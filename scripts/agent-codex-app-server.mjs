import { spawn } from 'node:child_process';
import { lstat } from 'node:fs/promises';
import path from 'node:path';

const scopedText = (value) => typeof value === 'string' && value.trim() && value.length <= 4096;

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
    const socket = await lstat(socketPath);
    if (!socket.isSocket() || socket.uid !== process.getuid?.()) throw new Error('Owned local app-server socket required.');
    if (signal?.aborted) throw new Error('Canceled app-server request.');
    return new Promise((resolve, reject) => {
      let child;
      let timer;
      let finished = false;
      let initialized = false;
      let bytes = 0;
      let buffer = '';
      const complete = (error, result) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
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
      const send = (message) => child.stdin.write(JSON.stringify(message) + '\n');
      try {
        child = spawn(codexPath, ['app-server', 'proxy', '--sock', socketPath], {
          shell: false, stdio: ['pipe', 'pipe', 'ignore'],
        });
        child.on('error', () => complete(true));
        child.stdin.on('error', () => complete(true));
        child.on('close', () => complete(true));
        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (chunk) => {
          if (finished) return;
          bytes += Buffer.byteLength(chunk);
          if (bytes > maxResponseBytes) return complete(true);
          buffer += chunk;
          let newline;
          while (!finished && (newline = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newline);
            buffer = buffer.slice(newline + 1);
            let message;
            try { message = JSON.parse(line); } catch { return complete(true); }
            if (!message || typeof message !== 'object' || Array.isArray(message)) return complete(true);
            if (message.method) {
              // No server-initiated approvals, commands or interaction is authorized by this client.
              if ('id' in message) return complete(true);
              continue;
            }
            if (message.error || !Object.hasOwn(message, 'result')) return complete(true);
            if (!initialized && message.id === 1 && message.result && typeof message.result === 'object') {
              initialized = true;
              send({ method: 'initialized', params: {} });
              send({ id: 2, method, params: payload });
            } else if (initialized && message.id === 2) complete(false, message.result);
            else return complete(true);
          }
        });
        signal?.addEventListener('abort', cancel, { once: true });
        timer = setTimeout(cancel, maxRunMs);
        if (signal?.aborted) return cancel();
        send({ id: 1, method: 'initialize', params: { clientInfo: { name: 'navet_worker_monitor', version: '1.0.0' },
          capabilities: { experimentalApi: true } } });
      } catch { complete(true); }
    });
  };
}
