import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { chmod, mkdir, open, readFile, rename, rm, stat } from 'node:fs/promises';
import { hostname } from 'node:os';
import path from 'node:path';

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
    const started = Date.now();
    let handle;
    while (!handle) {
      try {
        handle = await open(this.lock, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
        await handle.writeFile(JSON.stringify({ pid: process.pid, host: hostname() }));
        await handle.sync();
      } catch (error) {
        if (error.code !== 'EEXIST') {
          if (handle) {
            await handle.close();
            await rm(this.lock, { force: true });
          }
          throw error;
        }
        // Never break a lock on elapsed time alone: another coordinator may still be live.
        try {
          // Serialize recovery so two observers of the same dead owner cannot remove
          // a newly acquired live lock after one of them has already recovered it.
          const recoveryPath = `${this.lock}.recovery`;
          const recovery = await open(recoveryPath, 'wx', 0o600);
          try {
            const owner = JSON.parse(await readFile(this.lock, 'utf8'));
            if (owner.host === hostname() && Number.isInteger(owner.pid) && owner.pid > 0) {
              try { process.kill(owner.pid, 0); } catch (probe) {
                if (probe.code === 'ESRCH') {
                  await rm(this.lock, { force: true });
                  continue;
                }
              }
            }
          } finally {
            await recovery.close();
            await rm(recoveryPath, { force: true });
          }
        } catch (readError) {
          if (readError.code === 'ENOENT') continue;
        }
        if (Date.now() - started >= this.lockTimeoutMs) throw new Error('Task store is locked; inspect its live owner.');
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }
    try {
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
      await handle.close();
      await rm(this.lock, { force: true });
    }
  }

  async list() {
    return this.transaction((state) => state.tasks);
  }

  async enqueue({ source, requestId, mode, revision, authority, brief, requiredGates = [] }) {
    const id = taskId(source, requestId);
    if (!['research', 'implement', 'audit', 'steward'].includes(mode)) throw new Error('Unsupported task mode.');
    requireValue(revision, 'revision');
    if (!authority || !authority.actor || !authority.reference || !observationIsFresh(authority, this.now())) {
      throw new Error('A fresh authority observation is required.');
    }
    if (!brief || !Array.isArray(brief.acceptanceCriteria) || !brief.acceptanceCriteria.length) {
      throw new Error('Acceptance criteria are required.');
    }
    if (!Array.isArray(requiredGates) || requiredGates.some((item) => typeof item !== 'string' || !item.trim())) {
      throw new Error('Invalid required gates.');
    }
    return this.transaction((state) => {
      const existing = state.tasks.find((task) => task.id === id);
      if (existing) {
        if (existing.revision !== revision || existing.mode !== mode) throw new Error('Request identity was reused with different scope.');
        return existing;
      }
      const task = {
        id, source, requestId, mode, revision, authority, brief,
        state: 'queued', head: null, requiredGates: [...new Set([...requiredGates, 'output'])],
        evidence: [], dispatch: null, lease: null, retries: 0,
        createdAt: this.now(), updatedAt: this.now(), history: [],
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
      if (action === 'claim') {
        if (['delivered', 'terminal-failure'].includes(task.state)) throw new Error('Terminal work cannot be claimed.');
        requireValue(input.owner, 'owner');
        if (state.tasks.filter((other) => other.id !== id && !TERMINAL.has(other.state) &&
            (other.lease?.expiresAt > now || other.dispatch)).length >= this.maxActiveTasks) {
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
      } else {
        if (!task.lease || task.lease.owner !== input.owner || task.lease.expiresAt <= now) {
          throw new Error('A current owner lease is required.');
        }
        if (action === 'dispatch-intent') {
          // Save intent before the external call. Pending outcomes require reconciliation,
          // not another create_thread call. The same token is returned on a retry.
          if (TERMINAL.has(task.state)) throw new Error('Terminal work cannot be dispatched.');
          nextDispatchAction = task.dispatch ? 'reconcile' : 'create';
          if (!task.dispatch) {
            if (!observationIsFresh(input.authority, now) || input.authority.actor !== task.authority.actor ||
                input.authority.reference !== task.authority.reference || input.authority.revision !== task.revision) {
              throw new Error('Dispatch requires freshly rechecked authority for this revision.');
            }
            task.dispatch = { token: randomUUID(), intentAt: now, clientThreadId: null, threadId: null };
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
          // Preserve history, but use only the latest observation for a gate/head/revision.
          task.evidence = task.evidence.filter((prior) => !(prior.gate === item.gate && prior.head === item.head && prior.revision === item.revision));
          task.evidence.push(item);
        } else if (action === 'transition') {
          if (!STATES[task.state]?.includes(input.state)) throw new Error(`Invalid transition ${task.state} -> ${input.state}.`);
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
        ...(action === 'transition' ? { reason: input.reason } : {}),
      });
      return nextDispatchAction ? { ...task, nextDispatchAction } : task;
    });
  }
}
