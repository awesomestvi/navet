import { describe, expect, it } from 'vitest';
import { createLinearResultReader, linearResultBodyHash } from './agent-linear-result-reader.mjs';

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const time = 1_700_000_000_000;
const policy = { organizationId: id(1), appUserId: id(2), writerAppUserId: id(3), teamId: id(4), projectId: id(5) };
const body = 'Private household audit: reproduce, compare the reference and retest.';
const expected = { commentId: id(6), issueId: id(7), bodyHash: linearResultBodyHash(body), notBefore: time - 1000 };
function data() {
  return { organization: { id: policy.organizationId }, viewer: { id: policy.appUserId, app: true, active: true },
    comment: { id: expected.commentId, body, url: `https://linear.app/example/issue/NAV-42/test#comment-${id(6)}`,
      createdAt: new Date(time - 500).toISOString(), updatedAt: new Date(time - 500).toISOString(), archivedAt: null,
      user: { id: policy.writerAppUserId, app: true, active: true }, onBehalfOf: null, syncedWith: [],
      issue: { id: expected.issueId, archivedAt: null, canceledAt: null,
        team: { id: policy.teamId }, project: { id: policy.projectId } } } };
}
function setup({ response, now = () => time, maxReadMs, getAccessToken = async () => 'synthetic-result-token' } = {}) {
  const calls = [];
  const reader = createLinearResultReader({ policy, now, maxReadMs, getAccessToken,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return response ? response(calls.length) : Response.json({ data: data() });
    } });
  return { reader, calls };
}

