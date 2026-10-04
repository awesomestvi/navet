import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { runTeamAccounting, validateTeamAccounting } from './agent-team-accounting.mjs';
import { AgentTaskStore, resourceStatus } from './agent-task-store.mjs';
import { createPlanningBinding } from './agent-planning-scope.mjs';

const directories = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });
async function setup() {
  const directory = await mkdtemp(path.join(tmpdir(), 'navet-team-accounting-')); directories.push(directory);
  let time = 1_700_000_000_000;
  const now = () => time;
  const tick = () => ++time;
  const task = { id: 'task', revision: 'scope', lease: { owner: 'coordinator', expiresAt: time + 300_000 },
    resources: { reservations: [{ token: 'worker-reservation', event: 'arbitrary-worker-allocation', operation: 'team-worker:intent', reservedAt: time - 20 },
      { token: 'ticket-reservation', event: 'question-write', operation: 'team-ticket:update', reservedAt: time - 20 },
      { token: 'other-reservation', event: 'other', reservedAt: time - 20 }] },
    team: { plan: { revision: 'plan' }, workers: [{ intentId: 'intent', workerId: 'worker', status: 'running', attemptedAt: time - 20 }],
      updates: [{ updateId: 'update', status: 'verified', observation: { observedAt: time - 10 } }] } };
  const calls = [];
  const store = { list: async () => [structuredClone(task)], mutate: async (id, action, input) => {
    if (action === 'resource-unavailable') { task.resources.unavailable = structuredClone(input.observation); return structuredClone(task); }
    calls.push({ id, action, input: structuredClone(input) });
    if (id !== task.id || action !== 'team-accounting') throw new Error('Unexpected mutation.');
    validateTeamAccounting(task, input, now());
    task.resources.accounting = structuredClone(input.accounting); task.resources.usage = structuredClone(input.usage);
    for (const reservation of task.resources.reservations) if (input.settledReservations.includes(reservation.token)) reservation.settledAt = input.usage.observedAt;
    return structuredClone(task);
  } };
  const members = ['coordinator', 'worker'].map((threadId) => ({ role: threadId, threadId, runId: threadId + '-turn',
    status: 'running', dedicated: true, sessionFile: path.join(directory, threadId + '.jsonl'),
    ...(threadId === 'worker' ? { workerId: 'worker', intentId: 'intent' } : {}) }));
  const writeSession = async (member, total = member.role === 'coordinator' ? 100 : 200, options = {}) => {
    const timestamp = options.timestamp ?? now();
    const event = (type, at, payload) => ({ type: 'event_msg', timestamp: new Date(at).toISOString(), payload: { type, ...payload } });
    const records = [{ type: 'session_meta', payload: { id: member.threadId, base_instructions: 'PRIVATE_PROMPT' } },
      event('task_started', timestamp - 10, { turn_id: member.runId }),
      { type: 'response_item', payload: { type: 'custom_tool_call', call_id: 'call', input: 'PRIVATE_ARGUMENT' } },
      event('token_count', timestamp - 1, { info: { total_token_usage: { input_tokens: total - 1, output_tokens: 1,
        cached_input_tokens: 0, reasoning_output_tokens: 0, total_tokens: total } } })];
    if (member.status === 'stopped') records.push(event('task_complete', timestamp, { turn_id: member.runId }));
    await writeFile(member.sessionFile, records.map((record) => JSON.stringify(record)).join('\n') + '\n' + (options.partial ? '{unfinished' : ''));
  };
  await Promise.all(members.map((member) => writeSession(member)));
  const readTeamInventory = async () => ({ status: 'verified', complete: true, taskId: 'task', revision: 'scope', planRevision: 'plan',
    reference: 'authenticated-inventory', observedAt: tick(), phase: 'active', policy: { status: 'accepted',
      unit: 'native-observed-operations-v1', taskRevision: 'scope', reference: 'accepted-policy' }, members: structuredClone(members) });
  const options = { store, owner: 'coordinator', taskId: 'task', now, adapters: { readTeamInventory } };
  return { options, task, members, calls, writeSession, readTeamInventory, tick, now, advance: (ms) => { time += ms; } };
}
it('atomically records native aggregate usage while retaining active worker reservations', async () => {
  const h = await setup();
  expect(await runTeamAccounting(h.options)).toMatchObject({ status: 'verified', complete: true, modelTokens: 300, toolCalls: 2,
    settledReservations: ['ticket-reservation'] });
  expect(h.calls).toHaveLength(1); expect(h.calls[0].action).toBe('team-accounting');
  expect(h.task.resources.accounting.members).toHaveLength(2);
  expect(h.task.resources.reservations[0].settledAt).toBeUndefined();
  expect(JSON.stringify(h.calls)).not.toContain('PRIVATE_');
});
it('allows coordinator-only accounting before any worker is dispatched', async () => {
  const h = await setup(); h.task.team.workers = []; h.members.pop();
  expect(await runTeamAccounting(h.options)).toMatchObject({ status: 'verified', modelTokens: 100, toolCalls: 1 });
});
it.each(['completed', 'failed', 'missing', 'stopped'])('settles %s owning workers with both native and runtime stopped evidence', async (status) => {
  const h = await setup(); h.members[1].status = 'stopped'; await h.writeSession(h.members[1]);
  h.task.team.workers[0].status = status; h.task.team.workers[0].observation = { observedAt: h.tick() };
  expect(await runTeamAccounting(h.options)).toMatchObject({ status: 'verified', settledReservations: ['worker-reservation', 'ticket-reservation'] });
});
it('retains a running worker reservation even when a native turn stopped', async () => {
  const h = await setup(); h.members[1].status = 'stopped'; await h.writeSession(h.members[1]);
  h.task.team.workers[0].status = 'running'; h.task.team.workers[0].observation = { observedAt: h.tick() };
  expect(await runTeamAccounting(h.options)).toMatchObject({ status: 'verified', settledReservations: ['ticket-reservation'] });
});
it('does not settle worker reservations preceding no owning native measurement', async () => {
  const h = await setup(); h.members[1].status = 'stopped'; await h.writeSession(h.members[1]);
  h.task.team.workers[0].status = 'stopped'; h.task.team.workers[0].observation = { observedAt: h.tick() };
  h.task.resources.reservations[0].reservedAt = h.now();
  expect(await runTeamAccounting(h.options)).toMatchObject({ status: 'verified', settledReservations: ['ticket-reservation'] });
});
it.each(['missing-worker', 'foreign-worker', 'duplicate', 'shared', 'wrong-run', 'unaccepted', 'unknown-unit', 'incomplete', 'stale', 'foreign-plan'])('rejects %s inventory without manufacturing counters', async (kind) => {
  const h = await setup();
  const readTeamInventory = async () => {
    const value = await h.readTeamInventory();
    if (kind === 'missing-worker') value.members.pop();
    if (kind === 'foreign-worker') value.members[1].intentId = 'foreign';
    if (kind === 'duplicate') value.members.push(value.members[1]);
    if (kind === 'shared') value.members[0].dedicated = false;
    if (kind === 'wrong-run') value.members[1].runId = 'wrong';
    if (kind === 'unaccepted') value.policy.status = 'proposed';
    if (kind === 'unknown-unit') value.policy.unit = 'api-price';
    if (kind === 'incomplete') value.complete = false;
    if (kind === 'stale') value.observedAt = h.now() - 2;
    if (kind === 'foreign-plan') value.planRevision = 'foreign';
    return value;
  };
  const result = await runTeamAccounting({ ...h.options, adapters: { readTeamInventory } });
  expect(result).toMatchObject({ status: 'pending', complete: false }); expect(result).not.toHaveProperty('modelTokens'); expect(h.calls).toHaveLength(0);
});
it('blocks accounting until uncertain worker creation has been reconciled', async () => {
  const h = await setup(); delete h.task.team.workers[0].workerId;
  expect(await runTeamAccounting(h.options)).toMatchObject({ complete: false }); expect(h.calls).toHaveLength(0);
});
it.each(['partial', 'stale', 'foreign'])('rejects %s native coverage', async (kind) => {
  const h = await setup(); const worker = h.members[1];
  await h.writeSession(kind === 'foreign' ? { ...worker, threadId: 'foreign' } : worker, 200,
    { timestamp: kind === 'stale' ? h.now() - 120_000 : h.now(), partial: kind === 'partial' });
  expect(await runTeamAccounting(h.options)).toMatchObject({ complete: false }); expect(h.calls).toHaveLength(0);
});
it('rejects changing inventories and team mutations during native reads', async () => {
  const h = await setup(); let reads = 0;
  const adapters = { readTeamInventory: async () => {
    const value = await h.readTeamInventory(); if (++reads === 2) value.members[1].runId = 'successor'; return value;
  } };
  expect(await runTeamAccounting({ ...h.options, adapters })).toMatchObject({ complete: false });
  reads = 0;
  adapters.readTeamInventory = async () => {
    const value = await h.readTeamInventory(); if (++reads === 2) h.task.team.plan.revision = 'successor'; return value;
  };
  expect(await runTeamAccounting({ ...h.options, adapters })).toMatchObject({ complete: false }); expect(h.calls).toHaveLength(0);
});
it('retains all historical participants and rejects one-member regression hidden by aggregate growth', async () => {
  const h = await setup(); expect(await runTeamAccounting(h.options)).toMatchObject({ complete: true });
  h.members[0].status = 'stopped'; await h.writeSession(h.members[0]);
  h.members.push({ role: 'coordinator', threadId: 'successor', runId: 'successor-turn', status: 'running', dedicated: true,
    sessionFile: path.join(path.dirname(h.members[0].sessionFile), 'successor.jsonl') });
  await h.writeSession(h.members[2], 1000); h.task.lease.owner = 'successor';
  expect(await runTeamAccounting({ ...h.options, owner: 'successor' })).toMatchObject({ complete: true, modelTokens: 1300 });
  await h.writeSession(h.members[1], 100); await h.writeSession(h.members[2], 2000);
  expect(await runTeamAccounting({ ...h.options, owner: 'successor' })).toMatchObject({ complete: false });
  h.members.splice(0, 1);
  expect(await runTeamAccounting({ ...h.options, owner: 'successor' })).toMatchObject({ complete: false });
  expect(h.task.resources.accounting.members).toHaveLength(3);
});
it('preserves oldest active counter freshness and accepts final stopped inventory', async () => {
  const h = await setup(); const sourceAt = h.now() - 1; h.advance(59_000);
  expect(await runTeamAccounting(h.options)).toMatchObject({ complete: true, observedAt: sourceAt });
  h.advance(1_001); expect(await runTeamAccounting(h.options)).toMatchObject({ complete: false });
  for (const member of h.members) { member.status = 'stopped'; await h.writeSession(member); }
  h.task.team.workers[0].status = 'stopped'; h.task.team.workers[0].observation = { observedAt: h.tick() };
  const adapters = { readTeamInventory: async () => ({ ...await h.readTeamInventory(), phase: 'stopped' }) };
  expect(await runTeamAccounting({ ...h.options, adapters })).toMatchObject({ complete: true });
  expect(h.task.resources.accounting.phase).toBe('stopped');
});
it('bounds unresponsive inventories, rejects foreign leases and pre-cancellation', async () => {
  const h = await setup(); const controller = new AbortController(); controller.abort();
  expect(await runTeamAccounting({ ...h.options, signal: controller.signal })).toMatchObject({ complete: false });
  expect(await runTeamAccounting({ ...h.options, owner: 'foreign' })).toMatchObject({ complete: false });
  expect(await runTeamAccounting({ ...h.options, maxRunMs: 20,
    adapters: { readTeamInventory: async () => new Promise(() => {}) } })).toMatchObject({ complete: false }); expect(h.calls).toHaveLength(0);
});
it('never returns usable counters after cancellation at the accounting acknowledgement', async () => {
  const h = await setup(); const controller = new AbortController();
  const store = { list: h.options.store.list, mutate: async (...args) => {
    const saved = await h.options.store.mutate(...args); controller.abort(); return saved;
  } };
  const result = await runTeamAccounting({ ...h.options, store, signal: controller.signal });
  expect(result).toMatchObject({ complete: false, invalidation: 'persisted', accountingReference: expect.any(String) });
  expect(result).not.toHaveProperty('modelTokens');
  expect(h.task.resources.accounting.members).toHaveLength(2);
  expect(h.task.resources.unavailable.reference).toBe('team-native-usage-unverified');
});

