import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { observeCodexUsage } from './agent-codex-usage.mjs';

const text = (value) => typeof value === 'string' && value.trim() && value.length <= 4096;
const unitPolicy = 'native-observed-operations-v1';

// Inventory is an installed runtime boundary: it must attest every dedicated task session,
// including stopped workers, and independently verify the maintainer's operation-unit policy.
export function createTaskUsageReader({ store, owner, readInventory, now = Date.now, maxReadMs = 30_000 }) {
  if (!store || typeof store.list !== 'function' || typeof store.mutate !== 'function' || !text(owner) ||
      typeof readInventory !== 'function' || typeof now !== 'function' || !Number.isSafeInteger(maxReadMs) ||
      maxReadMs < 1 || maxReadMs > 60_000) throw new Error('Invalid task usage reader.');
  return async (identity, { signal: parentSignal } = {}) => {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    parentSignal?.addEventListener('abort', cancel, { once: true });
    if (parentSignal?.aborted) cancel();
    const timer = setTimeout(cancel, maxReadMs);
    const startedAt = now();
    let receipt;
    try {
      if (!['taskId', 'dispatchToken', 'threadId', 'runId'].every((key) => text(identity?.[key]))) throw new Error('Exact metered worker required.');
      identity = Object.fromEntries(['taskId', 'dispatchToken', 'threadId', 'runId'].map((key) => [key, identity[key]]));
      const clock = () => {
        const time = now();
        if (controller.signal.aborted || !Number.isSafeInteger(startedAt) || startedAt <= 0 || !Number.isSafeInteger(time) ||
            time < startedAt || time - startedAt >= maxReadMs) throw new Error('Expired usage read.');
        return time;
      };
      const bounded = async (callback) => {
        clock(); let rejectAbort;
        const aborted = new Promise((_, reject) => { rejectAbort = reject; });
        const onAbort = () => rejectAbort(new Error('Canceled usage read.'));
        controller.signal.addEventListener('abort', onAbort, { once: true });
        try { const result = await Promise.race([callback(), aborted]); clock(); return result; }
        finally { controller.signal.removeEventListener('abort', onAbort); }
      };
      const task = (await bounded(() => store.list())).find((item) => item.id === identity.taskId);
      if (!task?.resources || task.lease?.owner !== owner || task.lease.expiresAt <= clock() ||
          task.dispatch?.token !== identity.dispatchToken || task.dispatch.threadId !== identity.threadId) throw new Error('Bound owned metered task required.');
      const inventory = async () => {
        const readStartedAt = clock();
        const value = await bounded(() => readInventory({ ...identity }, { signal: controller.signal }));
        if (value?.status !== 'verified' || value.taskId !== identity.taskId || value.dispatchToken !== identity.dispatchToken ||
            value.complete !== true || !text(value.reference) || !Number.isSafeInteger(value.observedAt) ||
            value.observedAt < readStartedAt || value.observedAt > clock() || value.policy?.status !== 'accepted' ||
            value.policy.unit !== unitPolicy || value.policy.taskRevision !== task.revision || !text(value.policy.reference) ||
            !Array.isArray(value.members) || value.members.length < 2 || value.members.length > 8 ||
            value.members.filter((member) => member.role === 'coordinator' && member.status === 'running').length !== 1 ||
            !value.members.some((member) => member.role === 'worker' && member.threadId === identity.threadId && member.runId === identity.runId) ||
            new Set(value.members.map((member) => member.threadId)).size !== value.members.length) throw new Error('Complete authenticated inventory and accepted units required.');
        const members = value.members.map((member) => {
          if (!['worker', 'coordinator'].includes(member.role) || !['running', 'stopped'].includes(member.status) ||
              member.dedicated !== true || !text(member.threadId) || !text(member.runId) || !text(member.sessionFile) ||
              !path.isAbsolute(member.sessionFile)) throw new Error('Dedicated native session coverage required.');
          return { role: member.role, threadId: member.threadId, runId: member.runId, status: member.status,
            sessionFile: path.resolve(member.sessionFile) };
        }).sort((a, b) => a.threadId.localeCompare(b.threadId));
        return { policyReference: value.policy.reference, members };
      };
      const first = await inventory();
      const measurements = [];
      for (const member of first.members) {
        const usage = await bounded(() => observeCodexUsage({ sessionFile: member.sessionFile, threadId: member.threadId }, { now: clock(), signal: controller.signal }));
        if (usage.source.ignoredPartialTail || usage.nativeTurn?.runId !== member.runId ||
            usage.source.line <= usage.nativeTurn.startLine ||
            usage.source.observedAt < usage.nativeTurn.startedAt ||
            (member.status === 'running' && (usage.nativeTurn.status !== 'running' || usage.source.observedAt < clock() - 60_000)) ||
            (member.status === 'stopped' && !['completed', 'interrupted'].includes(usage.nativeTurn.status))) {
          throw new Error('Native current-turn accounting coverage unavailable.');
        }
        measurements.push({ ...member, modelTokens: usage.modelTokens, toolCalls: usage.observedOperationUnits, measurementAt: usage.source.observedAt });
      }
      const second = await inventory();
      if (!isDeepStrictEqual(first, second)) throw new Error('Runtime inventory changed during metering.');
      if (measurements.some((member) => member.status === 'running' && member.measurementAt < clock() - 60_000)) {
        throw new Error('Active measurements aged during the aggregate read.');
      }
      const modelTokens = measurements.reduce((total, member) => total + member.modelTokens, 0);
      const toolCalls = measurements.reduce((total, member) => total + member.toolCalls, 0);
      if (![modelTokens, toolCalls].every((value) => Number.isSafeInteger(value) && value >= 0)) throw new Error('Aggregate usage overflow.');
      const reference = 'task-native-usage:sha256:' + createHash('sha256').update(JSON.stringify({ ...identity, ...first, measurements })).digest('hex');
      clock();
      const saved = await store.mutate(identity.taskId, 'resource-accounting', { owner, accounting: {
        unitPolicy, policyReference: first.policyReference, members: measurements, reference, observedAt: now(),
      } });
      receipt = saved.resources.accounting;
      // Accounting commit alone does not consume usage or settle any execution reservation.
      clock();
      if (measurements.some((member) => member.status === 'running' && member.measurementAt < clock() - 60_000)) {
        throw new Error('Measurements aged during accounting acknowledgement.');
      }
      return { taskId: identity.taskId, complete: true, modelTokens, toolCalls, reference, observedAt: now() };
    } catch {
      return { taskId: identity?.taskId, complete: false, reason: 'task-native-usage-unverified',
        ...(receipt ? { accountingReference: receipt.reference } : {}) };
    } finally { clearTimeout(timer); parentSignal?.removeEventListener('abort', cancel); cancel(); }
  };
}
