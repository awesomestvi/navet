import { createHmac } from 'node:crypto';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AgentLinearInbox, LinearEventInputError } from './agent-linear-inbox.mjs';
import { AgentTaskStore } from './agent-task-store.mjs';
import { startLinearEventReceiver } from './agent-linear-receiver.mjs';

const time = 1_700_000_000_000;
const secret = 'synthetic-signing-secret';
const policy = { organizationId: 'dc844923-f9a4-40a3-825c-dea7747e57d6', webhookId: '000042e3-d123-4980-b49f-8e140eef9329' };
const fixture = () => ({ action: 'update', type: 'Issue', actor: null,
  data: { id: '2174add1-f7c8-44e3-bbf3-2d60b5ea8bc9', title: 'Private proposal', description: 'Private household details', labels: ['Approved'] },
  ...policy, createdAt: '2023-11-14T22:13:00.000Z', webhookTimestamp: time });
const signed = (event = fixture()) => {
  const rawBody = Buffer.from(JSON.stringify(event));
  return { rawBody, signature: createHmac('sha256', secret).update(rawBody).digest('hex'), secret, policy };
};
const directories = [];
const receivers = [];
afterEach(async () => {
  await Promise.all(receivers.splice(0).map((receiver) => receiver.stop()));
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});
async function setup(options = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'navet-linear-inbox-'));
  directories.push(directory);
  let now = time;
  const inbox = new AgentLinearInbox(directory, { now: () => now, ...options });
  return { directory, inbox, advance: (delta) => { now += delta; } };
}
const proof = () => ({ reference: `sha256:${'a'.repeat(64)}`, observedAt: time });

