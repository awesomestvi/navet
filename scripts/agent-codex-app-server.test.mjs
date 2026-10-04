import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { afterEach, expect, it } from 'vitest';
import { createCodexAppServerRequester } from './agent-codex-app-server.mjs';

const fixtures = [];
afterEach(async () => {
  for (const fixture of fixtures.splice(0)) {
    await new Promise((resolve) => fixture.server.close(resolve));
    await rm(fixture.directory, { recursive: true, force: true });
  }
});
async function setup(mode = 'success') {
  const directory = await mkdtemp(path.join(tmpdir(), 'navet-app-rpc-'));
  const socketPath = path.join(directory, 'socket');
  const codexPath = path.join(directory, 'codex.mjs');
  const log = path.join(directory, 'requests.jsonl');
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(socketPath, resolve); });
  fixtures.push({ directory, server });
  await writeFile(codexPath, `#!/usr/bin/env node
import readline from 'node:readline';
import { appendFileSync } from 'node:fs';
const mode = ${JSON.stringify(mode)};
const log = ${JSON.stringify(log)};
appendFileSync(log, JSON.stringify({ argv: process.argv.slice(2) }) + '\\n');
const output = (value) => process.stdout.write(JSON.stringify(value) + '\\n');
readline.createInterface({ input: process.stdin }).on('line', (line) => {
  const message = JSON.parse(line);
  appendFileSync(log, JSON.stringify(message) + '\\n');
  if (message.method === 'initialize') return output({ id: 1, result: { userAgent: 'fixture' } });
  if (!message.id) return;
  if (mode === 'hang') return;
  if (mode === 'malformed') return process.stdout.write('not-json\\n');
  if (mode === 'oversized') return process.stdout.write('x'.repeat(2000));
  if (mode === 'approval') return output({ id: 99, method: 'commandExecution/requestApproval', params: {} });
  if (mode === 'wrong-id') return output({ id: 99, result: {} });
  if (mode === 'error') { process.stderr.write('private diagnostic secret'); return output({ id: 2, error: { message: 'private service secret' } }); }
  if (mode === 'missing-result') return output({ id: 2 });
  output({ method: 'thread/status/changed', params: { private: 'ignored notification' } });
  const data = JSON.stringify({ id: 2, result: { thread: { id: 'thread', status: { type: 'idle' } } } }) + '\\n';
  process.stdout.write(data.slice(0, 12));
  setTimeout(() => process.stdout.write(data.slice(12)), 5);
});
`, { mode: 0o700 });
  const request = createCodexAppServerRequester({ codexPath, socketPath, threadId: 'thread', maxRunMs: 1000, maxResponseBytes: 1500 });
  return { request, codexPath, socketPath, log, readLog: async () => (await readFile(log, 'utf8')).trim().split('\n').map(JSON.parse) };
}
it('initializes the existing-socket proxy and correlates a fragmented scoped response', async () => {
  const h = await setup();
  expect(await h.request('thread/read', { threadId: 'thread', includeTurns: false })).toEqual({ thread: { id: 'thread', status: { type: 'idle' } } });
  const records = await h.readLog();
  expect(records[0].argv).toEqual(['app-server', 'proxy', '--sock', h.socketPath]);
  expect(records.slice(1)).toEqual([
    { id: 1, method: 'initialize', params: { clientInfo: { name: 'navet_worker_monitor', version: '1.0.0' }, capabilities: { experimentalApi: true } } },
    { method: 'initialized', params: {} },
    { id: 2, method: 'thread/read', params: { threadId: 'thread', includeTurns: false } },
  ]);
});
it.each(['malformed', 'oversized', 'approval', 'wrong-id', 'error', 'missing-result', 'hang'])('fails closed on %s transport output', async (mode) => {
  const h = await setup(mode);
  await expect(h.request('thread/read', { threadId: 'thread', includeTurns: false })).rejects.toThrow('App-server request unavailable.');
});
it.each([
  ['thread/start', { threadId: 'thread' }],
  ['thread/read', { threadId: 'other', includeTurns: false }],
  ['thread/read', { threadId: 'thread', includeTurns: true }],
  ['thread/read', { threadId: 'thread', includeTurns: false, arbitrary: 'extra' }],
  ['thread/turns/list', { threadId: 'thread', itemsView: 'full', limit: 1, sortDirection: 'desc' }],
  ['turn/interrupt', { threadId: 'thread', turnId: '' }],
])('rejects unscoped %s before launching a proxy', async (method, params) => {
  const h = await setup();
  await expect(h.request(method, params)).rejects.toThrow('Unscoped');
  await expect(readFile(h.log)).rejects.toMatchObject({ code: 'ENOENT' });
});
it('snapshots accepted parameters before asynchronous socket validation', async () => {
  const h = await setup(); const params = { threadId: 'thread', turnId: 'accepted-turn' };
  const result = h.request('turn/interrupt', params); params.threadId = 'other'; params.turnId = 'successor';
  await result;
  expect((await h.readLog()).at(-1)).toMatchObject({ method: 'turn/interrupt', params: { threadId: 'thread', turnId: 'accepted-turn' } });
});
it('rejects absent and non-socket paths without creating a daemon', async () => {
  const h = await setup();
  for (const socketPath of [path.join(path.dirname(h.socketPath), 'absent'), h.codexPath]) {
    const request = createCodexAppServerRequester({ codexPath: h.codexPath, socketPath, threadId: 'thread' });
    await expect(request('thread/read', { threadId: 'thread', includeTurns: false })).rejects.toThrow();
  }
  await expect(readFile(h.log)).rejects.toMatchObject({ code: 'ENOENT' });
});
it('honors cancellation before launch and while waiting for an unresponsive proxy', async () => {
  const h = await setup('hang'); const before = new AbortController(); before.abort();
  await expect(h.request('thread/read', { threadId: 'thread', includeTurns: false }, { signal: before.signal })).rejects.toThrow('Canceled');
  await expect(readFile(h.log)).rejects.toMatchObject({ code: 'ENOENT' });
  const controller = new AbortController();
  const result = h.request('thread/read', { threadId: 'thread', includeTurns: false }, { signal: controller.signal });
  setTimeout(() => controller.abort(), 100);
  await expect(result).rejects.toThrow('App-server request unavailable');
});
