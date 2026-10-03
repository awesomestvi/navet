import { AgentTaskStore } from './agent-task-store.mjs';
import { verifyLinearEvent } from './agent-linear-event.mjs';

const HASH = /^sha256:[a-f0-9]{64}$/;
const RECEIPT_KEYS = ['version', 'eventId', 'rawBodySha256', 'organizationId', 'webhookId', 'entityId',
  'issueId', 'type', 'action', 'actor', 'createdAt', 'sentAt', 'observedAt', 'intent', 'authority'];
function validReceipt(receipt) {
  if (!receipt || Object.keys(receipt).length !== RECEIPT_KEYS.length ||
      RECEIPT_KEYS.some((key) => !Object.hasOwn(receipt, key)) || receipt.version !== 1 ||
      !HASH.test(receipt.eventId) || !/^[a-f0-9]{64}$/.test(receipt.rawBodySha256) ||
      receipt.authority !== 'none' || !['refresh-planning', 'ignore-unsupported-event'].includes(receipt.intent) ||
      ['organizationId', 'webhookId', 'entityId', 'type', 'createdAt'].some((key) => typeof receipt[key] !== 'string' || !receipt[key]) ||
      !['create', 'update', 'remove'].includes(receipt.action) ||
      (receipt.issueId !== null && (typeof receipt.issueId !== 'string' || !receipt.issueId)) ||
      (receipt.actor !== null && (!receipt.actor || Object.keys(receipt.actor).length !== 2 ||
        typeof receipt.actor.id !== 'string' || !receipt.actor.id || typeof receipt.actor.type !== 'string' || !receipt.actor.type)) ||
      [receipt.sentAt, receipt.observedAt].some((time) => !Number.isSafeInteger(time) || time <= 0) ||
      (receipt.intent === 'refresh-planning') !== Boolean(receipt.issueId)) {
    throw new Error('Unsupported or corrupt Linear event receipt.');
  }
}
function inboxIn(state) {
  if (state.linearEventInbox === undefined) state.linearEventInbox = { version: 1, receipts: [] };
  const inbox = state.linearEventInbox;
  if (inbox?.version !== 1 || Object.keys(inbox).length !== 2 || !Array.isArray(inbox.receipts)) {
    throw new Error('Unsupported or corrupt Linear event inbox.');
  }
  const ids = new Set();
  for (const record of inbox.receipts) {
    if (!record || typeof record !== 'object') throw new Error('Unsupported or corrupt Linear event inbox.');
    validReceipt(record.receipt);
    if (Object.keys(record).length !== 5 || ids.has(record.receipt.eventId) ||
        !Number.isSafeInteger(record.deliveries) || record.deliveries < 1 ||
        !Number.isSafeInteger(record.firstSeenAt) || record.firstSeenAt <= 0 ||
        !Number.isSafeInteger(record.lastSeenAt) || record.lastSeenAt < record.firstSeenAt ||
        (record.confirmation !== null && (!record.confirmation || Object.keys(record.confirmation).length !== 2 ||
          !HASH.test(record.confirmation.reference) || !Number.isSafeInteger(record.confirmation.observedAt) ||
          record.confirmation.observedAt < record.firstSeenAt))) throw new Error('Unsupported or corrupt Linear event inbox.');
    ids.add(record.receipt.eventId);
  }
  return inbox;
}
function pendingReceipt(record) {
  return record.receipt.intent === 'refresh-planning' && !record.confirmation;
}
function compactInbox(inbox, now, { deduplicationMs, maxSettledReceipts }) {
  const settled = inbox.receipts.filter((record) => !pendingReceipt(record))
    .filter((record) => Math.max(record.lastSeenAt, record.confirmation?.observedAt ?? 0) >= now - deduplicationMs)
    .reverse().sort((a, b) => Math.max(b.lastSeenAt, b.confirmation?.observedAt ?? 0) - Math.max(a.lastSeenAt, a.confirmation?.observedAt ?? 0));
  const retained = new Set(settled.slice(0, maxSettledReceipts));
  inbox.receipts = inbox.receipts.filter((record) => pendingReceipt(record) || retained.has(record));
  return inbox;
}

