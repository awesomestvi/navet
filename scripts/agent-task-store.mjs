import { createHash, randomUUID } from 'node:crypto';
import { chmod, mkdir, open, readFile, rename, rm, stat } from 'node:fs/promises';
import { hostname } from 'node:os';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { evaluatePlanningObservation, requirePlanningScope, validatePlanningBinding } from './agent-planning-scope.mjs';

// Load through Node so browser-oriented test bundlers do not bundle this native module.
const sqlite = process.getBuiltinModule?.('node:sqlite');
if (!sqlite) throw new Error('Agent task storage requires Node 22.16 or later with SQLite support.');
const { DatabaseSync } = sqlite;

const STATES = {
  queued: ['investigating', 'waiting-for-input', 'terminal-failure'],
  investigating: ['building', 'verifying', 'waiting-for-input', 'retryable-failure', 'terminal-failure'],
  building: ['verifying', 'waiting-for-input', 'retryable-failure', 'terminal-failure'],
  verifying: ['building', 'awaiting-approval', 'delivered', 'waiting-for-input', 'retryable-failure', 'terminal-failure'],
  'awaiting-approval': ['building', 'verifying', 'delivered', 'waiting-for-input', 'terminal-failure'],
  'waiting-for-input': ['investigating', 'building', 'verifying', 'terminal-failure'],
  'retryable-failure': ['investigating', 'building', 'verifying', 'terminal-failure'],
  'terminal-failure': [],
  delivered: [],
};
const TERMINAL = new Set(['delivered', 'terminal-failure']);

function observationIsFresh(observation, now) {
  return Number.isFinite(observation?.observedAt) && observation.observedAt > 0 &&
    observation.observedAt >= now - 60_000 && observation.observedAt <= now;
}

function requireValue(value, label) {
  if (typeof value !== 'string' || !value.trim() || value.length > 4096) {
    throw new Error(`${label} must be a nonempty string of at most 4096 characters.`);
  }
  return value;
}

export function taskId(source, requestId) {
  return createHash('sha256').update(JSON.stringify([
    requireValue(source, 'source'), requireValue(requestId, 'requestId'),
  ])).digest('hex');
}

function completeEvidence(task) {
  return task.requiredGates.every((gate) => task.evidence.some((item) =>
    item.gate === gate && item.result === 'pass' && item.revision === task.revision &&
    item.head === task.head && item.artifact && item.observedAt
  ));
}

function validateResourceLimits(limits) {
  const keys = ['maxElapsedMs', 'maxModelTokens', 'maxToolCalls'];
  if (!limits || Object.keys(limits).length !== keys.length ||
      keys.some((key) => !Number.isSafeInteger(limits[key]) || limits[key] <= 0)) {
    throw new Error('Resource limits require positive integer elapsed milliseconds, model tokens and tool calls.');
  }
}

export function resourceStatus(task, now = Date.now()) {
  if (!task.resources) return { bounded: false };
  const { limits, startedAt, usage, reservations } = task.resources;
  validateResourceLimits(limits);
  if (!Array.isArray(reservations) || (startedAt != null && (!Number.isFinite(startedAt) || startedAt <= 0 || startedAt > now)) ||
      (usage && (!Number.isSafeInteger(usage.modelTokens) || usage.modelTokens < 0 ||
        !Number.isSafeInteger(usage.toolCalls) || usage.toolCalls < 0 || !Number.isFinite(usage.observedAt) ||
        usage.observedAt <= 0 || usage.observedAt > now || typeof usage.reference !== 'string' || !usage.reference.trim())) ||
      reservations.some((item) => !Number.isSafeInteger(item.modelTokens) || item.modelTokens < 0 ||
        !Number.isSafeInteger(item.toolCalls) || item.toolCalls < 0 || typeof item.token !== 'string' ||
        !item.token || typeof item.event !== 'string' || !item.event || !Number.isFinite(item.reservedAt) ||
        item.reservedAt <= 0 || item.reservedAt > now || (item.settledAt != null &&
          (!Number.isFinite(item.settledAt) || item.settledAt < item.reservedAt || item.settledAt > now)))) {
    throw new Error('Invalid execution resource state.');
  }
  const pending = reservations.filter((item) => !item.settledAt);
  const modelTokens = (usage?.modelTokens ?? 0) + pending.reduce((total, item) => total + item.modelTokens, 0);
  const toolCalls = (usage?.toolCalls ?? 0) + pending.reduce((total, item) => total + item.toolCalls, 0);
  return {
    bounded: true,
    measurementFresh: observationIsFresh(usage, now),
    remaining: {
      elapsedMs: Math.max(0, limits.maxElapsedMs - (startedAt == null ? 0 : now - startedAt)),
      modelTokens: Math.max(0, limits.maxModelTokens - modelTokens),
      toolCalls: Math.max(0, limits.maxToolCalls - toolCalls),
    },
    exceeded: (startedAt != null && now - startedAt >= limits.maxElapsedMs) ||
      (usage?.modelTokens ?? 0) >= limits.maxModelTokens || (usage?.toolCalls ?? 0) >= limits.maxToolCalls ||
      modelTokens > limits.maxModelTokens || toolCalls > limits.maxToolCalls,
  };
}

