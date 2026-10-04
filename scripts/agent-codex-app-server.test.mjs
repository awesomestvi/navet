import { mkdtemp, writeFile, readFile, rm, chmod, symlink, mkdir, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { appendFileSync } from 'node:fs';
import { WebSocketServer } from 'ws';
import { afterEach, expect, it } from 'vitest';
import { createCodexAppServerRequester } from './agent-codex-app-server.mjs';

const fixtures = [];
afterEach(async () => {
  for (const fixture of fixtures.splice(0)) {
    for (const client of fixture.websockets.clients) client.terminate();
    for (const socket of fixture.connections) socket.destroy();
    await new Promise((resolve) => fixture.server.close(resolve));
    fixture.websockets.close();
    await rm(fixture.directory, { recursive: true, force: true });
  }
});
async function setup(mode = 'success') {
  const directory = await mkdtemp(path.join(await realpath(tmpdir()), 'navet-app-rpc-'));
  await chmod(directory, 0o700);
  const socketPath = path.join(directory, 'socket');
  const codexPath = path.join(directory, 'codex.mjs');
  const log = path.join(directory, 'requests.jsonl');
  const server = http.createServer();
  const connections = new Set();
  server.on('connection', (socket) => { connections.add(socket); socket.on('close', () => connections.delete(socket)); });
  const websockets = new WebSocketServer({ noServer: true, perMessageDeflate: false });
  server.on('upgrade', (request, socket, head) => {
    if (mode === 'bad-upgrade') return socket.end('HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n');
    websockets.handleUpgrade(request, socket, head, (ws) => websockets.emit('connection', ws));
  });
  websockets.on('connection', (ws) => {
    ws.on('error', () => {});
    const output = (value) => ws.send(JSON.stringify(value));
    ws.on('message', (data, binary) => {
      expect(binary).toBe(false);
      const message = JSON.parse(data.toString());
      appendFileSync(log, JSON.stringify(message) + '\n');
      if (message.method === 'initialize') return output({ id: 1, result: { userAgent: 'fixture' } });
      if (!message.id) return;
      if (mode === 'hang') return;
      if (mode === 'malformed') return ws.send('not-json');
      if (mode === 'oversized') return ws.send('x'.repeat(2000));
      if (mode === 'binary') return ws.send(Buffer.from('{}'));
      if (mode === 'approval') return output({ id: 99, method: 'commandExecution/requestApproval', params: {} });
      if (mode === 'wrong-id') return output({ id: 99, result: {} });
      if (mode === 'error') return output({ id: 2, error: { message: 'private service secret' } });
      if (mode === 'missing-result') return output({ id: 2 });
      if (mode === 'notification-flood') {
        for (let i = 0; i < 30; i++) output({ method: 'thread/status/changed', params: { private: 'ignored notification' } });
        return;
      }
      ws.ping('fixture');
      output({ method: 'thread/status/changed', params: { private: 'ignored notification' } });
      const result = JSON.stringify({ id: 2, result: { thread: { id: 'thread', status: { type: 'idle' } } } });
      ws.send(result.slice(0, 12), { fin: false });
      setTimeout(() => { if (ws.readyState === 1) ws.send(result.slice(12), { fin: true }); }, 5);
    });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(socketPath, resolve); });
  await chmod(socketPath, 0o600);
  fixtures.push({ directory, server, websockets, connections });
  // Match the actual CLI: transparently forward bytes, with no JSON parsing or framing.
  await writeFile(codexPath, `#!/usr/bin/env node
import net from 'node:net';
import { appendFileSync } from 'node:fs';
appendFileSync(${JSON.stringify(log)}, JSON.stringify({ argv: process.argv.slice(2) }) + '\\n');
const socket = net.createConnection(process.argv.at(-1));
socket.on('error', () => process.exit(1));
process.stdin.pipe(socket); socket.pipe(process.stdout);
socket.on('end', () => process.exit(0));
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
it.each(['malformed', 'oversized', 'approval', 'wrong-id', 'error', 'missing-result', 'hang', 'binary', 'bad-upgrade', 'notification-flood'])('fails closed on %s transport output', async (mode) => {
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

it('resolves an owned managed rendezvous symlink to the protected physical socket', async () => {
  const h = await setup(); const alias = path.join(path.dirname(h.socketPath), 'rendezvous');
  await symlink(h.socketPath, alias);
  const request = createCodexAppServerRequester({ codexPath: h.codexPath, socketPath: alias, threadId: 'thread' });
  expect(await request('thread/read', { threadId: 'thread', includeTurns: false })).toHaveProperty('thread.id', 'thread');
  expect((await h.readLog())[0].argv.at(-1)).toBe(h.socketPath);
});
it('rejects a rendezvous in a replaceable directory', async () => {
  const h = await setup(); const directory = path.join(path.dirname(h.socketPath), 'unsafe');
  await mkdir(directory); await chmod(directory, 0o777);
  const alias = path.join(directory, 'rendezvous'); await symlink(h.socketPath, alias);
  const request = createCodexAppServerRequester({ codexPath: h.codexPath, socketPath: alias, threadId: 'thread' });
  await expect(request('thread/read', { threadId: 'thread', includeTurns: false })).rejects.toThrow('Protected');
  await expect(readFile(h.log)).rejects.toMatchObject({ code: 'ENOENT' });
});
it('rejects a symlink target with a writable parent or public socket permissions', async () => {
  const h = await setup(); const alias = path.join(path.dirname(h.socketPath), 'rendezvous');
  await symlink(h.socketPath, alias);
  const request = createCodexAppServerRequester({ codexPath: h.codexPath, socketPath: alias, threadId: 'thread' });
  await chmod(h.socketPath, 0o666);
  await expect(request('thread/read', { threadId: 'thread', includeTurns: false })).rejects.toThrow('private');
  await chmod(h.socketPath, 0o600); await chmod(path.dirname(h.socketPath), 0o777);
  await expect(request('thread/read', { threadId: 'thread', includeTurns: false })).rejects.toThrow('Protected');
  await expect(readFile(h.log)).rejects.toMatchObject({ code: 'ENOENT' });
});