// Lease handoffs retain progress only while the latest observation matches this read.
function taskHasLinearRefresh(task, eventId, firstSeenAt, reference) {
  const observation = task.planning.observation;
  return observation &&
    (['pass', 'fail'].includes(observation.result) || observation.reason === 'planning-stage-ambiguous') &&
    observation.observedAt >= firstSeenAt &&
    observation.reference === `linear-refresh:${eventId}:${reference}`;
}

export class LinearEventInputError extends Error {}

// Receipt metadata shares the existing store's process-safe atomic transaction mechanism.
// It never enqueues a task, alters a task lease or supplies implementation authority.
export class AgentLinearInbox {
  constructor(directory, { now = () => Date.now(), lockTimeoutMs = 2000,
    deduplicationMs = 86_400_000, maxSettledReceipts = 1000, maxPendingReceipts = 1000 } = {}) {
    if ([deduplicationMs, maxSettledReceipts, maxPendingReceipts].some((value) => !Number.isSafeInteger(value) || value <= 0)) {
      throw new Error('Positive Linear inbox retention and capacity limits are required.');
    }
    this.retention = { deduplicationMs, maxSettledReceipts };
    this.maxPendingReceipts = maxPendingReceipts;
    this.now = now;
    this.store = new AgentTaskStore(directory, { now, lockTimeoutMs });
  }
  async accept(input) {
    const now = this.now();
    let receipt;
    try { receipt = verifyLinearEvent({ ...input, now }); }
    catch { throw new LinearEventInputError('Linear event verification failed.'); }
    return this.store.transaction((state) => {
      const inbox = compactInbox(inboxIn(state), now, this.retention);
      let record = inbox.receipts.find((entry) => entry.receipt.eventId === receipt.eventId);
      let decision;
      if (record) {
        if (now < record.lastSeenAt || record.deliveries === Number.MAX_SAFE_INTEGER) throw new Error('Invalid Linear inbox receipt clock or counter.');
        record.deliveries++;
        record.lastSeenAt = now;
        decision = record.receipt.intent !== 'refresh-planning' ? 'ignore' : record.confirmation ? 'skip' : 'reconcile';
      } else {
        if (receipt.intent === 'refresh-planning' && inbox.receipts.filter(pendingReceipt).length >= this.maxPendingReceipts) {
          throw new Error('Linear inbox pending capacity exhausted; retry after reconciliation.');
        }
        record = { receipt, deliveries: 1, firstSeenAt: now, lastSeenAt: now, confirmation: null };
        inbox.receipts.push(record);
        decision = receipt.intent === 'refresh-planning' ? 'refresh' : 'ignore';
      }
      compactInbox(inbox, now, this.retention);
      return { eventId: receipt.eventId, decision, authority: 'none' };
    });
  }
  async pending() {
    return this.store.transaction((state) => compactInbox(inboxIn(state), this.now(), this.retention).receipts.filter(pendingReceipt));
  }
  async confirm(eventId, observation, { requireTaskReconciliation = false } = {}) {
    const now = this.now();
    if (!Number.isSafeInteger(now) || now <= 0 || !HASH.test(eventId) || !HASH.test(observation?.reference) ||
        !Number.isSafeInteger(observation.observedAt) || observation.observedAt > now ||
        observation.observedAt < now - 60_000) throw new Error('Fresh hashed Linear refresh evidence is required.');
    return this.store.transaction((state) => {
      const inbox = compactInbox(inboxIn(state), now, this.retention);
      const record = inbox.receipts.find((entry) => entry.receipt.eventId === eventId);
      if (!record || record.receipt.intent !== 'refresh-planning') throw new Error('Unknown Linear refresh event.');
      if (observation.observedAt < record.firstSeenAt) throw new Error('Linear refresh predates event receipt.');
      if (record.confirmation) return { eventId, decision: 'skip', authority: 'none' };
      if (requireTaskReconciliation && state.tasks.some((task) =>
        task.planning?.binding.issueId === record.receipt.issueId &&
        !['delivered', 'terminal-failure'].includes(task.state) &&
        !taskHasLinearRefresh(task, eventId, record.firstSeenAt, observation.reference))) {
        return { eventId, decision: 'retry', authority: 'none' };
      }
      record.confirmation = { reference: observation.reference, observedAt: observation.observedAt };
      inbox.receipts = [...inbox.receipts.filter((entry) => entry !== record), record];
      compactInbox(inbox, now, this.retention);
      return { eventId, decision: 'confirmed', authority: 'none' };
    });
  }
}
