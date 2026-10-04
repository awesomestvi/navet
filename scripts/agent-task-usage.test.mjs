import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { AgentTaskStore } from './agent-task-store.mjs';
import { createTaskUsageReader } from './agent-task-usage.mjs';
import { createPlanningBinding } from './agent-planning-scope.mjs';
import { monitorPlanningWorker } from './agent-worker-monitor.mjs';

const directories = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });
async function setup() {
  const directory = await mkdtemp(path.join(tmpdir(), 'navet-task-usage-')); directories.push(directory);
  let time = 1_700_000_000_000; const now = () => time; const tick = () => ++time;
  const store = new AgentTaskStore(path.join(directory, 'store'), { now });
  const issue = { uuid: 'proposal', teamId: 'team', projectId: 'project', title: 'Proposal', description: 'Selected delivery scope',
    attachments: [], labels: ['Approved'], archivedAt: null, canceledAt: null };
  const planningBinding = createPlanningBinding(issue);
  const authority = { actor: 'human', reference: 'accepted-request', revision: 'scope', planningRevision: planningBinding.revision, observedAt: tick() };
  const request = { source: 'human-source', requestId: 'request', mode: 'implement', revision: 'scope', authority, planningBinding,
    brief: { selectedOption: 'Bound execution', permittedChanges: ['Respect budgets'], visibility: 'public-delivery-approved',
      acceptanceCriteria: ['Respect whole-task budgets'] }, resourceLimits: { maxElapsedMs: 100_000, maxModelTokens: 10_000, maxToolCalls: 100 } };
  const task = await store.enqueue(request);
  const act = (action, input = {}) => store.mutate(task.id, action, { owner: 'coordinator', ...input });
  await act('claim', { durationMs: 100_000 });
  await act('planning-observation', { observation: { status: 'available', issue, reference: 'proposal-service', observedAt: tick() } });
  await act('resource-usage', { usage: { modelTokens: 0, toolCalls: 0, reference: 'initial', observedAt: tick() } });
  const reservation = await act('reserve-resources', { event: 'dispatch', modelTokens: 1, toolCalls: 1 });
  const dispatched = await act('dispatch-intent', { authority: { ...authority, observedAt: tick() }, resourceToken: reservation.resourceDecision.reservation.token });
  await act('bind', { token: dispatched.dispatch.token, threadId: 'worker' });
  const identity = { taskId: task.id, dispatchToken: dispatched.dispatch.token, threadId: 'worker', runId: 'worker-turn' };
  const members = ['coordinator', 'worker'].map((threadId) => ({ threadId, runId: threadId + '-turn',
    role: threadId, status: 'running', dedicated: true, sessionFile: path.join(directory, threadId + '.jsonl') }));
  const writeSession = async (member, total = member.role === 'coordinator' ? 100 : 200, options = {}) => {
    const timestamp = options.timestamp ?? now();
    const event = (type, at, payload) => ({ type: 'event_msg', timestamp: new Date(at).toISOString(), payload: { type, ...payload } });
    const records = [ { type: 'session_meta', payload: { id: member.threadId, base_instructions: 'PRIVATE_PROMPT' } },
      event('task_started', timestamp - 10, { turn_id: member.runId }),
      { type: 'response_item', payload: { type: 'custom_tool_call', call_id: 'call', input: 'PRIVATE_ARGUMENT' } },
      event('item_completed', timestamp - 2, { thread_id: member.threadId, item: { type: 'McpToolCall', id: 'nested', result: 'PRIVATE_OUTPUT' } }),
      event('token_count', timestamp - 1, { info: { total_token_usage: { input_tokens: total - 1, output_tokens: 1,
        cached_input_tokens: 0, reasoning_output_tokens: 0, total_tokens: total } } }) ];
    if (member.status === 'stopped') records.push(event('task_complete', timestamp, { turn_id: member.runId }));
    if (options.beforeStart) records.push(event('task_started', timestamp, { turn_id: member.runId + '-next' }));
    await writeFile(member.sessionFile, records.map((record) => JSON.stringify(record)).join('\n') + '\n' + (options.partial ? '{unfinished' : ''));
  };
  await Promise.all(members.map((member) => writeSession(member)));
  const readInventory = async () => ({ status: 'verified', taskId: task.id, dispatchToken: identity.dispatchToken, complete: true,
    reference: 'trusted-runtime-inventory', observedAt: tick(), policy: { status: 'accepted', unit: 'native-observed-operations-v1',
      taskRevision: 'scope', reference: 'accepted-unit-policy' }, members: structuredClone(members) });
  const options = { store, owner: 'coordinator', now, readInventory };
  return { options, store, act, identity, members, writeSession, readInventory, now, tick, issue, request,
    snapshot: async () => (await store.list())[0], advance: (ms) => { time += ms; } };
}
it('sums coordinator and worker native measurements and persists only bounded accounting metadata', async () => {
  const h = await setup(); const result = await createTaskUsageReader(h.options)(h.identity);
  expect(result).toMatchObject({ complete: true, modelTokens: 300, toolCalls: 4, reference: expect.stringMatching(/^task-native-usage:sha256:/) });
  expect(JSON.stringify(result)).not.toContain('sessionFile'); expect(JSON.stringify(result)).not.toContain('PRIVATE_');
  const task = await h.snapshot(); expect(task.resources.accounting.members).toHaveLength(2);
  expect(task.resources.usage.modelTokens).toBe(0);
  await h.act('resource-usage', { usage: { modelTokens: result.modelTokens, toolCalls: result.toolCalls, reference: result.reference, observedAt: result.observedAt } });
  expect((await h.snapshot()).resources.usage.modelTokens).toBe(300);
  expect((await h.snapshot()).resources.reservations[0].settledAt).toBeUndefined();
});
it('retains terminal workers and historical coordinators across coordinator restart', async () => {
  const h = await setup();
  expect((await createTaskUsageReader(h.options)(h.identity)).complete).toBe(true);
  h.members[0].status = 'stopped'; await h.writeSession(h.members[0], 100);
  await h.act('claim', { durationMs: 300_000 }); h.advance(120_000); await h.writeSession(h.members[1], 200);
  h.members.push({ role: 'coordinator', threadId: 'new-coordinator', runId: 'new-turn', status: 'running', dedicated: true,
    sessionFile: path.join(path.dirname(h.members[0].sessionFile), 'new-coordinator.jsonl') });
  await h.writeSession(h.members[2], 50);
  const restarted = createTaskUsageReader({ ...h.options, store: new AgentTaskStore(h.store.directory, { now: h.now }) });
  const result = await restarted(h.identity);
  expect(result).toMatchObject({ complete: true, modelTokens: 350, toolCalls: 6 });
  await h.writeSession(h.members[2], 1000);
  h.members.splice(0, 1);
  expect(await createTaskUsageReader(h.options)(h.identity)).toMatchObject({ complete: false });
  expect((await h.snapshot()).resources.accounting.members).toHaveLength(3);
});
it('persists final participant totals after all participants stop and the store reopens', async () => {
  const h = await setup();
  await createTaskUsageReader(h.options)(h.identity);
  for (const member of h.members) {
    member.status = 'stopped';
    await h.writeSession(member, member.role === 'coordinator' ? 125 : 225);
  }
  h.advance(120_000); await h.act('claim', { durationMs: 100_000 });
  const readInventory = async () => ({ ...await h.readInventory(), phase: 'stopped' });
  const restarted = new AgentTaskStore(h.store.directory, { now: h.now });
  const result = await createTaskUsageReader({ ...h.options, store: restarted, readInventory })(h.identity);
  expect(result).toMatchObject({ complete: true, modelTokens: 350, toolCalls: 4 });
  const task = (await restarted.list())[0];
  expect(task.resources.accounting.phase).toBe('stopped');
  expect(task.resources.accounting.members).toHaveLength(2);
  expect(task.resources.accounting.members.every((member) => member.status === 'stopped')).toBe(true);
  expect(task.resources.reservations[0].settledAt).toBeUndefined();
  expect(task.state).toBe('queued');
});
it.each(['implicit-active', 'running-worker', 'missing-terminal', 'unknown-phase'])('rejects invalid final inventory: %s', async (kind) => {
  const h = await setup();
  for (const member of h.members) { member.status = 'stopped'; await h.writeSession(member); }
  if (kind === 'running-worker') { h.members[1].status = 'running'; await h.writeSession(h.members[1]); }
  if (kind === 'missing-terminal') await h.writeSession({ ...h.members[1], status: 'running' });
  const readInventory = async () => ({ ...await h.readInventory(),
    ...(kind === 'implicit-active' ? {} : { phase: kind === 'unknown-phase' ? 'unknown' : 'stopped' }) });
  expect(await createTaskUsageReader({ ...h.options, readInventory })(h.identity)).toMatchObject({ complete: false });
  expect((await h.snapshot()).resources.accounting).toBeUndefined();
});
it('does not let a caller mark a running participant ledger as stopped', async () => {
  const h = await setup();
  await createTaskUsageReader(h.options)(h.identity);
  const accounting = (await h.snapshot()).resources.accounting;
  await expect(h.act('resource-accounting', { accounting: { ...accounting, phase: 'stopped', observedAt: h.tick() } }))
    .rejects.toThrow(/complete bound participant/);
  expect((await h.snapshot()).resources.accounting.phase).toBe('active');
});
it.each(['missing-worker', 'duplicate', 'shared', 'wrong-run', 'unaccepted', 'unknown-unit', 'incomplete', 'stale'])('rejects %s inventory', async (kind) => {
  const h = await setup();
  const readInventory = async () => {
    const value = await h.readInventory();
    if (kind === 'missing-worker') value.members.pop();
    if (kind === 'duplicate') value.members.push(value.members[1]);
    if (kind === 'shared') value.members[0].dedicated = false;
    if (kind === 'wrong-run') value.members[1].runId = 'wrong';
    if (kind === 'unaccepted') value.policy.status = 'proposed';
    if (kind === 'unknown-unit') value.policy.unit = 'api-price';
    if (kind === 'incomplete') value.complete = false;
    if (kind === 'stale') value.observedAt = h.now() - 2;
    return value;
  };
  expect(await createTaskUsageReader({ ...h.options, readInventory })(h.identity)).toMatchObject({ complete: false });
  expect((await h.snapshot()).resources.accounting).toBeUndefined();
});
it.each(['stale', 'partial', 'foreign', 'unstarted-usage'])('rejects %s native coverage without inventing zero usage', async (kind) => {
  const h = await setup(); const worker = h.members[1];
  if (kind === 'foreign') await h.writeSession({ ...worker, threadId: 'foreign' });
  else await h.writeSession(worker, 200, { timestamp: kind === 'stale' ? h.now() - 120_000 : h.now(), partial: kind === 'partial', beforeStart: kind === 'unstarted-usage' });
  if (kind === 'unstarted-usage') { worker.runId += '-next'; h.identity.runId = worker.runId; }
  const result = await createTaskUsageReader(h.options)(h.identity);
  expect(result).toMatchObject({ complete: false }); expect(result).not.toHaveProperty('modelTokens');
});
it('rejects inventory changes around session reads and per-member counter regression despite growing aggregate totals', async () => {
  const h = await setup(); let reads = 0;
  expect(await createTaskUsageReader({ ...h.options, readInventory: async () => {
    const result = await h.readInventory(); if (++reads === 2) result.members[1].runId = 'successor'; return result;
  } })(h.identity)).toMatchObject({ complete: false });
  await createTaskUsageReader(h.options)(h.identity);
  await h.writeSession(h.members[0], 1000); await h.writeSession(h.members[1], 100);
  expect(await createTaskUsageReader(h.options)(h.identity)).toMatchObject({ complete: false });
  expect((await h.snapshot()).resources.accounting.members.find((member) => member.threadId === 'worker').modelTokens).toBe(200);
});
it('preserves a committed participant ledger through cancellation but never returns a usable incomplete measurement', async () => {
  const h = await setup(); const controller = new AbortController();
  const store = { list: () => h.store.list(), mutate: async (...args) => { const task = await h.store.mutate(...args); controller.abort(); return task; } };
  const result = await createTaskUsageReader({ ...h.options, store })(h.identity, { signal: controller.signal });
  expect(result).toMatchObject({ complete: false, accountingReference: expect.any(String) });
  expect((await h.snapshot()).resources.accounting.members).toHaveLength(2);
});
it('rejects foreign leases and pre-cancellation and bounds an unresponsive inventory', async () => {
  const h = await setup(); const controller = new AbortController(); controller.abort();
  expect(await createTaskUsageReader(h.options)(h.identity, { signal: controller.signal })).toMatchObject({ complete: false });
  expect(await createTaskUsageReader({ ...h.options, owner: 'foreign' })(h.identity)).toMatchObject({ complete: false });
  expect(await createTaskUsageReader({ ...h.options, maxReadMs: 20, readInventory: async () => new Promise(() => {}) })(h.identity)).toMatchObject({ complete: false });
});
it('feeds real native totals to the durable worker monitor and invalidates cached usage on coverage loss', async () => {
  const h = await setup(); let stopped = false;
  const readUsage = createTaskUsageReader(h.options);
  const options = { store: h.store, owner: 'coordinator', taskId: h.identity.taskId, now: h.now, maxStopAttempts: 2, readUsage,
    readRequest: async () => ({ status: 'authorized', request: { ...h.request, authority: { ...h.request.authority, observedAt: h.tick() } } }),
    readIssue: async () => ({ status: 'available', issue: h.issue, reference: 'proposal', observedAt: h.tick() }),
    readWorker: async () => ({ ...h.identity, status: stopped ? 'stopped' : 'running', reference: 'runtime', observedAt: h.tick(),
      ...(stopped ? { checkpoint: { reference: 'saved', head: null, nextAction: 'Review inventory' } } : {}) }),
    interruptWorker: async () => { stopped = true; } };
  expect(await monitorPlanningWorker(options)).toMatchObject({ status: 'within-policy' });
  expect((await h.snapshot()).resources.usage).toMatchObject({ modelTokens: 300, toolCalls: 4 });
  h.members.pop();
  expect(await monitorPlanningWorker(options)).toMatchObject({ status: 'stopped', stop: { reason: 'usage-unverified' } });
  expect((await h.snapshot()).resources.unavailable).toBeDefined();
  expect((await h.snapshot()).resources.usage.modelTokens).toBe(300);
});
it('rejects measurement-time rollback even when cumulative counters are unchanged', async () => {
  const h = await setup(); await createTaskUsageReader(h.options)(h.identity);
  await h.writeSession(h.members[0], 1000);
  await h.writeSession(h.members[1], 200, { timestamp: h.now() - 5 });
  expect(await createTaskUsageReader(h.options)(h.identity)).toMatchObject({ complete: false });
});
it('withholds a complete result when active counters age during local acknowledgement', async () => {
  const h = await setup();
  await Promise.all(h.members.map((member) => h.writeSession(member, undefined, { timestamp: h.now() - 59_000 })));
  const store = { list: () => h.store.list(), mutate: async (...args) => {
    const result = await h.store.mutate(...args); h.advance(2000); return result;
  } };
  expect(await createTaskUsageReader({ ...h.options, store, maxReadMs: 60_000 })(h.identity))
    .toMatchObject({ complete: false, accountingReference: expect.any(String) });
});