function requireResourceCapacity(task, now) {
  const status = resourceStatus(task, now);
  if (status.bounded && (!status.measurementFresh || status.exceeded)) {
    throw new Error(status.exceeded ? 'Execution resource budget exhausted.' : 'Fresh resource usage observation is required.');
  }
  return status;
}

function bindResourceReservation(task, input, now, operation) {
  const status = requireResourceCapacity(task, now);
  if (!status.bounded) return;
  const reservation = task.resources.reservations.find((item) => item.token === input.resourceToken);
  if (!reservation || reservation.settledAt || reservation.toolCalls < 1 ||
      (reservation.operation && reservation.operation !== operation)) {
    throw new Error('An unused resource reservation for this operation is required.');
  }
  reservation.operation = operation;
}

// State records retain evidence; they do not grant authority. The coordinator must verify
// actor permissions and live source/approval state through the owning service before dispatch.
export class AgentTaskStore {
  constructor(directory, { now = () => Date.now(), lockTimeoutMs = 2000, maxActiveTasks = 1 } = {}) {
    this.directory = path.resolve(directory);
    this.file = path.join(this.directory, 'tasks.json');
    this.lock = path.join(this.directory, 'tasks.lock');
    this.now = now;
    this.lockTimeoutMs = lockTimeoutMs;
    this.maxActiveTasks = maxActiveTasks;
    if (!Number.isSafeInteger(maxActiveTasks) || maxActiveTasks < 1) throw new Error('Invalid active task limit.');
  }

