import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

const text = (value) => typeof value === 'string' && value.trim() && value.length <= 4096;
const terminal = new Set(['completed', 'interrupted', 'failed']);

// request is an authenticated app-server RPC boundary, not a tool selected by proposal text.
// The binding comes from the durable dispatch receipt. No full turn items are requested.
export function createCodexWorkerAdapter({ binding, request, readCheckpoint, now = Date.now, maxReadMs = 15_000 }) {
  if (!binding || !['taskId', 'dispatchToken', 'threadId'].every((key) => text(binding[key])) ||
      typeof request !== 'function' || typeof readCheckpoint !== 'function' || typeof now !== 'function' ||
      !Number.isSafeInteger(maxReadMs) || maxReadMs < 1 || maxReadMs > 60_000) throw new Error('Invalid Codex worker adapter.');
  const identity = Object.fromEntries(['taskId', 'dispatchToken', 'threadId'].map((key) => [key, binding[key]]));
  const checkIdentity = (input) => {
    if (!input || !Object.keys(identity).every((key) => input[key] === identity[key])) throw new Error('Foreign worker binding.');
  };
  const operation = async (signal, work) => {
    const startedAt = now();
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
    const timer = setTimeout(cancel, maxReadMs);
    const clock = () => {
      const value = now();
      if (controller.signal.aborted || !Number.isSafeInteger(startedAt) || startedAt <= 0 ||
          !Number.isSafeInteger(value) || value < startedAt || value - startedAt >= maxReadMs) throw new Error('Expired worker read.');
      return value;
    };
    const bounded = async (callback) => {
      clock();
      let rejectAbort;
      const abort = new Promise((_, reject) => { rejectAbort = reject; });
      const onAbort = () => rejectAbort(new Error('Canceled worker RPC.'));
      controller.signal.addEventListener('abort', onAbort, { once: true });
      try {
        const result = await Promise.race([callback({ signal: controller.signal }), abort]);
        clock();
        return result;
      } finally { controller.signal.removeEventListener('abort', onAbort); }
    };
    try { return await work({ clock, bounded, startedAt }); }
    finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); cancel(); }
  };
  const snapshot = async ({ bounded }) => {
    const metadata = await bounded((options) => request('thread/read', { threadId: identity.threadId, includeTurns: false }, options));
    const thread = metadata?.thread;
    if (thread?.id !== identity.threadId || !['active', 'idle'].includes(thread.status?.type)) {
      throw new Error('Loaded exact runtime thread required.');
    }
    const page = await bounded((options) => request('thread/turns/list', {
      threadId: identity.threadId, sortDirection: 'desc', limit: 1, itemsView: 'notLoaded',
    }, options));
    if (!Array.isArray(page?.data) || page.data.length !== 1) throw new Error('Latest runtime turn unavailable.');
    const turn = page.data[0];
    if (!text(turn?.id) || !['inProgress', ...terminal].includes(turn.status) ||
        turn.itemsView !== 'notLoaded' || !Array.isArray(turn.items) || turn.items.length !== 0 ||
        (thread.status.type === 'active') !== (turn.status === 'inProgress')) {
      throw new Error('Runtime thread and latest turn disagree.');
    }
    // Pagination of older turns is expected: only the latest descending turn defines this run.
    return { runId: turn.id, status: turn.status === 'inProgress' ? 'running' : 'stopped', turnStatus: turn.status };
  };
  const stable = async (context) => {
    const first = await snapshot(context);
    const second = await snapshot(context);
    if (!isDeepStrictEqual(first, second)) throw new Error('Runtime changed during observation.');
    return second;
  };
  const reference = (worker) => 'codex-app-server:sha256:' + createHash('sha256')
    .update(JSON.stringify({ ...identity, ...worker })).digest('hex');
  return {
    readWorker: async (input, { signal } = {}) => {
      checkIdentity(input);
      return operation(signal, async (context) => {
        const worker = await stable(context);
        let checkpoint;
        if (worker.status === 'stopped') {
          const checkpointStartedAt = context.clock();
          const saved = await context.bounded((options) => readCheckpoint({ ...identity, runId: worker.runId }, options));
          if (saved?.status === 'verified' && ['taskId', 'dispatchToken', 'threadId'].every((key) => saved[key] === identity[key]) &&
              saved.runId === worker.runId && Number.isSafeInteger(saved.observedAt) && saved.observedAt >= checkpointStartedAt &&
              saved.observedAt <= context.clock() && text(saved.reference) && text(saved.nextAction) &&
              (saved.head === null || (typeof saved.head === 'string' && /^[a-f0-9]{40}$/.test(saved.head)))) {
            checkpoint = { reference: saved.reference, head: saved.head, nextAction: saved.nextAction };
          }
          // A checkpoint read can race a resumed turn; never return its stopped proof after resume.
          const current = await stable(context);
          if (!isDeepStrictEqual(current, worker)) throw new Error('Worker resumed during checkpoint read.');
        }
        return { ...identity, runId: worker.runId, status: worker.status, reference: reference(worker),
          observedAt: context.clock(), ...(checkpoint ? { checkpoint } : {}) };
      });
    },
    interruptWorker: async (input, { signal } = {}) => {
      checkIdentity(input);
      if (!text(input.runId) || !text(input.stopToken)) throw new Error('Exact stop receipt required.');
      return operation(signal, async (context) => {
        const worker = await stable(context);
        if (worker.runId !== input.runId) throw new Error('Interrupt target is no longer the observed run.');
        if (worker.status === 'stopped') return { status: 'already-stopped' };
        // The native API addresses an exact turn. Repeating a receipt can never target its successor.
        await context.bounded((options) => request('turn/interrupt', { threadId: identity.threadId, turnId: input.runId }, options));
        return { status: 'requested' };
      });
    },
  };
}
