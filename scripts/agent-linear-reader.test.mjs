import { describe, expect, it } from 'vitest';
import { createLinearIssueReader } from './agent-linear-reader.mjs';

const id = (value) => `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;
const policy = { organizationId: id(1), appUserId: id(2), teamId: id(3), projectId: id(4) };
const issueId = id(5);
const time = 1_700_000_000_000;
const page = (nodes, next = null) => ({ nodes, pageInfo: { hasNextPage: next !== null, endCursor: next } });
const result = (changes = {}) => ({ data: { organization: { id: policy.organizationId },
  viewer: { id: policy.appUserId, app: true, active: true },
  issue: { id: issueId, title: 'Synthetic proposal', description: 'Option A and its acceptance criteria.',
    updatedAt: '2026-01-01T00:00:00Z', archivedAt: null, canceledAt: null,
    team: { id: policy.teamId }, project: { id: policy.projectId },
    attachments: page([{ id: id(6), url: 'https://example.test/design' }]),
    labels: page([{ id: id(7), name: 'Approved' }]), ...changes } } });

function harness(responses = [result(), result()], options = {}) {
  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url, ...init, body: JSON.parse(init.body) });
    const response = responses.shift();
    if (response instanceof Error) throw response;
    return response instanceof Response ? response : new Response(JSON.stringify(response), { status: 200 });
  };
  return { requests, read: createLinearIssueReader({ policy, now: () => time,
    getAccessToken: async () => 'synthetic-oauth-token', fetchImpl, ...options }) };
}

describe('scoped Linear service reader', () => {
  it('reads twice through the fixed OAuth endpoint and exposes scope without approval authority', async () => {
    const { read, requests } = harness();
    const observation = await read(issueId);
    expect(observation).toMatchObject({ status: 'available', observedAt: time,
      issue: { id: issueId, teamId: policy.teamId, projectId: policy.projectId, labels: ['Approved'],
        attachments: [{ id: id(6), url: 'https://example.test/design' }], archivedAt: null, canceledAt: null } });
    expect(observation.reference).toMatch(/^linear-service:sha256:[a-f0-9]{64}$/);
    expect(observation).not.toHaveProperty('authority');
    expect(requests).toHaveLength(2);
    for (const request of requests) {
      expect(request).toMatchObject({ url: 'https://api.linear.app/graphql', method: 'POST', redirect: 'error',
        cache: 'no-store', headers: { Authorization: 'Bearer synthetic-oauth-token' },
        body: { variables: { id: issueId, attachmentsAfter: null, labelsAfter: null, readAttachments: true, readLabels: true } } });
      expect(request.body.query).toMatch(/^query NavetPlanningIssue/);
    }
  });

  it('finishes each connection independently before comparing complete snapshots', async () => {
    const first = result({ attachments: page([{ id: id(6), url: 'https://example.test/first' }], 'next-attachment') });
    const second = result({ attachments: page([{ id: id(8), url: 'https://example.test/second' }]), labels: undefined });
    const { read, requests } = harness([first, second, first, second]);
    expect(await read(issueId)).toMatchObject({ status: 'available', issue: {
      attachments: [{ id: id(6), url: 'https://example.test/first' }, { id: id(8), url: 'https://example.test/second' }], labels: ['Approved'] } });
    expect(requests).toHaveLength(4);
    expect(requests[1].body.variables).toMatchObject({ attachmentsAfter: 'next-attachment', readLabels: false });
    expect(requests[2].body.variables.attachmentsAfter).toBeNull();
  });

  it.each([
    (response) => { response.data.organization.id = id(9); },
    (response) => { response.data.viewer.id = id(9); },
    (response) => { response.data.viewer.app = false; },
    (response) => { response.data.viewer.active = false; },
    (response) => { response.data.issue.id = id(9); },
    (response) => { response.data.issue.team.id = id(9); },
    (response) => { response.data.issue.project.id = id(9); },
  ])('fails closed on mismatched identity or a human token', async (change) => {
    const response = result();
    change(response);
    expect(await harness([response]).read(issueId)).toEqual({ status: 'unavailable',
      reference: 'linear-service-unavailable', observedAt: time });
  });

  it('checks identity again on later pages', async () => {
    const first = result({ attachments: page([{ id: id(6), url: 'https://example.test/design' }], 'next') });
    const second = result();
    second.data.viewer.app = false;
    expect((await harness([first, second]).read(issueId)).status).toBe('unavailable');
  });

  it.each([
    { description: 'Option B replaces A.' },
    { updatedAt: '2026-01-02T00:00:00Z' },
    { attachments: page([{ id: id(6), url: 'https://example.test/other' }]) },
    { labels: page([{ id: id(7), name: 'Deferred' }]) },
  ])('rejects proposal drift between complete snapshots: %j', async (changes) => {
    expect((await harness([result(), result(changes)]).read(issueId)).status).toBe('unavailable');
  });

  it('rejects issue edits between pages of one snapshot', async () => {
    const first = result({ attachments: page([{ id: id(6), url: 'https://example.test/first' }], 'next') });
    const second = result({ description: 'Changed scope.', attachments: page([{ id: id(8), url: 'https://example.test/second' }]) });
    expect((await harness([first, second]).read(issueId)).status).toBe('unavailable');
  });

  it('keeps the newest attachment signature without confusing renewal with a scope edit', async () => {
    const signed = (signature) => result({ attachments: page([{ id: id(6),
      url: `https://uploads.linear.app/workspace/file?signature=${signature}` }]) });
    expect(await harness([signed('first'), signed('second')]).read(issueId)).toMatchObject({
      status: 'available', issue: { attachments: [{ id: id(6), url: 'https://uploads.linear.app/workspace/file?signature=second' }] } });
  });

  it.each([
    { attachments: undefined },
    { labels: { nodes: [], pageInfo: {} } },
    { archivedAt: undefined },
    { canceledAt: '' },
    { updatedAt: 'invalid' },
    { description: null },
    { attachments: page([{ id: id(6), url: 'https://example.test/first' }, { id: id(6), url: 'https://example.test/duplicate' }]) },
  ])('rejects incomplete or duplicate data: %j', async (changes) => {
    expect((await harness([result(changes), result(changes)]).read(issueId)).status).toBe('unavailable');
  });

  it('rejects repeated cursors, empty advancing pages and bounded pagination overflow', async () => {
    const next = (node) => result({ attachments: page(node ? [{ id: id(node), url: 'https://example.test/design' }] : [], 'same') });
    expect((await harness([next(6), next(8)]).read(issueId)).status).toBe('unavailable');
    expect((await harness([next(null)]).read(issueId)).status).toBe('unavailable');
    expect((await harness([next(6)], { maxPages: 1 }).read(issueId)).status).toBe('unavailable');
  });

  it.each([
    new Response('private server error', { status: 401 }),
    new Response('masked not-found', { status: 404 }),
    { errors: [{ message: 'sensitive-token-and-household-details' }], data: result().data },
    new Response('invalid json'),
    new Response('x'.repeat(1_048_577)),
    new Error('sensitive-token-and-household-details'),
  ])('redacts failures and never converts them to deletion evidence', async (response) => {
    const observation = await harness([response]).read(issueId);
    expect(observation).toEqual({ status: 'unavailable', reference: 'linear-service-unavailable', observedAt: time });
    expect(JSON.stringify(observation)).not.toMatch(/sensitive-token|private server|masked/);
  });

  it('bounds an unresponsive token provider before any request', async () => {
    const { read, requests } = harness([], { maxReadMs: 5, getAccessToken: async () => new Promise(() => {}) });
    expect((await read(issueId)).status).toBe('unavailable');
    expect(requests).toEqual([]);
  });

  it('bounds an unresponsive transport even when it ignores cancellation', async () => {
    const { read } = harness([], { maxReadMs: 5, fetchImpl: async () => new Promise(() => {}) });
    expect((await read(issueId)).status).toBe('unavailable');
  });

  it('rejects invalid token material and invalid requested identity without transport', async () => {
    for (const token of ['', 'token\nprivate', 'x'.repeat(8193)]) {
      const { read, requests } = harness([], { getAccessToken: async () => token });
      expect((await read(issueId)).status).toBe('unavailable');
      expect(requests).toEqual([]);
    }
    const { read, requests } = harness([]);
    expect((await read('NAV-42')).status).toBe('unavailable');
    expect(requests).toEqual([]);
  });
});
