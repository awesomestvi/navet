import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { AgentTaskStore } from './agent-task-store.mjs';
import { createPlanningBinding } from './agent-planning-scope.mjs';
import { runLinearPlanningIntake } from './agent-linear-intake-run.mjs';

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const time = 1_700_000_000_000;
const directories = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });
async function setup() {
  const directory = await mkdtemp(path.join(tmpdir(), 'navet-intake-run-'));
  directories.push(directory);
  const now = () => time;
  const store = new AgentTaskStore(directory, { now });
  const readerPolicy = { organizationId: id(1), appUserId: id(2), teamId: id(3), projectId: id(4) };
  const issue = { id: id(5), title: 'Synthetic proposal', description: 'Accepted scope',
    teamId: id(3), projectId: id(4), attachments: [], labels: ['Approved'], archivedAt: null, canceledAt: null };
  const planningBinding = createPlanningBinding(issue);
  const identity = { source: 'trusted-human-source', requestId: 'synthetic-decision' };
  const request = { ...identity, mode: 'implement', revision: 'scope', planningBinding,
    brief: { selectedOption: 'Option A', permittedChanges: ['Repair persistence'],
      visibility: 'public-delivery-approved', acceptanceCriteria: ['Save and reopen preserves value'] },
    authority: { actor: 'maintainer', reference: 'synthetic-human-reference', revision: 'scope',
      planningRevision: planningBinding.revision, observedAt: time } };
  const requests = [];
  let authorityReads = 0;
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    if (url.endsWith('/oauth/revoke')) return new Response(null);
    if (url.endsWith('/oauth/token')) return Response.json({ access_token: 'synthetic-token',
      token_type: 'Bearer', expires_in: 3600, scope: 'read' });
    const page = (nodes) => ({ nodes, pageInfo: { hasNextPage: false, endCursor: null } });
    return Response.json({ data: { organization: { id: id(1) }, viewer: { id: id(2), app: true, active: true }, issue: {
      ...issue, updatedAt: new Date(time).toISOString(), team: { id: issue.teamId }, project: { id: issue.projectId },
      attachments: page([]), labels: page(issue.labels.map((name, index) => ({ id: id(10 + index), name }))),
    } } });
  };
  const options = { store, identity, readerPolicy, now, fetchImpl,
    readCredentials: async () => ({ clientId: 'synthetic-client', clientSecret: 'synthetic-secret' }),
    readRequest: async () => { authorityReads++; return { status: 'authorized', request: structuredClone(request) }; } };
  return { store, issue, request, requests, options, authorityReads: () => authorityReads };
}

