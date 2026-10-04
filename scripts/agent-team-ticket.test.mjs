import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createTeamTicketAdapter, createTeamTicketUpdate } from './agent-team-ticket.mjs';

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const policy = { organizationId: id(1), teamId: id(2), projectId: id(3), readerAppUserId: id(4), writerAppUserId: id(5), humanActorIds: [id(6)] };
const body = 'One bounded question';
const intent = () => createTeamTicketUpdate({ taskId: 'task:one', issueId: id(7), scopeRevision: 'revision:one', kind: 'question', body, questionId: 'question:one', intentAt: 100, writerAppUserId: id(5) });
function fixture(options = {}) {
  let writes = 0;
  let attempts = 0;
  let present = false;
  let receipt = intent();
  const destination = () => ({ status: 'available', observedAt: 202, ...policy, readerIsApp: true, issueId: id(7), private: true, active: true, synced: false });
  const authority = () => ({ status: 'available', observedAt: 200, taskId: receipt.taskId, issueId: receipt.issueId, scopeRevision: receipt.scopeRevision, active: true, kind: 'implementation', actorIsApp: false, actorId: id(6), reference: 'trusted:decision', expiresAt: 300 });
  const readback = () => ({ ...destination(), ...receipt, writerIsApp: true, onBehalfOf: null, url: 'https://linear.app/navet/issue/NAV-1', status: 'available', observedAt: 200 });
  const answer = () => ({ ...destination(), answerId: id(8), questionId: receipt.questionId, questionUpdateId: receipt.updateId, taskId: receipt.taskId, scopeRevision: receipt.scopeRevision, actorIsApp: false, actorId: id(6), onBehalfOf: null, scopeChanged: false, reference: 'trusted:answer', createdAt: 201, observedAt: 202, bodyHash: receipt.bodyHash, text: body });
  const callbacks = {
    policy, now: () => 202, readDestination: async () => destination(), readAuthority: async () => ({ ...authority(), observedAt: 202 }),
    beginAttempt: async ({ receipt: value }) => { attempts++; receipt = { ...value, attemptedAt: 202 }; return { action: 'send', receipt }; },
    writeUpdate: async () => { writes++; present = true; },
    readUpdate: async () => present ? { ...readback(), observedAt: 202 } : { status: 'absent', observedAt: 202 },
    readAnswer: async () => ({ ...answer(), createdAt: 203, observedAt: 204 }),
    ...options,
  };
  return { adapter: createTeamTicketAdapter(callbacks), callbacks, receipt: () => receipt, counts: () => ({ writes, attempts }), setPresent: () => { present = true; }, readback, answer };
}

test('identical content has one stable update identity; changes invalidate it', () => {
  const first = intent();
  assert.equal(createTeamTicketUpdate({ ...first, body, intentAt: 101 }).updateId, first.updateId);
  assert.notEqual(createTeamTicketUpdate({ ...first, body: 'Changed' }).updateId, first.updateId);
  assert.notEqual(createTeamTicketUpdate({ ...first, body, scopeRevision: 'revision:two' }).updateId, first.updateId);
});

test('durable attempt precedes write and independent readback verifies exact content', async () => {
  const f = fixture();
  const result = await f.adapter.deliver({ receipt: intent(), body });
  assert.equal(result.status, 'verified');
  assert.deepEqual(f.counts(), { attempts: 1, writes: 1 });
  assert.equal((await f.adapter.deliver({ receipt: { ...result.receipt, status: 'verified' }, body })).status, 'verified');
  assert.deepEqual(f.counts(), { attempts: 1, writes: 1 });
});

test('uncertain writes reconcile after restart and never resend even when absent', async () => {
  const f = fixture({ writeUpdate: async () => { throw new Error('lost response'); } });
  assert.equal((await f.adapter.deliver({ receipt: intent(), body })).status, 'uncertain');
  const durable = f.receipt();
  const restarted = fixture();
  assert.equal((await restarted.adapter.deliver({ receipt: durable, body })).status, 'uncertain');
  assert.deepEqual(restarted.counts(), { writes: 0, attempts: 0 });
  restarted.setPresent();
  assert.equal((await restarted.adapter.deliver({ receipt: durable, body })).status, 'verified');
});

test('unavailable destination, app authority and scope changes stop before reservation', async () => {
  for (const override of [
    { readDestination: async () => ({ status: 'unavailable' }) },
    { readAuthority: async () => ({ status: 'available', observedAt: 202, actorIsApp: true }) },
    { readAuthority: async () => ({ status: 'available', observedAt: 202, scopeRevision: 'other' }) },
  ]) {
    const f = fixture(override);
    assert.equal((await f.adapter.deliver({ receipt: intent(), body })).status, 'blocked');
    assert.deepEqual(f.counts(), { writes: 0, attempts: 0 });
  }
});

