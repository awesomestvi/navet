import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, realpath, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execute = promisify(execFile);
const HOOK = 'pnpm typecheck && pnpm test:tier1 && pnpm test:tier2';
const BOUND_HOOK = String.raw`navet_push_refs="$(cat)"
pnpm typecheck &&
  pnpm test:tier1 &&
  pnpm test:tier2 &&
  printf '%s\n' "$navet_push_refs" | while read -r navet_local_ref navet_local_sha navet_remote_ref navet_remote_sha; do
    printf 'Navet validated push: %s %s\n' "$navet_local_sha" "$navet_remote_ref"
  done`;
const normalizeHook = (value) => value.replace(/\s+/g, ' ').trim();
const sha = (value) => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);

// Validate all tracked inputs and installed dependencies in a fresh checkout of
// the recorded commit, then perform the ordinary push with its normal hooks.
export function validationPushCommand({ head, branch }) {
  if (!sha(head) || typeof branch !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(branch)) {
    throw new Error('Valid commit and branch are required.');
  }
  const refs = `refs/heads/${branch} ${head} refs/heads/${branch} ${'0'.repeat(40)}`;
  return `navet_validation_root="$(mktemp -d /tmp/navet-validation.XXXXXX)" && ` +
    `trap 'git worktree remove --force "$navet_validation_root" >/dev/null 2>&1; rmdir "$navet_validation_root" 2>/dev/null || true' EXIT && ` +
    `git worktree add --detach "$navet_validation_root" ${head} && ` +
    `(cd "$navet_validation_root" && pnpm install --frozen-lockfile && ` +
    `git diff --exit-code HEAD -- && test -z "$(git ls-files --others --exclude-standard)" && ` +
    `printf 'Navet validation checkout: %s\\n' '${head}' && ` +
    `printf '%s\\n' '${refs}' | /bin/sh .husky/pre-push && ` +
    `printf 'Navet validation complete: %s\\n' '${head}') && git push origin ${head}:refs/heads/${branch}`;
}