it('joins independent authority to scoped authenticated reads and queues exactly once across retries', async () => {
  const h = await setup();
  const result = await runLinearPlanningIntake(h.options);
  expect(result).toMatchObject({ status: 'queued', taskId: expect.any(String) });
  expect(h.authorityReads()).toBe(2);
  expect(h.requests).toHaveLength(4);
  expect(new URLSearchParams(h.requests[0].init.body).get('scope')).toBe('read');
  expect(h.requests.at(-1).url).toContain('/oauth/revoke');
  expect(await h.store.list()).toMatchObject([{ id: result.taskId, state: 'queued',
    lease: null, dispatch: null, planning: { observation: null } }]);
  expect(await runLinearPlanningIntake(h.options)).toEqual(result);
  expect(await h.store.list()).toHaveLength(1);
  expect(JSON.stringify(result)).not.toContain('Accepted scope');
});
it.each(['withdrawn', 'unavailable'])('does not load credentials for %s authority', async (status) => {
  const h = await setup();
  expect(await runLinearPlanningIntake({ ...h.options, readRequest: async () => ({ status }) })).toMatchObject({ status: 'blocked' });
  expect(h.requests).toEqual([]);
  expect(await h.store.list()).toEqual([]);
});
it('rechecks human authority after the proposal read and blocks withdrawal', async () => {
  const h = await setup(); let reads = 0;
  expect(await runLinearPlanningIntake({ ...h.options, readRequest: async () => ++reads === 1
    ? h.options.readRequest() : { status: 'withdrawn' } })).toMatchObject({ status: 'blocked' });
  expect(reads).toBe(2);
  expect(h.requests.at(-1).url).toContain('/oauth/revoke');
  expect(await h.store.list()).toEqual([]);
});
it.each(['description', 'labels', 'teamId'])('blocks changed proposal %s without queueing', async (key) => {
  const h = await setup();
  h.issue[key] = key === 'labels' ? ['Deferred'] : key === 'teamId' ? id(99) : 'Other scope';
  expect(await runLinearPlanningIntake(h.options)).toMatchObject({ status: 'blocked' });
  expect(await h.store.list()).toEqual([]);
  expect(h.requests.at(-1).url).toContain('/oauth/revoke');
});
it('validates scope policy and pre-cancellation before calling either credential or authority readers', async () => {
  const h = await setup(); let loads = 0;
  const readCredentials = async () => { loads++; throw new Error('Must not load'); };
  const controller = new AbortController(); controller.abort();
  expect(await runLinearPlanningIntake({ ...h.options, readCredentials, signal: controller.signal })).toMatchObject({ status: 'blocked' });
  expect(await runLinearPlanningIntake({ ...h.options, readCredentials,
    readerPolicy: { ...h.options.readerPolicy, appUserId: 'invalid' } })).toMatchObject({ status: 'blocked' });
  expect(h.authorityReads()).toBe(0);
  expect(loads).toBe(0);
});
it('bounds an unresponsive human-request adapter and passes cancellation to it', async () => {
  const h = await setup(); let observedSignal;
  expect(await runLinearPlanningIntake({ ...h.options, maxRunMs: 20,
    readRequest: (_identity, { signal }) => { observedSignal = signal; return new Promise(() => {}); } })).toMatchObject({ status: 'blocked' });
  expect(observedSignal.aborted).toBe(true);
  expect(await h.store.list()).toEqual([]);
  expect(h.requests).toEqual([]);
});
it('bounds stalled credential loading without queueing work', async () => {
  const h = await setup();
  expect(await runLinearPlanningIntake({ ...h.options, maxRunMs: 20,
    readCredentials: () => new Promise(() => {}) })).toMatchObject({ status: 'blocked' });
  expect(await h.store.list()).toEqual([]);
  expect(h.requests).toEqual([]);
});
it('rejects and revokes a broader grant without reading proposals or queueing work', async () => {
  const h = await setup(); let reads = 0; let revokes = 0;
  const fetchImpl = async (url, init) => {
    if (url.endsWith('/oauth/token')) return Response.json({ access_token: 'synthetic-broad-token',
      token_type: 'Bearer', expires_in: 3600, scope: 'read write' });
    if (url.endsWith('/oauth/revoke')) revokes++;
    else reads++;
    return h.options.fetchImpl(url, init);
  };
  expect(await runLinearPlanningIntake({ ...h.options, fetchImpl })).toMatchObject({ status: 'blocked' });
  expect(reads).toBe(0);
  expect(revokes).toBe(1);
  expect(await h.store.list()).toEqual([]);
});
it('reports failed revocation of a rejected grant without exposing credentials or token', async () => {
  const h = await setup();
  const fetchImpl = async (url) => url.endsWith('/oauth/token')
    ? Response.json({ access_token: 'synthetic-broad-token', token_type: 'Bearer', expires_in: 3600, scope: 'read write' })
    : new Response(null, { status: 500 });
  const result = await runLinearPlanningIntake({ ...h.options, fetchImpl });
  expect(result).toMatchObject({ status: 'blocked', reason: 'linear-session-revocation-unverified' });
  expect(await h.store.list()).toEqual([]);
  expect(JSON.stringify(result)).not.toContain('synthetic-broad-token');
  expect(JSON.stringify(result)).not.toContain('synthetic-secret');
});
it('cancels a GraphQL transport that ignores cancellation and revokes its grant', async () => {
  const h = await setup(); const controller = new AbortController();
  const fetchImpl = async (url, init) => {
    if (url.endsWith('/oauth/token') || url.endsWith('/oauth/revoke')) return h.options.fetchImpl(url, init);
    controller.abort(); return new Promise(() => {});
  };
  expect(await runLinearPlanningIntake({ ...h.options, fetchImpl, signal: controller.signal })).toMatchObject({ status: 'blocked' });
  expect(await h.store.list()).toEqual([]);
  expect(h.requests.at(-1).url).toContain('/oauth/revoke');
});
it('retains the committed task receipt when token revocation cannot be verified', async () => {
  const h = await setup();
  const fetchImpl = (url, init) => url.endsWith('/oauth/revoke')
    ? Promise.resolve(new Response(null, { status: 500 })) : h.options.fetchImpl(url, init);
  const result = await runLinearPlanningIntake({ ...h.options, fetchImpl });
  expect(result).toMatchObject({ status: 'blocked', reason: 'linear-session-revocation-unverified',
    intake: { status: 'queued', taskId: expect.any(String) } });
  expect(await h.store.list()).toMatchObject([{ id: result.intake.taskId, dispatch: null }]);
});
it('awaits an already-started durable enqueue and preserves its acknowledgement after cancellation', async () => {
  const h = await setup(); const controller = new AbortController();
  const store = { enqueue: async (request) => { controller.abort(); return h.store.enqueue(request); } };
  const result = await runLinearPlanningIntake({ ...h.options, store, signal: controller.signal });
  expect(result).toMatchObject({ status: 'queued' });
  expect(await h.store.list()).toMatchObject([{ id: result.taskId, dispatch: null }]);
  expect(h.requests.at(-1).url).toContain('/oauth/revoke');
});
it('keeps observing and revokes a late grant without restoring canceled intake', async () => {
  const h = await setup(); const controller = new AbortController(); let resolveGrant; let revokes = 0;
  const fetchImpl = (url) => {
    if (url.endsWith('/oauth/revoke')) { revokes++; return Promise.resolve(new Response(null)); }
    controller.abort(); return new Promise((resolve) => { resolveGrant = resolve; });
  };
  const result = await runLinearPlanningIntake({ ...h.options, fetchImpl, signal: controller.signal });
  expect(result).toMatchObject({ status: 'blocked', reason: 'linear-session-revocation-unverified' });
  expect(result.cleanup).toBeInstanceOf(Promise);
  resolveGrant(Response.json({ access_token: 'synthetic-late-token', token_type: 'Bearer', expires_in: 3600, scope: 'read' }));
  expect(await result.cleanup).toEqual({ status: 'revoked' });
  expect(revokes).toBe(1);
  expect(await h.store.list()).toEqual([]);
  expect(result.status).toBe('blocked');
  expect(JSON.stringify(result)).not.toContain('synthetic-late-token');
});
