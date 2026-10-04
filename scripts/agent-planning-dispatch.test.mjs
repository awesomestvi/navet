import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { AgentTaskStore } from './agent-task-store.mjs';
import { createPlanningBinding, planningStatus } from './agent-planning-scope.mjs';
import { preparePlanningDispatch } from './agent-planning-dispatch.mjs';

const directories = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });
async function setup({ bounded = false } = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'navet-planning-dispatch-'));
  directories.push(directory);
  let time = 1_700_000_000_000;
  const now = () => time;
  const tick = () => ++time;
  const store = new AgentTaskStore(directory, { now });
  const issue = { uuid: 'proposal', teamId: 'team', projectId: 'project', title: 'Private proposal',
    description: 'Accepted option A', attachments: [], labels: ['Approved'], archivedAt: null, canceledAt: null };
  const planningBinding = createPlanningBinding(issue);
  const request = { source: 'trusted-human-service', requestId: 'human-event', mode: 'implement', revision: 'scope',
    planningBinding, requiredGates: ['quality'], authority: { actor: 'maintainer', reference: 'human-decision',
      revision: 'scope', planningRevision: planningBinding.revision, observedAt: time },
    brief: { selectedOption: 'Option A', permittedChanges: ['Repair persistence'], visibility: 'public-delivery-approved',
      acceptanceCriteria: ['Save and reopen preserves value'] },
    ...(bounded ? { resourceLimits: { maxElapsedMs: 100_000, maxModelTokens: 1000, maxToolCalls: 100 } } : {}) };
  const task = await store.enqueue(request);
  const owner = 'coordinator';
  const act = (action, input = {}) => store.mutate(task.id, action, { owner, ...input });
  await act('claim', { durationMs: 100_000 });
  const calls = [];
  const options = { store, taskId: task.id, owner, now,
    readRequest: async (identity) => { calls.push(['request', identity]); return { status: 'authorized',
      request: { ...structuredClone(request), authority: { ...request.authority, observedAt: tick() } } }; },
    readIssue: async (issueId) => { calls.push(['issue', issueId]); return { status: 'available',
      issue: structuredClone(issue), reference: 'live-proposal-read', observedAt: tick() }; } };
  return { task, store, issue, request, act, options, calls, now, tick, advance: (ms) => { time += ms; } };
}
it('joins current lease, exact human scope and fresh proposal to one durable intent', async () => {
  const h = await setup();
  const result = await preparePlanningDispatch(h.options);
  expect(result).toMatchObject({ status: 'prepared', taskId: h.task.id, dispatch: {
    token: expect.any(String), threadId: null, clientThreadId: null } });
  expect(h.calls.map(([kind]) => kind)).toEqual(['request', 'issue', 'request']);
  const task = (await h.store.list())[0];
  expect(task.dispatch).toEqual(result.dispatch);
  expect(task.authority.observedAt).toBe(h.now());
  expect(planningStatus(task, h.now()).result).toBe('pass');
  expect(JSON.stringify(result)).not.toContain('Private proposal');
});
it('reconciles a saved intent without renewing authority or creating another token', async () => {
  const h = await setup(); const first = await preparePlanningDispatch(h.options);
  h.calls.length = 0;
  const result = await preparePlanningDispatch({ ...h.options,
    readRequest: async () => { throw new Error('Withdrawn'); }, readIssue: async () => { throw new Error('Unavailable'); } });
  expect(result).toEqual({ ...first, status: 'reconcile' });
  expect(h.calls).toEqual([]);
  expect((await h.store.list())[0].history.filter((item) => item.action === 'dispatch-intent')).toHaveLength(1);
});
it.each(['unavailable', 'withdrawn'])('blocks %s human authority before proposal reads', async (status) => {
  const h = await setup();
  expect(await preparePlanningDispatch({ ...h.options, readRequest: async () => ({ status }) })).toMatchObject({ status: 'blocked' });
  expect(h.calls).toEqual([]);
  expect((await h.store.list())[0].dispatch).toBeNull();
});
it('rechecks human withdrawal after the proposal read', async () => {
  const h = await setup(); let reads = 0;
  expect(await preparePlanningDispatch({ ...h.options, readRequest: async (identity) => ++reads === 1
    ? h.options.readRequest(identity) : { status: 'withdrawn' } })).toMatchObject({ status: 'blocked' });
  expect(reads).toBe(2);
  expect((await h.store.list())[0].dispatch).toBeNull();
});
it('latches human withdrawal and cannot revive the same request through restored source approval', async () => {
  const h = await setup();
  expect(await preparePlanningDispatch({ ...h.options, readRequest: async () => ({ status: 'withdrawn' }) })).toMatchObject({ status: 'blocked' });
  expect((await h.store.list())[0].requestRevocation).toMatchObject({ status: 'withdrawn',
    source: h.task.source, requestId: h.task.requestId, reference: h.request.authority.reference });
  expect(await preparePlanningDispatch(h.options)).toMatchObject({ status: 'blocked' });
  expect(h.calls).toEqual([]);
  await h.act('planning-observation', { observation: await h.options.readIssue('proposal') });
  await expect(h.act('dispatch-intent', { authority: { ...h.request.authority, observedAt: h.tick() } }))
    .rejects.toThrow('request-authority-revoked');
  await expect(h.act('transition', { state: 'investigating', reason: 'Try restoring old approval' }))
    .rejects.toThrow('request-authority-revoked');
  expect((await h.store.list())[0].dispatch).toBeNull();
});
it('rejects stale and mismatched revocation receipts and preserves the original valid receipt', async () => {
  const h = await setup();
  const observation = { status: 'withdrawn', source: h.task.source, requestId: h.task.requestId,
    reference: h.request.authority.reference, observedAt: h.now() };
  for (const change of [{ source: 'other-source' }, { requestId: 'other-request' }, { reference: 'other-human-decision' },
    { observedAt: h.now() - 60_001 }, { status: 'unavailable' }]) {
    await expect(h.act('request-revocation', { observation: { ...observation, ...change } })).rejects.toThrow('fresh exact source');
  }
  expect((await h.store.list())[0].requestRevocation).toBeUndefined();
  await h.act('request-revocation', { observation });
  await h.act('request-revocation', { observation: { ...observation, observedAt: h.tick() } });
  expect((await h.store.list())[0].requestRevocation).toEqual(observation);
});
it('preserves dispatch reconciliation and handle binding after human withdrawal while blocking new follow-ups', async () => {
  const h = await setup(); const result = await preparePlanningDispatch(h.options);
  await h.act('request-revocation', { observation: { status: 'withdrawn', source: h.task.source,
    requestId: h.task.requestId, reference: h.request.authority.reference, observedAt: h.tick() } });
  expect(await preparePlanningDispatch(h.options)).toMatchObject({ status: 'reconcile', dispatch: result.dispatch });
  await h.act('bind', { token: result.dispatch.token, threadId: 'actual-existing-worker' });
  await expect(h.act('reserve-followup', { events: ['new-work'] })).rejects.toThrow('request-authority-revoked');
  expect((await h.store.list())[0].dispatch.threadId).toBe('actual-existing-worker');
});
it.each(['brief', 'gates', 'limits', 'mode', 'actor', 'reference'])('blocks changed accepted %s even with an unchanged proposal', async (kind) => {
  const h = await setup(); let reads = 0;
  const readRequest = async (identity) => {
    const observation = await h.options.readRequest(identity);
    if (++reads === 2) {
      if (kind === 'brief') observation.request.brief.selectedOption = 'Option B';
      if (kind === 'gates') observation.request.requiredGates = [];
      if (kind === 'limits') observation.request.resourceLimits = { maxElapsedMs: 1000, maxModelTokens: 10, maxToolCalls: 10 };
      if (kind === 'mode') observation.request.mode = 'research';
      if (kind === 'actor') observation.request.authority.actor = 'other-human';
      if (kind === 'reference') observation.request.authority.reference = 'other-decision';
    }
    return observation;
  };
  expect(await preparePlanningDispatch({ ...h.options, readRequest })).toMatchObject({ status: 'blocked' });
  expect((await h.store.list())[0].dispatch).toBeNull();
});
it.each([{ description: 'New option' }, { labels: ['Deferred'] }, { archivedAt: '2026-10-04T00:00:00Z' }])(
  'latches changed or withdrawn planning scope %j', async (change) => {
    const h = await setup(); Object.assign(h.issue, change);
    expect(await preparePlanningDispatch(h.options)).toMatchObject({ status: 'blocked' });
    const task = (await h.store.list())[0];
    expect(planningStatus(task, h.now()).reason).toBe('planning-request-revoked');
    expect(task.dispatch).toBeNull();
  });
