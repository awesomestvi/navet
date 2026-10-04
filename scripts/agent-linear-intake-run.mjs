import { createLinearReadSession } from './agent-linear-auth.mjs';
import { createLinearIssueReader } from './agent-linear-reader.mjs';
import { enqueuePlanningRequest } from './agent-planning-intake.mjs';

// The installed coordinator supplies the independently authenticated human-request reader.
// This operation queues accepted scope; it never claims a task or dispatches a worker.
export async function runLinearPlanningIntake({ store, identity, readerPolicy, readCredentials,
  readRequest, fetchImpl = globalThis.fetch, now = () => Date.now(), maxRunMs = 60_000, signal }) {
  let controller;
  let timer;
  let cancel;
  let pendingSession;
  let result;
  try {
    if (!store || typeof store.enqueue !== 'function' || typeof readRequest !== 'function' ||
        typeof readCredentials !== 'function' || typeof fetchImpl !== 'function' || typeof now !== 'function' ||
        !Number.isSafeInteger(maxRunMs) || maxRunMs < 1 || maxRunMs > 60_000 ||
        !identity || ['source', 'requestId'].some((key) => typeof identity[key] !== 'string' ||
          !identity[key].trim() || identity[key].length > 4096)) throw new Error('Invalid intake run.');
    identity = structuredClone(identity);
    readerPolicy = structuredClone(readerPolicy);
    const startedAt = now();
    controller = new AbortController();
    cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    timer = setTimeout(cancel, maxRunMs);
    if (signal?.aborted) controller.abort();
    const remaining = () => {
      const observedAt = now();
      const budget = maxRunMs - (observedAt - startedAt);
      if (controller.signal.aborted || !Number.isSafeInteger(startedAt) || startedAt <= 0 ||
          !Number.isSafeInteger(observedAt) || observedAt < startedAt || budget < 1) throw new Error('Expired intake run.');
      return budget;
    };
    // Bound adapters that ignore cancellation. Never race an already-started store mutation:
    // its acknowledgement must be retained, including when the deadline expires during commit.
    const boundedRead = async (operation) => {
      remaining();
      let rejectAbort;
      const aborted = new Promise((_, reject) => { rejectAbort = reject; });
      const onAbort = () => rejectAbort(new Error('Canceled intake read.'));
      controller.signal.addEventListener('abort', onAbort, { once: true });
      try {
        if (controller.signal.aborted) throw new Error('Canceled intake read.');
        const observation = await Promise.race([operation(), aborted]);
        remaining();
        return observation;
      } finally {
        controller.signal.removeEventListener('abort', onAbort);
      }
    };
    const fetchForRun = (url, init) => boundedRead(() => fetchImpl(url, {
      ...init, signal: AbortSignal.any([controller.signal, init.signal]),
    }));
    const reader = createLinearIssueReader({ policy: readerPolicy, now, fetchImpl: fetchForRun,
      maxReadMs: Math.min(20_000, remaining()), getAccessToken: async (options) => {
        remaining();
        pendingSession ??= createLinearReadSession({ readCredentials, fetchImpl, now,
          signal: controller.signal, timeoutMs: remaining() });
        const session = await pendingSession;
        remaining();
        return session.getAccessToken(options);
      } });
    const task = await enqueuePlanningRequest({ identity, now,
      store: { enqueue: async (request) => { remaining(); return store.enqueue(request); } },
      readRequest: (requestIdentity) => boundedRead(() => readRequest({ ...requestIdentity }, {
        signal: controller.signal,
      })),
      readIssue: (issueId) => boundedRead(() => reader(issueId)),
    });
    result = { status: 'queued', taskId: task.id };
  } catch {
    result = { status: 'blocked', reason: 'linear-intake-run-unavailable' };
  } finally {
    clearTimeout(timer);
    if (cancel) signal?.removeEventListener('abort', cancel);
    controller?.abort();
    if (pendingSession) {
      const [settled] = await Promise.allSettled([pendingSession]);
      if (settled.status === 'fulfilled') {
        const cleanup = await settled.value.close();
        if (cleanup.status !== 'revoked') result = { status: 'blocked',
          reason: 'linear-session-revocation-unverified', intake: result };
      } else if (settled.reason?.code === 'linear-session-revocation-unverified') {
        result = { status: 'blocked', reason: 'linear-session-revocation-unverified', intake: result,
          ...(settled.reason.cleanup instanceof Promise ? { cleanup: settled.reason.cleanup } : {}) };
      }
    }
  }
  return result;
}
