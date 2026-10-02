import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { hostname, tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AgentTaskStore } from './agent-task-store.mjs';

const directories = [];
async function setup(options = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'navet-agent-state-'));
  directories.push(directory);
  let now = 1_000_000;
  const store = new AgentTaskStore(directory, { now: () => now, ...options });
  const request = {
    source: 'github:issue:42', requestId: 'event:123', mode: 'implement', revision: 'scope-v1',
    authority: { actor: 'maintainer', reference: 'verified-event', observedAt: now },
    brief: { acceptanceCriteria: ['Settings survive save and reopen.'] }, requiredGates: ['ci', 'visual'],
  };
  const task = await store.enqueue(request);
  const owner = 'coordinator-thread';
  const claim = () => store.mutate(task.id, 'claim', { owner, durationMs: 100_000 });
  const act = (action, input = {}) => store.mutate(task.id, action, { owner,
    ...(action === 'dispatch-intent' ? { authority: { ...request.authority, revision: request.revision } } : {}), ...input });
  const evidence = (gate, head = 'sha-a', result = 'pass') => act('evidence', {
    evidence: { gate, head, revision: request.revision, result, artifact: `verified:${gate}`, observedAt: now },
  });
  return { directory, store, request, task, owner, claim, act, evidence, advance: (delta) => { now += delta; } };
}
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