describe('read-only planning result verification', () => {
  it('reads the exact result twice without returning confidential Markdown or tokens', async () => {
    const { reader, calls } = setup();
    const observation = await reader(expected);
    expect(observation).toMatchObject({ status: 'available', observedAt: time, result: {
      commentId: expected.commentId, issueId: expected.issueId, authorId: policy.writerAppUserId,
      bodyHash: expected.bodyHash } });
    expect(observation.reference).toMatch(/^linear-result:sha256:[a-f0-9]{64}$/);
    expect(JSON.stringify(observation)).not.toMatch(/Private household|synthetic-result-token/);
    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call.url).toBe('https://api.linear.app/graphql');
      expect(call.options).toMatchObject({ method: 'POST', redirect: 'error', cache: 'no-store' });
      const payload = JSON.parse(call.options.body);
      expect(payload.variables).toEqual({ id: expected.commentId });
      expect(payload.query).not.toMatch(/mutation/);
    }
  });

  it.each([
    (v) => { v.organization.id = id(8); },
    (v) => { v.viewer.id = id(8); },
    (v) => { v.viewer.app = false; },
    (v) => { v.viewer.active = false; },
    (v) => { v.comment.id = id(8); },
    (v) => { v.comment.user.id = id(8); },
    (v) => { v.comment.user.app = false; },
    (v) => { v.comment.user.active = false; },
    (v) => { v.comment.user = null; },
    (v) => { v.comment.onBehalfOf = { id: id(8) }; },
    (v) => { v.comment.syncedWith = [{ __typename: 'ExternalEntityInfo' }]; },
    (v) => { delete v.comment.syncedWith; },
    (v) => { v.comment.issue.id = id(8); },
    (v) => { v.comment.issue.team.id = id(8); },
    (v) => { v.comment.issue.project.id = id(8); },
    (v) => { v.comment.archivedAt = new Date(time).toISOString(); },
    (v) => { delete v.comment.archivedAt; },
    (v) => { v.comment.issue.archivedAt = new Date(time).toISOString(); },
    (v) => { v.comment.issue.canceledAt = new Date(time).toISOString(); },
    (v) => { v.comment.body = 'Different confidential content.'; },
    (v) => { v.comment.createdAt = new Date(time - 31_001).toISOString(); },
    (v) => { v.comment.updatedAt = new Date(time + 30_001).toISOString(); },
    (v) => { v.comment.updatedAt = new Date(time - 999).toISOString(); },
    (v) => { v.comment.url = 'https://example.test/secret'; },
    (v) => { v.comment.url = 'https://user:secret@linear.app/example/issue/NAV-42/test'; },
    (v) => { v.comment.url = 'https://linear.app/example/settings'; },
  ])('rejects identity, publication, lifecycle or content mismatch %#', async (change) => {
    const { reader } = setup({ response: () => { const value = data(); change(value); return Response.json({ data: value }); } });
    expect(await reader(expected)).toEqual({ status: 'unavailable', reference: 'linear-result-unavailable', observedAt: time });
  });

  it.each([-30_000, 30_000])('accepts bounded cross-system clock skew of %i ms', async (offset) => {
    const { reader } = setup({ response: () => {
      const value = data();
      value.comment.createdAt = new Date(time + offset).toISOString();
      value.comment.updatedAt = value.comment.createdAt;
      return Response.json({ data: value });
    } });
    expect((await reader({ ...expected, notBefore: time })).status).toBe('available');
  });

  it('rejects edits between the two reads even when content is unchanged', async () => {
    const { reader } = setup({ response: (n) => {
      const value = data();
      if (n === 2) value.comment.updatedAt = new Date(time).toISOString();
      return Response.json({ data: value });
    } });
    expect((await reader(expected)).status).toBe('unavailable');
  });

  it.each([new Response('confidential service error', { status: 403 }),
    new Response('bad JSON'), Response.json({ errors: [{ message: 'confidential service error' }], data: data() }),
    Response.json({ data: { ...data(), comment: null } })])('redacts remote errors and permission-masked missing results %#', async (response) => {
    const { reader } = setup({ response: () => response });
    expect(await reader(expected)).toEqual({ status: 'unavailable', reference: 'linear-result-unavailable', observedAt: time });
  });

  it('bounds transport that ignores cancellation', async () => {
    const { reader, calls } = setup({ maxReadMs: 10, response: () => new Promise(() => {}) });
    expect((await reader(expected)).status).toBe('unavailable');
    expect(calls[0].options.signal.aborted).toBe(true);
  });

  it('rejects oversized service responses and result Markdown', async () => {
    for (const response of [new Response('x'.repeat(1_048_577)),
      Response.json({ data: { ...data(), comment: { ...data().comment, body: 'x'.repeat(262_145) } } })]) {
      const { reader } = setup({ response: () => response });
      expect((await reader(expected)).status).toBe('unavailable');
    }
  });

  it('bounds credential acquisition and redacts its failures', async () => {
    for (const getAccessToken of [async () => new Promise(() => {}), async () => { throw new Error('private credential'); }]) {
      const { reader, calls } = setup({ maxReadMs: 10, getAccessToken });
      expect((await reader(expected)).status).toBe('unavailable');
      expect(calls).toHaveLength(0);
    }
  });

  it.each(['', 'token\nprivate', 'x'.repeat(8193)])('rejects invalid credentials before transport %#', async (token) => {
    const { reader, calls } = setup({ getAccessToken: async () => token });
    expect((await reader(expected)).status).toBe('unavailable');
    expect(calls).toHaveLength(0);
  });

  it('rejects stale and backwards clocks', async () => {
    for (const end of [time - 1, time + 20_001]) {
      let count = 0;
      const { reader } = setup({ now: () => count++ === 0 ? time : end });
      expect((await reader(expected)).status).toBe('unavailable');
    }
  });

  it.each([{ commentId: 'wrong' }, { issueId: 'wrong' }, { bodyHash: 'wrong' },
    { notBefore: 0 }, { notBefore: time + 1 }])('rejects malformed expected results before acquiring credentials %j', async (change) => {
    let tokens = 0;
    const { reader } = setup({ getAccessToken: async () => { tokens++; return 'token'; } });
    expect((await reader({ ...expected, ...change })).status).toBe('unavailable');
    expect(tokens).toBe(0);
  });

  it('bounds result Markdown and protects configured identities from caller mutation', async () => {
    expect(() => linearResultBodyHash(' ')).toThrow('bounded nonempty');
    expect(() => linearResultBodyHash('é'.repeat(131_073))).toThrow('bounded nonempty');
    const mutable = { ...policy };
    const reader = createLinearResultReader({ policy: mutable, getAccessToken: async () => 'token',
      now: () => time, fetchImpl: async () => Response.json({ data: data() }) });
    mutable.writerAppUserId = id(8);
    expect((await reader(expected)).status).toBe('available');
  });
});

it('accepts the documented workspace-less Linear comment URL', async () => {
  const url = `https://linear.app/issue/NAV-42/test#comment-${expected.commentId}`;
  const { reader } = setup({ response: () => {
    const value = data(); value.comment.url = url; return Response.json({ data: value });
  } });
  expect(await reader(expected)).toMatchObject({ status: 'available', result: { url } });
});