  async transaction(operation) {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    if ((await stat(this.directory)).isDirectory() === false) throw new Error('Invalid state directory.');
    await chmod(this.directory, 0o700);
    const mutexPath = `${this.lock}.sqlite`;
    const mutexFile = await open(mutexPath, 'a', 0o600);
    await mutexFile.close();
    await chmod(mutexPath, 0o600);
    const started = Date.now();
    const mutex = new DatabaseSync(mutexPath);
    let acquired = false;
    try {
      mutex.exec('PRAGMA busy_timeout = 0;');
      while (!acquired) {
        try {
          // OS-managed SQLite locks disappear on process exit, including SIGKILL.
          // No owner-file creation or recursive recovery-lock window remains.
          mutex.exec('BEGIN IMMEDIATE;');
          acquired = true;
        } catch (error) {
          if (error.errcode !== 5 && error.errcode !== 6) throw error;
          if (Date.now() - started >= this.lockTimeoutMs) {
            throw new Error(`Task store is locked; inspect its live owner (${mutexPath}).`);
          }
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      }
      // Preserve legacy live/unknown owners during an upgrade. Older coordinator
      // versions must be stopped before upgrading; do not run mixed lock protocols.
      try {
        await stat(`${this.lock}.recovery`);
        throw new Error(`Legacy recovery lock requires inspection (${this.lock}.recovery).`);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      try {
        const owner = JSON.parse(await readFile(this.lock, 'utf8'));
        if (owner.host !== hostname() || !Number.isInteger(owner.pid) || owner.pid <= 0) {
          throw new Error('Unknown legacy task lock owner; inspect before repair.');
        }
        try {
          process.kill(owner.pid, 0);
          throw new Error('Task store is locked by a live legacy owner.');
        } catch (error) {
          if (error.code !== 'ESRCH') throw error;
        }
        await rm(this.lock);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      let state;
      try { state = JSON.parse(await readFile(this.file, 'utf8')); } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        state = { version: 1, tasks: [] };
      }
      if (state.version !== 1 || !Array.isArray(state.tasks)) throw new Error('Unsupported or corrupt task state.');
      const result = await operation(state);
      const temporary = `${this.file}.${randomUUID()}.tmp`;
      const output = await open(temporary, 'wx', 0o600);
      try {
        await output.writeFile(`${JSON.stringify(state, null, 2)}\n`);
        await output.sync();
        await output.close();
        await rename(temporary, this.file);
        const directory = await open(this.directory, 'r');
        try { await directory.sync(); } finally { await directory.close(); }
      } finally {
        await output.close();
        await rm(temporary, { force: true });
      }
      return structuredClone(result);
    } finally {
      mutex.close();
    }
  }

  async list() {
    return this.transaction((state) => state.tasks);
  }

  async enqueue({ source, requestId, mode, revision, authority, brief, requiredGates = [], resourceLimits, planningBinding }) {
    const id = taskId(source, requestId);
    if (!['research', 'implement', 'audit', 'steward'].includes(mode)) throw new Error('Unsupported task mode.');
    requireValue(revision, 'revision');
    if (!authority || !authority.actor || !authority.reference || !observationIsFresh(authority, this.now())) {
      throw new Error('A fresh authority observation is required.');
    }
    if (!brief || !Array.isArray(brief.acceptanceCriteria) || !brief.acceptanceCriteria.length) {
      throw new Error('Acceptance criteria are required.');
    }
    brief.acceptanceCriteria.forEach((criterion) => requireValue(criterion, 'acceptance criterion'));
    if (!Array.isArray(requiredGates) || requiredGates.some((item) => typeof item !== 'string' || !item.trim())) {
      throw new Error('Invalid required gates.');
    }
    const gates = [...new Set([...requiredGates, 'output'])];
    if (resourceLimits !== undefined) validateResourceLimits(resourceLimits);
    if (planningBinding !== undefined) {
      validatePlanningBinding(planningBinding);
      if (authority.planningRevision !== planningBinding.revision) {
        throw new Error('Request authority must name the accepted planning revision.');
      }
    }
    return this.transaction((state) => {
      const existing = state.tasks.find((task) => task.id === id);
      if (existing) {
        if (existing.revision !== revision || existing.mode !== mode ||
            !isDeepStrictEqual(existing.brief, brief) ||
            !isDeepStrictEqual([...existing.requiredGates].sort(), [...gates].sort()) ||
            !isDeepStrictEqual(existing.resources?.limits, resourceLimits) ||
            !isDeepStrictEqual(existing.planning?.binding, planningBinding) ||
            existing.authority.actor !== authority.actor || existing.authority.reference !== authority.reference) {
          throw new Error('Request identity was reused with different scope.');
        }
        return existing;
      }
      const task = {
        id, source, requestId, mode, revision, authority, brief,
        state: 'queued', head: null, requiredGates: gates,
        ...(planningBinding ? { planning: { binding: structuredClone(planningBinding), observation: null } } : {}),
        evidence: [], dispatch: null, lease: null, retries: 0,
        createdAt: this.now(), updatedAt: this.now(), history: [],
        ...(resourceLimits ? { resources: { limits: resourceLimits, startedAt: null, usage: null, reservations: [] } } : {}),
      };
      state.tasks.push(task);
      return task;
    });
  }

  async mutate(id, action, input = {}) {
    return this.transaction((state) => {
      const task = state.tasks.find((item) => item.id === id);
      if (!task) throw new Error('Unknown task.');
      const now = this.now();
      let nextDispatchAction;
      let followupDecision;
      if (action === 'claim') {
        if (['delivered', 'terminal-failure'].includes(task.state)) throw new Error('Terminal work cannot be claimed.');
        requireValue(input.owner, 'owner');
        if (state.tasks.filter((other) => other.id !== id && !TERMINAL.has(other.state) &&
            (other.lease || other.dispatch)).length >= this.maxActiveTasks) {
          throw new Error('Active task budget exhausted.');
        }
        if (!Number.isFinite(input.durationMs) || input.durationMs <= 0 || input.durationMs > 3_600_000) throw new Error('Invalid lease duration.');
        if (task.lease && task.lease.owner !== input.owner) {
          if (task.lease.expiresAt > now) throw new Error('Task already claimed.');
          if (!['missing', 'terminal'].includes(input.observation?.status) ||
              !observationIsFresh(input.observation, now) ||
              input.observation.owner !== task.lease.owner) throw new Error('Expired lease requires a fresh owner observation.');
        }
        task.lease = { owner: input.owner, expiresAt: now + input.durationMs };
        if (task.resources && task.resources.startedAt == null) task.resources.startedAt = now;
      } else {
        if (!task.lease || task.lease.owner !== input.owner || task.lease.expiresAt <= now) {
          throw new Error('A current owner lease is required.');
        }
        if (action === 'release') {
          requireValue(input.reason, 'release reason');
          task.lease = null;
        } else if (action === 'planning-observation') {
          if (!task.planning) throw new Error('Task has no planning binding.');
          const observation = evaluatePlanningObservation(task.planning.binding, input.observation, now);
          if (task.planning.observation && observation.observedAt < task.planning.observation.observedAt) {
            throw new Error('Planning observations cannot move backwards.');
          }
          task.planning.observation = observation;
          if (observation.result === 'fail') task.planning.revokedAt ??= now;
        } else if (action === 'resource-usage') {
          if (!task.resources) throw new Error('Task has no configured resource limits.');
          const usage = input.usage;
          if (!observationIsFresh(usage, now) ||
              !Number.isSafeInteger(usage.modelTokens) || usage.modelTokens < 0 ||
              !Number.isSafeInteger(usage.toolCalls) || usage.toolCalls < 0 ||
              (task.resources.usage && (usage.modelTokens < task.resources.usage.modelTokens ||
                usage.toolCalls < task.resources.usage.toolCalls || usage.observedAt < task.resources.usage.observedAt))) {
            throw new Error('Resource usage must be a fresh monotonic cumulative observation.');
          }
          requireValue(usage.reference, 'usage reference');
          const settled = input.settledReservations ?? [];
          if (!Array.isArray(settled) || settled.some((token) =>
            !task.resources.reservations.some((item) => item.token === token && item.reservedAt <= usage.observedAt))) {
            throw new Error('Unknown resource settlement or observation preceding reservation.');
          }
          for (const item of task.resources.reservations.filter((item) => settled.includes(item.token))) {
            item.settledAt = usage.observedAt;
            item.reference = usage.reference;
          }
          task.resources.usage = usage;
        } else if (action === 'reserve-resources') {
          if (!task.resources || TERMINAL.has(task.state)) throw new Error('A bounded active task is required.');
          requireValue(input.event, 'resource event');
          if (!Number.isSafeInteger(input.modelTokens) || input.modelTokens < 0 ||
              !Number.isSafeInteger(input.toolCalls) || input.toolCalls < 0 ||
              (input.modelTokens === 0 && input.toolCalls === 0)) throw new Error('Invalid resource reservation.');
          const existing = task.resources.reservations.find((item) => item.event === input.event);
          if (existing) {
            if (existing.modelTokens !== input.modelTokens || existing.toolCalls !== input.toolCalls) {
              throw new Error('Resource event was reused with a different allocation.');
            }
            return { ...task, resourceDecision: { action: existing.settledAt ? 'skip' : 'reconcile', reservation: existing } };
          }
          requirePlanningScope(task, now);
          const status = requireResourceCapacity(task, now);
          if (input.modelTokens > status.remaining.modelTokens || input.toolCalls > status.remaining.toolCalls) {
            throw new Error('Resource reservation exceeds the remaining budget.');
          }
          const reservation = { event: input.event, modelTokens: input.modelTokens, toolCalls: input.toolCalls,
            token: randomUUID(), reservedAt: now };
          task.resources.reservations.push(reservation);
          task.updatedAt = now;
          task.history.push({ action, owner: input.owner, at: now, reservation });
          return { ...task, resourceDecision: { action: 'execute', reservation } };
        } else if (action === 'dispatch-intent') {
          // Save intent before the external call. Pending outcomes require reconciliation,
          // not another create_thread call. The same token is returned on a retry.
          if (TERMINAL.has(task.state)) throw new Error('Terminal work cannot be dispatched.');
          nextDispatchAction = task.dispatch ? 'reconcile' : 'create';
          if (!task.dispatch) {
            requirePlanningScope(task, now);
            bindResourceReservation(task, input, now, 'dispatch');
            if (!observationIsFresh(input.authority, now) || input.authority.actor !== task.authority.actor ||
                input.authority.reference !== task.authority.reference || input.authority.revision !== task.revision ||
                (task.planning && input.authority.planningRevision !== task.planning.binding.revision)) {
              throw new Error('Dispatch requires freshly rechecked authority for this revision.');
            }
            task.dispatch = { token: randomUUID(), intentAt: now, clientThreadId: null, threadId: null,
              ...(task.resources ? { resourceToken: input.resourceToken } : {}) };
            task.authority = input.authority;
          }
        } else if (action === 'bind') {
          if (!task.dispatch) throw new Error('Dispatch intent is required.');
          if (input.token !== task.dispatch.token) throw new Error('Wrong dispatch token.');
          if (!input.threadId && !input.clientThreadId) throw new Error('A dispatch handle is required.');
          if (input.threadId) {
            requireValue(input.threadId, 'threadId');
            if (task.dispatch.threadId && task.dispatch.threadId !== input.threadId) throw new Error('Task already bound to another delivery.');
            task.dispatch.threadId = input.threadId;
          }
          if (input.clientThreadId) {
            requireValue(input.clientThreadId, 'clientThreadId');
            if (task.dispatch.clientThreadId && task.dispatch.clientThreadId !== input.clientThreadId) throw new Error('Pending setup handle changed.');
            task.dispatch.clientThreadId = input.clientThreadId;
          }
        } else if (action === 'reserve-followup') {
          if (!task.dispatch?.threadId || TERMINAL.has(task.state)) throw new Error('A resumable delivery is required.');
          if (!Array.isArray(input.events) || !input.events.length) throw new Error('Follow-up events are required.');
          input.events.forEach((event) => requireValue(event, 'event'));
          const events = [...new Set(input.events)].sort();
          task.followups ??= [];
          const existing = task.followups.filter((receipt) => events.includes(receipt.event));
          const pending = existing.filter((receipt) => receipt.status === 'pending');
          if (pending.length) {
            followupDecision = { action: 'reconcile', receipts: pending };
          } else {
            const fresh = events.filter((event) => !existing.some((receipt) => receipt.event === event));
            if (fresh.length) {
              requirePlanningScope(task, now);
              bindResourceReservation(task, input, now, `followup:${JSON.stringify(fresh)}`);
              const token = randomUUID();
              const receipts = fresh.map((event) => ({ event, token, threadId: task.dispatch.threadId,
                head: task.head, status: 'pending', intentAt: now,
                ...(task.resources ? { resourceToken: input.resourceToken } : {}) }));
              task.followups.push(...receipts);
              followupDecision = { action: 'send', token, events: fresh, threadId: task.dispatch.threadId };
            } else followupDecision = { action: 'skip', events };
          }
        } else if (action === 'confirm-followup') {
          const receipts = task.followups?.filter((receipt) => receipt.token === input.token);
          if (!receipts?.length || input.threadId !== task.dispatch?.threadId) throw new Error('Unknown follow-up or delivery handle.');
          requireValue(input.reference, 'follow-up acknowledgement');
          if (!observationIsFresh(input, now) || receipts.some((receipt) => input.observedAt < receipt.intentAt)) {
            throw new Error('A fresh follow-up acknowledgement is required.');
          }
          for (const receipt of receipts) {
            receipt.status = 'confirmed';
            receipt.reference = input.reference;
            receipt.observedAt = input.observedAt;
          }
        } else if (action === 'context') {
          const context = input.context;
          if (!context || typeof context !== 'object' || Array.isArray(context)) throw new Error('Invalid task context.');
          const allowed = ['worktree', 'branch', 'prUrl', 'proposalUrl', 'nextAction', 'unresolvedQuestions'];
          if (Object.keys(context).some((key) => !allowed.includes(key))) throw new Error('Unknown context field.');
          for (const [key, value] of Object.entries(context)) {
            if (key === 'unresolvedQuestions') {
              if (!Array.isArray(value)) throw new Error('Questions must be an array.');
              value.forEach((item) => requireValue(item, 'question'));
            } else requireValue(value, key);
          }
          task.context = { ...task.context, ...context };
        } else if (action === 'head') {
          requireValue(input.head, 'head');
          if (task.head !== input.head) {
            task.head = input.head;
            if (task.state === 'delivered') throw new Error('Delivered work requires a new request.');
            if (task.state === 'awaiting-approval') task.state = 'verifying';
          }
        } else if (action === 'evidence') {
          const item = input.evidence;
          if (!item || !task.requiredGates.includes(item.gate) || !['pass', 'fail', 'unverified'].includes(item.result)) throw new Error('Invalid evidence.');
          if (item.head !== task.head || item.revision !== task.revision) throw new Error('Evidence is for a different head or scope.');
          requireValue(item.artifact, 'artifact');
          if (!Number.isFinite(item.observedAt) || item.observedAt <= 0 || item.observedAt > now) throw new Error('Invalid evidence observation time.');
          const prior = task.evidence.find((value) => value.gate === item.gate && value.head === item.head && value.revision === item.revision);
          if (prior && item.observedAt < prior.observedAt) throw new Error('Evidence observations cannot move backwards.');
          // Preserve history, but use only the latest observation for a gate/head/revision.
          task.evidence = task.evidence.filter((prior) => !(prior.gate === item.gate && prior.head === item.head && prior.revision === item.revision));
          task.evidence.push(item);
        } else if (action === 'transition') {
          if (!STATES[task.state]?.includes(input.state)) throw new Error(`Invalid transition ${task.state} -> ${input.state}.`);
          if (['investigating', 'building', 'verifying', 'awaiting-approval', 'delivered'].includes(input.state)) {
            requirePlanningScope(task, now);
          }
          if (['investigating', 'building', 'verifying'].includes(input.state)) requireResourceCapacity(task, now);
          if (['awaiting-approval', 'delivered'].includes(input.state)) {
            if (!task.dispatch?.threadId) throw new Error('Confirmed delivery handle is required.');
            if (!completeEvidence(task)) throw new Error('Current-head required evidence is incomplete.');
            if (task.mode === 'implement' && !task.head) throw new Error('Implementation head is required.');
          }
          if (input.state === 'delivered' && task.mode === 'implement') {
            // Delivery is verified merge/output, not agent self-approval of a PR.
            if (!input.acceptance || input.acceptance.head !== task.head || !input.acceptance.reference ||
                !input.acceptance.actor || input.acceptance.revision !== task.revision) throw new Error('Current maintainer acceptance is required.');
            task.acceptance = input.acceptance;
          }
          if (task.state === 'retryable-failure' && input.state !== 'terminal-failure') {
            if (!Number.isSafeInteger(input.maxRetries) || input.maxRetries < 0 || task.retries >= input.maxRetries ||
                (task.retryLimit != null && task.retryLimit !== input.maxRetries)) throw new Error('Repair retry budget exhausted or changed.');
            task.retryLimit ??= input.maxRetries;
            task.retries += 1;
          }
          requireValue(input.reason, 'reason');
          task.state = input.state;
        } else throw new Error('Unsupported task action.');
      }
      task.updatedAt = now;
      task.history.push({ action, owner: input.owner, state: task.state, head: task.head, at: now,
        ...(action === 'evidence' ? { evidence: input.evidence } : {}),
        ...(action === 'planning-observation' ? { planning: task.planning.observation } : {}),
        ...(action === 'resource-usage' ? { usage: input.usage, settledReservations: input.settledReservations ?? [] } : {}),
        ...(['transition', 'release'].includes(action) ? { reason: input.reason } : {}),
      });
      return nextDispatchAction ? { ...task, nextDispatchAction } : followupDecision ? { ...task, followupDecision } : task;
    });
  }
}
