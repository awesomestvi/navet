import { createServer, type IncomingMessage } from 'node:http';
import {
  fetchPublicRssFeed,
  RSS_MAX_URL_BYTES,
  RSS_TIMEOUT_MS,
  type RssFeedResponse,
  rssError,
} from './public-rss-feed.ts';

function readTarget(request: IncomingMessage, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    const cleanup = () => {
      request.off('data', onData);
      request.off('end', onEnd);
      request.off('error', onError);
      signal.removeEventListener('abort', onAbort);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onAbort = () => onError(new Error('Request cancelled'));
    const onData = (chunk: Buffer) => {
      size += chunk.byteLength;
      if (size > RSS_MAX_URL_BYTES) {
        onError(new RangeError('Feed URL is too large'));
        return;
      }
      chunks.push(chunk);
    };
    const onEnd = () => {
      cleanup();
      resolve(Buffer.concat(chunks).toString('utf8').trim());
    };
    request.on('data', onData);
    request.once('end', onEnd);
    request.once('error', onError);
    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
}

/** Local transport only: nginx/njs owns caller authentication; this owns public egress enforcement. */
export function createRssTransportServer() {
  const pending = new Set<AbortController>();
  const server = createServer(
    {
      requestTimeout: RSS_TIMEOUT_MS,
      headersTimeout: RSS_TIMEOUT_MS,
      connectionsCheckingInterval: 1000,
    },
    async (request, response) => {
      if (pending.size >= 32) {
        response.writeHead(503, { 'Content-Type': 'application/json', Connection: 'close' });
        response.end(JSON.stringify({ error: 'Feed transport is busy' }));
        return;
      }
      const controller = new AbortController();
      pending.add(controller);
      const timeout = setTimeout(() => controller.abort(), RSS_TIMEOUT_MS);
      request.once('aborted', () => controller.abort());
      request.on('error', () => controller.abort());
      response.once('close', () => {
        if (!response.writableFinished) controller.abort();
      });
      response.setHeader('Connection', 'close');
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      try {
        let result: RssFeedResponse;
        if (request.method !== 'POST' || request.url !== '/') {
          result = rssError(405, 'Only feed transport POST requests are supported');
        } else {
          const target = await readTarget(request, controller.signal);
          result = target
            ? await fetchPublicRssFeed(target, controller.signal)
            : rssError(400, 'Missing feed URL');
        }
        request.resume();
        response.writeHead(result.status, { 'Content-Type': result.contentType });
        response.end(result.body);
      } catch (error) {
        if (!response.destroyed) {
          const result = rssError(
            error instanceof RangeError ? 413 : 502,
            error instanceof RangeError ? 'Feed URL is too large' : 'Unable to load feed'
          );
          request.resume();
          response.writeHead(result.status, { 'Content-Type': result.contentType });
          response.end(result.body);
        }
      } finally {
        clearTimeout(timeout);
        pending.delete(controller);
      }
    }
  );
  server.maxConnections = 32;
  server.setTimeout(RSS_TIMEOUT_MS, (socket) => socket.destroy());
  const shutdown = async () => {
    for (const controller of pending) controller.abort();
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  };
  return { server, shutdown };
}
