import { createHmac } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { AgentTaskStore } from './agent-task-store.mjs';
import { AgentLinearInbox } from './agent-linear-inbox.mjs';
import { createPlanningBinding, planningStatus } from './agent-planning-scope.mjs';
import { runLinearPlanningRefresh } from './agent-linear-refresh-run.mjs';

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const time = 1_700_000_000_000;
const readerPolicy = { organizationId: id(1), appUserId: id(2), teamId: id(3), projectId: id(4) };
const issueId = id(5);
const issue = { id: issueId, title: 'Synthetic private proposal', description: 'Accepted scope',
  teamId: id(3), projectId: id(4), attachments: [], labels: ['Approved'], archivedAt: null, canceledAt: null };
const directories = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });
async function setup() {
  const directory = await mkdtemp(path.join(tmpdir(), 'navet-refresh-run-'));
  directories.push(directory);
  let currentTime = time;
  const now = () => currentTime;
  const store = new AgentTaskStore(directory, { now });
  const inbox = new AgentLinearInbox(directory, { now });
  const binding = createPlanningBinding(issue);
  const task = await store.enqueue({ source: 'trusted-source', requestId: 'synthetic-human-decision', mode: 'implement', revision: 'scope',
    planningBinding: binding, brief: { visibility: 'public-delivery-approved', acceptanceCriteria: ['Accepted option'] },
    authority: { actor: 'maintainer', reference: 'synthetic-human-reference', planningRevision: binding.revision, observedAt: time } });
  await store.mutate(task.id, 'claim', { owner: 'coordinator', durationMs: 300_000 });
  await store.mutate(task.id, 'planning-observation', { owner: 'coordinator', observation: { status: 'available', issue, reference: 'initial-read', observedAt: time } });
  const policy = { organizationId: id(1), webhookId: id(6) };
  const rawBody = Buffer.from(JSON.stringify({ ...policy, type: 'Issue', action: 'update', actor: null,
    data: { id: issueId }, createdAt: new Date(time).toISOString(), webhookTimestamp: time }));
  const receipt = await inbox.accept({ rawBody, secret: 'synthetic', policy,
    signature: createHmac('sha256', 'synthetic').update(rawBody).digest('hex') });
  const requests = [];
  let labels = ['Approved'];
  let broader = false;
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    if (url.endsWith('/oauth/revoke')) return new Response(null, { status: 200 });
    if (url.endsWith('/oauth/token')) return Response.json({ access_token: 'synthetic-token', token_type: 'Bearer', expires_in: 3600, scope: broader ? 'read write' : 'read' });
    const page = (nodes) => ({ nodes, pageInfo: { hasNextPage: false, endCursor: null } });
    return Response.json({ data: { organization: { id: id(1) }, viewer: { id: id(2), app: true, active: true }, issue: {
      ...issue, updatedAt: new Date(time).toISOString(), team: { id: id(3) }, project: { id: id(4) },
      attachments: page([]), labels: page(labels.map((name, index) => ({ id: id(10 + index), name }))),
    } } });
  };
  const options = { inbox, eventId: receipt.eventId, store, owner: 'coordinator', readerPolicy, now, fetchImpl,
    readCredentials: async () => ({ clientId: 'synthetic-client', clientSecret: 'synthetic-secret' }) };
  currentTime++;
  return { store, inbox, requests, task, options, withdraw: () => { labels = ['Deferred']; }, broader: () => { broader = true; } };
}
it('authenticates one minimal grant and reconciles the actual inbox without granting execution authority', async () => {
  const h = await setup();
  const authority = (await h.store.list())[0].authority;
  expect(await runLinearPlanningRefresh(h.options)).toMatchObject({ decision: 'confirmed', updatedTasks: 1, authority: 'none' });
  expect(h.requests).toHaveLength(4);
  expect(new URLSearchParams(h.requests[0].init.body).get('scope')).toBe('read');
  expect(await h.inbox.pending()).toEqual([]);
  const task = (await h.store.list())[0];
  expect(task.authority).toEqual(authority);
  expect(task.dispatch).toBeNull();
  expect(planningStatus(task, h.options.now()).result).toBe('pass');
});
it('latches a live withdrawal from app-authenticated proposal reads', async () => {
  const h = await setup(); h.withdraw();
  expect(await runLinearPlanningRefresh(h.options)).toMatchObject({ decision: 'confirmed', authority: 'none' });
  expect(planningStatus((await h.store.list())[0], h.options.now()).reason).toBe('planning-request-revoked');
});
it('reports unverified token cleanup without undoing a confirmed reconciliation', async () => {
  const h = await setup();
  const fetchImpl = (url, init) => url.endsWith('/oauth/revoke')
    ? Promise.resolve(new Response(null, { status: 500 })) : h.options.fetchImpl(url, init);
  expect(await runLinearPlanningRefresh({ ...h.options, fetchImpl })).toMatchObject({
    decision: 'blocked', authority: 'none', reason: 'linear-session-revocation-unverified',
    reconciliation: { decision: 'confirmed', updatedTasks: 1 },
  });
  expect(await h.inbox.pending()).toEqual([]);
  const task = (await h.store.list())[0];
  expect(planningStatus(task, h.options.now()).result).toBe('pass');
  expect(task.dispatch).toBeNull();
});
it('invalidates old read passes and retains the receipt when the grant is broader than read', async () => {
  const h = await setup(); h.broader();
  expect(await runLinearPlanningRefresh(h.options)).toMatchObject({ decision: 'retry', updatedTasks: 1 });
  expect((await h.inbox.pending())).toHaveLength(1);
  expect(planningStatus((await h.store.list())[0], h.options.now()).result).toBe('unverified');
  expect(h.requests).toHaveLength(2);
});
it('validates policy and pre-cancellation before loading credentials or sending requests', async () => {
  const h = await setup(); let loads = 0;
  const readCredentials = async () => { loads++; throw new Error('Must not read'); };
  const controller = new AbortController(); controller.abort();
  expect(await runLinearPlanningRefresh({ ...h.options, readCredentials, signal: controller.signal })).toMatchObject({ decision: 'blocked' });
  expect(await runLinearPlanningRefresh({ ...h.options, readCredentials, readerPolicy: { ...readerPolicy, teamId: 'invalid' } })).toMatchObject({ decision: 'blocked' });
  expect(loads).toBe(0); expect(h.requests).toEqual([]);
});
it('bounds stalled credential loading and keeps reconciliation pending', async () => {
  const h = await setup();
  expect(await runLinearPlanningRefresh({ ...h.options, maxRunMs: 20, readCredentials: () => new Promise(() => {}) })).toMatchObject({ decision: 'retry' });
  expect(await h.inbox.pending()).toHaveLength(1);
  expect(planningStatus((await h.store.list())[0], h.options.now()).result).toBe('unverified');
});

