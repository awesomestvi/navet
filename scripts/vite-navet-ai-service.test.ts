import path from 'node:path';
import { PassThrough } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import {
  createViteNavetAiProxyHandler,
  registerNavetAiServiceSourceWatcher,
} from './vite-navet-ai-service';

function request(options: {
  method?: string;
  origin?: string;
  body?: string;
  url?: string;
}) {
  const stream = new PassThrough() as PassThrough & IncomingMessage;
  stream.method = options.method ?? 'GET';
  stream.url = options.url ?? '/__navet_ai__/state';
  stream.headers = {
    host: 'navet.local:5200',
    ...(options.origin ? { origin: options.origin } : {}),
    ...(options.body ? { 'content-type': 'application/json' } : {}),
  };
  stream.end(options.body);
  return stream;
}

function response() {
  const headers = new Map<string, string>();
  const output = { status: 200, body: '' };
  const serverResponse = {
    statusCode: 200,
    setHeader(name: string, value: string) {
      headers.set(name.toLowerCase(), value);
    },
    end(body?: string | Buffer) {
      output.status = this.statusCode;
      output.body = body ? String(body) : '';
    },
  } as unknown as ServerResponse;
  return { headers, output, serverResponse };
}

describe('Vite Navet AI proxy', () => {
  it('watches the service bundle and every imported core intelligence source', () => {
    const listeners = new Map<
      string,
      (eventName: 'add' | 'change' | 'unlink', changedPath: string) => void
    >();
    const watcher = {
      add: vi.fn(),
      on: vi.fn(
        (
          event: string,
          listener: (eventName: 'add' | 'change' | 'unlink', changedPath: string) => void
        ) => {
          listeners.set(event, listener);
        }
      ),
    };
    const restart = vi.fn();
    const repositoryRoot = '/repo/navet';

    registerNavetAiServiceSourceWatcher({ repositoryRoot, watcher, restart });

    const intelligenceChatPath = path.join(
      repositoryRoot,
      'packages/core/src/intelligence-chat.ts'
    );
    expect(watcher.add).toHaveBeenCalledWith([
      path.join(repositoryRoot, 'services/navet-ai'),
      path.join(repositoryRoot, 'packages/core/src/home-events.ts'),
      path.join(repositoryRoot, 'packages/core/src/intelligence.ts'),
      intelligenceChatPath,
    ]);

    listeners.get('all')?.('change', 'packages/core/src/intelligence-chat.ts');
    expect(restart).toHaveBeenCalledOnce();
  });

  it('keeps the local service behind the authenticated Navet session', async () => {
    const fetchImplementation = vi.fn();
    const result = response();
    const handle = createViteNavetAiProxyHandler({
      resolvePrincipal: () => null,
      targetOrigin: 'http://127.0.0.1:18098',
      ready: Promise.resolve(),
      fetchImplementation,
    });

    await handle(request({}), result.serverResponse);

    expect(result.output.status).toBe(401);
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it('rejects cross-origin mutations before forwarding them', async () => {
    const fetchImplementation = vi.fn();
    const result = response();
    const handle = createViteNavetAiProxyHandler({
      resolvePrincipal: () => ({ sessionId: 'session-1' }),
      targetOrigin: 'http://127.0.0.1:18098',
      ready: Promise.resolve(),
      fetchImplementation,
    });

    await handle(
      request({ method: 'POST', origin: 'https://attacker.example', body: '{}' }),
      result.serverResponse
    );

    expect(result.output.status).toBe(403);
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it('forwards authenticated same-origin requests to the loopback service', async () => {
    const fetchImplementation = vi.fn(async () =>
      Response.json({ contract: 'navet.ai', readOnly: true })
    );
    const result = response();
    const handle = createViteNavetAiProxyHandler({
      resolvePrincipal: () => ({ sessionId: 'session-1' }),
      targetOrigin: 'http://127.0.0.1:18098',
      ready: Promise.resolve(),
      fetchImplementation,
    });

    await handle(
      request({
        method: 'POST',
        origin: 'http://navet.local:5200',
        url: '/__navet_ai__/generate',
        body: '{"locale":"en"}',
      }),
      result.serverResponse
    );

    expect(result.output.status).toBe(200);
    expect(JSON.parse(result.output.body)).toEqual({ contract: 'navet.ai', readOnly: true });
    expect(fetchImplementation).toHaveBeenCalledWith(
      new URL('http://127.0.0.1:18098/__navet_ai__/generate'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});
