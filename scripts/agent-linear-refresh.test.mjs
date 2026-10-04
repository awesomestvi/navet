import { createHmac } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AgentLinearInbox } from './agent-linear-inbox.mjs';
import { reconcileLinearRefresh, LinearIssueNotFoundError } from './agent-linear-refresh.mjs';
import { createPlanningBinding, planningStatus } from './agent-planning-scope.mjs';
import { AgentTaskStore } from './agent-task-store.mjs';

const time = 1_700_000_000_000;
const secret = 'synthetic-signing-secret';
const policy = { organizationId: 'dc844923-f9a4-40a3-825c-dea7747e57d6', webhookId: '000042e3-d123-4980-b49f-8e140eef9329' };
const issueId = '2174add1-f7c8-44e3-bbf3-2d60b5ea8bc9';
const issue = () => ({ id: 'NAV-42', uuid: issueId, teamId: 'team', projectId: 'project',
  title: 'Private household proposal', description: 'Selected scope with private details.',
  labels: ['Approved', 'type: ux'], archivedAt: null, canceledAt: null,
  attachments: [{ id: 'reference', url: 'https://uploads.linear.app/workspace/file?signature=first-secret' }] });
const directories = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });
async function setup({ bound = true } = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'navet-linear-refresh-'));
  directories.push(directory);
  let now = time;
  const clock = () => now;
  const inbox = new AgentLinearInbox(directory, { now: clock });
  const store = new AgentTaskStore(directory, { now: clock });
  const binding = createPlanningBinding(issue());
  const request = { source: 'trusted-maintainer-request', requestId: 'human-event', mode: 'implement', revision: 'scope',
    authority: { actor: 'maintainer', reference: 'trusted-human-request', observedAt: time, ...(bound ? { planningRevision: binding.revision } : {}) },
    brief: { visibility: 'public-delivery-approved', acceptanceCriteria: ['Verify selected option.'] }, ...(bound ? { planningBinding: binding } : {}) };
  const task = await store.enqueue(request);
  await store.mutate(task.id, 'claim', { owner: 'coordinator', durationMs: 300_000 });
  async function accept(extra = {}) {
    const event = { action: 'update', type: 'Issue', actor: null, data: { id: issueId }, ...policy,
      createdAt: new Date(now - 1000).toISOString(), webhookTimestamp: now, ...extra };
    const rawBody = Buffer.from(JSON.stringify(event));
    return inbox.accept({ rawBody, signature: createHmac('sha256', secret).update(rawBody).digest('hex'), secret, policy });
  }
  const accepted = await accept();
  const reconcile = (readIssue = async () => issue(), extra = {}) => reconcileLinearRefresh({ inbox, store, owner: 'coordinator', eventId: accepted.eventId, readIssue, now: clock, ...extra });
  return { directory, inbox, store, task, request, accepted, accept, reconcile, clock, advance: (delta) => { now += delta; } };
}

