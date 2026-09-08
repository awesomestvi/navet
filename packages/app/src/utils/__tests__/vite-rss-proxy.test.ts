import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { rssProxyPlugin } from '@scripts/vite-public-media-plugins';
import { requestPublicResource } from '@scripts/vite-public-resource-request';
import type { ViteDevServer } from 'vite';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@scripts/vite-public-resource-request', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@scripts/vite-public-resource-request')>()),
  requestPublicResource: vi.fn(),
}));
beforeEach(() => vi.resetAllMocks());

function middleware(authenticated: boolean) {
  let handle: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
  rssProxyPlugin(() => authenticated).configureServer({
    middlewares: {
      use: (_path: string, callback: typeof handle) => {
        handle = callback;
      },
    },
  } as unknown as ViteDevServer);
  return async () => {
    const response = Object.assign(new EventEmitter(), {
      statusCode: 0,
      setHeader: vi.fn(),
      end: vi.fn(),
    });
    await handle(
      { url: '/?url=https%3A%2F%2Ffeed.example%2Frss%3Fsigned%3Dtoken' } as IncomingMessage,
      response as unknown as ServerResponse
    );
    return response;
  };
}

describe('Vite RSS authentication', () => {
  it('rejects anonymous callers before resolving or connecting to a URL', async () => {
    const response = await middleware(false)();
    expect(response.statusCode).toBe(401);
    expect(requestPublicResource).not.toHaveBeenCalled();
  });

  it('keeps signed feed URLs intact for authenticated callers', async () => {
    vi.mocked(requestPublicResource).mockResolvedValue(
      new Response('<rss/>', { headers: { 'Content-Type': 'application/rss+xml' } })
    );
    const response = await middleware(true)();
    expect(response.statusCode).toBe(200);
    expect(response.end).toHaveBeenCalledWith('<rss/>');
    expect(vi.mocked(requestPublicResource).mock.calls[0]?.[0].href).toBe(
      'https://feed.example/rss?signed=token'
    );
  });
});
