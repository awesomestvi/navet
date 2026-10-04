import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { lstat, readFile, readlink, realpath } from 'node:fs/promises';
import path from 'node:path';

const execute = promisify(execFile);
const hash = (value) => 'sha256:' + createHash('sha256').update(value).digest('hex');
const identityKeys = ['taskId', 'dispatchToken', 'threadId', 'runId'];
const text = (value) => typeof value === 'string' && value.trim() && value.length <= 4096;
const matches = (left, right) => identityKeys.every((key) => left?.[key] === right?.[key]);

async function gitSnapshot(worktree, { signal, clock }) {
  if (!text(worktree) || !path.isAbsolute(worktree)) throw new Error('Absolute saved worktree required.');
  const root = await realpath(worktree);
  clock();
  const git = async (args) => {
    const { stdout } = await execute('git', ['-c', 'core.fsmonitor=false', '-c', 'core.untrackedCache=false', ...args], {
      cwd: root, encoding: 'buffer', maxBuffer: 8_388_608, timeout: clock(), signal,
      env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_'))),
    });
    clock();
    return stdout;
  };
  if ((await realpath((await git(['rev-parse', '--show-toplevel'])).toString('utf8').trim())) !== root) {
    throw new Error('Saved worktree must be the repository root.');
  }
  const head = (await git(['rev-parse', 'HEAD'])).toString('utf8').trim();
  const branch = (await git(['rev-parse', '--abbrev-ref', 'HEAD'])).toString('utf8').trim();
  if (!/^[a-f0-9]{40}$/.test(head) || !text(branch)) throw new Error('Committed Git head required.');
  // Gitlinks need their own repository checkpoint, not just a parent diff marker.
  const index = await git(['ls-files', '--stage', '-z']);
  if (index.toString('utf8').split('\0').some((entry) => entry.startsWith('160000 ') || /^\d+ [a-f0-9]+ [123]\t/.test(entry))) {
    throw new Error('Submodule or unresolved-index checkpoint unavailable.');
  }
  const flags = (await git(['ls-files', '-v', '-z'])).toString('utf8').split('\0').filter(Boolean);
  if (flags.some((entry) => entry[0] === 'S' || entry[0] === entry[0].toLowerCase())) {
    throw new Error('Suppressed worktree changes cannot establish a checkpoint.');
  }
  const digest = createHash('sha256');
  const add = (value) => { digest.update(String(value.length) + ':'); digest.update(value); };
  for (const value of [Buffer.from(head), Buffer.from(branch), index,
    await git(['diff', '--cached', '--no-ext-diff', '--no-textconv', '--binary', 'HEAD'])]) add(value);
  const trackedNames = await git(['ls-files', '--cached', '-z']);
  const names = await git(['ls-files', '--others', '--exclude-standard', '-z']);
  if (!Buffer.from(names.toString('utf8')).equals(names)) throw new Error('Unsupported filename encoding.');
  if (!Buffer.from(trackedNames.toString('utf8')).equals(trackedNames)) throw new Error('Unsupported filename encoding.');
  const untracked = names.toString('utf8').split('\0').filter(Boolean);
  if (untracked.length > 512) throw new Error('Untracked checkpoint limit exceeded.');
  const files = [...new Set([...trackedNames.toString('utf8').split('\0').filter(Boolean), ...untracked])].sort();
  if (files.length > 20_000) throw new Error('Tracked checkpoint limit exceeded.');
  let bytes = 0;
  for (const file of files) {
    const filename = path.resolve(root, file);
    if (!filename.startsWith(root + path.sep)) throw new Error('Foreign checkpoint path.');
    let stat;
    try { stat = await lstat(filename); } catch (error) {
      if (error.code !== 'ENOENT' || untracked.includes(file)) throw error;
      add(Buffer.from(file)); add(Buffer.from('missing')); continue;
    }
    if (!stat.isFile() && !stat.isSymbolicLink()) throw new Error('Unsupported checkpoint file.');
    if (stat.size > 8_388_608) throw new Error('Checkpoint file limit exceeded.');
    const content = stat.isSymbolicLink() ? Buffer.from(await readlink(filename)) : await readFile(filename, { signal });
    bytes += content.length;
    if (bytes > 268_435_456) throw new Error('Checkpoint content limit exceeded.');
    clock(); add(Buffer.from(file)); add(Buffer.from(String(stat.mode))); add(content);
  }
  return { head, branch, stateHash: 'sha256:' + digest.digest('hex') };
}

export { gitSnapshot as readGitWorkerSnapshot };