it.each(['unavailable', 'malformed', 'cached', 'canceled'])('invalidates a prior planning pass on %s reads', async (kind) => {
  const h = await setup();
  await h.act('planning-observation', { observation: await h.options.readIssue('proposal') });
  h.tick(); const controller = new AbortController();
  const readIssue = async () => {
    if (kind === 'canceled') { controller.abort(); return new Promise(() => {}); }
    if (kind === 'unavailable') throw new Error('Access lost');
    return { status: 'available', issue: { ...h.issue, ...(kind === 'malformed' ? { attachments: undefined } : {}) },
      observedAt: kind === 'cached' ? h.now() - 1 : h.now(), reference: 'service-read' };
  };
  expect(await preparePlanningDispatch({ ...h.options, readIssue, signal: controller.signal })).toMatchObject({ status: 'blocked' });
  const task = (await h.store.list())[0];
  expect(planningStatus(task, h.now()).result).toBe('unverified');
  expect(task.dispatch).toBeNull();
});
it('never steals another lease or reclaims an expired lease from retained state', async () => {
  const h = await setup();
  expect(await preparePlanningDispatch({ ...h.options, owner: 'other-owner' })).toMatchObject({ status: 'blocked' });
  h.advance(100_001);
  expect(await preparePlanningDispatch(h.options)).toMatchObject({ status: 'blocked' });
  expect(h.calls).toEqual([]);
});
it('stops when ownership is released during the remote proposal read', async () => {
  const h = await setup();
  const readIssue = async (id) => { await h.act('release', { reason: 'Coordinator handoff' }); return h.options.readIssue(id); };
  expect(await preparePlanningDispatch({ ...h.options, readIssue })).toMatchObject({ status: 'blocked' });
  expect((await h.store.list())[0]).toMatchObject({ lease: null, dispatch: null });
});
it('requires the existing resource reservation and preserves it on dispatch', async () => {
  const h = await setup({ bounded: true });
  await h.act('resource-usage', { usage: { modelTokens: 0, toolCalls: 0, reference: 'actual-worker-usage', observedAt: h.tick() } });
  expect(await preparePlanningDispatch(h.options)).toMatchObject({ status: 'blocked' });
  const reservation = await h.act('reserve-resources', { event: 'initial-delivery', modelTokens: 100, toolCalls: 1 });
  const resourceToken = reservation.resourceDecision.reservation.token;
  expect(await preparePlanningDispatch({ ...h.options, resourceToken })).toMatchObject({ status: 'prepared', dispatch: { resourceToken } });
  expect((await h.store.list())[0].resources.reservations).toMatchObject([{ token: resourceToken, operation: 'dispatch' }]);
});
it('bounds a source adapter that ignores cancellation and creates no intent', async () => {
  const h = await setup(); let observedSignal;
  expect(await preparePlanningDispatch({ ...h.options, maxRunMs: 20,
    readRequest: (_identity, { signal }) => { observedSignal = signal; return new Promise(() => {}); } })).toMatchObject({ status: 'blocked' });
  expect(observedSignal.aborted).toBe(true);
  expect((await h.store.list())[0].dispatch).toBeNull();
});
it('preserves a committed intent after cancellation and returns no create permission', async () => {
  const h = await setup(); const controller = new AbortController();
  const store = { list: () => h.store.list(), mutate: async (...args) => {
    const task = await h.store.mutate(...args);
    if (args[1] === 'dispatch-intent') controller.abort();
    return task;
  } };
  const result = await preparePlanningDispatch({ ...h.options, store, signal: controller.signal });
  expect(result).toMatchObject({ status: 'blocked', dispatch: { token: expect.any(String) } });
  expect((await h.store.list())[0].dispatch).toEqual(result.dispatch);
  expect(await preparePlanningDispatch(h.options)).toMatchObject({ status: 'reconcile', dispatch: result.dispatch });
});
it('rejects pre-cancellation without loading state or querying services', async () => {
  const h = await setup(); const controller = new AbortController(); controller.abort(); let lists = 0;
  const store = { ...h.store, list: async () => { lists++; return []; }, mutate: h.store.mutate.bind(h.store) };
  expect(await preparePlanningDispatch({ ...h.options, store, signal: controller.signal })).toMatchObject({ status: 'blocked' });
  expect(lists).toBe(0); expect(h.calls).toEqual([]);
});
