import { resourceStatus } from './agent-task-store.mjs';
import { evaluatePlanningObservation, planningStatus } from './agent-planning-scope.mjs';
import { planningRequestMatchesTask, validatePlanningRequestObservation } from './agent-planning-intake.mjs';

// Observe an already-bound worker. Runtime adapters must target an exact run and make repeated
// interruption with the same stop token idempotent. No task is created, resumed or marked delivered.
export async function monitorPlanningWorker({ store, owner, taskId, readWorker, interruptWorker,
  readUsage, readRequest, readIssue, maxStopAttempts, now = () => Date.now(), maxRunMs = 60_000, signal }) {
  let controller;
  let cancel;
  let timer;
  let stop;
  try {
    if (!store || typeof store.list !== 'function' || typeof store.mutate !== 'function' ||
        [readWorker, interruptWorker, readUsage, readRequest, readIssue, now].some((value) => typeof value !== 'function') ||
        [owner, taskId].some((value) => typeof value !== 'string' || !value.trim()) ||
        !Number.isSafeInteger(maxStopAttempts) || maxStopAttempts < 1 || maxStopAttempts > 10 ||
        !Number.isSafeInteger(maxRunMs) || maxRunMs < 1 || maxRunMs > 60_000) throw new Error('Invalid worker monitoring policy.');
    const startedAt = now();
    controller = new AbortController();
    cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) controller.abort();
    timer = setTimeout(cancel, maxRunMs);
    const clock = () => {
      const value = now();
      if (controller.signal.aborted || !Number.isSafeInteger(startedAt) || startedAt <= 0 ||
          !Number.isSafeInteger(value) || value < startedAt || value - startedAt >= maxRunMs) throw new Error('Expired monitor operation.');
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
        const value = await Promise.race([operation(), aborted]);
        clock();
        return value;
      } finally {
        controller.signal.removeEventListener('abort', onAbort);
      }
    };
    const currentTask = async () => {
      clock();
      const task = (await store.list()).find((item) => item.id === taskId);
      if (!task?.planning || !task.dispatch?.threadId || task.lease?.owner !== owner ||
          task.lease.expiresAt <= clock() || ['delivered', 'terminal-failure'].includes(task.state)) {
        throw new Error('Bound worker and current coordinator ownership required.');
      }
      return task;
    };
    const mutate = (action, input) => {
      clock();
      return store.mutate(taskId, action, { owner, ...input });
    };
    const task = await currentTask();
    stop = task.workerStop;
    const identity = { taskId, dispatchToken: task.dispatch.token, threadId: task.dispatch.threadId };
    const observeWorker = async () => {
      const readStartedAt = clock();
      const worker = await bounded(() => readWorker({ ...identity }, { signal: controller.signal }));
      if (!worker || worker.taskId !== taskId || worker.dispatchToken !== identity.dispatchToken ||
          worker.threadId !== identity.threadId || !['running', 'stopped'].includes(worker.status) ||
          typeof worker.runId !== 'string' || !worker.runId.trim() || worker.runId.length > 4096 ||
          typeof worker.reference !== 'string' || !worker.reference.trim() || worker.reference.length > 4096 ||
          !Number.isSafeInteger(worker.observedAt) || worker.observedAt < readStartedAt || worker.observedAt > clock()) {
        throw new Error('Fresh exact worker incarnation required.');
      }
      return structuredClone(worker);
    };
    const saveObservation = async (worker) => {
      const saved = await mutate('worker-stop-observation', { token: stop.token, worker });
      stop = saved.workerStop;
      return { status: stop.status === 'stopped' ? 'stopped' : 'pending', taskId, stop: structuredClone(stop) };
    };
    const checkPolicy = async ({ final = false } = {}) => {
      const current = await currentTask();
      if (current.dispatch.token !== identity.dispatchToken || current.dispatch.threadId !== identity.threadId) {
        throw new Error('Worker binding changed during monitoring.');
      }
      if (final) {
        // Close cached execution permission before remote reads can stall or be canceled.
        await mutate('planning-observation', { observation: {
          status: 'unavailable', reference: 'worker-monitor-planning-unavailable', observedAt: clock(),
        } });
      }
      let reason;
      if (current.requestRevocation) reason = 'request-withdrawn';
      else {
        try {
          const authorityStartedAt = clock();
          const requestIdentity = { source: current.source, requestId: current.requestId };
          const observation = await bounded(() => readRequest(requestIdentity, { signal: controller.signal }));
          if (observation?.status === 'withdrawn') {
            await mutate('request-revocation', { observation: { ...requestIdentity, status: 'withdrawn',
              reference: current.authority.reference, observedAt: clock() } });
            reason = 'request-withdrawn';
          } else {
            const request = validatePlanningRequestObservation(observation, requestIdentity, authorityStartedAt, clock());
            if (!planningRequestMatchesTask(current, request)) throw new Error('Accepted scope unavailable.');
          }
        } catch { reason = 'request-unverified'; }
      }
      if (!reason || final) {
        let observation;
        try {
          const planningStartedAt = clock();
          observation = await bounded(() => readIssue(current.planning.binding.issueId, { signal: controller.signal }));
          if (!Number.isSafeInteger(observation?.observedAt) || observation.observedAt < planningStartedAt ||
              observation.observedAt > clock()) throw new Error('Cached planning read.');
          const evaluated = evaluatePlanningObservation(current.planning.binding, observation, clock());
          // A current proposal alone cannot reopen permission when human authority is unknown.
          if (reason === 'request-unverified' && evaluated.result === 'pass') throw new Error('Authority unavailable.');
        } catch {
          observation = { status: 'unavailable', reference: 'worker-monitor-planning-unavailable', observedAt: now() };
        }
        const saved = await store.mutate(taskId, 'planning-observation', { owner, observation });
        if (planningStatus(saved, clock()).result !== 'pass') reason ??= 'planning-unverified';
      }
      if (!reason || final) {
        if (!current.resources) return reason ?? 'worker-resource-limits-unconfigured';
        try {
          const usageStartedAt = clock();
          const usage = await bounded(() => readUsage({ ...identity, runId: worker.runId }, { signal: controller.signal }));
          const verifiedAt = usage?.verifiedAt ?? usage?.observedAt;
          if (usage?.taskId !== taskId || usage.complete !== true || !Number.isSafeInteger(usage.observedAt) ||
              !Number.isSafeInteger(verifiedAt) || verifiedAt < usageStartedAt || verifiedAt > clock() ||
              usage.observedAt > verifiedAt || usage.observedAt < clock() - 60_000) throw new Error('Incomplete task-wide usage.');
          const saved = await mutate('resource-usage', { usage: { modelTokens: usage.modelTokens, toolCalls: usage.toolCalls,
            observedAt: usage.observedAt, reference: usage.reference }, settledReservations: usage.settledReservations ?? [] });
          if (resourceStatus(saved, clock()).exceeded) reason ??= 'resource-exhausted';
        } catch {
          await store.mutate(taskId, 'resource-unavailable', { owner, observation: {
            reference: 'worker-monitor-usage-unavailable', observedAt: now(),
          } });
          reason ??= 'usage-unverified';
        }
      }
      return reason;
    };
    const reconcileStopped = async (stoppedWorker) => {
      const reason = await checkPolicy({ final: true });
      const latest = await observeWorker();
      if (latest.status !== 'stopped' || latest.runId !== stoppedWorker.runId) {
        await mutate('resource-unavailable', { observation: {
          reference: 'worker-monitor-final-run-changed', observedAt: clock(),
        } });
        throw new Error('Worker changed during stopped reconciliation.');
      }
      if (stop && stop.runId === latest.runId) return await saveObservation(latest);
      return { status: 'inactive', taskId, reference: latest.reference, observedAt: latest.observedAt,
        ...(reason ? { reason } : {}) };
    };
    let worker = await observeWorker();
    if (worker.status === 'stopped') return await reconcileStopped(worker);
    if (stop && stop.status !== 'stopped' && stop.runId !== worker.runId) throw new Error('Unresolved stop belongs to another run.');
    let reason = stop?.status !== 'stopped' ? stop?.reason : undefined;
    if (!reason) {
      reason = await checkPolicy();
      if (reason === 'worker-resource-limits-unconfigured') return { status: 'blocked', taskId, reason };
      if (!reason) return { status: 'within-policy', taskId, runId: worker.runId, observedAt: clock() };
      // Re-observe immediately before reserving a stop; earlier running evidence may have changed.
      worker = await observeWorker();
      if (worker.status === 'stopped') return await reconcileStopped(worker);
      const saved = await mutate('worker-stop-intent', { worker, reason, maxAttempts: maxStopAttempts });
      stop = saved.workerStop;
    }
    // A fresh read after intent distinguishes an already-stopped run from one needing interruption.
    worker = await observeWorker();
    if (worker.runId !== stop.runId) throw new Error('Worker incarnation changed before interruption.');
    if (worker.status === 'stopped') return await reconcileStopped(worker);
    const attempt = await mutate('worker-stop-attempt', { token: stop.token, worker });
    stop = attempt.workerStop;
    if (attempt.workerStopDecision.action === 'send') {
      try {
        await bounded(() => interruptWorker({ ...identity, runId: stop.runId, stopToken: stop.token }, { signal: controller.signal }));
      } catch {
        // The command's acknowledgement is not proof of effect, including when it is lost.
        clock();
      }
    }
    worker = await observeWorker();
    return worker.status === 'stopped' ? await reconcileStopped(worker) : await saveObservation(worker);
  } catch {
    return { status: stop ? 'pending' : 'blocked', taskId, reason: 'worker-monitor-unverified',
      ...(stop ? { stop: structuredClone(stop) } : {}) };
  } finally {
    clearTimeout(timer);
    if (cancel) signal?.removeEventListener('abort', cancel);
    controller?.abort();
  }
}
