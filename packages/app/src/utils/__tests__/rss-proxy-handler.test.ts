import rssProxy from '@docker/njs/rss-proxy.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authorization = vi.hoisted(() => ({ auth: vi.fn(), homey: vi.fn(), openhab: vi.fn() }));
vi.mock('@docker/njs/auth-store.js', () => ({
  default: { resolveAuthenticatedPrincipal: authorization.auth },
}));
vi.mock('@docker/njs/homey-store.js', () => ({
  default: { resolveHomeySession: authorization.homey },
}));
vi.mock('@docker/njs/openhab-store.js', () => ({
  default: { resolveOpenHABSession: authorization.openhab },
}));
beforeEach(() => {
  vi.resetAllMocks();
  authorization.auth.mockReturnValue({ userId: 'user' });
});

function request(url: string) {
  return {
    args: { url },
    variables: {},
    headersOut: {},
    return: vi.fn(),
    subrequest: vi.fn().mockResolvedValue({
      status: 200,
      headersOut: { 'Content-Type': 'application/rss+xml' },
      responseText: '<rss/>',
    }),
  };
}

describe('Docker RSS proxy host enforcement', () => {
  it('rejects unauthenticated requests before fetching and never trusts standalone forwarded identity', async () => {
    authorization.auth.mockReturnValue(null);
    const req = {
      ...request('https://feeds.example/rss'),
      headersIn: { 'X-Remote-User-Id': 'spoofed' },
    };
    await rssProxy.handle(req);
    expect(req.return).toHaveBeenCalledWith(401, expect.any(String));
    expect(authorization.auth).toHaveBeenCalledWith(req, { trustIngressHeaders: false });
    expect(req.subrequest).not.toHaveBeenCalled();
  });

  it.each(['homey', 'openhab'] as const)(
    'accepts an authenticated %s session',
    async (provider) => {
      authorization.auth.mockReturnValue(null);
      authorization[provider].mockReturnValue({ session: {} });
      const req = request('https://feeds.example/rss');
      await rssProxy.handle(req);
      expect(req.return).toHaveBeenCalledWith(200, '<rss/>');
    }
  );

  it('only requests trusted header authentication in the explicit Ingress handler', async () => {
    const req = request('https://feeds.example/rss');
    await rssProxy.handleIngress(req);
    expect(authorization.auth).toHaveBeenCalledWith(req, { trustIngressHeaders: true });
    expect(req.return).toHaveBeenCalledWith(200, '<rss/>');
  });

  it.each([
    'https://[::ffff:127.0.0.1]/feed',
    'https://[::ffff:7f00:1]/feed',
    'https://[fe90::1]/feed',
    'https://2130706433/feed',
    'https://0x7f000001/feed',
    'https://127.1/feed',
    'https://homeassistant.local./feed',
  ])('rejects %s before contacting the upstream', async (url) => {
    const req = request(url);
    await rssProxy.handle(req);
    expect(req.return).toHaveBeenCalledWith(400, expect.any(String));
    expect(req.subrequest).not.toHaveBeenCalled();
  });

  it('passes a public URL only to the internal pinned transport', async () => {
    const req = request('https://fcnews.example/feed');
    await rssProxy.handle(req);
    expect(req.subrequest).toHaveBeenCalledWith('/__navet_rss_transport__', {
      method: 'POST',
      body: 'https://fcnews.example/feed',
    });
    expect(req.return).toHaveBeenCalledWith(200, '<rss/>');
  });
});
