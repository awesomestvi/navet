import { spawn } from 'node:child_process';
import { lstat, realpath } from 'node:fs/promises';
import { Duplex } from 'node:stream';
import WebSocket from 'ws';
import path from 'node:path';

const scopedText = (value) => typeof value === 'string' && value.trim() && value.length <= 4096;

// Resolve the rendezvous alias before launch; the proxy receives only its protected physical path.
async function ownedSocket(socketPath) {
  const uid = process.getuid?.();
  if (!Number.isInteger(uid)) throw new Error('Owned local app-server socket required.');
  const validateDirectories = async (directory) => {
    for (;;) {
      const entry = await lstat(directory);
      const trustedOwner = entry.uid === uid || entry.uid === 0;
      const stickyRoot = entry.uid === 0 && (entry.mode & 0o1000) !== 0;
      if (!entry.isDirectory() || !trustedOwner || ((entry.mode & 0o022) !== 0 && !stickyRoot)) {
        throw new Error('Protected local app-server path required.');
      }
      const parent = path.dirname(directory);
      if (parent === directory) return;
      directory = parent;
    }
  };
  const alias = await lstat(socketPath);
  if (alias.uid !== uid || (!alias.isSocket() && !alias.isSymbolicLink())) {
    throw new Error('Owned local app-server socket required.');
  }
  await validateDirectories(await realpath(path.dirname(socketPath)));
  const physicalPath = await realpath(socketPath);
  await validateDirectories(path.dirname(physicalPath));
  const socket = await lstat(physicalPath);
  if (!socket.isSocket() || socket.uid !== uid || (socket.mode & 0o077) !== 0) {
    throw new Error('Owned private app-server socket required.');
  }
  return physicalPath;
}

// Explicitly configured existing socket only. This never starts a daemon or changes its settings.
export function createCodexAppServerRequester({ codexPath, socketPath, threadId, maxRunMs = 15_000,
  maxResponseBytes = 1_048_576 }) {
  if (!path.isAbsolute(codexPath ?? '') || !path.isAbsolute(socketPath ?? '') || !scopedText(threadId) ||
      !Number.isSafeInteger(maxRunMs) || maxRunMs < 1 || maxRunMs > 60_000 ||
      !Number.isSafeInteger(maxResponseBytes) || maxResponseBytes < 1 || maxResponseBytes > 4_194_304) {
    throw new Error('Invalid local app-server configuration.');
  }
  return async (method, params, { signal } = {}) => {
    const keys = Object.keys(params ?? {}).sort();
    const expected = method === 'thread/read' ? ['includeTurns', 'threadId']
      : method === 'thread/turns/list' ? ['itemsView', 'limit', 'sortDirection', 'threadId']
      : method === 'turn/interrupt' ? ['threadId', 'turnId'] : [];
    if (!expected.length || JSON.stringify(keys) !== JSON.stringify(expected.sort()) || params.threadId !== threadId ||
        (method === 'thread/read' && params.includeTurns !== false) ||
        (method === 'thread/turns/list' && (params.itemsView !== 'notLoaded' || params.limit !== 1 || params.sortDirection !== 'desc')) ||
        (method === 'turn/interrupt' && !scopedText(params.turnId))) throw new Error('Unscoped app-server request.');
    const payload = structuredClone(params);
    if (signal?.aborted) throw new Error('Canceled app-server request.');
    const physicalPath = await ownedSocket(socketPath);
    if (signal?.aborted) throw new Error('Canceled app-server request.');
    return new Promise((resolve, reject) => {
      let child;
      let websocket;
      let timer;
      let finished = false;
      let initialized = false;
      let bytes = 0;
      const complete = (error, result) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
        websocket?.terminate();
        child?.stdin.end();
        if (child && child.exitCode === null && child.signalCode === null) {
          child.kill('SIGTERM');
          const kill = setTimeout(() => {
            if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
          }, 1000);
          kill.unref();
        }
        if (error) reject(new Error('App-server request unavailable.'));
        else resolve(result);
      };
      const cancel = () => complete(true);
      const send = (message) => websocket.send(JSON.stringify(message), (error) => { if (error) complete(true); });
      try {
        child = spawn(codexPath, ['app-server', 'proxy', '--sock', physicalPath], {
          shell: false, stdio: ['pipe', 'pipe', 'ignore'],
        });
        child.on('error', () => complete(true));
        child.stdin.on('error', () => complete(true));
        child.on('close', () => complete(true));
        // Count handshake, control frames, notifications and fragmented messages together.
        child.stdout.on('data', (chunk) => {
          bytes += chunk.length;
          if (bytes > maxResponseBytes) complete(true);
        });
        websocket = new WebSocket('ws://localhost/', {
          createConnection: () => Duplex.from({ readable: child.stdout, writable: child.stdin }),
          perMessageDeflate: false, followRedirects: false,
          maxPayload: maxResponseBytes,
        });
        websocket.on('unexpected-response', (request, response) => {
          response.destroy(); request.destroy(); complete(true);
        });
        websocket.on('error', () => complete(true));
        websocket.on('close', () => complete(true));
        websocket.on('message', (data, isBinary) => {
          if (finished) return;
          if (isBinary) return complete(true);
          let message;
          try { message = JSON.parse(data.toString('utf8')); } catch { return complete(true); }
          if (!message || typeof message !== 'object' || Array.isArray(message)) return complete(true);
          if (message.method) {
            // No server-initiated approvals, commands or interaction is authorized by this client.
            if ('id' in message) return complete(true);
            return;
          }
          if (message.error || !Object.hasOwn(message, 'result')) return complete(true);
          if (!initialized && message.id === 1 && message.result && typeof message.result === 'object') {
            initialized = true;
            send({ method: 'initialized', params: {} });
            send({ id: 2, method, params: payload });
          } else if (initialized && message.id === 2) complete(false, message.result);
          else complete(true);
        });
        websocket.on('open', () => {
          if (finished) return;
          send({ id: 1, method: 'initialize', params: { clientInfo: { name: 'navet_worker_monitor', version: '1.0.0' },
            capabilities: { experimentalApi: true } } });
        });
        signal?.addEventListener('abort', cancel, { once: true });
        timer = setTimeout(cancel, maxRunMs);
        if (signal?.aborted) return cancel();
      } catch { complete(true); }
    });
  };
}