test('answer requires exact verified question, human identity and unchanged accepted scope', async () => {
  const f = fixture();
  const published = await f.adapter.deliver({ receipt: intent(), body });
  const receipt = { ...published.receipt, status: 'verified' };
  const acceptedAnswer = { ...f.answer(), createdAt: 203, observedAt: 204 };
  const callbacks = { ...f.callbacks, now: () => 204,
    readUpdate: async () => ({ ...f.readback(), observedAt: 204 }),
    readAuthority: async () => ({ status: 'available', observedAt: 204, taskId: receipt.taskId, issueId: receipt.issueId, scopeRevision: receipt.scopeRevision, active: true, kind: 'implementation', actorIsApp: false, actorId: id(6), reference: 'trusted:decision', expiresAt: 300 }),
    readAnswer: async () => acceptedAnswer,
  };
  assert.equal((await createTeamTicketAdapter(callbacks).acceptAnswer({ receipt, answerId: id(8) })).status, 'accepted');
  for (const change of [{ actorIsApp: true }, { actorId: id(5) }, { scopeChanged: true }, { questionUpdateId: id(9) }, { scopeRevision: 'other' }, { onBehalfOf: id(6) }]) {
    const adapter = createTeamTicketAdapter({ ...callbacks, readAnswer: async () => ({ ...acceptedAnswer, ...change }) });
    assert.equal((await adapter.acceptAnswer({ receipt, answerId: id(8) })).status, 'blocked');
  }
});

test('hanging reads and canceled operations cannot send', async () => {
  const f = fixture({ maxOperationMs: 5, readDestination: async () => new Promise(() => {}) });
  assert.equal((await f.adapter.deliver({ receipt: intent(), body })).status, 'blocked');
  assert.deepEqual(f.counts(), { writes: 0, attempts: 0 });
  const controller = new AbortController();
  controller.abort();
  const canceled = fixture({ signal: controller.signal });
  assert.equal((await canceled.adapter.deliver({ receipt: intent(), body })).status, 'blocked');
  assert.deepEqual(canceled.counts(), { writes: 0, attempts: 0 });
});

test('all scoped update kinds verify and agent stages cannot establish implementation authority', async () => {
  for (const kind of ['proposal', 'question', 'answer', 'pr-evidence', 'stage']) {
    const receipt = createTeamTicketUpdate({ ...intent(), kind, body,
      questionId: ['question', 'answer'].includes(kind) ? 'question:one' : null,
      stage: kind === 'stage' ? 'In delivery' : null });
    const f = fixture({
      beginAttempt: async ({ receipt: value }) => ({ action: 'send', receipt: { ...value, attemptedAt: 202 } }),
      readUpdate: async (value) => value.attemptedAt ? {
        ...policy, observedAt: 202, readerIsApp: true, private: true, active: true,
        synced: false, ...value, writerIsApp: true, onBehalfOf: null, url: 'https://linear.app/navet/issue/NAV-1',
        status: 'available',
      } : { status: 'absent', observedAt: 202 },
    });
    assert.equal((await f.adapter.deliver({ receipt, body })).status, 'verified');
  }
  const stage = createTeamTicketUpdate({ ...intent(), kind: 'stage', stage: 'In delivery', questionId: null, body });
  const f = fixture({ readAuthority: async (value) => ({ status: 'available', observedAt: 202,
    taskId: value.taskId, issueId: value.issueId, scopeRevision: value.scopeRevision, active: true,
    kind: 'discovery', actorIsApp: false, actorId: id(6), reference: 'trusted:idea', expiresAt: 300 }) });
  assert.equal((await f.adapter.deliver({ receipt: stage, body })).status, 'blocked');
  assert.deepEqual(f.counts(), { attempts: 0, writes: 0 });
});

test('authority withdrawal after durable attempt prevents sending and requires reconciliation', async () => {
  let reads = 0;
  const f = fixture({ readAuthority: async (value) => ({ status: 'available', observedAt: 202,
    taskId: value.taskId, issueId: value.issueId, scopeRevision: value.scopeRevision, active: ++reads === 1,
    kind: 'implementation', actorIsApp: false, actorId: id(6), reference: 'trusted:decision', expiresAt: 300 }) });
  assert.equal((await f.adapter.deliver({ receipt: intent(), body })).status, 'uncertain');
  assert.deepEqual(f.counts(), { attempts: 1, writes: 0 });
});

test('wrong readback author or body never verifies a write acknowledgement', async () => {
  for (const change of [{ writerIsApp: false }, { writerAppUserId: id(6) }, { bodyHash: intent().bodyHash.replace(/.$/, '0') }]) {
    const f = fixture();
    let present = false;
    const adapter = createTeamTicketAdapter({ ...f.callbacks,
      writeUpdate: async () => { present = true; },
      readUpdate: async () => present ? { ...f.readback(), ...change, observedAt: 202 } : { status: 'absent', observedAt: 202 },
    });
    assert.equal((await adapter.deliver({ receipt: intent(), body })).status, 'uncertain');
  }
});
