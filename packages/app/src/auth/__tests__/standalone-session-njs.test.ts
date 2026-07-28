import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import authStoreModule from '@docker/njs/auth-store.js';
import homeAssistantProxyModule from '@docker/njs/ha-proxy.template.js';
import { describe, expect, it, vi } from 'vitest';

const { AUTH_BINDING_HEADER, createAuthSessionStore } = authStoreModule;
const { createHomeAssistantProxy } = homeAssistantProxyModule;

const AUTH_A = {
  hassUrl: 'https://ha-a.example.com',
  clientId: 'https://navet.example/',
  expires: Date.now() + 3_600_000,
  refresh_token: 'refresh-a',
  access_token: 'access-a',
  expires_in: 3600,
};

const AUTH_B = {
  ...AUTH_A,
  hassUrl: 'https://ha-b.example.com',
  refresh_token: 'refresh-b',
  access_token: 'access-b',
};

interface NjsResult {
  status: number | null;
  body: string;
  redirectLocation: string | null;
}

function createRequest(options: {
  method?: string;
  uri?: string;
  requestUri?: string;
  cookie?: string;
  body?: string;
  headers?: Record<string, string>;
  args?: Record<string, string>;
}) {
  const result: NjsResult = { status: null, body: '', redirectLocation: null };
  const headersIn: Record<string, string> = {
    Host: 'navet.example',
    ...(options.cookie ? { Cookie: options.cookie } : {}),
    ...options.headers,
  };
  const request = {
    method: options.method ?? 'GET',
    uri: options.uri ?? '/__navet_auth__/session',
    requestText: options.body ?? '',
    args: options.args ?? {},
    headersIn,
    headersOut: {} as Record<string, string>,
    variables: {
      scheme: headersIn['X-Forwarded-Proto'] ?? 'http',
      request_uri: options.requestUri ?? options.uri ?? '/__navet_auth__/session',
    },
    return(status: number, body = '') {
      result.status = status;
      if ([301, 302, 303, 307, 308].includes(status)) {
        result.redirectLocation = body;
      } else {
        result.body = body;
      }
    },
  };
  return { request, result };
}

function cookieHeader(setCookie: string) {
  return setCookie.split(';', 1)[0] ?? '';
}

async function withoutGlobalUrl<T>(callback: () => Promise<T>): Promise<T> {
  const standardUrl = globalThis.URL;
  Object.defineProperty(globalThis, 'URL', {
    configurable: true,
    value: undefined,
    writable: true,
  });
  try {
    return await callback();
  } finally {
    Object.defineProperty(globalThis, 'URL', {
      configurable: true,
      value: standardUrl,
      writable: true,
    });
  }
}

function createStore(fetchImpl = vi.fn()) {
  const directory = mkdtempSync(join(tmpdir(), 'navet-njs-auth-'));
  const sessionsDirectory = join(directory, 'sessions');
  const legacyAuthPath = join(directory, 'navet-auth-session.json');
  return {
    directory,
    legacyAuthPath,
    store: createAuthSessionStore({
      sessionsDirectory,
      legacyAuthPath,
      fetch: fetchImpl,
    }),
  };
}

async function createBrowserSession(
  store: ReturnType<typeof createAuthSessionStore>,
  headers?: Record<string, string>
) {
  const { request, result } = createRequest({ headers });
  await store.handle(request);
  const metadata = JSON.parse(result.body) as {
    sessionId: string;
    authenticated: boolean;
  };
  return {
    cookie: cookieHeader(request.headersOut['Set-Cookie']),
    metadata,
    request,
  };
}

function seedAuth(
  store: ReturnType<typeof createAuthSessionStore>,
  browser: Awaited<ReturnType<typeof createBrowserSession>>,
  auth: typeof AUTH_A
) {
  const context = store.getRequestSession(createRequest({ cookie: browser.cookie }).request);
  expect(context).not.toBeNull();
  if (!context) {
    throw new Error('Expected browser session');
  }
  store.writeSession(context.cookieId, {
    ...context.session,
    updatedAt: Date.now(),
    auth,
  });
}

