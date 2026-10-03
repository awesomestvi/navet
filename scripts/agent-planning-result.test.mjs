import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createPlanningBinding } from './agent-planning-scope.mjs';
import { linearResultBodyHash } from './agent-linear-result-reader.mjs';
import { AgentTaskStore } from './agent-task-store.mjs';

const directories = [];
const writerAppUserId = '00000000-0000-4000-8000-000000000003';
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });
async function setup() {
  const directory = await mkdtemp(path.join(tmpdir(), 'navet-planning-result-'));
  directories.push(directory);
  let time = 1_700_000_000_000;
  const now = () => time;
  const issue = { id: 'proposal', teamId: 'team', projectId: 'project', title: 'Selected option',
    description: 'Research the approved journey.', attachments: [], labels: ['Approved'], archivedAt: null, canceledAt: null };
  const planningBinding = createPlanningBinding(issue);
  const authority = { actor: 'maintainer', reference: 'human-request', revision: 'scope', planningRevision: planningBinding.revision, observedAt: time };
  const store = new AgentTaskStore(directory, { now });
  const task = await store.enqueue({ source: 'trusted-request', requestId: 'event', mode: 'research', revision: 'scope',
    authority, planningBinding, brief: { visibility: 'public-delivery-approved', resultDestination: 'linear-planning',
      acceptanceCriteria: ['Return the scoped research to Linear.'] } });
  const owner = 'coordinator';
  const act = (action, input = {}) => store.mutate(task.id, action, { owner,
    ...(action === 'transition' ? { authority: { ...authority, observedAt: time } } : {}), ...input });
  await act('claim', { durationMs: 300_000 });
  await act('planning-observation', { observation: { status: 'available', issue, reference: 'linear-read', observedAt: time } });
  await act('dispatch-intent', { authority });
  const dispatched = (await store.list())[0];
  await act('bind', { token: dispatched.dispatch.token, threadId: 'worker' });
  await act('transition', { state: 'investigating', reason: 'Research the authorized scope.' });
  await act('transition', { state: 'verifying', reason: 'Read back the result.' });
  const input = { bodyHash: linearResultBodyHash('The exact selected research.'), writerAppUserId, authority };
  const intent = () => act('planning-result-intent', input);
  const readback = (receipt, changes = {}) => {
    const result = { commentId: receipt.commentId, issueId: receipt.issueId, authorId: receipt.writerAppUserId,
      bodyHash: receipt.bodyHash, url: 'https://linear.app/example/issue/NAV-42/research',
      createdAt: new Date(time).toISOString(), updatedAt: new Date(time).toISOString(), ...changes };
    return { status: 'available', observedAt: time, result,
      reference: 'linear-result:sha256:' + createHash('sha256').update(JSON.stringify(result)).digest('hex') };
  };
  return { directory, store, task, owner, now, issue, authority, act, input, intent, readback, advance: (ms) => { time += ms; } };
}