describe('fresh Linear planning reconciliation', () => {
  it('applies a complete fresh read before confirming without changing authority or dispatching', async () => {
    const { store, task, inbox, reconcile } = await setup();
    const before = (await store.list())[0];
    let readId;
    expect(await reconcile(async (id) => { readId = id; return issue(); })).toMatchObject({ decision: 'confirmed', updatedTasks: 1, authority: 'none' });
    expect(readId).toBe(issueId);
    const after = (await store.list())[0];
    expect(planningStatus(after, time)).toMatchObject({ result: 'pass', reason: 'planning-scope-current' });
    expect(after.id).toBe(task.id);
    expect(after.authority).toEqual(before.authority);
    expect(after.lease).toEqual(before.lease);
    expect(after.dispatch).toBeNull();
    expect(await inbox.pending()).toEqual([]);
  });

  it('latches withdrawal and blocks new execution while confirming the observed refresh', async () => {
    const { store, task, reconcile, inbox } = await setup();
    expect((await reconcile(async () => ({ ...issue(), labels: ['Deferred'] }))).decision).toBe('confirmed');
    expect(planningStatus((await store.list())[0], time).reason).toBe('planning-request-revoked');
    await expect(store.mutate(task.id, 'transition', { owner: 'coordinator', state: 'investigating', reason: 'Start' })).rejects.toThrow('revoked');
    expect(await inbox.pending()).toEqual([]);
  });

  it('confirms a deleted issue as withdrawal and cannot revive it on a later service read', async () => {
    const { store, inbox, task, accept, reconcile, advance, clock } = await setup();
    const removed = await accept({ action: 'remove' });
    expect(await reconcile(async (id) => { throw new LinearIssueNotFoundError(id); }, { eventId: removed.eventId }))
      .toMatchObject({ decision: 'confirmed', updatedTasks: 1 });
    expect(planningStatus((await store.list())[0], clock()).reason).toBe('planning-request-revoked');
    expect((await inbox.pending()).some((entry) => entry.receipt.eventId === removed.eventId)).toBe(false);
    await expect(store.mutate(task.id, 'transition', { owner: 'coordinator', state: 'investigating', reason: 'Start' })).rejects.toThrow('revoked');
    advance(1000);
    const restored = await accept();
    await reconcile(undefined, { eventId: restored.eventId });
    expect(planningStatus((await store.list())[0], clock()).reason).toBe('planning-request-revoked');
  });

  it.each([
    () => Object.assign(new Error('Access masked as not found'), { status: 404 }),
    () => new LinearIssueNotFoundError('different-issue'),
  ])('keeps ambiguous or mismatched not-found errors pending', async (failure) => {
    const { reconcile, inbox, store } = await setup();
    expect((await reconcile(async () => { throw failure(); })).decision).toBe('retry');
    expect(await inbox.pending()).toHaveLength(1);
    expect(planningStatus((await store.list())[0], time).result).toBe('unverified');
  });

  it('cannot revive a withdrawn request from a later Approved service event', async () => {
    const { store, reconcile, accept, clock, advance } = await setup();
    await reconcile(async () => ({ ...issue(), labels: ['Deferred'] }));
    advance(1000);
    const next = await accept();
    await reconcile(undefined, { eventId: next.eventId });
    expect(planningStatus((await store.list())[0], clock()).reason).toBe('planning-request-revoked');
  });

  it.each([
    { description: 'A different selected option.' },
    { teamId: 'another-team' },
    { archivedAt: new Date(time).toISOString() },
    { attachments: [{ id: 'reference', url: 'https://uploads.linear.app/workspace/another-file?signature=secret' }] },
  ])('revokes changes to accepted scope or archival %j', async (changes) => {
    const { reconcile, store } = await setup();
    await reconcile(async () => ({ ...issue(), ...changes }));
    expect(planningStatus((await store.list())[0], time).reason).toBe('planning-request-revoked');
  });

  it('keeps unchanged attachment scope after service signatures rotate', async () => {
    const { reconcile, store } = await setup();
    await reconcile(async () => ({ ...issue(), attachments: [{ ...issue().attachments[0], url: issue().attachments[0].url.replace('first-secret', 'renewed-secret') }] }));
    expect(planningStatus((await store.list())[0], time).result).toBe('pass');
  });

  it('confirms a complete ambiguous-stage read while keeping execution blocked', async () => {
    const { reconcile, store } = await setup();
    expect(await reconcile(async () => ({ ...issue(), labels: ['Approved', 'Deferred'] })))
      .toMatchObject({ decision: 'confirmed', updatedTasks: 1 });
    expect(planningStatus((await store.list())[0], time)).toMatchObject({ result: 'unverified', reason: 'planning-stage-ambiguous' });
  });

  it('replaces a previous pass on lost access and retains the receipt for retry without error disclosure', async () => {
    const { directory, reconcile, store, inbox, task } = await setup();
    await store.mutate(task.id, 'planning-observation', { owner: 'coordinator', observation: { status: 'available', issue: issue(), reference: 'earlier-read', observedAt: time } });
    expect(await reconcile(async () => { throw new Error('Private service credential detail'); })).toMatchObject({ decision: 'retry', authority: 'none' });
    expect(planningStatus((await store.list())[0], time)).toMatchObject({ result: 'unverified', reason: 'planning-access-unverified' });
    expect(await inbox.pending()).toHaveLength(1);
    expect(await readFile(path.join(directory, 'tasks.json'), 'utf8')).not.toContain('credential detail');
  });

  it.each(['labels', 'attachments', 'description', 'archivedAt', 'canceledAt'])('retains incomplete %s reads for retry', async (field) => {
    const { reconcile, inbox, store } = await setup();
    const snapshot = issue();
    delete snapshot[field];
    expect((await reconcile(async () => snapshot)).decision).toBe('retry');
    expect(await inbox.pending()).toHaveLength(1);
    expect(planningStatus((await store.list())[0], time).result).toBe('unverified');
  });

  it('rejects a returned issue with a different identity rather than binding it to the event', async () => {
    const { reconcile, inbox, store } = await setup();
    expect((await reconcile(async () => ({ ...issue(), uuid: policy.webhookId }))).decision).toBe('retry');
    expect(await inbox.pending()).toHaveLength(1);
    expect(planningStatus((await store.list())[0], time).result).toBe('unverified');
  });

  it('retains slow reads for retry rather than treating their start as fresh', async () => {
    const { reconcile, advance, store, clock } = await setup();
    expect((await reconcile(async () => { advance(60_001); return issue(); })).decision).toBe('retry');
    expect(planningStatus((await store.list())[0], clock()).result).toBe('unverified');
  });

  it('preserves unowned tasks and pending receipts for their own coordinator', async () => {
    const { reconcile, inbox, store } = await setup();
    const before = await store.list();
    expect(await reconcile(undefined, { owner: 'another-coordinator' })).toMatchObject({ decision: 'retry', updatedTasks: 0 });
    expect(await store.list()).toEqual(before);
    expect(await inbox.pending()).toHaveLength(1);
  });

  it('reconciles multiple requests sequentially under individual leases across restart', async () => {
    const { directory, reconcile, inbox, store, task, request, accepted, clock, advance } = await setup();
    // A second accepted revision can coexist with a released request at the default capacity.
    const next = await store.enqueue({ ...request, requestId: 'revised-human-event' });
    expect(await reconcile()).toMatchObject({ decision: 'retry', updatedTasks: 1 });
    expect((await store.list()).find((item) => item.id === next.id).planning.observation).toBeNull();
    expect(await inbox.pending()).toHaveLength(1);
    await store.mutate(task.id, 'release', { owner: 'coordinator', reason: 'Hand off reconciliation capacity.' });
    await store.mutate(next.id, 'claim', { owner: 'next-coordinator', durationMs: 300_000 });
    advance(61_000);
    const restarted = new AgentTaskStore(directory, { now: clock });
    const restartedInbox = new AgentLinearInbox(directory, { now: clock });
    expect(await reconcileLinearRefresh({ inbox: restartedInbox, store: restarted, eventId: accepted.eventId,
      owner: 'next-coordinator', readIssue: async () => issue(), now: clock }))
      .toMatchObject({ decision: 'confirmed', updatedTasks: 1 });
    expect(await restartedInbox.pending()).toEqual([]);
    const tasks = await restarted.list();
    expect(tasks.find((item) => item.id === task.id).lease).toBeNull();
    expect(planningStatus(tasks.find((item) => item.id === task.id), clock()).result).toBe('unverified');
    expect(planningStatus(tasks.find((item) => item.id === next.id), clock()).result).toBe('pass');
  });

  it('keeps a receipt pending until every task reflects the same confirming proposal state', async () => {
    const { reconcile, inbox, store, request, task, advance } = await setup();
    const next = await store.enqueue({ ...request, requestId: 'next-owner-request' });
    expect((await reconcile()).decision).toBe('retry');
    await store.mutate(task.id, 'release', { owner: 'coordinator', reason: 'Allow next coordinator.' });
    await store.mutate(next.id, 'claim', { owner: 'next-coordinator', durationMs: 300_000 });
    advance(1000);
    const withdrawn = async () => ({ ...issue(), labels: ['Deferred'] });
    expect(await reconcile(withdrawn, { owner: 'next-coordinator' }))
      .toMatchObject({ decision: 'retry', updatedTasks: 1 });
    expect(await inbox.pending()).toHaveLength(1);
    await store.mutate(next.id, 'release', { owner: 'next-coordinator', reason: 'Refresh previous request too.' });
    await store.mutate(task.id, 'claim', { owner: 'coordinator', durationMs: 300_000 });
    advance(1000);
    expect(await reconcile(withdrawn)).toMatchObject({ decision: 'confirmed', updatedTasks: 1 });
    expect(await inbox.pending()).toEqual([]);
    for (const record of await store.list()) expect(planningStatus(record, time + 2000).reason).toBe('planning-request-revoked');
    await expect(store.mutate(task.id, 'transition', { owner: 'coordinator', state: 'investigating', reason: 'Start.' }))
      .rejects.toThrow('revoked');
  });

  it('applies later withdrawal reads to already handled records while other owners are pending', async () => {
    const { reconcile, store, request, task, advance } = await setup();
    await store.enqueue({ ...request, requestId: 'another-owner-request' });
    expect((await reconcile()).decision).toBe('retry');
    advance(1000);
    expect(await reconcile(async () => ({ ...issue(), labels: ['Deferred'] })))
      .toMatchObject({ decision: 'retry', updatedTasks: 1 });
    expect((await store.list()).find((item) => item.id === task.id).planning.revokedAt).toBe(time + 1000);
  });

  it('does not confirm when another bound request appears before receipt acknowledgement', async () => {
    const { reconcile, inbox, store, request } = await setup();
    const racedInbox = { store: inbox.store, pending: () => inbox.pending(), confirm: async (...args) => {
      await store.enqueue({ ...request, requestId: 'concurrent-request' });
      return inbox.confirm(...args);
    } };
    expect(await reconcile(undefined, { inbox: racedInbox })).toMatchObject({ decision: 'retry', updatedTasks: 1 });
    expect(await inbox.pending()).toHaveLength(1);
  });

  it('reconciles after interrupted confirmation and restart without creating another task', async () => {
    const { directory, reconcile, inbox, store, clock, advance } = await setup();
    const interrupted = { store: inbox.store, pending: () => inbox.pending(), confirm: async () => { throw new Error('Lost acknowledgement'); } };
    await expect(reconcile(undefined, { inbox: interrupted })).rejects.toThrow('Lost acknowledgement');
    expect(planningStatus((await store.list())[0], clock()).result).toBe('pass');
    expect(await inbox.pending()).toHaveLength(1);
    advance(1000);
    expect((await reconcile(undefined, { inbox: new AgentLinearInbox(directory, { now: clock }), store: new AgentTaskStore(directory, { now: clock }) })).decision).toBe('confirmed');
    expect(await store.list()).toHaveLength(1);
    expect(await inbox.pending()).toEqual([]);
  });

  it('preserves terminal history without requiring a new lease to refresh a closed request', async () => {
    const { reconcile, store, task } = await setup();
    await store.mutate(task.id, 'transition', { owner: 'coordinator', state: 'terminal-failure', reason: 'Task ended.' });
    await store.mutate(task.id, 'release', { owner: 'coordinator', reason: 'Release closed task.' });
    const before = await store.list();
    expect(await reconcile()).toMatchObject({ decision: 'confirmed', updatedTasks: 0 });
    expect(await store.list()).toEqual(before);
  });

  it('confirms an unbound proposal read without manufacturing an implementation request', async () => {
    const { reconcile, store, directory } = await setup({ bound: false });
    const before = await store.list();
    expect(await reconcile()).toMatchObject({ decision: 'confirmed', updatedTasks: 0, authority: 'none' });
    expect(await store.list()).toEqual(before);
    const bytes = await readFile(path.join(directory, 'tasks.json'), 'utf8');
    for (const secretValue of [issue().title, issue().description, 'first-secret', 'uploads.linear.app']) expect(bytes).not.toContain(secretValue);
  });

  it('uses a signed comment issue identity for its complete read', async () => {
    const { accept, reconcile } = await setup();
    const comment = await accept({ type: 'Comment', data: { id: policy.webhookId, issueId } });
    const readIds = [];
    expect((await reconcile(async (id) => { readIds.push(id); return issue(); }, { eventId: comment.eventId })).decision).toBe('confirmed');
    expect(readIds).toEqual([issueId]);
  });

  it('rejects a separate receipt store before reading or acknowledging work', async () => {
    const { reconcile, inbox, store } = await setup();
    const other = await setup();
    let calls = 0;
    await expect(reconcile(async () => { calls++; return issue(); }, { store: other.store }))
      .rejects.toThrow('share their private store directory');
    expect(calls).toBe(0);
    expect(await inbox.pending()).toHaveLength(1);
    expect((await store.list())[0].planning.observation).toBeNull();
  });

  it('refuses unknown or confirmed events before calling the service reader', async () => {
    const { reconcile } = await setup();
    let calls = 0;
    const read = async () => { calls++; return issue(); };
    await expect(reconcile(read, { eventId: `sha256:${'f'.repeat(64)}` })).rejects.toThrow('Unknown');
    expect(calls).toBe(0);
    await reconcile(read);
    await expect(reconcile(read)).rejects.toThrow('already confirmed');
    expect(calls).toBe(1);
  });
});