describe('production njs standalone OAuth sessions', () => {
  it('isolates Home Assistant host and credentials between browser cookie jars', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'user-1', name: 'Vishal' }), {
        status: 200,
      })
    );
    const { store } = createStore(fetchImpl);
    const browserA = await createBrowserSession(store);
    const browserB = await createBrowserSession(store);

    expect(browserA.cookie).not.toBe(browserB.cookie);
    expect(browserA.cookie).toMatch(/^navet_auth_session=[a-f0-9]{64}$/);
    expect(browserA.metadata.sessionId).not.toBe(browserB.metadata.sessionId);
    expect(browserA.metadata.authenticated).toBe(false);

    seedAuth(store, browserA, AUTH_A);
    seedAuth(store, browserB, AUTH_B);

    const proxy = createHomeAssistantProxy(store);
    const requestA = createRequest({
      cookie: browserA.cookie,
      requestUri: '/__navet_ha_proxy__/api/states?room=kitchen',
      headers: { Authorization: 'Bearer attacker-token' },
    }).request;
    const requestB = createRequest({
      cookie: browserB.cookie,
      requestUri: '/__navet_ha_proxy__/api/states',
    }).request;

    expect(proxy.upstream_url(requestA)).toBe('https://ha-a.example.com/api/states?room=kitchen');
    expect(proxy.authorization_header(requestA)).toBe('Bearer access-a');
    expect(proxy.upstream_url(requestB)).toBe('https://ha-b.example.com/api/states');
    expect(proxy.authorization_header(requestB)).toBe('Bearer access-b');
  });

  it('returns sanitized GET metadata and reveals credentials only with the public binding', async () => {
    const { store } = createStore(vi.fn().mockResolvedValue(new Response('{}', { status: 404 })));
    const browser = await createBrowserSession(store);
    seedAuth(store, browser, AUTH_A);

    const metadataRequest = createRequest({ cookie: browser.cookie });
    await store.handle(metadataRequest.request);
    const metadata = JSON.parse(metadataRequest.result.body);

    expect(metadata).toMatchObject({
      authenticated: true,
      hassUrl: AUTH_A.hassUrl,
      sessionId: browser.metadata.sessionId,
      userId: null,
      userName: null,
    });
    expect(metadata).not.toHaveProperty('access_token');
    expect(metadata).not.toHaveProperty('refresh_token');
    expect(metadataRequest.result.body).not.toContain(browser.cookie.split('=')[1]);

    const denied = createRequest({
      method: 'POST',
      uri: '/__navet_auth__/session/credentials',
      cookie: browser.cookie,
      headers: { [AUTH_BINDING_HEADER]: 'nas_00000000000000000000000000000000' },
    });
    await store.handle(denied.request);
    expect(denied.result.status).toBe(401);

    const allowed = createRequest({
      method: 'POST',
      uri: '/__navet_auth__/session/credentials',
      cookie: browser.cookie,
      headers: { [AUTH_BINDING_HEADER]: browser.metadata.sessionId },
    });
    await store.handle(allowed.request);
    expect(JSON.parse(allowed.result.body)).toEqual(AUTH_A);
  });

  it('allows only an existing OAuth session to refresh without changing its target', async () => {
    const { store } = createStore(vi.fn().mockResolvedValue(new Response('{}', { status: 404 })));
    const browser = await createBrowserSession(store);
    const headers = {
      [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
      Origin: 'http://navet.example',
    };

    const unauthenticatedPut = createRequest({
      method: 'PUT',
      cookie: browser.cookie,
      body: JSON.stringify(AUTH_A),
      headers,
    });
    await store.handle(unauthenticatedPut.request);
    expect(unauthenticatedPut.result.status).toBe(401);

    seedAuth(store, browser, AUTH_A);
    const retargetedPut = createRequest({
      method: 'PUT',
      cookie: browser.cookie,
      body: JSON.stringify(AUTH_B),
      headers,
    });
    await store.handle(retargetedPut.request);
    expect(retargetedPut.result.status).toBe(409);

    const refreshedAuth = {
      ...AUTH_A,
      access_token: 'access-a-refreshed',
      expires: AUTH_A.expires + 60_000,
    };
    const refreshPut = createRequest({
      method: 'PUT',
      cookie: browser.cookie,
      body: JSON.stringify(refreshedAuth),
      headers,
    });
    await store.handle(refreshPut.request);
    expect(refreshPut.result.status).toBe(200);

    const proxy = createHomeAssistantProxy(store);
    expect(proxy.authorization_header(createRequest({ cookie: browser.cookie }).request)).toBe(
      'Bearer access-a-refreshed'
    );
  });

  it('binds OAuth state and callback to the browser that started login', async () => {
    const standardUrl = globalThis.URL;
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.endsWith('/auth/token')) {
        return new Response(
          JSON.stringify({
            access_token: 'oauth-access-a',
            refresh_token: 'oauth-refresh-a',
            expires_in: 1800,
          }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({ id: 'user-a', name: 'Wall panel A' }), {
        status: 200,
      });
    });
    const { store } = createStore(fetchImpl);
    const browserA = await createBrowserSession(store);
    const browserB = await createBrowserSession(store);

    const authorize = createRequest({
      method: 'POST',
      uri: '/__navet_auth__/authorize',
      cookie: browserA.cookie,
      headers: {
        [AUTH_BINDING_HEADER]: browserA.metadata.sessionId,
        Origin: 'http://navet.example',
      },
      body: JSON.stringify({
        hassUrl: 'https://ha-a.example.com/home-assistant',
        returnTo:
          '/wall-panel?view=home&auth_callback=1&navet_oauth_callback=1&code=old&state=old#lights',
      }),
    });
    await withoutGlobalUrl(() => store.handle(authorize.request));
    const authorizeUrl = new standardUrl(JSON.parse(authorize.result.body).authorizeUrl);
    expect(authorizeUrl.pathname).toBe('/home-assistant/auth/authorize');
    const state = authorizeUrl.searchParams.get('state');
    expect(state).toMatch(/^[a-f0-9]{64}$/);
    if (!state) {
      throw new Error('Expected OAuth state');
    }

    const wrongBrowserCallback = createRequest({
      uri: '/__navet_auth__/callback',
      cookie: browserB.cookie,
      args: { code: 'code-a', state },
    });
    await withoutGlobalUrl(() => store.handle(wrongBrowserCallback.request));
    expect(wrongBrowserCallback.result.status).toBe(400);

    const correctCallback = createRequest({
      uri: '/__navet_auth__/callback',
      cookie: browserA.cookie,
      args: { code: 'code-a', state },
    });
    await withoutGlobalUrl(() => store.handle(correctCallback.request));
    expect(correctCallback.result.status).toBe(302);
    expect(correctCallback.result.redirectLocation).toBe(
      '/wall-panel?view=home&navet_oauth_callback=1#lights'
    );

    const proxy = createHomeAssistantProxy(store);
    expect(proxy.authorization_header(createRequest({ cookie: browserA.cookie }).request)).toBe(
      'Bearer oauth-access-a'
    );
    expect(proxy.authorization_header(createRequest({ cookie: browserB.cookie }).request)).toBe('');
    expect(fetchImpl.mock.calls.map(([url]) => String(url))).toEqual([
      'https://ha-a.example.com/home-assistant/auth/token',
    ]);
    expect(
      store.resolveAuthenticatedPrincipal(createRequest({ cookie: browserA.cookie }).request)
    ).toMatchObject({
      source: 'standalone_session',
      userId: null,
      userName: null,
    });
  });

  it('rejects unsafe Home Assistant targets without relying on the URL global', async () => {
    const { store } = createStore();
    const browser = await createBrowserSession(store);
    const targets = [
      'ftp://homeassistant.local',
      'http://user:password@homeassistant.local:8123',
      'http://homeassistant.local:70000',
      'http://homeassistant.local:',
      'http://homeassistant.local\\@attacker.example',
    ];

    for (const hassUrl of targets) {
      const authorize = createRequest({
        method: 'POST',
        uri: '/__navet_auth__/authorize',
        cookie: browser.cookie,
        headers: {
          [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
          Origin: 'http://navet.example',
        },
        body: JSON.stringify({ hassUrl, returnTo: '/' }),
      });
      await store.handle(authorize.request);
      expect(authorize.result.status).toBe(400);
      expect(JSON.parse(authorize.result.body)).toEqual({
        error: 'A valid Home Assistant URL is required',
      });
    }
  });

  it('deletes only the caller session and never migrates the old global credentials', async () => {
    const { store, legacyAuthPath } = createStore(
      vi.fn().mockResolvedValue(new Response('{}', { status: 404 }))
    );
    writeFileSync(legacyAuthPath, JSON.stringify(AUTH_A), 'utf8');
    const browserA = await createBrowserSession(store);
    const browserB = await createBrowserSession(store);
    seedAuth(store, browserA, AUTH_A);
    seedAuth(store, browserB, AUTH_B);

    const deleteA = createRequest({
      method: 'DELETE',
      cookie: browserA.cookie,
      headers: {
        [AUTH_BINDING_HEADER]: browserA.metadata.sessionId,
        Origin: 'http://navet.example',
      },
    });
    await store.handle(deleteA.request);
    expect(deleteA.result.status).toBe(200);
    expect(deleteA.request.headersOut['Set-Cookie']).toContain('Max-Age=0');

    const proxy = createHomeAssistantProxy(store);
    expect(proxy.authorization_header(createRequest({ cookie: browserA.cookie }).request)).toBe('');
    expect(proxy.authorization_header(createRequest({ cookie: browserB.cookie }).request)).toBe(
      'Bearer access-b'
    );
    expect(() => writeFileSync(legacyAuthPath, '', { flag: 'wx' })).not.toThrow();
  });

  it('uses ingress cookie paths, Secure on HTTPS, and trusts ingress users only explicitly', async () => {
    const { store } = createStore();
    const browser = await createBrowserSession(store, {
      'X-Ingress-Path': '/api/hassio_ingress/token/',
      'X-Forwarded-Proto': 'https',
    });
    const setCookie = browser.request.headersOut['Set-Cookie'];

    expect(setCookie).toContain('Path=/api/hassio_ingress/token');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Secure');

    const unsafePathBrowser = await createBrowserSession(store, {
      'X-Ingress-Path': '/api/hassio_ingress/token; SameSite=None',
      'X-Forwarded-Proto': 'https',
    });
    expect(unsafePathBrowser.request.headersOut['Set-Cookie']).toContain('Path=/;');

    const ingressRequest = createRequest({
      headers: {
        'X-Remote-User-Id': 'ha-user-1',
        'X-Remote-User-Display-Name': 'Kitchen panel',
      },
    }).request;
    expect(store.resolveAuthenticatedPrincipal(ingressRequest)).toBeNull();
    expect(
      store.resolveAuthenticatedPrincipal(ingressRequest, {
        trustIngressHeaders: true,
      })
    ).toMatchObject({
      source: 'home_assistant_ingress',
      userId: 'ha-user-1',
      userName: 'Kitchen panel',
    });
  });

  it('keeps standalone OAuth endpoints out of the Ingress-only add-on', () => {
    for (const relativePath of [
      'platform/home-assistant/addons/navet/rootfs/etc/nginx/http.d/default.conf',
      'platform/home-assistant/addons/navet/run.sh',
    ]) {
      const source = readFileSync(relativePath, 'utf8');
      expect(source).not.toContain('navet-auth-store.conf');
      expect(source).toContain('navet-profile-store-ingress.conf');
    }
  });
});
