import { createLinearCommentSession, createLinearReadSession } from './agent-linear-auth.mjs';
import { createLinearIssueReader } from './agent-linear-reader.mjs';
import { createLinearResultReader } from './agent-linear-result-reader.mjs';
import { createLinearResultWriter } from './agent-linear-result-writer.mjs';
import { deliverPlanningResult } from './agent-planning-result-delivery.mjs';

// One coordinator operation. Credential-manager callbacks and the independently authenticated
// human-request reader belong to the installed runner. This does not activate or dispatch work.
export async function runLinearPlanningResult({ store, owner, taskId, head, body, resourceToken,
  readerPolicy, writerPolicy, readReaderCredentials, readWriterCredentials, readRequest,
  fetchImpl = globalThis.fetch, now = () => Date.now(), maxRunMs = 60_000, signal }) {
  let controller;
  let timer;
  let cancel;
  const sessions = [];
  let result;
  try {
    if (typeof readReaderCredentials !== 'function' || typeof readRequest !== 'function' ||
        typeof now !== 'function' || typeof fetchImpl !== 'function' ||
        !Number.isSafeInteger(maxRunMs) || maxRunMs < 1 || maxRunMs > 60_000 ||
        !readerPolicy || !writerPolicy || readerPolicy.appUserId === writerPolicy.appUserId ||
        readerPolicy.writerAppUserId !== writerPolicy.appUserId ||
        ['organizationId', 'teamId', 'projectId'].some((key) => readerPolicy[key] !== writerPolicy[key])) {
      throw new Error('Invalid scoped result run.');
    }
    readerPolicy = structuredClone(readerPolicy);
    writerPolicy = structuredClone(writerPolicy);
    const startedAt = now();
    controller = new AbortController();
    cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    timer = setTimeout(cancel, maxRunMs);
    if (signal?.aborted) controller.abort();
    const remaining = () => {
      const observed = now();
      const budget = maxRunMs - (observed - startedAt);
      if (controller.signal.aborted || !Number.isSafeInteger(startedAt) || startedAt <= 0 ||
          !Number.isSafeInteger(observed) || observed < startedAt || budget < 1) throw new Error('Expired result run.');
      return budget;
    };
    const fetchForRun = async (url, init) => {
      const requestSignal = AbortSignal.any([controller.signal, init.signal]);
      let rejectAbort;
      const aborted = new Promise((_, reject) => { rejectAbort = reject; });
      const onAbort = () => rejectAbort(new Error('Canceled result transport.'));
      requestSignal.addEventListener('abort', onAbort, { once: true });
      try {
        if (requestSignal.aborted) throw new Error('Canceled result transport.');
        return await Promise.race([fetchImpl(url, { ...init, signal: requestSignal }), aborted]);
      } finally {
        requestSignal.removeEventListener('abort', onAbort);
      }
    };
    const lazyToken = (factory, readCredentials) => {
      let pending;
      return async ({ signal: requestSignal } = {}) => {
        remaining();
        if (requestSignal?.aborted || typeof readCredentials !== 'function') throw new Error('Session unavailable.');
        if (!pending) {
          pending = factory({ readCredentials, fetchImpl, now, signal: controller.signal, timeoutMs: remaining() });
          sessions.push(pending);
        }
        const session = await pending;
        remaining();
        return session.getAccessToken({ signal: requestSignal });
      };
    };
    const readerToken = lazyToken(createLinearReadSession, readReaderCredentials);
    const writerToken = lazyToken(createLinearCommentSession, readWriterCredentials);
    const readIssue = createLinearIssueReader({ policy: readerPolicy, getAccessToken: readerToken,
      fetchImpl: fetchForRun, now, maxReadMs: Math.min(20_000, remaining()) });
    const readResult = createLinearResultReader({ policy: readerPolicy, getAccessToken: readerToken,
      fetchImpl: fetchForRun, now, maxReadMs: Math.min(20_000, remaining()) });
    // Validate the writer identity policy before reading credentials, while keeping its grant lazy.
    const createWriter = (adapters) => createLinearResultWriter({ ...adapters, policy: writerPolicy,
      getAccessToken: writerToken, fetchImpl: fetchForRun, now, maxWriteMs: Math.min(20_000, remaining()) });
    createWriter({ readIssue, readRequest, signal: controller.signal, beginWrite: async () => { throw new Error('No send reservation.'); } });
    result = await deliverPlanningResult({ store, owner, taskId, head, body, resourceToken,
      writerAppUserId: writerPolicy.appUserId, readIssue, readResult, readRequest, createWriter,
      now, signal: controller.signal, maxRunMs: remaining() });
  } catch {
    result = { status: 'blocked', taskId, reason: 'linear-result-run-unavailable' };
  } finally {
    clearTimeout(timer);
    if (cancel) signal?.removeEventListener('abort', cancel);
    controller?.abort();
    // Close fulfilled sessions even when a bounded reader stopped awaiting authentication.
    const settled = await Promise.allSettled(sessions);
    const cleanup = await Promise.allSettled(settled.filter((entry) => entry.status === 'fulfilled')
      .map((entry) => entry.value.close()));
    if (settled.some((entry) => entry.status === 'rejected' && entry.reason?.code === 'linear-session-revocation-unverified') ||
        cleanup.some((entry) => entry.status !== 'fulfilled' || entry.value.status !== 'revoked')) {
      result = { status: 'blocked', taskId, reason: 'linear-session-revocation-unverified', result };
    }
  }
  return result;
}
