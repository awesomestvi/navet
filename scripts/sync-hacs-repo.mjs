import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { appPaths } from './repo-paths.mjs';

const siblingRepoRoot = appPaths.siblingHacsRepoRoot;

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
    ...options,
  });
}

function printSection(title, body) {
  console.log(`\n${title}`);
  console.log(body.trim() ? body : '(none)');
}

run(process.execPath, ['scripts/export-hacs-integration.mjs'], {
  cwd: new URL('..', import.meta.url),
  stdio: 'inherit',
});

if (fs.existsSync(`${siblingRepoRoot}/repository.yaml`)) {
  throw new Error(`navet-hacs must not contain repository.yaml: ${siblingRepoRoot}/repository.yaml`);
}

const branch = run('git', ['-C', siblingRepoRoot, 'branch', '--show-current']).trim();
const status = run('git', ['-C', siblingRepoRoot, 'status', '--short']).trim();
const diffStat = run('git', ['-C', siblingRepoRoot, 'diff', '--stat']).trim();

console.log(`\nSynced navet-hacs worktree on branch ${branch}.`);
printSection('navet-hacs status', status);
printSection('navet-hacs diff summary', diffStat);

console.log('\nNext steps:');
console.log(`- review ../navet-hacs`);
console.log(`- commit there when the export looks correct`);
console.log(`- push ../navet-hacs/main when you want HACS to pick up the latest repo contents`);