describe('durable Linear result intent and readback', () => {
  it('saves one comment identity before creation and reconciles it after restart', async () => {
    const { directory, owner, task, input, now, intent } = await setup();
    const first = await intent();
    expect(first.planningResultDecision.action).toBe('create');
    expect(first.planningResult.commentId).toMatch(/^[a-f0-9-]{36}$/);
    const restarted = new AgentTaskStore(directory, { now });
    const second = await restarted.mutate(task.id, 'planning-result-intent', { owner, ...input });
    expect(second.planningResultDecision.action).toBe('reconcile');
    expect(second.planningResult).toEqual(first.planningResult);
    expect(second.evidence).toEqual([]);
    expect(second.state).toBe('verifying');
  });

  it('records service readback without inventing output evidence or completing the task', async () => {
    const { act, intent, readback } = await setup();
    const pending = await intent();
    const observation = readback(pending.planningResult);
    const confirmed = await act('planning-result-observation', { observation });
    expect(confirmed.planningResult).toMatchObject({ status: 'confirmed', reference: observation.reference, observedAt: observation.observedAt });
    expect(confirmed.evidence).toEqual([]);
    expect((await intent()).planningResultDecision.action).toBe('skip');
    await expect(act('transition', { state: 'delivered', reason: 'Missing quality evidence.' })).rejects.toThrow('evidence is incomplete');
  });

  it('requires matching fresh readback and output evidence before delivery', async () => {
    const { act, intent, readback, task, advance, now } = await setup();
    const pending = await intent();
    await act('evidence', { evidence: { gate: 'output', result: 'pass', artifact: 'arbitrary-agent-claim',
      head: null, revision: task.revision, observedAt: pending.planningResult.intentAt } });
    await expect(act('transition', { state: 'delivered', reason: 'No actual readback.' })).rejects.toThrow('evidence is incomplete');
    advance(1);
    const observation = readback(pending.planningResult);
    await act('planning-result-observation', { observation });
    advance(1);
    await act('evidence', { evidence: { gate: 'output', result: 'pass', artifact: observation.reference,
      head: null, revision: task.revision, observedAt: now() } });
    // Different-time evidence cannot stand in for the exact owning-service observation.
    await expect(act('transition', { state: 'delivered', reason: 'Still unmatched.' })).rejects.toThrow('evidence is incomplete');
    advance(1);
    const fresh = readback(pending.planningResult);
    await act('planning-result-observation', { observation: fresh });
    await act('evidence', { evidence: { gate: 'output', result: 'pass', artifact: fresh.reference,
      head: null, revision: task.revision, observedAt: fresh.observedAt } });
    await expect(act('transition', { state: 'delivered', reason: 'Missing current human authority.', authority: undefined }))
      .rejects.toThrow('authority rechecked after result readback');
    await expect(act('transition', { state: 'delivered', reason: 'Authority predates readback.',
      authority: { ...pending.authority, observedAt: observation.observedAt } }))
      .rejects.toThrow('authority rechecked after result readback');
    expect((await act('transition', { state: 'delivered', reason: 'Verified result and quality gates.' })).state).toBe('delivered');
  });

  it.each([{ bodyHash: linearResultBodyHash('Changed result.') },
    { writerAppUserId: '00000000-0000-4000-8000-000000000009' }])('cannot replace a pending comment with a different identity %j', async (change) => {
    const { act, input, intent } = await setup();
    await intent();
    await expect(act('planning-result-intent', { ...input, ...change })).rejects.toThrow('different content or scope');
  });

  it.each([{ commentId: 'other' }, { issueId: 'other' }, { authorId: 'human' },
    { bodyHash: linearResultBodyHash('Changed result.') }, { url: 'https://github.com/example/result' },
    { createdAt: 'invalid' }, { createdAt: new Date(1).toISOString() },
    { updatedAt: new Date(1_700_000_000_001).toISOString() }])('rejects mismatched readback %j', async (change) => {
    const { act, intent, readback, store } = await setup();
    const pending = await intent();
    await expect(act('planning-result-observation', { observation: readback(pending.planningResult, change) })).rejects.toThrow('Planning result');
    expect((await store.list())[0].planningResult.status).toBe('pending');
  });

  it('blocks new writes after withdrawal but permits read-only reconciliation of pending output', async () => {
    const { intent, act, issue, now, readback } = await setup();
    const pending = await intent();
    await act('planning-observation', { observation: { status: 'available', issue: { ...issue, labels: ['Deferred'] },
      reference: 'withdrawn', observedAt: now() } });
    expect((await intent()).planningResultDecision.action).toBe('reconcile');
    const observation = readback(pending.planningResult);
    await act('planning-result-observation', { observation });
    await expect(act('transition', { state: 'delivered', reason: 'Withdrawn.' })).rejects.toThrow('revoked');
  });

  it('rejects stale authority before reserving a new comment identity', async () => {
    const { act, input, store } = await setup();
    await expect(act('planning-result-intent', { ...input, authority: { ...input.authority, observedAt: 1 } })).rejects.toThrow('rechecked authority');
    expect((await store.list())[0].planningResult).toBeUndefined();
  });

  it.each(['bodyHash', 'writerAppUserId'])('rejects coerced %s inputs before reserving an artifact', async (key) => {
    const { act, input, store } = await setup();
    await expect(act('planning-result-intent', { ...input, [key]: [input[key]] })).rejects.toThrow('content hash and writer app identity');
    expect((await store.list())[0].planningResult).toBeUndefined();
  });

  it('does not use this output route to bypass private dispatch restrictions', async () => {
    const { directory, intent, store } = await setup();
    // A legacy private record retains its checkpoint, but cannot reserve a fresh publication.
    await store.transaction((state) => { state.tasks[0].brief.visibility = 'private-planning'; });
    await expect(intent()).rejects.toThrow('visibility approval');
    expect((await new AgentTaskStore(directory).list())[0].planningResult).toBeUndefined();
  });

  it('requires current head and fresh confirmation, even when prior output evidence passed', async () => {
    const { intent, act, readback, advance, issue, now, task } = await setup();
    const pending = await intent();
    const observation = readback(pending.planningResult);
    await act('planning-result-observation', { observation });
    await act('evidence', { evidence: { gate: 'output', result: 'pass', head: null, revision: task.revision,
      artifact: observation.reference, observedAt: observation.observedAt } });
    advance(60_001);
    await act('planning-observation', { observation: { status: 'available', issue, reference: 'fresh', observedAt: now() } });
    await expect(act('transition', { state: 'delivered', reason: 'Old readback.' })).rejects.toThrow('evidence is incomplete');
    await act('head', { head: 'new-head' });
    await expect(intent()).rejects.toThrow('different content or scope');
    await expect(act('planning-result-observation', { observation: readback(pending.planningResult) })).rejects.toThrow('exact-scope');
  });

  it('invalidates a prior pass when service access is lost, preserving readback history for recovery', async () => {
    const { intent, act, readback, advance, now, task } = await setup();
    const pending = await intent();
    const observation = readback(pending.planningResult);
    await act('planning-result-observation', { observation });
    await act('evidence', { evidence: { gate: 'output', result: 'pass', head: null, revision: task.revision,
      artifact: observation.reference, observedAt: observation.observedAt } });
    const unavailable = { status: 'unavailable', reference: 'linear-result-unavailable', observedAt: now() };
    const failed = await act('planning-result-observation', { commentId: pending.planningResult.commentId, observation: unavailable });
    expect(failed.planningResult.status).toBe('unverified');
    expect(failed.history.some((event) => event.planningResult?.status === 'confirmed')).toBe(true);
    expect((await intent()).planningResultDecision.action).toBe('reconcile');
    await expect(act('transition', { state: 'delivered', reason: 'Lost access.' })).rejects.toThrow('evidence is incomplete');
    await expect(act('planning-result-observation', { observation })).rejects.toThrow('move backwards');
    advance(1);
    const current = readback(pending.planningResult);
    await act('planning-result-observation', { observation: current });
    await act('evidence', { evidence: { gate: 'output', result: 'pass', head: null, revision: task.revision,
      artifact: current.reference, observedAt: current.observedAt } });
    expect((await act('transition', { state: 'delivered', reason: 'Restored verified output.' })).state).toBe('delivered');
  });

  it('rejects unknown destinations and Linear output for non-planning or implementation work at intake', async () => {
    const { store, authority } = await setup();
    const request = { source: 'trusted', requestId: 'invalid-destination', mode: 'research', revision: 'scope', authority,
      brief: { acceptanceCriteria: ['Scoped result.'], resultDestination: 'unknown' } };
    await expect(store.enqueue(request)).rejects.toThrow('Unsupported result destination');
    await expect(store.enqueue({ ...request, brief: { ...request.brief, resultDestination: 'linear-planning' } }))
      .rejects.toThrow('planning-bound research or audit');
    const planningBinding = (await store.list())[0].planning.binding;
    await expect(store.enqueue({ ...request, mode: 'implement', planningBinding,
      brief: { ...request.brief, resultDestination: 'linear-planning' } })).rejects.toThrow('planning-bound research or audit');
  });
});