async function git(root, args) {
  try { return (await execute('git', ['-C', root, ...args], { maxBuffer: 1_048_576,
    env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_'))) })).stdout.trim(); }
  catch { throw new Error('Commit-bound Git evidence is unavailable.'); }
}

async function nativeRecord(file, targetLine, threadId, expectedHash) {
  const snapshot = await stat(file);
  if (!snapshot.isFile() || !snapshot.size) throw new Error('Native receipt source is unavailable.');
  let buffer = '';
  let number = 0;
  let identity = false;
  for await (const chunk of createReadStream(file, { encoding: 'utf8', end: snapshot.size - 1 })) {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const raw = buffer.slice(0, newline + 1);
      buffer = buffer.slice(newline + 1);
      number += 1;
      if (raw.length > 16 * 1024 * 1024) throw new Error('Native receipt record exceeds its size limit.');
      let record;
      try { record = JSON.parse(raw); } catch { throw new Error('Malformed complete native receipt record.'); }
      if (record.type === 'session_meta') {
        if (identity || record.payload?.id !== threadId) throw new Error('Native receipt thread identity mismatch.');
        identity = true;
      } else if (!identity) throw new Error('Native receipt metadata must precede command evidence.');
      if (number === targetLine) {
        if (!identity || createHash('sha256').update(raw).digest('hex') !== expectedHash) {
          throw new Error('Native receipt record hash mismatch.');
        }
        return record;
      }
    }
    if (buffer.length > 16 * 1024 * 1024) throw new Error('Native receipt record exceeds its size limit.');
  }
  throw new Error('Complete native receipt source line is missing.');
}

export async function verifyValidationReceipt({ receiptFile, expectedHead, repositoryRoot, repository, branch, threadId }) {
  if (!sha(expectedHead) || typeof receiptFile !== 'string' || !receiptFile ||
      typeof repositoryRoot !== 'string' || !repositoryRoot || typeof threadId !== 'string' || !threadId ||
      typeof repository !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) ||
      typeof branch !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(branch)) {
    throw new Error('Confirmed head, repository, branch, thread and private receipt inputs are required.');
  }
  let receipt;
  try { receipt = JSON.parse(await readFile(receiptFile, 'utf8')); }
  catch { throw new Error('Valid private receipt JSON is required.'); }
  const source = receipt.source;
  if (receipt.version !== 2 || receipt.gate !== 'local-validation' || receipt.head !== expectedHead ||
      receipt.repository !== repository || receipt.branch !== branch || receipt.threadId !== threadId ||
      !Number.isSafeInteger(receipt.tier1Tests) || receipt.tier1Tests <= 0 ||
      !Number.isSafeInteger(receipt.tier2Tests) || receipt.tier2Tests <= 0 ||
      !source || typeof source.file !== 'string' || !path.isAbsolute(source.file) ||
      !Number.isSafeInteger(source.line) || source.line < 2 ||
      typeof source.recordSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(source.recordSha256) ||
      typeof source.itemId !== 'string' || !source.itemId || !source.timestamp ||
      receipt.hook?.file !== '.husky/pre-push' || receipt.hook.sourceAtHead !== expectedHead) {
    throw new Error('Validation receipt identity, counts or provenance mismatch.');
  }
  const root = await realpath(repositoryRoot);
  const remote = await git(root, ['remote', 'get-url', 'origin']);
  const acceptedRemotes = [`https://github.com/${repository}`, `https://github.com/${repository}.git`,
    `git@github.com:${repository}`, `git@github.com:${repository}.git`];
  if (!acceptedRemotes.includes(remote)) throw new Error('Validation receipt repository mismatch.');
  const hook = await git(root, ['show', `${expectedHead}:.husky/pre-push`]);
  if (![HOOK, normalizeHook(BOUND_HOOK)].includes(normalizeHook(hook))) throw new Error('Unsupported commit-bound pre-push hook.');
  const record = await nativeRecord(source.file, source.line, threadId, source.recordSha256);
  const item = record.payload?.item;
  if (record.type !== 'event_msg' || record.payload?.type !== 'item_completed' || record.payload.thread_id !== threadId ||
      record.timestamp !== source.timestamp || !Number.isFinite(Date.parse(record.timestamp)) || Date.parse(record.timestamp) > Date.now() ||
      item?.type !== 'CommandExecution' || item.id !== source.itemId ||
      item.status !== 'completed' || item.exit_code !== 0 || !Array.isArray(item.command) ||
      item.command.length !== 3 || !['/bin/zsh', '/bin/bash'].includes(item.command[0]) ||
      !['-c', '-lc'].includes(item.command[1]) || item.command[2] !== validationPushCommand({ head: expectedHead, branch }) ||
      typeof item.cwd !== 'string' || await realpath(item.cwd.startsWith('file:') ? fileURLToPath(item.cwd) : item.cwd) !== root) {
    throw new Error('Native receipt is not the matching successful commit-bound validation and ordinary push command.');
  }
  if (typeof item.aggregated_output !== 'string') throw new Error('Native push output is missing.');
  const output = item.aggregated_output.replace(/\u001b\[[0-9;]*m/g, '');
  const startMarker = `Navet validation checkout: ${expectedHead}\n`;
  const endMarker = `Navet validation complete: ${expectedHead}\n`;
  const start = output.indexOf(startMarker);
  const end = output.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < start) throw new Error('Native receipt clean-checkout validation bounds are missing.');
  const validationOutput = output.slice(start + startMarker.length, end);
  const stages = ['$ tsc --noEmit', '$ node scripts/run-test-tier.mjs tier1', '$ node scripts/run-test-tier.mjs tier2'];
  const positions = stages.map((stage) => validationOutput.indexOf(stage));
  if (positions.some((position) => position < 0) || !(positions[0] < positions[1] && positions[1] < positions[2])) {
    throw new Error('Native receipt validation chain is incomplete.');
  }
  const tier1 = validationOutput.slice(positions[1], positions[2]);
  const tier2 = validationOutput.slice(positions[2]);
  for (const [section, count] of [[tier1, receipt.tier1Tests], [tier2, receipt.tier2Tests]]) {
    if (!new RegExp(`\\bTests\\s+${count} passed \\(${count}\\)`).test(section)) {
      throw new Error('Native receipt test counts are not a complete passing tier.');
    }
  }
  const escaped = branch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pushed = new RegExp(`^\\s*[a-f0-9]{7,40}\\.\\.([a-f0-9]{7,40})\\s+${expectedHead} -> ${escaped}\\s*$`, 'm').exec(output);
  const created = new RegExp(`^\\s*\\* \\[new branch\\]\\s+${expectedHead} -> ${escaped}\\s*$`, 'm').test(output);
  if ((!pushed && !created) ||
      !output.includes(`To https://github.com/${repository}.git`) && !output.includes(`To github.com:${repository}.git`)) {
    throw new Error('Native receipt pushed head, branch or destination mismatch.');
  }
  if (pushed) {
    if (!expectedHead.startsWith(pushed[1]) || await git(root, ['rev-parse', '--verify', `${pushed[1]}^{commit}`]) !== expectedHead) {
      throw new Error('Native receipt push abbreviation is not the confirmed commit.');
    }
  } else {
    const validated = new RegExp(`^Navet validated push: ([a-f0-9]{40}) refs/heads/${escaped}\\s*$`, 'm').exec(validationOutput);
    if (normalizeHook(hook) !== normalizeHook(BOUND_HOOK) || !validated || validated[1] !== expectedHead ||
        validationOutput.indexOf(validated[0]) < positions[2]) {
      throw new Error('Native receipt new branch lacks immutable push-time commit evidence.');
    }
  }
  // Output only the proved facts; never expose native prompts, commands or log bodies.
  return { version: 1, gate: 'local-validation', result: 'pass', head: expectedHead,
    threadId, tier1Tests: receipt.tier1Tests, tier2Tests: receipt.tier2Tests,
    typecheck: 'verified native chain', source: { line: source.line, timestamp: source.timestamp,
      itemId: source.itemId, recordSha256: source.recordSha256 }, hookSourceAtHead: expectedHead };
}