it('preserves the inbox receipt and exposes late grant cleanup after run cancellation', async () => {
  const h = await setup();
  const controller = new AbortController();
  let resolveGrant;
  let revokes = 0;
  const fetchImpl = (url) => {
    if (url.endsWith('/oauth/revoke')) { revokes++; return Promise.resolve(new Response(null)); }
    controller.abort();
    return new Promise((resolve) => { resolveGrant = resolve; });
  };
  const result = await runLinearPlanningRefresh({ ...h.options, fetchImpl, signal: controller.signal });
  expect(result).toMatchObject({ decision: 'blocked', authority: 'none', reason: 'linear-session-revocation-unverified' });
  expect(result.cleanup).toBeInstanceOf(Promise);
  expect(await h.inbox.pending()).toHaveLength(1);
  expect(planningStatus((await h.store.list())[0], h.options.now()).result).toBe('unverified');
  resolveGrant(Response.json({ access_token: 'late-reader-token', token_type: 'Bearer', expires_in: 3600, scope: 'read' }));
  expect(await result.cleanup).toEqual({ status: 'revoked' });
  expect(revokes).toBe(1);
  expect(result.decision).toBe('blocked');
  expect(JSON.stringify(result)).not.toContain('late-reader-token');
});
it('cancels a stalled GraphQL transport and durably invalidates the prior pass before returning', async () => {
  const h = await setup();
  const controller = new AbortController();
  let signal;
  const fetchImpl = async (url, init) => {
    if (url.endsWith('/oauth/token') || url.endsWith('/oauth/revoke')) return h.options.fetchImpl(url, init);
    signal = init.signal;
    controller.abort();
    return new Promise(() => {});
  };
  expect(await runLinearPlanningRefresh({ ...h.options, signal: controller.signal, fetchImpl })).toMatchObject({ decision: 'retry', updatedTasks: 1 });
  expect(signal.aborted).toBe(true);
  expect(planningStatus((await h.store.list())[0], h.options.now()).reason).toBe('planning-access-unverified');
  expect(await h.inbox.pending()).toHaveLength(1);
});

it('surfaces failed cleanup of a rejected grant while retaining retry state', async () => {
  const h = await setup(); h.broader();
  const fetchImpl = (url, init) => url.endsWith('/oauth/revoke')
    ? Promise.resolve(new Response(null, { status: 500 })) : h.options.fetchImpl(url, init);
  expect(await runLinearPlanningRefresh({ ...h.options, fetchImpl })).toMatchObject({
    decision: 'blocked', authority: 'none', reason: 'linear-session-revocation-unverified',
    reconciliation: { decision: 'retry', updatedTasks: 1 },
  });
  expect(await h.inbox.pending()).toHaveLength(1);
  expect(planningStatus((await h.store.list())[0], h.options.now()).result).toBe('unverified');
});
