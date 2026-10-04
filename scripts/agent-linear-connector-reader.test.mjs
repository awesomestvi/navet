import { expect, it } from 'vitest';
import { createLinearConnectorIssueReader } from './agent-linear-connector-reader.mjs';
import { createPlanningBinding } from './agent-planning-scope.mjs';

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const time = 1_700_000_000_000;
const policy = { organizationId: id(1), readerUserId: id(2), teamId: id(3), projectId: id(4) };
function setup() {
  const raw = { id: 'NAV-123', uuid: id(5), teamId: id(3), projectId: id(4), title: 'Private proposal',
    description: 'Accepted scope', attachments: [{ id: id(6), url: 'https://example.test/design' }], labels: ['Approved'],
    updatedAt: new Date(time).toISOString(), archivedAt: null, canceledAt: null };
  const calls = [];
  const wrap = (value) => ({ content: [{ type: 'text', text: JSON.stringify(value) }] });
  const options = { policy, now: () => time,
    getWorkspace: async (args) => { calls.push(['workspace', args]); return wrap({ id: id(1) }); },
    getUser: async (args) => { calls.push(['user', args]); return wrap({ id: id(2), isActive: true }); },
    getIssue: async (args) => { calls.push(['issue', args]); return wrap(raw); } };
  return { raw, options, calls, wrap };
}
it('reads complete stable connector scope with fixed workspace, active account, team and project identities', async () => {
  const h = setup(); const result = await createLinearConnectorIssueReader(h.options)(id(5));
  expect(result).toMatchObject({ status: 'available', issue: { id: id(5), title: h.raw.title },
    observedAt: time, reference: expect.stringMatching(/^linear-connector:sha256:/) });
  expect(h.calls.map(([kind]) => kind)).toEqual(['workspace', 'user', 'issue', 'workspace', 'user', 'issue']);
  expect(h.calls.filter(([kind]) => kind === 'issue').map(([, args]) => args)).toEqual([{ id: id(5) }, { id: id(5) }]);
  expect(createPlanningBinding(result.issue)).toEqual(createPlanningBinding(h.raw));
  expect(result.authority).toBeUndefined();
});
it.each(['workspace', 'user', 'inactive', 'team', 'project', 'issue'])('rejects mismatched %s identity', async (kind) => {
  const h = setup();
  if (kind === 'workspace') h.options.getWorkspace = async () => ({ id: id(99) });
  if (kind === 'user' || kind === 'inactive') h.options.getUser = async () => ({ id: kind === 'user' ? id(99) : id(2), isActive: kind !== 'inactive' });
  if (kind === 'team') h.raw.teamId = id(99);
  if (kind === 'project') h.raw.projectId = id(99);
  if (kind === 'issue') h.raw.uuid = id(99);
  expect(await createLinearConnectorIssueReader(h.options)(id(5))).toMatchObject({ status: 'unavailable' });
});
it.each(['attachments', 'labels', 'archivedAt', 'canceledAt', 'updatedAt'])('rejects missing %s rather than inventing complete scope', async (key) => {
  const h = setup(); delete h.raw[key];
  expect(await createLinearConnectorIssueReader(h.options)(id(5))).toMatchObject({ status: 'unavailable' });
});
it.each(['hasNextPage', 'truncated'])('rejects an explicitly %s issue result', async (key) => {
  const h = setup(); h.raw[key] = true;
  expect(await createLinearConnectorIssueReader(h.options)(id(5))).toMatchObject({ status: 'unavailable' });
});
it.each(['title', 'labels', 'attachments'])('detects changed %s between reads, including transport object reuse', async (key) => {
  const h = setup(); let reads = 0;
  h.options.getIssue = async () => {
    if (++reads === 2) {
      if (key === 'title') h.raw.title = 'Changed scope';
      if (key === 'labels') h.raw.labels.push('Deferred');
      if (key === 'attachments') h.raw.attachments.push({ id: id(7), url: 'https://example.test/other-design' });
    }
    return h.raw;
  };
  expect(await createLinearConnectorIssueReader(h.options)(id(5))).toMatchObject({ status: 'unavailable' });
});
it('does not interpret missing or permission-masked issues as verified deletion', async () => {
  const h = setup(); h.options.getIssue = async () => { throw new Error('404'); };
  expect(await createLinearConnectorIssueReader(h.options)(id(5))).toEqual({ status: 'unavailable',
    reference: 'linear-connector-unavailable', observedAt: time });
});
it.each([
  { isError: true, content: [{ type: 'text', text: 'Permission denied' }] },
  { content: [{ type: 'text', text: '{"uuid":' }] },
  { content: [{ type: 'text', text: '{}' }, { type: 'text', text: '{}' }] },
])('rejects failed, truncated or mixed MCP payloads without exposing remote errors', async (response) => {
  const h = setup(); h.options.getIssue = async () => response;
  const result = await createLinearConnectorIssueReader(h.options)(id(5));
  expect(result.status).toBe('unavailable');
  expect(JSON.stringify(result)).not.toContain('Permission denied');
});
it('bounds a stalled tool and propagates cancellation without needing credentials', async () => {
  const h = setup(); let observedSignal;
  h.options.getIssue = (_args, { signal }) => { observedSignal = signal; return new Promise(() => {}); };
  expect(await createLinearConnectorIssueReader({ ...h.options, maxReadMs: 20 })(id(5))).toMatchObject({ status: 'unavailable' });
  expect(observedSignal.aborted).toBe(true);
});
it('pre-cancels before calling any connected tool', async () => {
  const h = setup(); const controller = new AbortController(); controller.abort();
  expect(await createLinearConnectorIssueReader({ ...h.options, signal: controller.signal })(id(5))).toMatchObject({ status: 'unavailable' });
  expect(h.calls).toEqual([]);
});
it('rejects invalid policy and exact-issue identity without connector reads', async () => {
  const h = setup();
  expect(() => createLinearConnectorIssueReader({ ...h.options, policy: { ...policy, readerUserId: 'invalid' } })).toThrow('scoped identities');
  expect(await createLinearConnectorIssueReader(h.options)('NAV-123')).toMatchObject({ status: 'unavailable' });
  expect(h.calls).toEqual([]);
});