describe('durable Linear receipts', () => {
  it('persists one pending refresh across restart without storing private content or creating tasks', async () => {
    const { directory, inbox } = await setup();
    expect(await inbox.accept(signed())).toMatchObject({ decision: 'refresh', authority: 'none' });
    const reopened = new AgentLinearInbox(directory, { now: () => time });
    expect(await reopened.pending()).toHaveLength(1);
    const state = JSON.parse(await readFile(path.join(directory, 'tasks.json'), 'utf8'));
    expect(state.tasks).toEqual([]);
    expect(JSON.stringify(state)).not.toContain('Private');
    expect((await stat(directory)).mode & 0o777).toBe(0o700);
    expect((await stat(path.join(directory, 'tasks.json'))).mode & 0o777).toBe(0o600);
  });
  it('reconciles uncertain refresh delivery instead of returning another new action', async () => {
    const { inbox, advance } = await setup();
    const first = await inbox.accept(signed());
    advance(1000);
    expect(await inbox.accept(signed({ ...fixture(), webhookTimestamp: time + 1000 }))).toEqual({ ...first, decision: 'reconcile' });
    expect((await inbox.pending())[0].deliveries).toBe(2);
  });
  it('skips confirmed refreshes after restart while retaining the original proof', async () => {
    const { directory, inbox } = await setup();
    const { eventId } = await inbox.accept(signed());
    expect(await inbox.confirm(eventId, proof())).toMatchObject({ decision: 'confirmed', authority: 'none' });
    const reopened = new AgentLinearInbox(directory, { now: () => time });
    expect(await reopened.pending()).toEqual([]);
    expect(await reopened.accept(signed())).toMatchObject({ decision: 'skip' });
    expect(await reopened.confirm(eventId, { ...proof(), reference: `sha256:${'b'.repeat(64)}` })).toMatchObject({ decision: 'skip' });
    const state = JSON.parse(await readFile(path.join(directory, 'tasks.json'), 'utf8'));
    expect(state.linearEventInbox.receipts[0].confirmation).toEqual(proof());
  });
  it('serializes duplicate and distinct concurrent arrivals across inbox instances', async () => {
    const { directory, inbox } = await setup();
    const other = new AgentLinearInbox(directory, { now: () => time });
    const results = await Promise.all([inbox.accept(signed()), other.accept(signed()), inbox.accept(signed({ ...fixture(), action: 'remove' }))]);
    expect(results.filter((result) => result.decision === 'refresh')).toHaveLength(2);
    expect(results.filter((result) => result.decision === 'reconcile')).toHaveLength(1);
    expect(await inbox.pending()).toHaveLength(2);
  });
  it('preserves task state and leases when recording event metadata in the same store', async () => {
    const { directory, inbox } = await setup();
    const store = new AgentTaskStore(directory, { now: () => time });
    const task = await store.enqueue({ source: 'trusted-request', requestId: 'human-event', mode: 'research', revision: 'scope', authority: { actor: 'maintainer', reference: 'human', observedAt: time }, brief: { acceptanceCriteria: ['Research only.'] } });
    await store.mutate(task.id, 'claim', { owner: 'existing-owner', durationMs: 60_000 });
    const before = await store.list();
    await inbox.accept(signed());
    expect(await store.list()).toEqual(before);
    expect(await inbox.pending()).toHaveLength(1);
  });
  it('does not persist invalidly signed arrivals', async () => {
    const { directory, inbox } = await setup();
    await expect(inbox.accept({ ...signed(), signature: 'a'.repeat(64) })).rejects.toBeInstanceOf(LinearEventInputError);
    await expect(readFile(path.join(directory, 'tasks.json'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('retains ignored signed models for deduplication without offering a pending refresh', async () => {
    const { inbox } = await setup();
    expect(await inbox.accept(signed({ ...fixture(), type: 'Project' }))).toMatchObject({ decision: 'ignore' });
    expect(await inbox.pending()).toEqual([]);
  });
  it('bounds settled history across restart while preserving pending refreshes and recent retry deduplication', async () => {
    const { directory, inbox } = await setup({ maxSettledReceipts: 2 });
    const pending = await inbox.accept(signed());
    const events = Array.from({ length: 3 }, (_, index) => ({ ...fixture(), type: 'Project',
      createdAt: `2023-11-14T22:13:0${index}.000Z` }));
    for (const event of events) await inbox.accept(signed(event));
    const restarted = new AgentLinearInbox(directory, { now: () => time, maxSettledReceipts: 2 });
    const receipts = JSON.parse(await readFile(path.join(directory, 'tasks.json'), 'utf8')).linearEventInbox.receipts;
    expect(receipts).toHaveLength(3);
    expect((await restarted.pending()).map((record) => record.receipt.eventId)).toEqual([pending.eventId]);
    expect(await restarted.accept(signed(events[0]))).toMatchObject({ decision: 'ignore' });
    await restarted.confirm(pending.eventId, proof());
    expect(await restarted.accept(signed())).toMatchObject({ decision: 'skip' });
    expect(JSON.parse(await readFile(path.join(directory, 'tasks.json'), 'utf8')).linearEventInbox.receipts).toHaveLength(2);
  });

  it('expires settled deduplication receipts without deleting old pending work', async () => {
    const { directory, inbox, advance } = await setup({ deduplicationMs: 1000 });
    const confirmed = await inbox.accept(signed());
    await inbox.confirm(confirmed.eventId, proof());
    const pendingEvent = { ...fixture(), action: 'remove' };
    const pending = await inbox.accept(signed(pendingEvent));
    await inbox.accept(signed({ ...fixture(), type: 'Project' }));
    advance(1001);
    expect((await inbox.pending()).map((record) => record.receipt.eventId)).toEqual([pending.eventId]);
    expect(JSON.parse(await readFile(path.join(directory, 'tasks.json'), 'utf8')).linearEventInbox.receipts).toHaveLength(1);
    expect(await inbox.accept(signed({ ...fixture(), webhookTimestamp: time + 1001 }))).toMatchObject({ decision: 'refresh' });
    expect(await inbox.accept(signed({ ...pendingEvent, webhookTimestamp: time + 1001 }))).toMatchObject({ decision: 'reconcile' });
  });

  it('returns retryable capacity failure without dropping pending work and accepts new events after confirmation', async () => {
    const { directory, inbox } = await setup({ maxPendingReceipts: 1 });
    const first = await inbox.accept(signed());
    const second = signed({ ...fixture(), action: 'remove' });
    await expect(inbox.accept(second)).rejects.toThrow('pending capacity exhausted');
    const before = await readFile(path.join(directory, 'tasks.json'), 'utf8');
    expect(await inbox.accept(signed())).toMatchObject({ decision: 'reconcile' });
    await expect(inbox.accept(second)).rejects.toThrow('pending capacity exhausted');
    expect((await inbox.pending()).map((record) => record.receipt.eventId)).toEqual([first.eventId]);
    expect(JSON.parse(before).linearEventInbox.receipts).toHaveLength(1);
    await inbox.confirm(first.eventId, proof());
    expect(await inbox.accept(second)).toMatchObject({ decision: 'refresh' });
  });

  it.each([{ maxSettledReceipts: 0 }, { maxPendingReceipts: -1 }, { deduplicationMs: 1.5 }])('rejects invalid retention limits: %s', async (options) => {
    await expect(setup(options)).rejects.toThrow('Positive Linear inbox');
  });

  it('requires fresh hashed confirmation evidence after receipt and known event identity', async () => {
    const { inbox, advance } = await setup();
    const { eventId } = await inbox.accept(signed());
    for (const observation of [{ ...proof(), observedAt: time + 1 }, { ...proof(), observedAt: time - 1 }, { ...proof(), reference: 'raw private URL' }]) {
      await expect(inbox.confirm(eventId, observation)).rejects.toThrow();
    }
    await expect(inbox.confirm(`sha256:${'b'.repeat(64)}`, proof())).rejects.toThrow('Unknown');
    advance(60_001);
    await expect(inbox.confirm(eventId, proof())).rejects.toThrow('Fresh');
  });
  it('preserves and rejects corrupt receipt state rather than resetting its deduplication history', async () => {
    const { directory, inbox } = await setup();
    await inbox.accept(signed());
    const file = path.join(directory, 'tasks.json');
    const state = JSON.parse(await readFile(file, 'utf8'));
    state.linearEventInbox.receipts[0].receipt.authority = 'approved';
    const bytes = JSON.stringify(state);
    await writeFile(file, bytes);
    await expect(inbox.pending()).rejects.toThrow('corrupt');
    expect(await readFile(file, 'utf8')).toBe(bytes);
  });
});

describe('loopback HTTP receipt pilot', () => {
  async function start(inbox) {
    const receiver = await startLinearEventReceiver({ inbox, secret, policy });
    receivers.push(receiver);
    return receiver;
  }
  async function send(receiver, input = signed(), options = {}) {
    return fetch(receiver.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Linear-Signature': input.signature }, body: input.rawBody, ...options });
  }
  it('acknowledges only durable receipts and reports reconcile/skip on actual HTTP retries', async () => {
    const { directory, inbox } = await setup();
    const receiver = await start(inbox);
    expect(receiver.url).toMatch(/^http:\/\/127\.0\.0\.1:/);
    const first = await send(receiver);
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ accepted: true, decision: 'refresh' });
    expect(await readFile(path.join(directory, 'tasks.json'), 'utf8')).not.toContain('Private');
    expect(await (await send(receiver)).json()).toEqual({ accepted: true, decision: 'reconcile' });
    const [pending] = await inbox.pending();
    await inbox.confirm(pending.receipt.eventId, proof());
    expect(await (await send(receiver)).json()).toEqual({ accepted: true, decision: 'skip' });
  });
  it('reconciles a durable event after a failed acknowledgement and receiver restart', async () => {
    const { directory, inbox } = await setup();
    const first = await start({ accept: async (input) => {
      await inbox.accept(input);
      throw new Error('Simulated failure after durable receipt.');
    } });
    expect((await send(first)).status).toBe(503);
    await first.stop();
    receivers.splice(receivers.indexOf(first), 1);
    const restarted = await start(new AgentLinearInbox(directory, { now: () => time }));
    expect(await (await send(restarted)).json()).toEqual({ accepted: true, decision: 'reconcile' });
    expect(await inbox.pending()).toHaveLength(1);
    expect((await new AgentTaskStore(directory).list())).toEqual([]);
  });
  it('rejects unconfigured webhook identity before opening a receiver', async () => {
    const { inbox } = await setup();
    await expect(startLinearEventReceiver({ inbox, secret, policy: {} })).rejects.toThrow('configured');
  });
  it('returns retryable failure on storage errors instead of acknowledging a lost event', async () => {
    const receiver = await start({ accept: async () => { throw new Error('Private storage detail'); } });
    const response = await send(receiver);
    expect(response.status).toBe(503);
    expect(await response.text()).toBe('{"accepted":false}');
  });
  it('rejects invalid signatures, methods, paths and content types without pending work', async () => {
    const { inbox } = await setup();
    const receiver = await start(inbox);
    expect((await send(receiver, { ...signed(), signature: 'a'.repeat(64) })).status).toBe(400);
    expect((await fetch(receiver.url)).status).toBe(405);
    expect((await fetch(receiver.url + '/other')).status).toBe(404);
    expect((await send(receiver, signed(), { headers: { 'Content-Type': 'text/plain' } })).status).toBe(415);
    expect(await inbox.pending()).toEqual([]);
  });
  it('rejects an oversized body before storing it', async () => {
    const { inbox } = await setup();
    const receiver = await start(inbox);
    expect((await send(receiver, { ...signed(), rawBody: Buffer.alloc(1_048_577) })).status).toBe(413);
    expect(await inbox.pending()).toEqual([]);
  });
});
