import { preparePlanningDispatch } from './agent-planning-dispatch.mjs';
import { planningRequestMatchesTask, validatePlanningRequestObservation } from './agent-planning-intake.mjs';

// Installed worker adapters are trusted boundaries. Only a durable first-send decision permits
// creation. Find/bind recovers uncertainty; a missing observation never permits a replacement.
export async function dispatchPlanningDelivery({ store, owner, taskId, resourceToken, readIssue,
  readRequest, createDelivery, findDelivery, now = () => Date.now(), maxRunMs = 60_000, signal }) {
  let controller;
  let timer;
  let cancel;
  let receipt;
  try {
    if (!store || typeof store.list !== 'function' || typeof store.mutate !== 'function' ||
        [readIssue, readRequest, createDelivery, findDelivery, now].some((value) => typeof value !== 'function') ||
        [owner, taskId].some((value) => typeof value !== 'string' || !value.trim()) ||
        !Number.isSafeInteger(maxRunMs) || maxRunMs < 1 || maxRunMs > 60_000) throw new Error('Invalid worker dispatch.');
    const startedAt = now();
    controller = new AbortController();
    cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    timer = setTimeout(cancel, maxRunMs);
    if (signal?.aborted) controller.abort();
    const clock = () => {
      const value = now();
      if (controller.signal.aborted || !Number.isSafeInteger(startedAt) || startedAt <= 0 ||
          !Number.isSafeInteger(value) || value < startedAt || value - startedAt >= maxRunMs) throw new Error('Expired worker dispatch.');
      return value;
    };
    const bounded = async (operation) => {
      clock();
      let rejectAbort;
      const aborted = new Promise((_, reject) => { rejectAbort = reject; });
      const onAbort = () => rejectAbort(new Error('Canceled worker observation.'));
      controller.signal.addEventListener('abort', onAbort, { once: true });
      try {
        if (controller.signal.aborted) throw new Error('Canceled worker observation.');
        const result = await Promise.race([operation(), aborted]);
        clock();
        return result;
      } finally {
        controller.signal.removeEventListener('abort', onAbort);
      }
    };
    const currentTask = async () => {
      clock();
      const task = (await store.list()).find((item) => item.id === taskId);
      if (!task?.planning || task.lease?.owner !== owner || task.lease.expiresAt <= clock() ||
          ['delivered', 'terminal-failure'].includes(task.state)) throw new Error('Current dispatch owner unavailable.');
      return task;
    };
    const bind = async (handle) => {
      const validText = (value) => typeof value === 'string' && value.trim() && value.length <= 4096;
      if ((!validText(handle?.threadId) && !validText(handle?.clientThreadId)) ||
          (handle.threadId != null && !validText(handle.threadId)) ||
          (handle.clientThreadId != null && !validText(handle.clientThreadId))) throw new Error('Worker handle unavailable.');
      // An acknowledgement is recovery evidence even if cancellation occurs during local commit.
      const task = await store.mutate(taskId, 'bind', { owner, token: receipt.token,
        ...(handle.threadId ? { threadId: handle.threadId } : {}),
        ...(handle.clientThreadId ? { clientThreadId: handle.clientThreadId } : {}) });
      receipt = task.dispatch;
      return { status: 'bound', taskId, dispatch: structuredClone(receipt), canceled: controller.signal.aborted };
    };
    const reconcile = async () => {
      const readStartedAt = clock();
      const observation = await bounded(() => findDelivery({ taskId, dispatchToken: receipt.token }, { signal: controller.signal }));
      if (observation?.status !== 'found' || observation.taskId !== taskId ||
          observation.dispatchToken !== receipt.token || typeof observation.reference !== 'string' ||
          !observation.reference.trim() || !Number.isSafeInteger(observation.observedAt) ||
          observation.observedAt < readStartedAt || observation.observedAt > clock()) {
        return { status: 'pending', taskId, reason: 'worker-dispatch-unverified', dispatch: structuredClone(receipt) };
      }
      return bind(observation);
    };
    let task = await currentTask();
    receipt = task.dispatch;
    if (receipt && (receipt.protocol !== 'attempt-receipt-v1' || receipt.attemptedAt || receipt.threadId || receipt.clientThreadId)) {
      return await reconcile();
    }
    const preparation = await preparePlanningDispatch({ store, owner, taskId, resourceToken,
      readIssue, readRequest, now, signal: controller.signal, maxRunMs: maxRunMs - (clock() - startedAt),
      dispatchProtocol: 'attempt-receipt-v1', resumeUnattempted: true });
    receipt = preparation.dispatch ?? receipt;
    if (preparation.status === 'blocked') throw new Error('Planning preparation blocked.');
    task = await currentTask();
    receipt = task.dispatch;
    if (!receipt || receipt.protocol !== 'attempt-receipt-v1') throw new Error('Unverified receipt protocol.');
    const identity = { source: task.source, requestId: task.requestId };
    const authorityStartedAt = clock();
    const observation = await bounded(() => readRequest({ ...identity }, { signal: controller.signal }));
    if (observation?.status === 'withdrawn') {
      await store.mutate(taskId, 'request-revocation', { owner, observation: {
        ...identity, status: 'withdrawn', reference: task.authority.reference, observedAt: clock(),
      } });
    }
    const request = validatePlanningRequestObservation(observation, identity, authorityStartedAt, clock());
    if (!planningRequestMatchesTask(task, request)) throw new Error('Worker scope changed.');
    clock();
    const attempted = await store.mutate(taskId, 'dispatch-attempt', { owner, token: receipt.token, authority: request.authority });
    receipt = attempted.dispatch;
    if (attempted.dispatchDecision.action !== 'send') return await reconcile();
    clock();
    const handle = await bounded(() => createDelivery({ taskId, dispatchToken: receipt.token,
      mode: task.mode, revision: task.revision, brief: structuredClone(task.brief) }, { signal: controller.signal }));
    return await bind(handle);
  } catch {
    return { status: receipt ? 'pending' : 'blocked', taskId, reason: 'worker-dispatch-unverified',
      ...(receipt ? { dispatch: structuredClone(receipt) } : {}) };
  } finally {
    clearTimeout(timer);
    if (cancel) signal?.removeEventListener('abort', cancel);
    controller?.abort();
  }
}