it.each(['invented-total', 'foreign-settlement', 'running-settlement', 'foreign-member', 'policy-change', 'stale', 'duplicate-settlement'])('store validator rejects %s transaction without changing ledger', async (kind) => {
  const h = await setup(); await runTeamAccounting(h.options);
  const input = structuredClone(h.calls[0].input);
  const before = structuredClone(h.task);
  if (kind === 'invented-total') input.usage.modelTokens++;
  if (kind === 'foreign-settlement') input.settledReservations = ['other-reservation'];
  if (kind === 'running-settlement') input.settledReservations = ['worker-reservation'];
  if (kind === 'foreign-member') input.accounting.members[1].intentId = 'foreign';
  if (kind === 'policy-change') input.accounting.policyReference = 'new-policy';
  if (kind === 'stale') input.accounting.observedAt = h.now() - 60_001;
  if (kind === 'duplicate-settlement') input.settledReservations = ['ticket-reservation', 'ticket-reservation'];
  expect(() => validateTeamAccounting(h.task, input, h.now())).toThrow();
  expect(h.task).toEqual(before);
});

it('integrates native accounting with the real durable store and invalidates cached capacity after inventory loss', async () => {
  const h = await setup(); h.members.pop();
  const directory = await mkdtemp(path.join(tmpdir(), 'navet-team-accounting-store-')); directories.push(directory);
  const store = new AgentTaskStore(directory, { now: h.now });
  const issue = { uuid: 'proposal', teamId: 'team', projectId: 'project', title: 'Proposal', description: 'Approved scope',
    attachments: [], labels: ['Approved'], archivedAt: null, canceledAt: null };
  const binding = createPlanningBinding(issue);
  const task = await store.enqueue({ source: 'human', requestId: 'decision', revision: 'scope', mode: 'implement',
    planningBinding: binding, authority: { actor: 'maintainer', reference: 'decision', revision: 'scope',
      planningRevision: binding.revision, observedAt: h.tick() },
    brief: { selectedOption: 'Accepted change', permittedChanges: ['Bounded team work'], acceptanceCriteria: ['Verified result'],
      visibility: 'public-delivery-approved' },
    resourceLimits: { maxElapsedMs: 100_000, maxModelTokens: 10_000, maxToolCalls: 100 } });
  const act = (action, input = {}) => store.mutate(task.id, action, { owner: 'coordinator', ...input });
  await act('claim', { durationMs: 100_000 });
  await act('planning-observation', { observation: { status: 'available', reference: 'linear:read', issue, observedAt: h.tick() } });
  await act('head', { head: 'head' });
  await act('team-event', { event: { eventId: 'plan', type: 'plan', revision: 'plan', phase: 'delivery', assignments: [
    { id: 'build', role: 'developer', dependsOn: [], files: ['scripts/example.mjs'], brief: { acceptanceCriteria: ['Correct result'] } },
    { id: 'test', role: 'tester', dependsOn: ['build'], files: [], brief: { acceptanceCriteria: ['Verified result'] } },
    { id: 'review', role: 'independent-reviewer', dependsOn: ['test'], files: [], brief: { acceptanceCriteria: ['Independent current-head review'] } },
  ] } });
  await h.writeSession(h.members[0]);
  let inventoryAvailable = true;
  const adapters = { readTeamInventory: async () => ({ ...await h.readTeamInventory(), taskId: task.id,
    complete: inventoryAvailable }) };
  const options = { ...h.options, store, taskId: task.id, adapters };
  expect(await runTeamAccounting(options)).toMatchObject({ complete: true, modelTokens: 100, toolCalls: 1 });
  let saved = (await store.list())[0];
  expect(saved.resources.accounting.members).toHaveLength(1);
  expect(saved.resources.usage.modelTokens).toBe(100);
  expect(resourceStatus(saved, h.now()).measurementFresh).toBe(true);
  inventoryAvailable = false;
  expect(await runTeamAccounting(options)).toMatchObject({ complete: false, invalidation: 'persisted' });
  saved = (await new AgentTaskStore(directory, { now: h.now }).list())[0];
  expect(saved.resources.usage.modelTokens).toBe(100);
  expect(saved.resources.unavailable.reference).toBe('team-native-usage-unverified');
  expect(resourceStatus(saved, h.now()).measurementFresh).toBe(false);
});
it('never settles an allocation merely because its caller-chosen event resembles a worker operation', async () => {
  const h = await setup(); h.task.resources.reservations[0].event = 'team-worker:intent'; delete h.task.resources.reservations[0].operation;
  h.members[1].status = 'stopped'; await h.writeSession(h.members[1]);
  h.task.team.workers[0].status = 'stopped'; h.task.team.workers[0].observation = { observedAt: h.tick() };
  expect(await runTeamAccounting(h.options)).toMatchObject({ complete: true, settledReservations: ['ticket-reservation'] });
});

it('settles only a resumed operation covered by its owning final native incarnation', async () => {
  const h = await setup(); h.members[1].status = 'stopped'; await h.writeSession(h.members[1]);
  const worker = h.task.team.workers[0]; worker.status = 'stopped'; worker.observation = { observedAt: h.tick() };
  worker.resumes = [{ resumeId: 'resume', status: 'running', runId: h.members[1].runId }];
  h.task.resources.reservations.push({ token: 'resume-reservation', event: 'any-allocation', operation: 'team-resume:resume', reservedAt: h.now() - 20 });
  expect(await runTeamAccounting(h.options)).toMatchObject({ complete: true,
    settledReservations: ['worker-reservation', 'ticket-reservation', 'resume-reservation'] });
});
