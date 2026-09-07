import { lookup } from 'node:dns/promises';
import type { IncomingMessage } from 'node:http';
import { request } from 'node:https';
import { Readable } from 'node:stream';
import { requestPublicResource } from '@scripts/vite-public-resource-request';
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest';

vi.mock('node:dns/promises', () => {
  const lookup = vi.fn();
  return { lookup, default: { lookup } };
});
vi.mock('node:https', () => {
  const request = vi.fn();
  return { request, default: { request } };
});

const lookupMock = vi.mocked(lookup) as unknown as Mock<
  () => Promise<Array<{ address: string; family: number }>>
>;

afterEach(() => vi.resetAllMocks());

function respond(status = 200) {
  vi.mocked(request).mockImplementation((...args: unknown[]) => {
    const callback = args[2] as (response: IncomingMessage) => void;
    return {
      on: vi.fn(),
      end: () =>
        callback(
          Object.assign(Readable.from([Buffer.from('<rss/>')]), {
            statusCode: status,
            rawHeaders: ['Content-Type', 'application/rss+xml'],
          }) as IncomingMessage
        ),
    } as unknown as ReturnType<typeof request>;
  });
}
const options = () => ({
  signal: new AbortController().signal,
  headers: { Accept: 'application/rss+xml' },
});

describe('public resource DNS pinning', () => {
  it('connects to the checked answers without changing the TLS or Host authority', async () => {
    lookupMock.mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }]);
    respond();
    const response = await requestPublicResource(
      new URL('https://feed.example/rss?signed=token'),
      options()
    );
    const calls = vi.mocked(request).mock.calls as unknown[][];
    if (!calls[0]) throw new Error('Expected HTTPS request');
    const [target, transport] = calls[0] as [
      URL,
      {
        agent: boolean;
        lookup: (
          host: string,
          options: { all: boolean },
          callback: (...args: unknown[]) => void
        ) => void;
      },
    ];
    expect(target.href).toBe('https://feed.example/rss?signed=token');
    expect(transport.agent).toBe(false);
    // Even if the next DNS answer would point at loopback, the connector uses the validated set.
    lookupMock.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
    const resolved = vi.fn();
    transport.lookup('feed.example', { all: true }, resolved);
    expect(resolved).toHaveBeenCalledWith(null, [{ address: '8.8.8.8', family: 4 }]);
    expect(lookup).toHaveBeenCalledOnce();
    expect(await response.text()).toBe('<rss/>');
  });

  it('rejects a DNS answer set containing any private address before opening HTTPS', async () => {
    lookupMock.mockResolvedValue([
      { address: '8.8.8.8', family: 4 },
      { address: '::ffff:7f00:1', family: 6 },
    ]);
    await expect(
      requestPublicResource(new URL('https://feed.example/rss'), options())
    ).rejects.toThrow('Private DNS');
    expect(request).not.toHaveBeenCalled();
  });

  it('does not follow upstream redirects to unchecked destinations', async () => {
    lookupMock.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    respond(302);
    const response = await requestPublicResource(new URL('https://feed.example/rss'), options());
    expect(response.ok).toBe(false);
    expect(request).toHaveBeenCalledOnce();
    expect(lookup).toHaveBeenCalledOnce();
  });
});
