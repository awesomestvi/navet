import { lookup } from 'node:dns/promises';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import {
  createServer as createHttpsServer,
  request as httpsRequest,
  type RequestOptions,
} from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { URL as NodeURL } from 'node:url';
import { createRssTransportServer } from '@scripts/rss-transport-server';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

vi.mock('node:dns/promises', () => {
  const lookup = vi.fn();
  return { lookup, default: { lookup } };
});
vi.mock('node:https', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:https')>();
  const request = vi.fn(original.request);
  return { ...original, request, default: { ...original, request } };
});
const lookupMock = vi.mocked(lookup) as unknown as Mock<
  () => Promise<Array<{ address: string; family: number }>>
>;
const cert = await readFile(new NodeURL('./fixtures/rss-tls/cert.pem', import.meta.url));
const key = await readFile(new NodeURL('./fixtures/rss-tls/key.pem', import.meta.url));
const originalHttps = await vi.importActual<typeof import('node:https')>('node:https');
let directory: string;
let socketPath: string;
let transport: ReturnType<typeof createRssTransportServer>;
let upstream: ReturnType<typeof createHttpsServer>;
let target: string;
const hits = vi.fn();

beforeEach(async () => {
  vi.clearAllMocks();
  lookupMock.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
  directory = await mkdtemp(join(tmpdir(), 'navet-rss-'));
  socketPath = join(directory, 'rss.sock');
  upstream = createHttpsServer({ key, cert }, (request, response) => {
    hits(request.url, request.headers);
    response.setHeader('Content-Type', 'application/rss+xml');
    if (request.url === '/redirect') {
      response.writeHead(302, { Location: 'https://127.0.0.1/private' });
      response.end();
    } else if (request.url === '/large') {
      response.write('a'.repeat(1024 * 1024));
      response.end('extra');
    } else if (request.url === '/wrong-type') {
      response.setHeader('Content-Type', 'text/html');
      response.end('<html>Not a feed</html>');
    } else if (request.url === '/slow') {
      response.write('<rss>');
    } else {
      response.end('<rss/>');
    }
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  const address = upstream.address();
  if (!address || typeof address === 'string') throw new Error('Expected upstream TCP address');
  target = `https://feed.example:${address.port}`;
  // Only the final network hop is rerouted into the local TLS fixture. The production lookup
  // callback must supply the approved public address; original URL, Host and TLS checks remain real.
  vi.mocked(httpsRequest).mockImplementation(((
    url: URL,
    options: RequestOptions,
    callback: Parameters<typeof httpsRequest>[2]
  ) => {
    const pinnedLookup = options.lookup;
    return originalHttps.request(
      url,
      {
        ...options,
        ca: cert,
        lookup: (_hostname, lookupOptions, callback) => {
          if (!pinnedLookup) throw new Error('Missing pinned lookup');
          pinnedLookup('feed.example', { ...lookupOptions, all: true }, (error, addresses) => {
            expect(error).toBeNull();
            expect(addresses).toEqual([{ address: '8.8.8.8', family: 4 }]);
            if (lookupOptions.all) callback(null, [{ address: '127.0.0.1', family: 4 }]);
            else callback(null, '127.0.0.1', 4);
          });
        },
      },
      callback
    );
  }) as typeof httpsRequest);
  transport = createRssTransportServer();
  transport.server.listen(socketPath);
  await once(transport.server, 'listening');
});

afterEach(async () => {
  await transport.shutdown();
  upstream.closeAllConnections();
  await new Promise<void>((resolve) => upstream.close(() => resolve()));
  await rm(directory, { recursive: true, force: true });
});

function send(body: string, method = 'POST') {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const request = httpRequest(
      {
        socketPath,
        agent: false,
        path: '/',
        method,
        headers: { Cookie: 'secret=session', Authorization: 'Bearer secret' },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () =>
          resolve({ status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString() })
        );
      }
    );
    request.on('error', reject);
    request.end(body);
  });
}

describe('Unix socket RSS transport', () => {
  it('loads XML through verified TLS with original signed URL/Host and no incoming credentials', async () => {
    expect(await send(`${target}/rss?signed=token`)).toEqual({ status: 200, body: '<rss/>' });
    expect(lookupMock).toHaveBeenCalledOnce();
    expect(hits).toHaveBeenCalledWith(
      '/rss?signed=token',
      expect.objectContaining({ host: new URL(target).host })
    );
    expect(hits.mock.calls[0]?.[1]).not.toHaveProperty('cookie');
    expect(hits.mock.calls[0]?.[1]).not.toHaveProperty('authorization');
  });

  it('rejects a private DNS answer before opening any upstream connection', async () => {
    lookupMock.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
    expect((await send(`${target}/rss`)).status).toBe(400);
    expect(httpsRequest).not.toHaveBeenCalled();
    expect(hits).not.toHaveBeenCalled();
  });

  it('rejects a hostname certificate mismatch even with a trusted test certificate', async () => {
    expect((await send(`${target.replace('feed.example', 'wrong.example')}/rss`)).status).toBe(502);
    expect(hits).not.toHaveBeenCalled();
  });

  it('does not follow a redirect to private infrastructure', async () => {
    expect((await send(`${target}/redirect`)).status).toBe(502);
    expect(hits).toHaveBeenCalledTimes(1);
  });

  it('limits chunked upstream responses by bytes', async () => {
    expect((await send(`${target}/large`)).status).toBe(502);
  });

  it('continues serving after oversized and unsupported responses cancel their upstream streams', async () => {
    for (const route of ['/large', '/wrong-type']) {
      expect((await send(`${target}${route}`)).status).toBe(502);
      expect(await send(`${target}/rss`)).toEqual({ status: 200, body: '<rss/>' });
    }
  });

  it('rejects oversized target bodies before DNS', async () => {
    expect((await send('a'.repeat(8193))).status).toBe(413);
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it('rejects wrong methods before DNS', async () => {
    expect((await send('', 'GET')).status).toBe(405);
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it('cancels a pending upstream response when its Unix client disconnects', async () => {
    const request = httpRequest({ socketPath, path: '/', method: 'POST' });
    request.on('error', () => {});
    request.end(`${target}/slow`);
    await vi.waitFor(() => expect(hits).toHaveBeenCalled());
    request.destroy();
    await vi.waitFor(() => expect(transport.server.listening).toBe(true));
    await vi.waitFor(async () => {
      const connections = await new Promise<number>((resolve, reject) =>
        upstream.getConnections((error, count) => (error ? reject(error) : resolve(count)))
      );
      expect(connections).toBe(0);
    });
  });
});
