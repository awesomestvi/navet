import { createHash } from 'node:crypto';
import { createPlanningBinding, evaluatePlanningObservation } from './agent-planning-scope.mjs';

function clock(now) {
  const value = now();
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Invalid planning refresh clock.');
  return value;
}
function completeIssue(issue, issueId, observedAt) {
  if ((issue?.uuid ?? issue?.id) !== issueId ||
      !Array.isArray(issue.labels) || issue.labels.some((label) => typeof label !== 'string') ||
      ['archivedAt', 'canceledAt'].some((key) => !Object.hasOwn(issue, key) ||
        (issue[key] !== null && (typeof issue[key] !== 'string' || !Number.isFinite(Date.parse(issue[key])))))) {
    throw new Error('Incomplete or mismatched planning service read.');
  }
  const binding = createPlanningBinding(issue);
  // This checks complete label names too, without treating a current stage as human authority.
  evaluatePlanningObservation(binding, { status: 'available', issue, reference: 'service-read', observedAt }, observedAt);
  return binding;
}

// readIssue must perform a complete fresh read through the owning service. This consumer
// never claims tasks, dispatches work, grants approval, or changes Linear. A lost read keeps
// the event pending and replaces earlier passes on the caller's already-owned bound tasks.
export async function reconcileLinearRefresh({ inbox, eventId, store, owner, readIssue, now = () => Date.now() }) {
  if (typeof readIssue !== 'function' || typeof owner !== 'string' || !owner.trim()) {
    throw new Error('Planning refresh requires an owning coordinator and service reader.');
  }
  const pending = await inbox.pending();
  const record = pending.find((entry) => entry.receipt.eventId === eventId);
  if (!record) throw new Error('Unknown or already confirmed planning refresh.');
  const startedAt = clock(now);
  if (startedAt < record.firstSeenAt) throw new Error('Planning refresh precedes event receipt.');
  let issue;
  let binding;
  let status = 'available';
  try { issue = await readIssue(record.receipt.issueId); }
  catch { status = 'unavailable'; }
  const observedAt = clock(now);
  if (observedAt < startedAt) throw new Error('Planning refresh clock moved backwards.');
  if (observedAt - startedAt > 60_000) status = 'unavailable';
  if (status === 'available') {
    try { binding = completeIssue(issue, record.receipt.issueId, observedAt); }
    catch { status = 'unavailable'; }
  }
  const reference = 'sha256:' + createHash('sha256').update(JSON.stringify({
    eventId, issueId: record.receipt.issueId, startedAt, observedAt, status,
    ...(binding ? { binding, labels: [...issue.labels].sort(), archivedAt: issue.archivedAt, canceledAt: issue.canceledAt } : {}),
  })).digest('hex');
  const observation = { status, reference, observedAt, ...(status === 'available' ? { issue } : {}) };
  const tasks = (await store.list()).filter((task) => task.planning?.binding.issueId === record.receipt.issueId &&
    !['delivered', 'terminal-failure'].includes(task.state));
  // Normal store mutations recheck leases, ordering, and latched revocation. A partial
  // update or lost acknowledgement leaves the inbox pending for idempotent reconciliation.
  for (const task of tasks) {
    await store.mutate(task.id, 'planning-observation', { owner, observation });
  }
  if (status !== 'available') return { eventId, decision: 'retry', updatedTasks: tasks.length, authority: 'none' };
  const confirmation = await inbox.confirm(eventId, { reference, observedAt });
  return { ...confirmation, updatedTasks: tasks.length };
}
