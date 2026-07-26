import { mkdtempSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import {
  AUTH_BINDING_HEADER,
  createViteAuthRequestHandler,
  createViteAuthSessionStore,
  parseViteAuthCookie,
  resolveViteAuthenticatedPrincipal,
  resolveViteAuthSession,
  serializeViteAuthCookie,
} from '@scripts/vite-auth-session-store';
import { describe, expect, it, vi } from 'vitest';

const AUTH_A = {
  hassUrl: 'https://ha-a.example.com',
  clientId: 'https://navet.example/',
  expires: Date.now() + 60_000,
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

function createStore() {
  const tempDir = mkdtempSync(join(tmpdir(), 'navet-vite-auth-'));
  const sessionsDirectory = join(tempDir, 'sessions');
  const legacyFile = join(tempDir, 'navet-auth-session.json');
  return {
    legacyFile,
    store: createViteAuthSessionStore(sessionsDirectory, legacyFile),
  };
}

function createRequest(options: {
  method?: string;
  url?: string;
  cookie?: string;
  body?: string;
  headers?: Record<string, string>;
}) {
  const request = Readable.from(options.body ? [options.body] : []) as IncomingMessage;
  request.method = options.method ?? 'GET';
  request.url = options.url ?? '/session';
  request.headers = {
    host: 'navet.example',
    ...(options.cookie ? { cookie: options.cookie } : {}),
    ...Object.fromEntries(
      Object.entries(options.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value])
    ),
  };
  Object.defineProperty(request, 'socket', {
    configurable: true,
    value: {},
  });
  return request;
}

function createResponse() {
  const headers = new Map<string, string | string[]>();
  let body = '';
  const response = {
    statusCode: 200,
    setHeader(name: string, value: string | string[]) {
      headers.set(name.toLowerCase(), value);
      return this;
    },
    getHeader(name: string) {
      return headers.get(name.toLowerCase());
    },
    end(chunk?: string | Buffer) {
      body += chunk ? chunk.toString() : '';
      return this;
    },
  } as unknown as ServerResponse;
  return {
    response,
    get body() {
      return body;
    },
    getHeader(name: string) {
      return headers.get(name.toLowerCase());
    },
  };
}

function cookieHeader(value: string | string[] | undefined) {
  const serialized = Array.isArray(value) ? value[0] : value;
  return serialized?.split(';', 1)[0] ?? '';
}

async function createBrowser(
  handler: ReturnType<typeof createViteAuthRequestHandler>,
  headers?: Record<string, string>
) {
  const request = createRequest({ headers });
  const response = createResponse();
  await handler(request, response.response);
  const metadata = JSON.parse(response.body) as {
    sessionId: string;
    authenticated: boolean;
  };
  return {
    cookie: cookieHeader(response.getHeader('set-cookie')),
    metadata,
    response,
  };
}

function seedAuth(
  store: ReturnType<typeof createViteAuthSessionStore>,
  browser: Awaited<ReturnType<typeof createBrowser>>,
  auth: typeof AUTH_A
) {
  const cookieId = browser.cookie.split('=')[1] ?? '';
  const session = store.readSession(cookieId);
  expect(session).not.toBeNull();
  if (!session) {
    throw new Error('Expected browser session');
  }
  store.writeSession(cookieId, {
    ...session,
    updatedAt: Date.now(),
    auth,
  });
}

describe('Vite standalone auth session conformance', () => {
  it('persists independent secure-random sessions for separate cookie jars', async () => {
    const { store } = createStore();
    const handler = createViteAuthRequestHandler(
      store,
      vi.fn().mockResolvedValue(new Response('{}', { status: 404 }))
    );
    const browserA = await createBrowser(handler);
    const browserB = await createBrowser(handler);

    expect(browserA.cookie).toMatch(/^navet_auth_session=[a-f0-9]{64}$/);
    expect(browserB.cookie).not.toBe(browserA.cookie);
    expect(browserB.metadata.sessionId).not.toBe(browserA.metadata.sessionId);

    seedAuth(store, browserA, AUTH_A);
    seedAuth(store, browserB, AUTH_B);

    const sessionA = resolveViteAuthSession(createRequest({ cookie: browserA.cookie }), store);
    const sessionB = resolveViteAuthSession(createRequest({ cookie: browserB.cookie }), store);
    expect(sessionA?.auth).toEqual(AUTH_A);
    expect(sessionB?.auth).toEqual(AUTH_B);
  });

  it('keeps GET metadata token-free and gates credentials with the public binding', async () => {
    const { store } = createStore();
    const handler = createViteAuthRequestHandler(
      store,
      vi.fn().mockResolvedValue(new Response('{}', { status: 404 }))
    );
    const browser = await createBrowser(handler);
    seedAuth(store, browser, AUTH_A);

    const metadataResponse = createResponse();
    await handler(createRequest({ cookie: browser.cookie }), metadataResponse.response);
    const metadata = JSON.parse(metadataResponse.body);
    expect(metadata).toMatchObject({
      authenticated: true,
      hassUrl: AUTH_A.hassUrl,
      sessionId: browser.metadata.sessionId,
      userId: null,
      userName: null,
    });
    expect(metadata).not.toHaveProperty('access_token');
    expect(metadata).not.toHaveProperty('refresh_token');
    expect(metadataResponse.body).not.toContain(browser.cookie.split('=')[1]);

    const deniedResponse = createResponse();
    await handler(
      createRequest({
        method: 'POST',
        url: '/session/credentials',
        cookie: browser.cookie,
        headers: {
          [AUTH_BINDING_HEADER]: 'nas_00000000000000000000000000000000',
        },
      }),
      deniedResponse.response
    );
    expect(deniedResponse.response.statusCode).toBe(401);

    const allowedResponse = createResponse();
    await handler(
      createRequest({
        method: 'POST',
        url: '/session/credentials',
        cookie: browser.cookie,
        headers: { [AUTH_BINDING_HEADER]: browser.metadata.sessionId },
      }),
      allowedResponse.response
    );
    expect(JSON.parse(allowedResponse.body)).toEqual(AUTH_A);
  });

  it('allows only an existing OAuth session to refresh without changing its target', async () => {
    const { store } = createStore();
    const handler = createViteAuthRequestHandler(
      store,
      vi.fn().mockResolvedValue(new Response('{}', { status: 404 }))
    );
    const browser = await createBrowser(handler);
    const headers = {
      Origin: 'http://navet.example',
      [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
    };

    const unauthenticatedPutResponse = createResponse();
    await handler(
      createRequest({
        method: 'PUT',
        cookie: browser.cookie,
        body: JSON.stringify(AUTH_A),
        headers,
      }),
      unauthenticatedPutResponse.response
    );
    expect(unauthenticatedPutResponse.response.statusCode).toBe(401);

    seedAuth(store, browser, AUTH_A);
    const retargetedPutResponse = createResponse();
    await handler(
      createRequest({
        method: 'PUT',
        cookie: browser.cookie,
        body: JSON.stringify(AUTH_B),
        headers,
      }),
      retargetedPutResponse.response
    );
    expect(retargetedPutResponse.response.statusCode).toBe(409);

    const refreshedAuth = {
      ...AUTH_A,
      access_token: 'access-a-refreshed',
      expires: AUTH_A.expires + 60_000,
    };
    const refreshPutResponse = createResponse();
    await handler(
      createRequest({
        method: 'PUT',
        cookie: browser.cookie,
        body: JSON.stringify(refreshedAuth),
        headers,
      }),
      refreshPutResponse.response
    );
    expect(refreshPutResponse.response.statusCode).toBe(200);
    expect(
      resolveViteAuthSession(createRequest({ cookie: browser.cookie }), store)?.auth?.access_token
    ).toBe('access-a-refreshed');
  });

  it('requires the initiating cookie jar for the OAuth callback', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith('/auth/token')) {
        return new Response(
          JSON.stringify({
            access_token: 'oauth-access',
            refresh_token: 'oauth-refresh',
            expires_in: 1800,
          }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({ id: 'user-a', name: 'Panel A' }), {
        status: 200,
      });
    });
    const { store } = createStore();
    const handler = createViteAuthRequestHandler(store, fetchMock as typeof fetch);
    const browserA = await createBrowser(handler);
    const browserB = await createBrowser(handler);

    const authorizeResponse = createResponse();
    await handler(
      createRequest({
        method: 'POST',
        url: '/authorize',
        cookie: browserA.cookie,
        headers: {
          Origin: 'http://navet.example',
          [AUTH_BINDING_HEADER]: browserA.metadata.sessionId,
        },
        body: JSON.stringify({
          hassUrl: 'https://ha-a.example.com/home-assistant',
          returnTo:
            '/wall?view=home&auth_callback=1&navet_oauth_callback=1&code=old&state=old#lights',
        }),
      }),
      authorizeResponse.response
    );
    const authorizeUrl = new URL(JSON.parse(authorizeResponse.body).authorizeUrl);
    expect(authorizeUrl.pathname).toBe('/home-assistant/auth/authorize');
    const state = authorizeUrl.searchParams.get('state');
    expect(state).toMatch(/^[a-f0-9]{64}$/);
    if (!state) {
      throw new Error('Expected OAuth state');
    }

    const wrongResponse = createResponse();
    await handler(
      createRequest({
        url: `/callback?code=code-a&state=${state}`,
        cookie: browserB.cookie,
      }),
      wrongResponse.response
    );
    expect(wrongResponse.response.statusCode).toBe(400);

    const correctResponse = createResponse();
    await handler(
      createRequest({
        url: `/callback?code=code-a&state=${state}`,
        cookie: browserA.cookie,
      }),
      correctResponse.response
    );
    expect(correctResponse.response.statusCode).toBe(302);
    expect(correctResponse.getHeader('location')).toBe(
      '/wall?view=home&navet_oauth_callback=1#lights'
    );
    expect(
      resolveViteAuthSession(createRequest({ cookie: browserA.cookie }), store)?.auth?.access_token
    ).toBe('oauth-access');
    expect(
      resolveViteAuthSession(createRequest({ cookie: browserB.cookie }), store)?.auth
    ).toBeNull();
    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
      'https://ha-a.example.com/home-assistant/auth/token',
    ]);
    expect(
      resolveViteAuthenticatedPrincipal(createRequest({ cookie: browserA.cookie }), store)
    ).toMatchObject({
      source: 'standalone_session',
      userId: null,
      userName: null,
    });
  });

  it('logs out only the caller and drops the legacy global session instead of adopting it', async () => {
    const { store, legacyFile } = createStore();
    writeFileSync(legacyFile, JSON.stringify(AUTH_A), 'utf8');
    const handler = createViteAuthRequestHandler(
      store,
      vi.fn().mockResolvedValue(new Response('{}', { status: 404 }))
    );
    const browserA = await createBrowser(handler);
    const browserB = await createBrowser(handler);
    seedAuth(store, browserA, AUTH_A);
    seedAuth(store, browserB, AUTH_B);

    const deleteResponse = createResponse();
    await handler(
      createRequest({
        method: 'DELETE',
        cookie: browserA.cookie,
        headers: {
          Origin: 'http://navet.example',
          [AUTH_BINDING_HEADER]: browserA.metadata.sessionId,
        },
      }),
      deleteResponse.response
    );
    expect(deleteResponse.response.statusCode).toBe(200);
    expect(deleteResponse.getHeader('set-cookie')).toContain('Max-Age=0');
    expect(resolveViteAuthSession(createRequest({ cookie: browserA.cookie }), store)).toBeNull();
    expect(resolveViteAuthSession(createRequest({ cookie: browserB.cookie }), store)?.auth).toEqual(
      AUTH_B
    );
    expect(() => writeFileSync(legacyFile, '', { flag: 'wx' })).not.toThrow();
  });

  it('matches ingress cookie and explicit-principal trust semantics', async () => {
    const request = createRequest({
      headers: {
        'X-Ingress-Path': '/api/hassio_ingress/token/',
        'X-Forwarded-Proto': 'https',
      },
    });
    expect(serializeViteAuthCookie(request, 'a'.repeat(64))).toContain(
      'Path=/api/hassio_ingress/token'
    );
    expect(serializeViteAuthCookie(request, 'a'.repeat(64))).toContain('Secure');

    const unsafePathRequest = createRequest({
      headers: {
        'X-Ingress-Path': '/api/hassio_ingress/%2e%2e/private',
        'X-Forwarded-Proto': 'https',
      },
    });
    expect(serializeViteAuthCookie(unsafePathRequest, 'a'.repeat(64))).toContain('Path=/;');

    const { store } = createStore();
    const ingressRequest = createRequest({
      headers: {
        'X-Remote-User-Id': 'ha-user-1',
        'X-Remote-User-Name': 'Kitchen panel',
      },
    });
    expect(parseViteAuthCookie(ingressRequest)).toBe('');
    expect(resolveViteAuthenticatedPrincipal(ingressRequest, store)).toBeNull();
    expect(
      resolveViteAuthenticatedPrincipal(ingressRequest, store, {
        trustIngressHeaders: true,
      })
    ).toMatchObject({
      source: 'home_assistant_ingress',
      userId: 'ha-user-1',
      userName: 'Kitchen panel',
    });
  });
});