export function createGitWorkerCheckpointService({ store, owner, readWorker, now = Date.now, maxReadMs = 15_000 }) {
  if (!store || typeof store.list !== 'function' || typeof store.mutate !== 'function' || !text(owner) ||
      typeof now !== 'function' || !Number.isSafeInteger(maxReadMs) || maxReadMs < 1 || maxReadMs > 60_000) {
    throw new Error('Invalid checkpoint service.');
  }
  const operate = async (identity, signal, capture, worker) => {
    let receipt;
    const parentSignal = signal;
    const controller = new AbortController();
    const cancel = () => controller.abort();
    parentSignal?.addEventListener('abort', cancel, { once: true });
    if (parentSignal?.aborted) cancel();
    const timer = setTimeout(cancel, maxReadMs);
    signal = controller.signal;
    try {
      if (!identityKeys.every((key) => text(identity?.[key]))) throw new Error('Exact checkpoint identity required.');
      identity = Object.fromEntries(identityKeys.map((key) => [key, identity[key]]));
      if (worker) worker = structuredClone(worker);
      const startedAt = now();
      const clock = () => {
        const time = now();
        if (signal?.aborted || !Number.isSafeInteger(time) || !Number.isSafeInteger(startedAt) || startedAt <= 0 ||
            time < startedAt || time - startedAt >= maxReadMs) throw new Error('Expired checkpoint read.');
        return maxReadMs - (time - startedAt);
      };
      const getTask = async () => {
        clock();
        let rejectAbort;
        const aborted = new Promise((_, reject) => { rejectAbort = reject; });
        const onAbort = () => rejectAbort(new Error('Canceled checkpoint store read.'));
        signal.addEventListener('abort', onAbort, { once: true });
        let tasks;
        try { tasks = await Promise.race([store.list(), aborted]); }
        finally { signal.removeEventListener('abort', onAbort); }
        const task = tasks.find((item) => item.id === identity.taskId);
        clock();
        if (!task || task.dispatch?.token !== identity.dispatchToken || task.dispatch.threadId !== identity.threadId ||
            task.lease?.owner !== owner || task.lease.expiresAt <= now() || ['delivered', 'terminal-failure'].includes(task.state) ||
            !text(task.context?.nextAction) || !text(task.context?.branch)) throw new Error('Owned recovery context required.');
        return task;
      };
      const stoppedWorker = async () => {
        if (typeof readWorker !== 'function' || !matches(worker, identity) || worker.status !== 'stopped') {
          throw new Error('Trusted runtime checkpoint reader required.');
        }
        const observedAfter = now();
        clock();
        let rejectAbort;
        const aborted = new Promise((_, reject) => { rejectAbort = reject; });
        const onAbort = () => rejectAbort(new Error('Canceled checkpoint runtime read.'));
        signal.addEventListener('abort', onAbort, { once: true });
        let current;
        try { current = await Promise.race([readWorker(identity, { signal }), aborted]); }
        finally { signal.removeEventListener('abort', onAbort); }
        clock();
        if (!matches(current, identity) || current.status !== 'stopped' || !text(current.reference) ||
            !Number.isSafeInteger(current.observedAt) || current.observedAt < observedAfter || current.observedAt > now()) {
          throw new Error('Stopped checkpoint run changed.');
        }
        return structuredClone(current);
      };
      const task = await getTask();
      if (capture && (!Number.isSafeInteger(worker?.observedAt) || worker.observedAt > now() ||
          worker.observedAt < now() - 60_000 || !text(worker.reference))) throw new Error('Fresh initial stopped proof required.');
      if (!capture && !matches(task.workerCheckpoint, identity)) throw new Error('Saved checkpoint unavailable.');
      if (capture) await stoppedWorker();
      const first = await gitSnapshot(task.context.worktree, { signal, clock });
      const second = await gitSnapshot(task.context.worktree, { signal, clock });
      if (JSON.stringify(first) !== JSON.stringify(second) || first.branch !== task.context.branch) throw new Error('Changed Git recovery state.');
      const current = await getTask();
      if (JSON.stringify(current.context) !== JSON.stringify(task.context)) throw new Error('Recovery context changed.');
      if (capture) {
        const checkpoint = { ...first, worktree: task.context.worktree, nextAction: task.context.nextAction };
        checkpoint.reference = 'git-worker-checkpoint:' + hash(JSON.stringify({ ...identity, ...checkpoint }));
        clock();
        // Git/store reads can outlive a stop observation. Fence the exact latest turn
        // again immediately before the local mutation and persist this fresh proof.
        worker = await stoppedWorker();
        // Await an already-started local commit even if cancellation arrives during acknowledgement.
        const saved = await store.mutate(identity.taskId, 'worker-checkpoint', { owner, worker, checkpoint });
        receipt = saved.workerCheckpoint;
        return { status: 'saved', checkpoint: receipt };
      }
      const saved = current.workerCheckpoint;
      if (!matches(saved, identity) || saved.head !== current.head || saved.worktree !== current.context.worktree ||
          saved.nextAction !== current.context.nextAction || saved.branch !== first.branch || saved.head !== first.head ||
          saved.stateHash !== first.stateHash || !text(saved.reference)) throw new Error('Saved checkpoint no longer matches Git.');
      clock();
      return { status: 'verified', ...identity, head: saved.head, reference: saved.reference, nextAction: saved.nextAction, observedAt: now() };
    } catch {
      return { status: receipt ? 'saved' : 'unavailable', ...(receipt ? { checkpoint: receipt } : {}) };
    } finally {
      clearTimeout(timer); parentSignal?.removeEventListener('abort', cancel); cancel();
    }
  };
  return {
    captureCheckpoint: (worker, { signal } = {}) => operate(worker, signal, true, worker),
    readCheckpoint: (identity, { signal } = {}) => operate(identity, signal, false),
  };
}
