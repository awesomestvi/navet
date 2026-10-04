import { planningRequestMatchesTask, validatePlanningRequestObservation } from './agent-planning-intake.mjs';
import { evaluatePlanningObservation } from './agent-planning-scope.mjs';

// Connect existing queue ownership, complete planning reads and independently verified human
// decisions to the existing durable dispatch intent. Worker creation belongs to the coordinator.
export async function preparePlanningDispatch({ store, owner, taskId, resourceToken, readIssue,
  readRequest, now = () => Date.now(), maxRunMs = 60_000, signal }) {
  let controller;
  let cancel;
  let timer;
  let intent;
  try {
    if (!store || typeof store.list !== 'function' || typeof store.mutate !== 'function' ||
        [readIssue, readRequest, now].some((value) => typeof value !== 'function') ||
        [owner, taskId].some((value) => typeof value !== 'string' || !value.trim()) ||
        !Number.isSafeInteger(maxRunMs) || maxRunMs < 1 || maxRunMs > 60_000) throw new Error('Invalid dispatch handoff.');
    const startedAt = now();
    controller = new AbortController();
    cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) controller.abort();
    timer = setTimeout(cancel, maxRunMs);
    const clock = () => {
      const value = now();
      if (controller.signal.aborted || !Number.isSafeInteger(startedAt) || startedAt <= 0 ||
          !Number.isSafeInteger(value) || value < startedAt || value - startedAt >= maxRunMs) {
        throw new Error('Dispatch handoff canceled or expired.');
      }
      return value;
    };
    const boundedRead = async (operation) => {
      clock();
      let rejectAbort;
      const aborted = new Promise((_, reject) => { rejectAbort = reject; });
      const onAbort = () => rejectAbort(new Error('Canceled dispatch read.'));
      controller.signal.addEventListener('abort', onAbort, { once: true });
      try {
        if (controller.signal.aborted) throw new Error('Canceled dispatch read.');
        const result = await Promise.race([operation(), aborted]);
        clock();
        return result;
      } finally {
        controller.signal.removeEventListener('abort', onAbort);
      }
    };
    // Atomic local operations are awaited, never abandoned on an observation timeout.
    clock();
    const task = (await store.list()).find((item) => item.id === taskId);
    if (!task?.planning || task.lease?.owner !== owner || task.lease.expiresAt <= clock() ||
        ['delivered', 'terminal-failure'].includes(task.state)) throw new Error('Planning dispatch requires current ownership.');
    if (task.dispatch) {
      return { status: 'reconcile', taskId, dispatch: structuredClone(task.dispatch) };
    }
    if (task.requestRevocation) throw new Error('Request authority was withdrawn.');
    const identity = { source: task.source, requestId: task.requestId };
    const currentRequest = async () => {
      const requestStartedAt = clock();
      const observation = await boundedRead(() => readRequest({ ...identity }, { signal: controller.signal }));
      if (observation?.status === 'withdrawn') {
        await store.mutate(taskId, 'request-revocation', { owner, observation: {
          ...identity, status: 'withdrawn', reference: task.authority.reference, observedAt: clock(),
        } });
      }
      return validatePlanningRequestObservation(observation, identity, requestStartedAt, clock());
    };
    const initial = await currentRequest();
    if (!planningRequestMatchesTask(task, initial)) throw new Error('Accepted task scope changed.');
    const planningStartedAt = clock();
    let observation;
    try {
      observation = await boundedRead(() => readIssue(task.planning.binding.issueId, { signal: controller.signal }));
      if (!Number.isSafeInteger(observation?.observedAt) || observation.observedAt < planningStartedAt ||
          observation.observedAt > clock()) throw new Error('Planning read is not fresh.');
      evaluatePlanningObservation(task.planning.binding, observation, clock());
    } catch {
      // Invalidate an earlier planning pass even when the remote read was canceled. This is a
      // recovery commit under the same lease, not permission to execute after cancellation.
      await store.mutate(taskId, 'planning-observation', { owner, observation: {
        status: 'unavailable', reference: 'planning-dispatch-read-unavailable', observedAt: now(),
      } });
      throw new Error('Planning read unavailable.');
    }
    clock();
    await store.mutate(taskId, 'planning-observation', { owner, observation });
    const current = await currentRequest();
    if (!planningRequestMatchesTask(task, current)) throw new Error('Accepted task scope changed.');
    clock();
    intent = await store.mutate(taskId, 'dispatch-intent', { owner, authority: current.authority, resourceToken });
    clock();
    return { status: intent.nextDispatchAction === 'create' ? 'prepared' : 'reconcile', taskId,
      dispatch: structuredClone(intent.dispatch) };
  } catch {
    return { status: 'blocked', taskId, reason: 'planning-dispatch-handoff-unavailable',
      ...(intent?.dispatch ? { dispatch: structuredClone(intent.dispatch) } : {}) };
  } finally {
    clearTimeout(timer);
    if (cancel) signal?.removeEventListener('abort', cancel);
    controller?.abort();
  }
}
