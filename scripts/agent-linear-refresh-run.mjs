import { createLinearReadSession } from './agent-linear-auth.mjs';
import { createLinearIssueReader } from './agent-linear-reader.mjs';
import { reconcileLinearRefresh } from './agent-linear-refresh.mjs';

// Read-only coordinator operation. The credential callback belongs to the installed runner.
// This reconciles an existing signed event; it never creates approval or dispatches work.
export async function runLinearPlanningRefresh({ inbox, eventId, store, owner, readerPolicy,
  readCredentials, fetchImpl = globalThis.fetch, now = () => Date.now(), maxRunMs = 60_000, signal }) {
  let controller;
  let timer;
  let cancel;
  let pendingSession;
  let result;
  try {
    if (typeof readCredentials !== 'function' || typeof fetchImpl !== 'function' || typeof now !== 'function' ||
        !Number.isSafeInteger(maxRunMs) || maxRunMs < 1 || maxRunMs > 60_000) throw new Error('Invalid refresh run.');
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
          !Number.isSafeInteger(observedAt) || observedAt < startedAt || budget < 1) throw new Error('Expired refresh run.');
      return budget;
    };
    // Parent cancellation reaches both OAuth and GraphQL transports. The underlying readers
    // still bound responses from transports that fail to honor their AbortSignal.
    const fetchForRun = async (url, init) => {
      const requestSignal = AbortSignal.any([controller.signal, init.signal]);
      let rejectAbort;
      const aborted = new Promise((_, reject) => { rejectAbort = reject; });
      const onAbort = () => rejectAbort(new Error('Canceled refresh transport.'));
      requestSignal.addEventListener('abort', onAbort, { once: true });
      try {
        if (requestSignal.aborted) throw new Error('Canceled refresh transport.');
        return await Promise.race([fetchImpl(url, { ...init, signal: requestSignal }), aborted]);
      } finally {
        requestSignal.removeEventListener('abort', onAbort);
      }
    };
    const reader = createLinearIssueReader({ policy: readerPolicy, now, fetchImpl: fetchForRun,
      maxReadMs: Math.min(20_000, remaining()), getAccessToken: async (options) => {
        remaining();
        pendingSession ??= createLinearReadSession({ readCredentials, fetchImpl,
          now, signal: controller.signal, timeoutMs: remaining() });
        const session = await pendingSession;
        remaining();
        return session.getAccessToken(options);
      } });
    result = await reconcileLinearRefresh({ inbox, eventId, store, owner, now, readIssue: async (issueId) => {
      remaining();
      const observation = await reader(issueId);
      remaining();
      if (observation.status !== 'available') throw new Error('Proposal unavailable.');
      return observation.issue;
    } });
  } catch {
    result = { eventId, decision: 'blocked', authority: 'none', reason: 'linear-refresh-run-unavailable' };
  } finally {
    clearTimeout(timer);
    if (cancel) signal?.removeEventListener('abort', cancel);
    controller?.abort();
    // Reconciliation is awaited above, including every already-started atomic store update.
    // Close a fulfilled authentication session even when its consumer stopped awaiting it.
    if (pendingSession) {
      const [settled] = await Promise.allSettled([pendingSession]);
      if (settled.status === 'fulfilled') {
        const cleanup = await settled.value.close();
        if (cleanup.status !== 'revoked') result = { eventId, decision: 'blocked', authority: 'none',
          reason: 'linear-session-revocation-unverified', reconciliation: result };
      } else if (settled.reason?.code === 'linear-session-revocation-unverified') {
        result = { eventId, decision: 'blocked', authority: 'none',
          reason: 'linear-session-revocation-unverified', reconciliation: result,
          ...(settled.reason.cleanup instanceof Promise ? { cleanup: settled.reason.cleanup } : {}) };
      }
    }
  }
  return result;
}
