import { expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createCodexWorkerAdapter } from './agent-codex-worker.mjs';
import { AgentTaskStore } from './agent-task-store.mjs';
import { createPlanningBinding } from './agent-planning-scope.mjs';
import { monitorPlanningWorker } from './agent-worker-monitor.mjs';

const binding = { taskId: 'task', dispatchToken: 'dispatch', threadId: 'thread' };
function setup() {
  let time = 1_700_000_000_000;
  let turn = { id: 'turn-a', status: 'inProgress', itemsView: 'notLoaded', items: [] };
  const tick = () => ++time;
  const calls = [];
  const options = { binding, now: () => time, request: async (method, params) => {
    calls.push({ method, params }); tick();
    if (method === 'thread/read') return { thread: { id: 'thread', status: { type: turn.status === 'inProgress' ? 'active' : 'idle' },
      preview: 'Private task text never returned', turns: [] } };
    if (method === 'thread/turns/list') return { data: [structuredClone(turn)], nextCursor: 'older-history' };
    if (method === 'turn/interrupt') { turn.status = 'interrupted'; return {}; }
    throw new Error('Unexpected method');
  }, readCheckpoint: async (identity) => ({ status: 'verified', ...identity, observedAt: tick(), head: 'a'.repeat(40),
    reference: 'checkpoint-service', nextAction: 'Review worktree', prompt: 'private' }) };
  return { options, calls, tick, setTurn: (value) => { turn = { ...turn, ...value }; } };
}
it('reads only latest-turn metadata and returns an exact redacted worker identity', async () => {
  const h = setup();
  const result = await createCodexWorkerAdapter(h.options).readWorker(binding);
  expect(result).toMatchObject({ ...binding, runId: 'turn-a', status: 'running', reference: expect.stringMatching(/^codex-app-server:sha256:/) });
  expect(h.calls).toEqual(Array.from({ length: 2 }, () => [
    { method: 'thread/read', params: { threadId: 'thread', includeTurns: false } },
    { method: 'thread/turns/list', params: { threadId: 'thread', sortDirection: 'desc', limit: 1, itemsView: 'notLoaded' } },
  ]).flat());
  expect(JSON.stringify(result)).not.toContain('Private');
});
it.each(['completed', 'interrupted', 'failed'])('verifies checkpoint separately for a %s run', async (status) => {
  const h = setup(); h.setTurn({ status });
  expect(await createCodexWorkerAdapter(h.options).readWorker(binding)).toMatchObject({ status: 'stopped', runId: 'turn-a',
    checkpoint: { reference: 'checkpoint-service', head: 'a'.repeat(40), nextAction: 'Review worktree' } });
  expect(h.calls).toHaveLength(8);
});
it.each(['completed', 'interrupted', 'failed'])('reconciles a persisted %s turn after its runtime thread unloads', async (status) => {
  const h = setup(); h.setTurn({ status });
  const request = async (...args) => {
    const result = await h.options.request(...args);
    if (args[0] === 'thread/read') result.thread.status.type = 'notLoaded';
    return result;
  };
  const adapter = createCodexWorkerAdapter({ ...h.options, request });
  expect(await adapter.readWorker(binding)).toMatchObject({ status: 'stopped', runId: 'turn-a', checkpoint: {
    reference: 'checkpoint-service', head: 'a'.repeat(40), nextAction: 'Review worktree' } });
  expect(await adapter.interruptWorker({ ...binding, runId: 'turn-a', stopToken: 'stop-receipt' })).toEqual({ status: 'already-stopped' });
  expect(h.calls.some((call) => call.method === 'turn/interrupt')).toBe(false);
});
it('withholds stopped proof when runtime load status changes during observation', async () => {
  const h = setup(); h.setTurn({ status: 'interrupted' }); let reads = 0;
  const request = async (...args) => {
    const result = await h.options.request(...args);
    if (args[0] === 'thread/read' && ++reads === 1) result.thread.status.type = 'notLoaded';
    return result;
  };
  await expect(createCodexWorkerAdapter({ ...h.options, request }).readWorker(binding)).rejects.toThrow('changed');
});
it.each(['completed', 'interrupted', 'failed'])('reconciles a terminal %s turn in a system-error thread', async (status) => {
  const h = setup(); h.setTurn({ status });
  const request = async (...args) => {
    const result = await h.options.request(...args);
    if (args[0] === 'thread/read') result.thread.status.type = 'systemError';
    return result;
  };
  const adapter = createCodexWorkerAdapter({ ...h.options, request });
  expect(await adapter.readWorker(binding)).toMatchObject({ status: 'stopped', runId: 'turn-a',
    checkpoint: { reference: 'checkpoint-service', head: 'a'.repeat(40), nextAction: 'Review worktree' } });
  expect(await adapter.interruptWorker({ ...binding, runId: 'turn-a', stopToken: 'receipt' })).toEqual({ status: 'already-stopped' });
  expect(h.calls.some((call) => call.method === 'turn/interrupt')).toBe(false);
});
it('withholds a system-error terminal observation that changes during the stable read', async () => {
  const h = setup(); h.setTurn({ status: 'failed' }); let reads = 0;
  const request = async (...args) => {
    const result = await h.options.request(...args);
    if (args[0] === 'thread/read' && ++reads === 1) result.thread.status.type = 'systemError';
    return result;
  };
  await expect(createCodexWorkerAdapter({ ...h.options, request }).readWorker(binding)).rejects.toThrow('changed');
});
it('preserves checkpoint uncertainty for an unloaded terminal turn', async () => {
  const h = setup(); h.setTurn({ status: 'interrupted' });
  const request = async (...args) => {
    const result = await h.options.request(...args);
    if (args[0] === 'thread/read') result.thread.status.type = 'notLoaded';
    return result;
  };
  const result = await createCodexWorkerAdapter({ ...h.options, request, readCheckpoint: async () => ({ status: 'unavailable' }) }).readWorker(binding);
  expect(result).toMatchObject({ status: 'stopped' }); expect(result).not.toHaveProperty('checkpoint');
});
it('targets native interruption by exact turn and makes retries unable to interrupt a successor', async () => {
  const h = setup(); const adapter = createCodexWorkerAdapter(h.options);
  const stop = { ...binding, runId: 'turn-a', stopToken: 'receipt' };
  expect(await adapter.interruptWorker(stop)).toEqual({ status: 'requested' });
  expect(await adapter.interruptWorker(stop)).toEqual({ status: 'already-stopped' });
  h.setTurn({ id: 'turn-b', status: 'inProgress' });
  await expect(adapter.interruptWorker(stop)).rejects.toThrow('no longer');
  expect(h.calls.filter((call) => call.method === 'turn/interrupt')).toEqual([
    { method: 'turn/interrupt', params: { threadId: 'thread', turnId: 'turn-a' } },
  ]);
});
it('rejects a turn changing between snapshots', async () => {
  const h = setup(); let reads = 0;
  const request = async (...args) => {
    if (args[0] === 'thread/turns/list' && ++reads === 2) h.setTurn({ id: 'replacement' });
    return h.options.request(...args);
  };
  await expect(createCodexWorkerAdapter({ ...h.options, request }).readWorker(binding)).rejects.toThrow('changed');
});
it.each(['notLoaded', 'systemError', 'foreign', 'contradiction', 'items', 'missing'])('rejects %s runtime evidence', async (kind) => {
  const h = setup();
  const request = async (...args) => {
    const result = await h.options.request(...args);
    if (args[0] === 'thread/read') {
      if (['notLoaded', 'systemError'].includes(kind)) result.thread.status.type = kind;
      if (kind === 'foreign') result.thread.id = 'other-thread';
      if (kind === 'contradiction') result.thread.status.type = 'idle';
    }
    if (args[0] === 'thread/turns/list') {
      if (kind === 'items') result.data[0].items = [{ text: 'Private text' }];
      if (kind === 'missing') result.data = [];
    }
    return result;
  };
  await expect(createCodexWorkerAdapter({ ...h.options, request }).readWorker(binding)).rejects.toThrow();
});
it.each(['foreign', 'stale', 'malformed-head', 'unavailable'])('does not preserve an unverified %s checkpoint', async (kind) => {
  const h = setup(); h.setTurn({ status: 'interrupted' });
  const readCheckpoint = async (identity) => ({ status: kind === 'unavailable' ? 'unavailable' : 'verified', ...identity,
    ...(kind === 'foreign' ? { runId: 'other-turn' } : {}), observedAt: kind === 'stale' ? 1 : h.tick(),
    head: kind === 'malformed-head' ? 'short' : null, reference: 'saved', nextAction: 'Review' });
  const result = await createCodexWorkerAdapter({ ...h.options, readCheckpoint }).readWorker(binding);
  expect(result.status).toBe('stopped'); expect(result).not.toHaveProperty('checkpoint');
});
it('rejects a resumed worker during checkpoint verification', async () => {
  const h = setup(); h.setTurn({ status: 'interrupted' });
  const readCheckpoint = async (identity) => {
    const result = await h.options.readCheckpoint(identity); h.setTurn({ id: 'next', status: 'inProgress' }); return result;
  };
  await expect(createCodexWorkerAdapter({ ...h.options, readCheckpoint }).readWorker(binding)).rejects.toThrow('resumed');
});
it('pins an immutable binding and rejects foreign identity before any RPC', async () => {
  const h = setup(); const configured = { ...binding };
  const adapter = createCodexWorkerAdapter({ ...h.options, binding: configured }); configured.threadId = 'other';
  await expect(adapter.readWorker(configured)).rejects.toThrow('Foreign'); expect(h.calls).toEqual([]);
  expect(await adapter.readWorker(binding)).toMatchObject({ threadId: 'thread' });
});
it('bounds an unresponsive runtime and rejects pre-cancellation', async () => {
  const h = setup();
  const adapter = createCodexWorkerAdapter({ ...h.options, maxReadMs: 20, request: async () => new Promise(() => {}) });
  await expect(adapter.readWorker(binding)).rejects.toThrow('Canceled');
  const controller = new AbortController(); controller.abort();
  await expect(createCodexWorkerAdapter(h.options).readWorker(binding, { signal: controller.signal })).rejects.toThrow('Expired');
  expect(h.calls).toEqual([]);
});
it('connects native exact-turn interruption to the durable monitor and verified checkpoint receipt', async () => {
  const h = setup(); const directory = await mkdtemp(path.join(tmpdir(), 'navet-native-monitor-'));
  try {
    const store = new AgentTaskStore(directory, { now: h.options.now });
    const issue = { uuid: 'proposal', teamId: 'team', projectId: 'project', title: 'Proposal', description: 'Selected scope', attachments: [],
      labels: ['Approved'], archivedAt: null, canceledAt: null };
    const planningBinding = createPlanningBinding(issue);
    const authority = { actor: 'human', reference: 'verified-decision', revision: 'scope', planningRevision: planningBinding.revision, observedAt: h.tick() };
    const task = await store.enqueue({ source: 'human-source', requestId: 'request', mode: 'implement', revision: 'scope',
      authority, planningBinding, requiredGates: ['quality'], brief: { selectedOption: 'Repair setting',
        permittedChanges: ['Fix persistence'], visibility: 'public-delivery-approved', acceptanceCriteria: ['Value persists'] } });
    const act = (action, input = {}) => store.mutate(task.id, action, { owner: 'coordinator', ...input });
    await act('claim', { durationMs: 60_000 });
    await act('planning-observation', { observation: { status: 'available', issue, reference: 'proposal-service', observedAt: h.tick() } });
    const dispatched = await act('dispatch-intent', { authority: { ...authority, observedAt: h.tick() } });
    await act('bind', { token: dispatched.dispatch.token, threadId: 'thread' });
    await act('request-revocation', { observation: { status: 'withdrawn', source: 'human-source', requestId: 'request',
      reference: authority.reference, observedAt: h.tick() } });
    let unloaded = false; let checkpointAvailable = false;
    const request = async (...args) => {
      const result = await h.options.request(...args);
      if (args[0] === 'turn/interrupt') unloaded = true;
      if (args[0] === 'thread/read' && unloaded) result.thread.status.type = 'notLoaded';
      return result;
    };
    const adapter = createCodexWorkerAdapter({ ...h.options, request,
      readCheckpoint: async (...args) => checkpointAvailable ? h.options.readCheckpoint(...args) : { status: 'unavailable' },
      binding: { taskId: task.id, dispatchToken: dispatched.dispatch.token, threadId: 'thread' } });
    const options = { ...adapter, store, owner: 'coordinator', taskId: task.id,
      now: h.options.now, maxStopAttempts: 2, readRequest: async () => { throw new Error('Not needed after revocation'); },
      readIssue: async () => { throw new Error('Not needed after revocation'); }, readUsage: async () => { throw new Error('Not needed after revocation'); } };
    const pending = await monitorPlanningWorker(options);
    expect(pending).toMatchObject({ status: 'pending', stop: { attempts: 1 } });
    checkpointAvailable = true;
    const result = await monitorPlanningWorker({ ...options, store: new AgentTaskStore(directory, { now: h.options.now }) });
    expect(result).toMatchObject({ status: 'stopped', stop: { runId: 'turn-a', reason: 'request-withdrawn', attempts: 1,
      token: pending.stop.token,
      checkpoint: { reference: 'checkpoint-service', head: 'a'.repeat(40), nextAction: 'Review worktree' } } });
    expect((await store.list())[0].workerStop).toEqual(result.stop);
    expect(h.calls.filter((call) => call.method === 'turn/interrupt')).toHaveLength(1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
