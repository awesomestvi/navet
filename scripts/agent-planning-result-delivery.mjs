import { isDeepStrictEqual } from 'node:util';
import { linearResultBodyHash } from './agent-linear-result-reader.mjs';
import { validatePlanningRequestObservation } from './agent-planning-intake.mjs';

function matchesRequest(task, request) {
  return request.mode === task.mode && request.revision === task.revision &&
    isDeepStrictEqual(request.planningBinding, task.planning.binding) && isDeepStrictEqual(request.brief, task.brief) &&
    isDeepStrictEqual(request.resourceLimits, task.resources?.limits) &&
    isDeepStrictEqual([...new Set([...(request.requiredGates ?? []), 'output'])].sort(), [...task.requiredGates].sort()) &&
    request.authority.actor === task.authority.actor && request.authority.reference === task.authority.reference;
}

// A coordinator handoff, not an activation switch or quality/acceptance decision. Supply live,
// independently authenticated readers and a writer factory using the installed app policy.
export async function deliverPlanningResult({ store, owner, taskId, head, body, writerAppUserId,
  resourceToken, readIssue, readRequest, readResult, createWriter, now = () => Date.now(),
  maxRunMs = 60_000, signal }) {
  if (!store || typeof store.list !== 'function' || typeof store.mutate !== 'function' ||
      [readIssue, readRequest, readResult, createWriter, now].some((value) => typeof value !== 'function') ||
      [owner, taskId, writerAppUserId].some((value) => typeof value !== 'string' || !value.trim()) ||
      !(head === null || (typeof head === 'string' && head.trim())) ||
      !Number.isSafeInteger(maxRunMs) || maxRunMs < 1 || maxRunMs > 60_000) {
    throw new Error('Planning result handoff requires scoped identity, current head and bounded service adapters.');
  }
  const controller = new AbortController();
  const cancel = () => controller.abort();
  let onAbort;
  const expired = new Promise((_, reject) => {
    onAbort = () => reject(new Error('Planning result handoff canceled or expired.'));
    controller.signal.addEventListener('abort', onAbort, { once: true });
  });
  // Local atomic commits are fenced rather than abandoned on an observation timeout.
  // A timer may fire before the first remote read has attached a race handler.
  void expired.catch(() => {});
  const localOperations = new Set();
  const local = (operation) => {
    clock();
    const pending = Promise.resolve().then(operation);
    localOperations.add(pending);
    pending.then(() => localOperations.delete(pending), () => localOperations.delete(pending));
    return pending;
  };
  const timer = setTimeout(cancel, maxRunMs);
  signal?.addEventListener('abort', cancel, { once: true });
  let startedAt;
  let commentId;
  let attempted = false;
  const clock = () => {
    const value = now();
    if (controller.signal.aborted || !Number.isSafeInteger(startedAt) || startedAt <= 0 ||
        !Number.isSafeInteger(value) || value <= 0 ||
        value < startedAt || value - startedAt > maxRunMs) throw new Error('Stale coordinator operation.');
    return value;
  };
  const bounded = (operation) => Promise.race([operation, expired]);
  const mutate = async (action, input) => {
    clock();
    const result = await local(() => store.mutate(taskId, action, { owner, ...input }));
    clock();
    return result;
  };
  const currentTask = async () => {
    clock();
    const task = (await local(() => store.list())).find((item) => item.id === taskId);
    if (!task || task.head !== head || !task.planning || !['research', 'audit'].includes(task.mode) ||
        task.brief?.resultDestination !== 'linear-planning' || task.lease?.owner !== owner || task.lease.expiresAt <= clock()) {
      throw new Error('Current planning result owner or scope is unavailable.');
    }
    return task;
  };
  const observeResult = async (receipt) => {
    const readStartedAt = clock();
    const failure = () => ({ status: 'unavailable', reference: 'linear-result-unavailable', observedAt: clock() });
    let observation;
    try {
      observation = await bounded(readResult({ commentId: receipt.commentId, issueId: receipt.issueId,
        bodyHash: receipt.bodyHash, notBefore: receipt.intentAt }));
      if (!['available', 'unavailable'].includes(observation?.status) ||
          !Number.isSafeInteger(observation.observedAt) || observation.observedAt < readStartedAt || observation.observedAt > clock()) {
        throw new Error('Result handoff requires fresh owning-service readback.');
      }
    } catch {
      // A fresh failed probe can invalidate a pass; it cannot renew cached success. Cancellation
      // still stops record writing because clock() rejects an aborted coordinator operation.
      observation = failure();
    }
    try {
      await mutate('planning-result-observation', { commentId: receipt.commentId, observation });
    } catch {
      if (observation.status !== 'available') throw new Error('Result observation was not recorded.');
      observation = failure();
      await mutate('planning-result-observation', { commentId: receipt.commentId, observation });
    }
    return observation.status === 'available'
      ? { status: 'verified', taskId, commentId: receipt.commentId, reference: observation.reference, observedAt: observation.observedAt }
      : { status: 'pending', taskId, commentId: receipt.commentId, reason: 'result-readback-unverified' };
  };
  try {
    if (signal?.aborted) throw new Error('Canceled handoff.');
    startedAt = now();
    let task = await currentTask();
    if (task.planningResult) {
      const receipt = task.planningResult;
      commentId = receipt.commentId;
      attempted = Boolean(receipt.attemptedAt);
      if (receipt.writerAppUserId !== writerAppUserId || receipt.head !== head || receipt.revision !== task.revision ||
          receipt.planningRevision !== task.planning.binding.revision ||
          (body !== undefined && receipt.bodyHash !== linearResultBodyHash(body))) throw new Error('Reserved result scope changed.');
      // Monitoring an attempted or already observed result needs no new publication authority.
      // It never invokes the writer, even when the source has subsequently been withdrawn.
      if (attempted || receipt.status !== 'pending') return await observeResult(receipt);
    }
    const bodyHash = linearResultBodyHash(body);
    const scopeStartedAt = clock();
    const scope = await bounded(readIssue(task.planning.binding.issueId));
    if (!Number.isSafeInteger(scope?.observedAt) || scope.observedAt < scopeStartedAt || scope.observedAt > clock()) {
      throw new Error('Result handoff requires a fresh proposal read.');
    }
    await mutate('planning-observation', { observation: scope });
    task = await currentTask();
    const authorityStartedAt = clock();
    const request = validatePlanningRequestObservation(await bounded(readRequest({ source: task.source, requestId: task.requestId })),
      { source: task.source, requestId: task.requestId }, authorityStartedAt, clock());
    if (!matchesRequest(task, request)) throw new Error('Result handoff authority changed.');
    const reserved = await mutate('planning-result-intent', { head, bodyHash, writerAppUserId, resourceToken, authority: request.authority });
    commentId = reserved.planningResult.commentId;
    const writer = createWriter({ readIssue, readRequest, signal: controller.signal,
      beginWrite: async (input) => {
        if (input.taskId !== taskId || input.commentId !== commentId) throw new Error('Result send identity mismatch.');
        await mutate('planning-observation', { observation: input.observation });
        const result = await mutate('planning-result-attempt', { commentId, authority: input.authority });
        attempted = Boolean(result.planningResult.attemptedAt);
        return result.planningResultDecision;
      } });
    if (typeof writer !== 'function') throw new Error('Result writer unavailable.');
    const outcome = await bounded(writer({ task: reserved, decision: reserved.planningResultDecision, body }));
    task = await currentTask();
    attempted = Boolean(task.planningResult?.attemptedAt);
    if (!attempted) return { status: 'blocked', taskId, commentId, reason: 'result-send-not-authorized' };
    if (!['acknowledged', 'uncertain'].includes(outcome?.status)) {
      return { status: 'pending', taskId, commentId, reason: 'result-write-requires-reconciliation' };
    }
    return await observeResult(task.planningResult);
  } catch {
    // Partial intent and uncertain send receipts remain durable. Do not infer a failed write,
    // renew authority, manufacture output evidence or transition the task to delivered.
    return { status: attempted ? 'pending' : 'blocked', taskId, ...(commentId ? { commentId } : {}),
      reason: attempted ? 'result-write-requires-reconciliation' : 'result-handoff-unverified' };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
    controller.signal.removeEventListener('abort', onAbort);
    controller.abort();
    while (localOperations.size) await Promise.allSettled([...localOperations]);
  }
}
