import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { AgentTaskStore } from './agent-task-store.mjs';
import { createPlanningBinding } from './agent-planning-scope.mjs';
import { preparePlanningDispatch } from './agent-planning-dispatch.mjs';
import { dispatchPlanningDelivery } from './agent-planning-delivery-dispatch.mjs';

const directories = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });
async function setup({ bounded = false } = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'navet-worker-dispatch-'));
  directories.push(directory);
  let time = 1_700_000_000_000;
  const now = () => time;
  const tick = () => ++time;
  const store = new AgentTaskStore(directory, { now });
  const issue = { uuid: 'private-proposal', teamId: 'private-team', projectId: 'private-project', title: 'Private deliberation',
    description: 'Private research notes', attachments: [], labels: ['Approved'], archivedAt: null, canceledAt: null };
  const planningBinding = createPlanningBinding(issue);
  const request = { source: 'trusted-human-source', requestId: 'accepted-event', mode: 'implement', revision: 'scope-a',
    planningBinding, requiredGates: ['quality'], authority: { actor: 'maintainer', reference: 'verified-human-decision',
      revision: 'scope-a', planningRevision: planningBinding.revision, observedAt: time },
    brief: { selectedOption: 'Repair selected setting', permittedChanges: ['Fix persistence'], visibility: 'public-delivery-approved',
      acceptanceCriteria: ['Save and reopen preserves value'] },
    ...(bounded ? { resourceLimits: { maxElapsedMs: 100_000, maxModelTokens: 1000, maxToolCalls: 100 } } : {}) };
  const task = await store.enqueue(request);
  const owner = 'coordinator';
  const act = (action, input = {}) => store.mutate(task.id, action, { owner, ...input });
  await act('claim', { durationMs: 100_000 });
  const creations = []; const searches = []; let authorityReads = 0;
  const options = { store, owner, taskId: task.id, now,
    readRequest: async () => { authorityReads++; return { status: 'authorized', request: {
      ...structuredClone(request), authority: { ...request.authority, observedAt: tick() } } }; },
    readIssue: async () => ({ status: 'available', issue: structuredClone(issue), reference: 'live-proposal', observedAt: tick() }),
    createDelivery: async (input) => { creations.push(input); return { threadId: 'actual-worker' }; },
    findDelivery: async (input) => { searches.push(input); return { status: 'found', ...input,
      reference: 'actual-task-service-observation', observedAt: tick(), threadId: 'actual-worker' }; } };
  return { store, task, issue, request, act, options, creations, searches, authorityReads: () => authorityReads, tick, now };
}
it('reserves first-send permission, creates once and durably binds the actual handle using only the approved brief', async () => {
  const h = await setup(); const result = await dispatchPlanningDelivery(h.options);
  expect(result).toMatchObject({ status: 'bound', taskId: h.task.id, dispatch: {
    protocol: 'attempt-receipt-v1', attemptedAt: expect.any(Number), threadId: 'actual-worker' } });
  expect(h.authorityReads()).toBe(3);
  expect(h.creations).toEqual([{ taskId: h.task.id, dispatchToken: result.dispatch.token,
    mode: h.task.mode, revision: h.task.revision, brief: h.request.brief }]);
  expect(JSON.stringify(h.creations)).not.toContain('private-proposal');
  expect(JSON.stringify(h.creations)).not.toContain('Private research');
  expect((await h.store.list())[0].dispatch).toEqual(result.dispatch);
  expect(await dispatchPlanningDelivery(h.options)).toMatchObject({ status: 'bound', dispatch: result.dispatch });
  expect(h.creations).toHaveLength(1);
});
it('recovers an explicitly unsent intent after fresh authority and proposal reads', async () => {
  const h = await setup();
  const reserved = await preparePlanningDispatch({ ...h.options, dispatchProtocol: 'attempt-receipt-v1' });
  expect(reserved.status).toBe('prepared');
  expect(await dispatchPlanningDelivery(h.options)).toMatchObject({ status: 'bound', dispatch: { token: reserved.dispatch.token } });
  expect(h.creations).toHaveLength(1);
  expect(h.searches).toEqual([]);
});
it('issues one first-send permission under concurrent dispatch attempts', async () => {
  const h = await setup();
  await preparePlanningDispatch({ ...h.options, dispatchProtocol: 'attempt-receipt-v1' });
  const outcomes = await Promise.all([dispatchPlanningDelivery(h.options), dispatchPlanningDelivery(h.options)]);
  expect(outcomes.some((result) => result.status === 'bound')).toBe(true);
  expect(h.creations).toHaveLength(1);
  expect((await h.store.list())[0].dispatch.threadId).toBe('actual-worker');
});
it('recovers a canceled intent commit without losing its identity or creating twice', async () => {
  const h = await setup(); const controller = new AbortController();
  const store = { list: () => h.store.list(), mutate: async (...args) => {
    const task = await h.store.mutate(...args);
    if (args[1] === 'dispatch-intent') controller.abort();
    return task;
  } };
  expect(await dispatchPlanningDelivery({ ...h.options, store, signal: controller.signal })).toMatchObject({ status: 'pending' });
  const receipt = (await h.store.list())[0].dispatch;
  expect(receipt.attemptedAt).toBeUndefined();
  expect(h.creations).toEqual([]);
  expect(await dispatchPlanningDelivery(h.options)).toMatchObject({ status: 'bound', dispatch: { token: receipt.token } });
  expect(h.creations).toHaveLength(1);
});
it('never retries an uncertain creation and binds it from the owning service even after withdrawal', async () => {
  const h = await setup(); let attempts = 0;
  expect(await dispatchPlanningDelivery({ ...h.options, createDelivery: async () => { attempts++; throw new Error('Lost response'); } }))
    .toMatchObject({ status: 'pending', dispatch: { attemptedAt: expect.any(Number) } });
  const result = await dispatchPlanningDelivery({ ...h.options, readRequest: async () => ({ status: 'withdrawn' }) });
  expect(result).toMatchObject({ status: 'bound', dispatch: { threadId: 'actual-worker' } });
  expect(attempts).toBe(1); expect(h.creations).toEqual([]); expect(h.searches).toHaveLength(1);
});
it.each(['missing', 'unavailable', 'mismatch', 'stale'])('preserves %s creation uncertainty without replacement', async (kind) => {
  const h = await setup();
  await dispatchPlanningDelivery({ ...h.options, createDelivery: async () => { throw new Error('Uncertain'); } });
  const findDelivery = async (input) => ({ status: kind === 'missing' || kind === 'unavailable' ? kind : 'found',
    ...input, ...(kind === 'mismatch' ? { dispatchToken: 'other-token' } : {}), threadId: 'actual-worker',
    reference: 'owning-task-service', observedAt: kind === 'stale' ? h.now() - 1 : h.tick() });
  expect(await dispatchPlanningDelivery({ ...h.options, findDelivery })).toMatchObject({ status: 'pending' });
  expect(h.creations).toEqual([]); expect((await h.store.list())[0].dispatch.threadId).toBeNull();
});
it('treats legacy intents as uncertain, never as demonstrably unsent', async () => {
  const h = await setup(); const reserved = await preparePlanningDispatch(h.options);
  expect(reserved.dispatch.protocol).toBeUndefined();
  expect(await dispatchPlanningDelivery({ ...h.options, findDelivery: async () => ({ status: 'missing' }) })).toMatchObject({ status: 'pending' });
  expect(h.creations).toEqual([]);
  expect((await h.store.list())[0].dispatch.token).toBe(reserved.dispatch.token);
  await h.act('dispatch-intent', { dispatchProtocol: 'attempt-receipt-v1' });
  expect((await h.store.list())[0].dispatch.protocol).toBeUndefined();
  expect((await h.act('dispatch-attempt', { token: reserved.dispatch.token })).dispatchDecision.action).toBe('reconcile');
});
it('rejects a wrong token and authority predating the last planning read at the send boundary', async () => {
  const h = await setup(); const prepared = await preparePlanningDispatch({ ...h.options, dispatchProtocol: 'attempt-receipt-v1' });
  await expect(h.act('dispatch-attempt', { token: 'wrong-token', authority: { ...h.request.authority, observedAt: h.tick() } }))
    .rejects.toThrow('reserved active intent');
  const authority = { ...h.request.authority, observedAt: h.tick() };
  await h.act('planning-observation', { observation: await h.options.readIssue() });
  await expect(h.act('dispatch-attempt', { token: prepared.dispatch.token, authority }))
    .rejects.toThrow('authority rechecked after current planning');
  expect((await h.store.list())[0].dispatch.attemptedAt).toBeUndefined();
  expect(h.creations).toEqual([]);
});
it('retains a pending client handle and later binds its actual confirmed thread', async () => {
  const h = await setup();
  expect(await dispatchPlanningDelivery({ ...h.options, createDelivery: async () => ({ clientThreadId: 'actual-pending-client' }) }))
    .toMatchObject({ status: 'bound', dispatch: { clientThreadId: 'actual-pending-client', threadId: null } });
  expect(await dispatchPlanningDelivery(h.options)).toMatchObject({ status: 'bound', dispatch: {
    clientThreadId: 'actual-pending-client', threadId: 'actual-worker' } });
  expect(h.creations).toEqual([]);
});
it('latches withdrawal immediately before first send and never calls the worker', async () => {
  const h = await setup(); let reads = 0;
  const readRequest = async () => ++reads < 3 ? h.options.readRequest() : { status: 'withdrawn' };
  expect(await dispatchPlanningDelivery({ ...h.options, readRequest })).toMatchObject({ status: 'pending' });
  expect((await h.store.list())[0].requestRevocation.status).toBe('withdrawn');
  expect(await dispatchPlanningDelivery(h.options)).toMatchObject({ status: 'pending' });
  expect(h.creations).toEqual([]);
});
it('blocks changed brief at the first-send recheck', async () => {
  const h = await setup(); let reads = 0;
  const readRequest = async () => { const result = await h.options.readRequest();
    if (++reads === 3) result.request.brief.acceptanceCriteria = ['Other scope']; return result; };
  expect(await dispatchPlanningDelivery({ ...h.options, readRequest })).toMatchObject({ status: 'pending' });
  expect(h.creations).toEqual([]); expect((await h.store.list())[0].dispatch.attemptedAt).toBeUndefined();
});
it('does not invoke a worker when the durable first-send acknowledgement is lost', async () => {
  const h = await setup();
  const store = { list: () => h.store.list(), mutate: async (...args) => {
    const task = await h.store.mutate(...args); if (args[1] === 'dispatch-attempt') throw new Error('Lost local acknowledgement'); return task;
  } };
  expect(await dispatchPlanningDelivery({ ...h.options, store })).toMatchObject({ status: 'pending' });
  expect((await h.store.list())[0].dispatch.attemptedAt).toBeGreaterThan(0);
  expect(h.creations).toEqual([]);
  expect(await dispatchPlanningDelivery({ ...h.options, findDelivery: async () => ({ status: 'missing' }) })).toMatchObject({ status: 'pending' });
  expect(h.creations).toEqual([]);
});
it('bounds an unresponsive creation call and reconciles its possible late result instead of retrying', async () => {
  const h = await setup(); const controller = new AbortController(); let resolveCreation; let observedSignal;
  const createDelivery = (_input, { signal }) => { observedSignal = signal; controller.abort();
    return new Promise((resolve) => { resolveCreation = resolve; }); };
  expect(await dispatchPlanningDelivery({ ...h.options, createDelivery, signal: controller.signal })).toMatchObject({ status: 'pending' });
  expect(observedSignal.aborted).toBe(true);
  resolveCreation({ threadId: 'actual-worker' });
  expect(await dispatchPlanningDelivery(h.options)).toMatchObject({ status: 'bound' });
  expect(h.creations).toEqual([]);
});
it('preserves bind acknowledgement through cancellation during the local commit', async () => {
  const h = await setup(); const controller = new AbortController();
  const store = { list: () => h.store.list(), mutate: async (...args) => {
    const task = await h.store.mutate(...args); if (args[1] === 'bind') controller.abort(); return task;
  } };
  expect(await dispatchPlanningDelivery({ ...h.options, store, signal: controller.signal })).toMatchObject({ status: 'bound', canceled: true });
  expect((await h.store.list())[0].dispatch.threadId).toBe('actual-worker');
});
it('requires existing measured resource allocation and binds the same reservation to first send', async () => {
  const h = await setup({ bounded: true });
  await h.act('planning-observation', { observation: await h.options.readIssue() });
  await h.act('resource-usage', { usage: { modelTokens: 0, toolCalls: 0, reference: 'actual-usage', observedAt: h.tick() } });
  expect(await dispatchPlanningDelivery(h.options)).toMatchObject({ status: 'blocked' });
  const reservation = await h.act('reserve-resources', { event: 'worker-creation', modelTokens: 100, toolCalls: 1 });
  const resourceToken = reservation.resourceDecision.reservation.token;
  expect(await dispatchPlanningDelivery({ ...h.options, resourceToken })).toMatchObject({ status: 'bound', dispatch: { resourceToken } });
  expect((await h.store.list())[0].resources.reservations).toMatchObject([{ operation: 'dispatch', token: resourceToken }]);
});
it('rejects pre-cancellation and foreign ownership without creation or search', async () => {
  const h = await setup(); const controller = new AbortController(); controller.abort();
  expect(await dispatchPlanningDelivery({ ...h.options, signal: controller.signal })).toMatchObject({ status: 'blocked' });
  expect(await dispatchPlanningDelivery({ ...h.options, owner: 'other-owner' })).toMatchObject({ status: 'blocked' });
  expect(h.creations).toEqual([]); expect(h.searches).toEqual([]);
});