describe('durable agent task lifecycle', () => {
  it('atomically deduplicates concurrent intake and rejects changed scope under the same request', async () => {
    const { store, request, directory } = await setup();
    const other = new AgentTaskStore(directory, { now: () => 1_000_000 });
    const entries = await Promise.all(Array.from({ length: 10 }, (_, index) =>
      (index % 2 ? store : other).enqueue(request)));
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(1);
    expect(await store.list()).toHaveLength(1);
    await expect(store.enqueue({ ...request, revision: 'scope-v2' })).rejects.toThrow('different scope');
    expect((await stat(path.join(directory, 'tasks.json'))).mode & 0o777).toBe(0o600);
  });

  it('preserves dispatch intent across restart and distinguishes pending setup from a delivery handle', async () => {
    const { store, directory, task, owner, claim, act } = await setup();
    await claim();
    const intent = await act('dispatch-intent');
    const resumed = new AgentTaskStore(directory, { now: () => 1_000_001 });
    const reconciled = await resumed.mutate(task.id, 'dispatch-intent', { owner });
    expect(reconciled.dispatch.token).toBe(intent.dispatch.token);
    expect(intent.nextDispatchAction).toBe('create');
    expect(reconciled.nextDispatchAction).toBe('reconcile');
    await act('bind', { token: intent.dispatch.token, clientThreadId: 'pending-worktree' });
    await act('transition', { state: 'investigating', reason: 'Accepted request.' });
    await act('transition', { state: 'verifying', reason: 'Investigated.' });
    await expect(act('transition', { state: 'awaiting-approval', reason: 'Ready.' })).rejects.toThrow('Confirmed delivery');
    await expect(act('bind', { token: 'forged', threadId: 'thread' })).rejects.toThrow('Wrong dispatch');
    expect((await store.list())[0].dispatch.threadId).toBeNull();
  });

  it('requires fresh terminal or missing handle evidence before reclaiming an expired owner', async () => {
    const { store, task, owner, claim, advance } = await setup();
    await claim();
    advance(100_001);
    const input = { owner: 'another-coordinator', durationMs: 1000 };
    await expect(store.mutate(task.id, 'claim', input)).rejects.toThrow('fresh owner');
    await expect(store.mutate(task.id, 'claim', { ...input, observation: { owner, status: 'running', observedAt: 1_100_001 } })).rejects.toThrow('fresh owner');
    await expect(store.mutate(task.id, 'claim', { ...input, observation: { owner, status: 'missing' } })).rejects.toThrow('fresh owner');
    expect((await store.mutate(task.id, 'claim', { ...input, observation: { owner, status: 'terminal', observedAt: 1_100_001 } })).lease.owner).toBe(input.owner);
  });

  it('invalidates readiness on a new head and prevents failing or missing evidence from passing', async () => {
    const { task, claim, act, evidence } = await setup();
    await claim();
    const intent = await act('dispatch-intent');
    await act('bind', { token: intent.dispatch.token, threadId: 'delivery-thread' });
    await act('head', { head: 'sha-a' });
    await act('transition', { state: 'investigating', reason: 'Start.' });
    await act('transition', { state: 'verifying', reason: 'Checks.' });
    await evidence('ci'); await evidence('visual');
    await expect(act('transition', { state: 'awaiting-approval', reason: 'Review.' })).rejects.toThrow('incomplete');
    await evidence('output'); await evidence('ci', 'sha-a', 'fail');
    await expect(act('transition', { state: 'awaiting-approval', reason: 'Review.' })).rejects.toThrow('incomplete');
    await evidence('ci');
    expect((await act('transition', { state: 'awaiting-approval', reason: 'Review.' })).state).toBe('awaiting-approval');
    expect((await act('head', { head: 'sha-b' })).state).toBe('verifying');
    await expect(evidence('ci', 'sha-a')).rejects.toThrow('different head');
    await expect(act('transition', { state: 'awaiting-approval', reason: 'Old checks.' })).rejects.toThrow('incomplete');
    expect(task.head).toBeNull();
  });

  it('retains failure evidence and rejects automatic completion of implementation without acceptance', async () => {
    const { store, claim, act, evidence } = await setup();
    await claim();
    const intent = await act('dispatch-intent');
    await act('bind', { token: intent.dispatch.token, threadId: 'delivery-thread' });
    await act('head', { head: 'sha-a' });
    await act('transition', { state: 'investigating', reason: 'Start.' });
    await act('transition', { state: 'verifying', reason: 'Check.' });
    await evidence('ci', 'sha-a', 'fail'); await evidence('ci'); await evidence('visual'); await evidence('output');
    await expect(act('transition', { state: 'delivered', reason: 'Done.' })).rejects.toThrow('maintainer acceptance');
    const record = (await store.list())[0];
    expect(record.state).toBe('verifying');
    expect(record.history.some((item) => item.evidence?.result === 'fail')).toBe(true);
  });

  it('bounds active work and repeated repairs', async () => {
    const { store, request, claim, act } = await setup();
    await claim();
    const second = await store.enqueue({ ...request, requestId: 'event:124' });
    await expect(store.mutate(second.id, 'claim', { owner: 'second', durationMs: 1000 })).rejects.toThrow('budget');
    await act('transition', { state: 'investigating', reason: 'Start.' });
    await act('transition', { state: 'retryable-failure', reason: 'External failure.' });
    await act('transition', { state: 'investigating', reason: 'Retry.', maxRetries: 1 });
    await act('transition', { state: 'retryable-failure', reason: 'Still failing.' });
    await expect(act('transition', { state: 'investigating', reason: 'Retry.', maxRetries: 1 })).rejects.toThrow('exhausted');
    await expect(act('transition', { state: 'investigating', reason: 'Raise limit.', maxRetries: 2 })).rejects.toThrow('changed');
    expect((await act('transition', { state: 'terminal-failure', reason: 'Budget exhausted.' })).state).toBe('terminal-failure');
  });

  it('keeps uncertain or running delivery capacity reserved after coordinator lease expiry', async () => {
    const { store, request, task, claim, act, advance } = await setup();
    await claim();
    await act('dispatch-intent');
    const second = await store.enqueue({ ...request, requestId: 'next' });
    advance(100_001);
    await expect(store.mutate(second.id, 'claim', { owner: 'next', durationMs: 1000 })).rejects.toThrow('budget');
    expect((await store.list()).find((entry) => entry.id === task.id).dispatch.threadId).toBeNull();
  });

  it('rechecks authority before creating intent and preserves recovery context across restart', async () => {
    const { store, directory, task, owner, claim, act } = await setup();
    await claim();
    await expect(store.mutate(task.id, 'dispatch-intent', { owner })).rejects.toThrow('rechecked authority');
    await expect(act('dispatch-intent', { authority: { actor: 'maintainer', reference: 'verified-event', revision: 'different', observedAt: 1_000_000 } })).rejects.toThrow('rechecked authority');
    await expect(act('dispatch-intent', { authority: { actor: 'maintainer', reference: 'verified-event', revision: 'scope-v1', observedAt: 1 } })).rejects.toThrow('rechecked authority');
    expect((await store.list())[0].dispatch).toBeNull();
    await act('context', { context: { branch: 'feature/repair', worktree: '/tmp/worktree', nextAction: 'Verify persistence', unresolvedQuestions: ['Confirm reported browser'] } });
    const restarted = new AgentTaskStore(directory, { now: () => 1_000_001 });
    expect((await restarted.list()).find((entry) => entry.id === task.id).context.branch).toBe('feature/repair');
  });

  it('recovers a dead process lock, preserves a live lock, and fails closed on corrupt state', async () => {
    const { store, directory } = await setup({ lockTimeoutMs: 40 });
    await writeFile(path.join(directory, 'tasks.lock'), JSON.stringify({ pid: 2_147_483_647, host: hostname() }));
    expect(await store.list()).toHaveLength(1);
    await writeFile(path.join(directory, 'tasks.lock'), JSON.stringify({ pid: process.pid, host: hostname() }));
    await expect(store.list()).rejects.toThrow('locked');
    await rm(path.join(directory, 'tasks.lock'));
    await writeFile(path.join(directory, 'tasks.json'), '{broken');
    await expect(store.list()).rejects.toThrow();
    expect(await readFile(path.join(directory, 'tasks.json'), 'utf8')).toBe('{broken');
  });
});
