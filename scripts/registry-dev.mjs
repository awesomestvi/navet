#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdirSync, watch, writeFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { serveRegistry, sourceRevision } from './ui-registry.mjs';
const root = process.cwd();
const storybookPort = Number(process.env.NAVET_STORYBOOK_PORT ?? 6006);
const registryPort = Number(process.env.NAVET_REGISTRY_PORT ?? 7331);
for (const port of [storybookPort, registryPort]) if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid development port');
const cache = path.join(root, '.cache/ui-registry');
mkdirSync(cache, { recursive: true });
async function available(port) {
  const probe = createServer();
  await new Promise((resolve, reject) => { probe.once('error', (error) => reject(new Error(error.code === 'EADDRINUSE' ? `Port ${port} is occupied. Stop its owner or select an explicit NAVET_STORYBOOK_PORT/NAVET_REGISTRY_PORT.` : `Cannot listen on port ${port}: ${error.message}`))); probe.listen(port, '127.0.0.1', resolve); });
  await new Promise((resolve) => probe.close(resolve));
}
await available(storybookPort); await available(registryPort);
const state = { error: 'Registry build pending' };
const errorFile = path.join(cache, 'error.json');
const invalidate = (message) => { state.error = message; writeFileSync(errorFile, JSON.stringify({ error: message })); };
invalidate(state.error);
const server = serveRegistry(path.join(cache, 'r'), registryPort, state);
const children = new Set();
const watchers = [];
let stopping = false;
let building = false;
let queued = false;
let storybook;
let timer;
function child(command, args) {
  const process = spawn(command, args, { cwd: root, stdio: 'inherit', detached: true, env: { ...globalThis.process.env } });
  children.add(process); process.once('exit', () => children.delete(process));
  process.once('error', (error) => { console.error(error); stop(1); });
  return process;
}
function stop(code = 0) {
  if (stopping) return;
  stopping = true; clearTimeout(timer); clearInterval(revisionTimer);
  watchers.forEach((watcher) => watcher.close());
  invalidate('Development server stopped; rebuild or restart registry:dev.');
  server.close();
  const groups = [...children].map((child) => child.pid);
  for (const pid of groups) { try { globalThis.process.kill(-pid, 'SIGTERM'); } catch {} }
  setTimeout(() => { for (const pid of groups) { try { globalThis.process.kill(-pid, 'SIGKILL'); } catch {} } globalThis.process.exit(code); }, 2000);
  globalThis.process.exitCode = code;
}
function rebuild() {
  if (stopping) return;
  if (building) { queued = true; return; }
  building = true; queued = false;
  invalidate('Registry source changed; rebuilding contracts and story links.');
  const builder = child(globalThis.process.execPath, ['scripts/ui-registry.mjs', 'build']);
  builder.once('exit', (code) => {
    building = false;
    if (stopping) return;
    if (queued) { rebuild(); return; }
    if (code !== 0) { invalidate('Registry build failed. See terminal diagnostics; old payloads are unavailable.'); return; }
    state.error = null; rmSync(errorFile, { force: true });
    lastRevision = JSON.stringify(sourceRevision(root));
    if (!storybook) {
      storybook = child('pnpm', ['storybook:only', '--port', String(storybookPort)]);
      storybook.once('exit', (code) => { if (!stopping) stop(code || 1); });
    }
  });
}
function changed() {
  invalidate('Registry source changed; rebuild pending.');
  if (building) queued = true;
  clearTimeout(timer); timer = setTimeout(rebuild, 300);
}
for (const directory of ['packages', 'scripts', 'apps/storybook']) watchers.push(watch(path.join(root, directory), { recursive: true }, (_event, file) => {
  const parts = String(file ?? '').split(path.sep);
  if (parts.some((part) => ['node_modules', 'dist', '.cache', '.git', '.vite'].includes(part)) || String(file).endsWith('.log')) return;
  if (!/\.(?:tsx?|mjs|json|ya?ml|css)$/.test(String(file))) return;
  changed();
}));
// Watch the directory so editor atomic replacements do not detach a file-inode watcher.
const rootInputs = new Set(['tsconfig.json', 'package.json', 'pnpm-lock.yaml', 'components.json']);
watchers.push(watch(root, (_event, file) => { if (rootInputs.has(String(file))) changed(); }));
let lastRevision = JSON.stringify(sourceRevision(root));
const revisionTimer = setInterval(() => { const revision = JSON.stringify(sourceRevision(root)); if (revision !== lastRevision) { lastRevision = revision; changed(); } }, 2000);
server.once('error', (error) => { console.error(error); stop(1); });
// Package runners can forward the terminal signal twice; keep handlers installed
// while the detached process groups finish their graceful shutdown.
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
rebuild();
