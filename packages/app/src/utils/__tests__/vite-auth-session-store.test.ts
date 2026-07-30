import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { createInstallationCookieNames } from '@scripts/installation-cookie-scope';
import {
  AUTH_BINDING_HEADER,
  AUTH_REVISION_HEADER,
  createHomeAssistantTenantId,
  createViteAuthRequestHandler,
  createViteAuthSessionStore,
  normalizeHassOrigin,
  parseViteAuthCookie,
  resolveViteAuthenticatedPrincipal,
  resolveViteAuthSession,
  serializeViteAuthCookie,
} from '@scripts/vite-auth-session-store';
import type { ViteInstallationAuthority } from '@scripts/vite-installation-authority';
import { describe, expect, it, vi } from 'vitest';

const TEST_INSTALLATION_AUTHORITY: ViteInstallationAuthority = {
  authorizeHomeAssistant: () => ({ allowed: true, pairingVerified: true }),
  authorizeHomeyStart: () => ({ allowed: true, pairingVerified: true }),
  authorizeOpenHAB: () => ({ allowed: true, pairingVerified: true }),
  commitHomeAssistant: () => true,
  commitHomey: () => true,
  commitOpenHAB: () => true,
  getCookieNames: (baseName) => createInstallationCookieNames(baseName),
};

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
    sessionsDirectory,
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

function createDeferredRequest(options: {
  method: string;
  url?: string;
  cookie: string;
  body: string;
  headers: Record<string, string>;
}) {
  let releaseBody!: () => void;
  let markBodyRead!: () => void;
  const bodyGate = new Promise<void>((resolve) => {
    releaseBody = resolve;
  });
  const bodyRead = new Promise<void>((resolve) => {
    markBodyRead = resolve;
  });
  const request = {
    method: options.method,
    url: options.url ?? '/session',
    headers: {
      host: 'navet.example',
      cookie: options.cookie,
      ...Object.fromEntries(
        Object.entries(options.headers).map(([key, value]) => [key.toLowerCase(), value])
      ),
    },
    socket: {},
    async *[Symbol.asyncIterator]() {
      markBodyRead();
      await bodyGate;
      yield Buffer.from(options.body);
    },
  } as unknown as IncomingMessage;
  return { request, bodyRead, releaseBody };
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
    authRevision: number;
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
  const now = Date.now();
  store.writeSession(cookieId, {
    version: 2,
    sessionId: browser.metadata.sessionId,
    createdAt: now,
    updatedAt: now,
    authRevision: 0,
    auth,
    pending: null,
    userId: null,
    userName: null,
  });
}

function seedPendingOAuth(
  store: ReturnType<typeof createViteAuthSessionStore>,
  browser: Awaited<ReturnType<typeof createBrowser>>,
  state: string,
  hassUrl: string
) {
  const cookieId = browser.cookie.split('=')[1] ?? '';
  const now = Date.now();
  store.writeSession(cookieId, {
    version: 2,
    sessionId: browser.metadata.sessionId,
    createdAt: now,
    updatedAt: now,
    authRevision: 0,
    auth: null,
    pending: {
      state,
      hassUrl,
      clientId: 'http://navet.example/',
      redirectUri: 'http://navet.example/__navet_auth__/callback',
      returnTo: '/',
      expiresAt: now + 60_000,
      installationPairingVerified: true,
    },
    userId: null,
    userName: null,
  });
}

describe('Vite standalone auth session conformance', () => {
  it('promotes only local legacy sessions and revokes every local legacy duplicate on logout', async () => {
    const legacy = createStore();
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 404 }));
    const legacyHandler = createViteAuthRequestHandler(
      legacy.store,
      fetchImpl,
      TEST_INSTALLATION_AUTHORITY
    );
    const browser = await createBrowser(legacyHandler);
    const secondLegacyBrowser = await createBrowser(legacyHandler);
    seedAuth(legacy.store, browser, AUTH_A);
    seedAuth(legacy.store, secondLegacyBrowser, AUTH_B);

    const cookieNames = createInstallationCookieNames('navet_auth_session', '1'.repeat(64));
    const scopedStore = createViteAuthSessionStore(
      legacy.sessionsDirectory,
      legacy.legacyFile,
      cookieNames
    );
    const scopedHandler = createViteAuthRequestHandler(
      scopedStore,
      fetchImpl,
      TEST_INSTALLATION_AUTHORITY
    );
    const migratedResponse = createResponse();
    await scopedHandler(createRequest({ cookie: browser.cookie }), migratedResponse.response);
    expect(JSON.parse(migratedResponse.body)).toMatchObject({
      authenticated: true,
      hassUrl: AUTH_A.hassUrl,
    });
    const scopedCookie = cookieHeader(migratedResponse.getHeader('set-cookie'));
    expect(scopedCookie).toBe(`${cookieNames.currentName}=${browser.cookie.split('=')[1]}`);

    const logoutResponse = createResponse();
    await scopedHandler(
      createRequest({
        method: 'DELETE',
        cookie: `${browser.cookie}; ${secondLegacyBrowser.cookie}; ${scopedCookie}`,
        headers: {
          Origin: 'http://navet.example',
          [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
        },
      }),
      logoutResponse.response
    );
    const logoutCookies = logoutResponse.getHeader('set-cookie');
    const serializedLogoutCookies = Array.isArray(logoutCookies)
      ? logoutCookies
      : [logoutCookies ?? ''];
    expect(
      serializedLogoutCookies.every((serialized) =>
        serialized.startsWith(`${cookieNames.currentName}=`)
      )
    ).toBe(true);
    expect(serializedLogoutCookies.join('; ')).not.toContain('navet_auth_session=');
    expect(legacy.store.readSession(browser.cookie.split('=')[1] ?? '')).toBeNull();
    expect(legacy.store.readSession(secondLegacyBrowser.cookie.split('=')[1] ?? '')).toBeNull();
    const cannotResurrectResponse = createResponse();
    await scopedHandler(
      createRequest({ cookie: secondLegacyBrowser.cookie }),
      cannotResurrectResponse.response
    );
    expect(JSON.parse(cannotResurrectResponse.body).authenticated).toBe(false);

    const neighbor = createStore();
    const neighborCookieNames = createInstallationCookieNames('navet_auth_session', '2'.repeat(64));
    const neighborStore = createViteAuthSessionStore(
      neighbor.sessionsDirectory,
      neighbor.legacyFile,
      neighborCookieNames
    );
    const neighborHandler = createViteAuthRequestHandler(
      neighborStore,
      fetchImpl,
      TEST_INSTALLATION_AUTHORITY
    );
    const unknownLegacyResponse = createResponse();
    await neighborHandler(
      createRequest({ cookie: browser.cookie }),
      unknownLegacyResponse.response
    );
    expect(JSON.parse(unknownLegacyResponse.body).authenticated).toBe(false);
    expect(cookieHeader(unknownLegacyResponse.getHeader('set-cookie'))).toMatch(
      new RegExp(`^${neighborCookieNames.currentName}=`)
    );
  });

  it('derives an opaque tenant identity from the full canonical Home Assistant base URL', () => {
    expect(normalizeHassOrigin('HTTPS://HA-A.Example.com:443/home-assistant/?panel=1')).toBe(
      'https://ha-a.example.com'
    );
    expect(createHomeAssistantTenantId('HTTPS://HA-A.Example.com:443/home-assistant/')).not.toBe(
      createHomeAssistantTenantId('https://ha-a.example.com/another-base')
    );
    expect(createHomeAssistantTenantId('HTTPS://HA-A.Example.com:443/home-assistant/')).toBe(
      createHomeAssistantTenantId('https://ha-a.example.com/home-assistant')
    );
    expect(createHomeAssistantTenantId('http://ha-a.example.com')).not.toBe(
      createHomeAssistantTenantId('https://ha-a.example.com')
    );
  });

  it('persists independent secure-random sessions for separate cookie jars', async () => {
    const { store } = createStore();
    const handler = createViteAuthRequestHandler(
      store,
      vi.fn().mockResolvedValue(new Response('{}', { status: 404 })),
      TEST_INSTALLATION_AUTHORITY
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

    const injectedCookie = `navet_auth_session=${'f'.repeat(64)}`;
    for (const cookie of [
      `${injectedCookie}; ${browserA.cookie}`,
      `${browserA.cookie}; ${injectedCookie}`,
    ]) {
      expect(resolveViteAuthSession(createRequest({ cookie }), store)?.auth).toEqual(AUTH_A);
    }
  });

  it('rejects an oversized wrapped credential record before replacing valid auth', async () => {
    const { store } = createStore();
    const handler = createViteAuthRequestHandler(
      store,
      vi.fn().mockResolvedValue(new Response('{}', { status: 404 })),
      TEST_INSTALLATION_AUTHORITY
    );
    const browser = await createBrowser(handler);
    seedAuth(store, browser, AUTH_A);
    const cookieId = browser.cookie.split('=')[1] ?? '';
    const current = store.readSession(cookieId);
    expect(current?.auth).toEqual(AUTH_A);
    if (!current) {
      throw new Error('Expected the seeded auth record');
    }

    let failure: unknown;
    try {
      store.writeSession(cookieId, {
        ...current,
        updatedAt: Date.now(),
        auth: {
          ...AUTH_A,
          access_token: 'x'.repeat(33 * 1024),
        },
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({
      code: 'credential-session-record-too-large',
      statusCode: 507,
    });
    expect(store.readSession(cookieId)?.auth).toEqual(AUTH_A);
  });

  it('returns a typed storage status when OAuth metadata would overflow a valid record', async () => {
    const { store } = createStore();
    const handler = createViteAuthRequestHandler(
      store,
      vi.fn().mockResolvedValue(new Response('{}', { status: 404 })),
      TEST_INSTALLATION_AUTHORITY
    );
    const browser = await createBrowser(handler);
    const cookieId = browser.cookie.split('=')[1] ?? '';
    const now = Date.now();
    const template = {
      version: 2 as const,
      sessionId: browser.metadata.sessionId,
      createdAt: now,
      updatedAt: now,
      auth: {
        ...AUTH_A,
        access_token: '',
      },
      pending: null,
      userId: null,
      userName: null,
    };
    const wrapperBytes = Buffer.byteLength(JSON.stringify(template), 'utf8');
    const nearLimit = {
      ...template,
      auth: {
        ...template.auth,
        access_token: 'x'.repeat(32 * 1024 - wrapperBytes - 64),
      },
    };
    expect(Buffer.byteLength(JSON.stringify(nearLimit), 'utf8')).toBeLessThan(32 * 1024);
    store.writeSession(cookieId, nearLimit);

    const response = createResponse();
    await handler(
      createRequest({
        method: 'POST',
        url: '/authorize',
        cookie: browser.cookie,
        headers: {
          [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
          Origin: 'http://navet.example',
        },
        body: JSON.stringify({
          hassUrl: AUTH_A.hassUrl,
          returnTo: '/',
        }),
      }),
      response.response
    );

    expect(response.response.statusCode).toBe(507);
    expect(JSON.parse(response.body)).toMatchObject({
      code: 'credential-session-record-too-large',
    });
    expect(store.readSession(cookieId)).toEqual(nearLimit);
  });

  it('returns a typed storage status when authenticated sessions exhaust capacity', async () => {
    const { sessionsDirectory, store } = createStore();
    const handler = createViteAuthRequestHandler(
      store,
      vi.fn().mockResolvedValue(new Response('{}', { status: 404 })),
      TEST_INSTALLATION_AUTHORITY
    );
    const browser = await createBrowser(handler);
    mkdirSync(sessionsDirectory, { recursive: true });
    const now = Date.now();
    for (let index = 1; index <= 256; index += 1) {
      const cookieId = index.toString(16).padStart(64, '0');
      writeFileSync(
        join(sessionsDirectory, `${cookieId}.json`),
        JSON.stringify({
          version: 2,
          sessionId: `nas_${index.toString(16).padStart(32, '0')}`,
          createdAt: now,
          updatedAt: now,
          auth: AUTH_A,
          pending: null,
          userId: null,
          userName: null,
        }),
        'utf8'
      );
    }

    const response = createResponse();
    await handler(
      createRequest({
        method: 'POST',
        url: '/authorize',
        cookie: browser.cookie,
        headers: {
          [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
          Origin: 'http://navet.example',
        },
        body: JSON.stringify({
          hassUrl: AUTH_A.hassUrl,
          returnTo: '/',
        }),
      }),
      response.response
    );

    expect(response.response.statusCode).toBe(507);
    expect(JSON.parse(response.body)).toMatchObject({
      code: 'credential-session-capacity-reached',
    });
    expect(readdirSync(sessionsDirectory).filter((name) => name.endsWith('.json'))).toHaveLength(
      256
    );
  });

  it('keeps GET metadata token-free and gates credentials with the public binding', async () => {
    const { store } = createStore();
    const handler = createViteAuthRequestHandler(
      store,
      vi.fn().mockResolvedValue(new Response('{}', { status: 404 })),
      TEST_INSTALLATION_AUTHORITY
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

  it.each([
    ['malformed JSON', '{"version":2'],
    ['an invalid schema', JSON.stringify({ version: 2, auth: AUTH_A })],
    ['an oversized record', 'x'.repeat(33 * 1024)],
  ])('preserves %s and reports durable storage unavailability', async (_label, serialized) => {
    const { sessionsDirectory, store } = createStore();
    const handler = createViteAuthRequestHandler(
      store,
      vi.fn().mockResolvedValue(new Response('{}', { status: 404 })),
      TEST_INSTALLATION_AUTHORITY
    );
    const browser = await createBrowser(handler);
    const cookieId = browser.cookie.split('=')[1] ?? '';
    const sessionPath = join(sessionsDirectory, `${cookieId}.json`);
    mkdirSync(sessionsDirectory, { recursive: true });
    writeFileSync(sessionPath, serialized, { encoding: 'utf8', mode: 0o600 });

    const response = createResponse();
    await handler(createRequest({ cookie: browser.cookie }), response.response);

    expect(response.response.statusCode).toBe(503);
    expect(JSON.parse(response.body)).toMatchObject({
      code: 'credential-session-record-unavailable',
    });
    expect(readFileSync(sessionPath, 'utf8')).toBe(serialized);
  });

  it('prefers a current authenticated duplicate over a newer expired record', async () => {
    const { store } = createStore();
    const handler = createViteAuthRequestHandler(
      store,
      vi.fn().mockResolvedValue(new Response('{}', { status: 404 })),
      TEST_INSTALLATION_AUTHORITY
    );
    const unauthenticated = await createBrowser(handler);
    const olderAuthenticated = await createBrowser(handler);
    const newerAuthenticated = await createBrowser(handler);
    const newestExpired = await createBrowser(handler);
    const now = Date.now();
    const records = [
      {
        browser: unauthenticated,
        updatedAt: now,
        auth: null,
        pending: {
          state: 'a'.repeat(64),
          hassUrl: AUTH_A.hassUrl,
          clientId: AUTH_A.clientId,
          redirectUri: 'http://navet.example/__navet_auth__/callback',
          returnTo: '/',
          expiresAt: now + 60_000,
          installationPairingVerified: true,
        },
      },
      {
        browser: olderAuthenticated,
        updatedAt: now - 200,
        auth: AUTH_A,
        pending: null,
      },
      {
        browser: newerAuthenticated,
        updatedAt: now - 100,
        auth: AUTH_B,
        pending: null,
      },
      {
        browser: newestExpired,
        updatedAt: now - 50,
        auth: {
          ...AUTH_A,
          access_token: 'expired-access',
          expires: now - 1,
        },
        pending: null,
      },
    ];
    for (const record of records) {
      store.writeSession(record.browser.cookie.split('=')[1] ?? '', {
        version: 2,
        sessionId: record.browser.metadata.sessionId,
        createdAt: now,
        updatedAt: record.updatedAt,
        auth: record.auth,
        pending: record.pending,
        userId: null,
        userName: null,
      });
    }

    for (const cookie of [
      `${newestExpired.cookie}; ${unauthenticated.cookie}; ${olderAuthenticated.cookie}; ${newerAuthenticated.cookie}`,
      `${newerAuthenticated.cookie}; ${olderAuthenticated.cookie}; ${unauthenticated.cookie}; ${newestExpired.cookie}`,
    ]) {
      const headers = {
        [AUTH_BINDING_HEADER]: unauthenticated.metadata.sessionId,
      };
      expect(resolveViteAuthenticatedPrincipal(createRequest({ cookie, headers }), store)).toEqual({
        providerId: 'home_assistant',
        source: 'standalone_session',
        tenantId: createHomeAssistantTenantId(AUTH_B.hassUrl),
        sessionId: newerAuthenticated.metadata.sessionId,
        userId: null,
        userName: null,
      });

      const metadataResponse = createResponse();
      await handler(createRequest({ cookie, headers }), metadataResponse.response);
      expect(JSON.parse(metadataResponse.body)).toMatchObject({
        authenticated: true,
        hassUrl: AUTH_B.hassUrl,
        sessionId: newerAuthenticated.metadata.sessionId,
      });
      expect(cookieHeader(metadataResponse.getHeader('set-cookie'))).toBe(
        newerAuthenticated.cookie
      );
    }
  });

  it('allows only an existing OAuth session to refresh without changing its target', async () => {
    const { store } = createStore();
    const handler = createViteAuthRequestHandler(
      store,
      vi.fn().mockResolvedValue(new Response('{}', { status: 404 })),
      TEST_INSTALLATION_AUTHORITY
    );
    const browser = await createBrowser(handler);
    const headers = {
      Origin: 'http://navet.example',
      [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
      [AUTH_REVISION_HEADER]: String(browser.metadata.authRevision),
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

  it('rejects a stale second-tab refresh and preserves the winning tokens', async () => {
    const { store } = createStore();
    const handler = createViteAuthRequestHandler(
      store,
      vi.fn().mockResolvedValue(new Response('{}', { status: 404 })),
      TEST_INSTALLATION_AUTHORITY
    );
    const browser = await createBrowser(handler);
    seedAuth(store, browser, AUTH_A);
    const headers = {
      Origin: 'http://navet.example',
      [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
      [AUTH_REVISION_HEADER]: '0',
    };
    const winnerAuth = {
      ...AUTH_A,
      access_token: 'access-winner',
      expires: AUTH_A.expires + 60_000,
    };
    const staleAuth = {
      ...AUTH_A,
      access_token: 'access-stale-loser',
      expires: AUTH_A.expires + 120_000,
    };

    const winnerResponse = createResponse();
    await handler(
      createRequest({
        method: 'PUT',
        cookie: browser.cookie,
        body: JSON.stringify(winnerAuth),
        headers,
      }),
      winnerResponse.response
    );
    expect(winnerResponse.response.statusCode).toBe(200);
    expect(JSON.parse(winnerResponse.body).authRevision).toBe(1);

    const staleResponse = createResponse();
    await handler(
      createRequest({
        method: 'PUT',
        cookie: browser.cookie,
        body: JSON.stringify(staleAuth),
        headers,
      }),
      staleResponse.response
    );
    expect(staleResponse.response.statusCode).toBe(409);
    expect(JSON.parse(staleResponse.body)).toMatchObject({
      code: 'credential-session-superseded',
      session: { authRevision: 1 },
    });
    expect(resolveViteAuthSession(createRequest({ cookie: browser.cookie }), store)).toMatchObject({
      authRevision: 1,
      auth: winnerAuth,
    });
  });

  it('accepts a monotonic refresh from an old tab that omits the revision', async () => {
    const { store } = createStore();
    const handler = createViteAuthRequestHandler(
      store,
      vi.fn().mockResolvedValue(new Response('{}', { status: 404 })),
      TEST_INSTALLATION_AUTHORITY
    );
    const browser = await createBrowser(handler);
    seedAuth(store, browser, AUTH_A);
    const cookieId = browser.cookie.split('=')[1] ?? '';
    const legacyRefresh = {
      ...AUTH_A,
      access_token: 'old-client-refresh',
      expires: AUTH_A.expires + 60_000,
    };
    const response = createResponse();
    await handler(
      createRequest({
        method: 'PUT',
        cookie: browser.cookie,
        body: JSON.stringify(legacyRefresh),
        headers: {
          Origin: 'http://navet.example',
          [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
        },
      }),
      response.response
    );

    expect(response.response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({
      authenticated: true,
      authRevision: 1,
    });
    expect(store.readSession(cookieId)).toMatchObject({
      auth: legacyRefresh,
      authRevision: 1,
    });
  });

  it('treats a stale old-tab refresh as a successful no-op', async () => {
    const { store } = createStore();
    const handler = createViteAuthRequestHandler(
      store,
      vi.fn().mockResolvedValue(new Response('{}', { status: 404 })),
      TEST_INSTALLATION_AUTHORITY
    );
    const browser = await createBrowser(handler);
    const winnerAuth = {
      ...AUTH_A,
      access_token: 'winning-refresh',
      expires: AUTH_A.expires + 120_000,
    };
    seedAuth(store, browser, winnerAuth);
    const cookieId = browser.cookie.split('=')[1] ?? '';
    const before = store.readSession(cookieId);
    const response = createResponse();
    await handler(
      createRequest({
        method: 'PUT',
        cookie: browser.cookie,
        body: JSON.stringify({
          ...AUTH_A,
          access_token: 'stale-old-client-refresh',
          expires: AUTH_A.expires + 60_000,
        }),
        headers: {
          Origin: 'http://navet.example',
          [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
        },
      }),
      response.response
    );

    expect(response.response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({
      authenticated: true,
      authRevision: 0,
    });
    expect(store.readSession(cookieId)).toEqual(before);
  });

  it.each(['not-a-revision', String(Number.MAX_SAFE_INTEGER), '9999999999999999'])(
    'rejects the invalid nonempty auth revision %s instead of using legacy compatibility',
    async (revision) => {
      const { store } = createStore();
      const handler = createViteAuthRequestHandler(
        store,
        vi.fn().mockResolvedValue(new Response('{}', { status: 404 })),
        TEST_INSTALLATION_AUTHORITY
      );
      const browser = await createBrowser(handler);
      seedAuth(store, browser, AUTH_A);
      const cookieId = browser.cookie.split('=')[1] ?? '';
      const before = store.readSession(cookieId);
      const response = createResponse();
      await handler(
        createRequest({
          method: 'PUT',
          cookie: browser.cookie,
          body: JSON.stringify({
            ...AUTH_A,
            access_token: 'malformed-revision-refresh',
            expires: AUTH_A.expires + 60_000,
          }),
          headers: {
            Origin: 'http://navet.example',
            [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
            [AUTH_REVISION_HEADER]: revision,
          },
        }),
        response.response
      );

      expect(response.response.statusCode).toBe(428);
      expect(JSON.parse(response.body)).toMatchObject({
        code: 'credential-session-revision-required',
      });
      expect(store.readSession(cookieId)).toEqual(before);
    }
  );

  it('selects the public-binding-matched backed session regardless of duplicate cookie order', async () => {
    for (const matchingCookieFirst of [true, false]) {
      const { store } = createStore();
      const handler = createViteAuthRequestHandler(
        store,
        vi.fn().mockResolvedValue(new Response('{}', { status: 404 })),
        TEST_INSTALLATION_AUTHORITY
      );
      const browserA = await createBrowser(handler);
      const browserB = await createBrowser(handler);
      seedAuth(store, browserA, AUTH_A);
      seedAuth(store, browserB, AUTH_B);

      const refreshedAuthB = {
        ...AUTH_B,
        access_token: `access-b-refreshed-${matchingCookieFirst ? 'first' : 'second'}`,
      };
      const response = createResponse();
      await handler(
        createRequest({
          method: 'PUT',
          cookie: matchingCookieFirst
            ? `${browserB.cookie}; ${browserA.cookie}`
            : `${browserA.cookie}; ${browserB.cookie}`,
          body: JSON.stringify(refreshedAuthB),
          headers: {
            Origin: 'http://navet.example',
            [AUTH_BINDING_HEADER]: browserB.metadata.sessionId,
            [AUTH_REVISION_HEADER]: String(browserB.metadata.authRevision),
          },
        }),
        response.response
      );

      expect(response.response.statusCode).toBe(200);
      expect(
        resolveViteAuthSession(createRequest({ cookie: browserA.cookie }), store)?.auth
      ).toEqual(AUTH_A);
      expect(
        resolveViteAuthSession(createRequest({ cookie: browserB.cookie }), store)?.auth
          ?.access_token
      ).toBe(refreshedAuthB.access_token);
    }
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
    const handler = createViteAuthRequestHandler(
      store,
      fetchMock as typeof fetch,
      TEST_INSTALLATION_AUTHORITY
    );
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
    const rotatedCookie = cookieHeader(correctResponse.getHeader('set-cookie'));
    expect(rotatedCookie).not.toBe(browserA.cookie);
    expect(resolveViteAuthSession(createRequest({ cookie: browserA.cookie }), store)).toBeNull();
    expect(
      resolveViteAuthSession(createRequest({ cookie: rotatedCookie }), store)?.auth?.access_token
    ).toBe('oauth-access');
    expect(resolveViteAuthSession(createRequest({ cookie: browserB.cookie }), store)).toBeNull();
    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
      'https://ha-a.example.com/home-assistant/auth/token',
    ]);
    expect(
      resolveViteAuthenticatedPrincipal(createRequest({ cookie: rotatedCookie }), store)
    ).toMatchObject({
      source: 'standalone_session',
      userId: null,
      userName: null,
    });
  });

  it('redirects a trusted OAuth denial safely, consumes its state, and preserves prior auth', async () => {
    const fetchMock = vi.fn();
    const { store } = createStore();
    const handler = createViteAuthRequestHandler(
      store,
      fetchMock as typeof fetch,
      TEST_INSTALLATION_AUTHORITY
    );
    const browser = await createBrowser(handler);
    seedAuth(store, browser, AUTH_A);

    const authorizeResponse = createResponse();
    await handler(
      createRequest({
        method: 'POST',
        url: '/authorize',
        cookie: browser.cookie,
        headers: {
          Origin: 'http://navet.example',
          [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
        },
        body: JSON.stringify({
          hassUrl: AUTH_A.hassUrl,
          returnTo:
            '/wall?view=home&navet_oauth_callback=1&navet_oauth_error=invalid_response&code=discarded&state=discarded&error_description=secret#lights',
        }),
      }),
      authorizeResponse.response
    );
    const state = new URL(
      (JSON.parse(authorizeResponse.body) as { authorizeUrl: string }).authorizeUrl
    ).searchParams.get('state');
    expect(state).toBeTruthy();

    const deniedResponse = createResponse();
    await handler(
      createRequest({
        url: `/callback?error=access_denied&error_description=provider-secret&state=${state}`,
        cookie: browser.cookie,
      }),
      deniedResponse.response
    );

    expect(deniedResponse.response.statusCode).toBe(302);
    expect(deniedResponse.getHeader('location')).toBe(
      '/wall?view=home&navet_oauth_error=access_denied#lights'
    );
    expect(deniedResponse.body).toBe('');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(resolveViteAuthSession(createRequest({ cookie: browser.cookie }), store)?.auth).toEqual(
      AUTH_A
    );

    const replayResponse = createResponse();
    await handler(
      createRequest({
        url: `/callback?error=access_denied&state=${state}`,
        cookie: browser.cookie,
      }),
      replayResponse.response
    );
    expect(replayResponse.response.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'missing code',
      callbackSuffix: '',
      response: null,
      expected: 'callback_incomplete',
    },
    {
      name: 'upstream rejection',
      callbackSuffix: '&code=oauth-code',
      response: new Response('{}', { status: 503 }),
      expected: 'temporarily_unavailable',
    },
    {
      name: 'invalid token response',
      callbackSuffix: '&code=oauth-code',
      response: new Response(JSON.stringify({ access_token: 'incomplete' }), {
        status: 200,
      }),
      expected: 'invalid_response',
    },
  ])(
    'maps a trusted $name to a bounded OAuth marker',
    async ({ callbackSuffix, response, expected }) => {
      const fetchMock = response ? vi.fn().mockResolvedValue(response) : vi.fn();
      const { store } = createStore();
      const handler = createViteAuthRequestHandler(
        store,
        fetchMock as typeof fetch,
        TEST_INSTALLATION_AUTHORITY
      );
      const browser = await createBrowser(handler);
      const state = 'c'.repeat(64);
      seedPendingOAuth(store, browser, state, AUTH_A.hassUrl);

      const callbackResponse = createResponse();
      await handler(
        createRequest({
          url: `/callback?state=${state}${callbackSuffix}`,
          cookie: browser.cookie,
        }),
        callbackResponse.response
      );

      expect(callbackResponse.response.statusCode).toBe(302);
      expect(callbackResponse.getHeader('location')).toBe(`/?navet_oauth_error=${expected}`);
    }
  );

  it('selects the OAuth-state-matched backed session regardless of duplicate cookie order', async () => {
    for (const matchingCookieFirst of [true, false]) {
      const fetchMock = vi.fn(
        async (_input: string | URL | Request, _init?: RequestInit) =>
          new Response(
            JSON.stringify({
              access_token: 'oauth-access-a',
              refresh_token: 'oauth-refresh-a',
              expires_in: 1800,
            }),
            { status: 200 }
          )
      );
      const { store } = createStore();
      const handler = createViteAuthRequestHandler(
        store,
        fetchMock as typeof fetch,
        TEST_INSTALLATION_AUTHORITY
      );
      const browserA = await createBrowser(handler);
      const browserB = await createBrowser(handler);
      const stateA = 'a'.repeat(64);
      seedPendingOAuth(store, browserA, stateA, AUTH_A.hassUrl);
      seedPendingOAuth(store, browserB, 'b'.repeat(64), AUTH_B.hassUrl);

      const callbackResponse = createResponse();
      await handler(
        createRequest({
          url: `/callback?code=code-a&state=${stateA}`,
          cookie: matchingCookieFirst
            ? `${browserA.cookie}; ${browserB.cookie}`
            : `${browserB.cookie}; ${browserA.cookie}`,
        }),
        callbackResponse.response
      );

      expect(callbackResponse.response.statusCode).toBe(302);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(String(fetchMock.mock.calls[0]?.[0])).toBe(`${AUTH_A.hassUrl}/auth/token`);
      const rotatedCookie = cookieHeader(callbackResponse.getHeader('set-cookie'));
      expect(
        resolveViteAuthSession(createRequest({ cookie: rotatedCookie }), store)?.auth?.access_token
      ).toBe('oauth-access-a');
      expect(resolveViteAuthSession(createRequest({ cookie: browserB.cookie }), store)).toBeNull();
    }
  });

  it('logs out only the caller and drops the legacy global session instead of adopting it', async () => {
    const { store, legacyFile } = createStore();
    writeFileSync(legacyFile, JSON.stringify(AUTH_A), 'utf8');
    const handler = createViteAuthRequestHandler(
      store,
      vi.fn().mockResolvedValue(new Response('{}', { status: 404 })),
      TEST_INSTALLATION_AUTHORITY
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

  it('uses the public binding and auth revision as a CAS for confirmed-invalid cleanup', async () => {
    const { store } = createStore();
    const handler = createViteAuthRequestHandler(
      store,
      vi.fn().mockResolvedValue(new Response('{}', { status: 404 })),
      TEST_INSTALLATION_AUTHORITY
    );
    const browser = await createBrowser(handler);
    const anotherBrowser = await createBrowser(handler);
    seedAuth(store, browser, AUTH_A);
    const cookieId = browser.cookie.split('=')[1] ?? '';
    const seeded = store.readSession(cookieId);
    if (!seeded) {
      throw new Error('Expected the seeded auth record');
    }
    store.writeSession(cookieId, {
      ...seeded,
      updatedAt: seeded.updatedAt + 1,
      authRevision: 1,
      auth: {
        ...AUTH_A,
        access_token: 'winning-access-token',
      },
    });

    const staleResponse = createResponse();
    await handler(
      createRequest({
        method: 'DELETE',
        cookie: browser.cookie,
        headers: {
          Origin: 'http://navet.example',
          [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
          [AUTH_REVISION_HEADER]: '0',
        },
      }),
      staleResponse.response
    );
    expect(staleResponse.response.statusCode).toBe(409);
    expect(JSON.parse(staleResponse.body)).toMatchObject({
      error: 'Auth session changed before invalidation completed',
      code: 'credential-session-superseded',
      session: {
        sessionId: browser.metadata.sessionId,
        authRevision: 1,
      },
    });
    expect(staleResponse.getHeader('set-cookie')).toBeUndefined();
    expect(store.readSession(cookieId)).toMatchObject({
      authRevision: 1,
      auth: { access_token: 'winning-access-token' },
    });

    const mismatchedBindingResponse = createResponse();
    await handler(
      createRequest({
        method: 'DELETE',
        cookie: browser.cookie,
        headers: {
          Origin: 'http://navet.example',
          [AUTH_BINDING_HEADER]: anotherBrowser.metadata.sessionId,
          [AUTH_REVISION_HEADER]: '1',
        },
      }),
      mismatchedBindingResponse.response
    );
    expect(mismatchedBindingResponse.response.statusCode).toBe(409);
    expect(JSON.parse(mismatchedBindingResponse.body)).toMatchObject({
      error: 'Auth session changed before invalidation completed',
      code: 'credential-session-superseded',
      session: {
        sessionId: browser.metadata.sessionId,
        authRevision: 1,
      },
    });
    expect(mismatchedBindingResponse.getHeader('set-cookie')).toBeUndefined();
    expect(store.readSession(cookieId)).not.toBeNull();

    const exactResponse = createResponse();
    await handler(
      createRequest({
        method: 'DELETE',
        cookie: browser.cookie,
        headers: {
          Origin: 'http://navet.example',
          [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
          [AUTH_REVISION_HEADER]: '1',
        },
      }),
      exactResponse.response
    );
    expect(exactResponse.response.statusCode).toBe(200);
    expect(exactResponse.getHeader('set-cookie')).toContain('Max-Age=0');
    expect(store.readSession(cookieId)).toBeNull();

    const missingResponse = createResponse();
    await handler(
      createRequest({
        method: 'DELETE',
        cookie: browser.cookie,
        headers: {
          Origin: 'http://navet.example',
          [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
          [AUTH_REVISION_HEADER]: '1',
        },
      }),
      missingResponse.response
    );
    expect(missingResponse.response.statusCode).toBe(409);
    expect(JSON.parse(missingResponse.body)).toMatchObject({
      error: 'Auth session changed before invalidation completed',
      code: 'credential-session-superseded',
      session: null,
    });
    expect(missingResponse.getHeader('set-cookie')).toBeUndefined();
  });

  it('rejects a malformed conditional-delete revision without falling back to logout', async () => {
    const { store } = createStore();
    const handler = createViteAuthRequestHandler(
      store,
      vi.fn().mockResolvedValue(new Response('{}', { status: 404 })),
      TEST_INSTALLATION_AUTHORITY
    );
    const browser = await createBrowser(handler);
    seedAuth(store, browser, AUTH_A);
    const cookieId = browser.cookie.split('=')[1] ?? '';

    const response = createResponse();
    await handler(
      createRequest({
        method: 'DELETE',
        cookie: browser.cookie,
        headers: {
          Origin: 'http://navet.example',
          [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
          [AUTH_REVISION_HEADER]: 'not-a-revision',
        },
      }),
      response.response
    );

    expect(response.response.statusCode).toBe(428);
    expect(JSON.parse(response.body)).toMatchObject({
      error: 'Home Assistant auth revision is invalid',
      code: 'credential-session-revision-required',
    });
    expect(response.getHeader('set-cookie')).toBeUndefined();
    expect(store.readSession(cookieId)?.auth).toEqual(AUTH_A);
  });

  it('keeps unrelated presented records during a successful scoped conditional delete', async () => {
    const persistence = createStore();
    const cookieNames = createInstallationCookieNames('navet_auth_session', '3'.repeat(64));
    const store = createViteAuthSessionStore(
      persistence.sessionsDirectory,
      persistence.legacyFile,
      cookieNames
    );
    const handler = createViteAuthRequestHandler(
      store,
      vi.fn().mockResolvedValue(new Response('{}', { status: 404 })),
      TEST_INSTALLATION_AUTHORITY
    );
    const browserA = await createBrowser(handler);
    const browserB = await createBrowser(handler);
    seedAuth(store, browserA, AUTH_A);
    seedAuth(store, browserB, AUTH_B);
    const browserACookieId = browserA.cookie.split('=')[1] ?? '';
    const browserBCookieId = browserB.cookie.split('=')[1] ?? '';

    const response = createResponse();
    await handler(
      createRequest({
        method: 'DELETE',
        cookie: `${browserB.cookie}; ${browserA.cookie}`,
        headers: {
          Origin: 'http://navet.example',
          [AUTH_BINDING_HEADER]: browserA.metadata.sessionId,
          [AUTH_REVISION_HEADER]: '0',
        },
      }),
      response.response
    );

    expect(response.response.statusCode).toBe(200);
    expect(store.readSession(browserACookieId)).toBeNull();
    expect(store.readSession(browserBCookieId)?.auth).toEqual(AUTH_B);
  });

  it('revokes every presented record with the validated binding and clears current and root paths', async () => {
    for (const matchingCookieFirst of [true, false]) {
      const { store } = createStore();
      const handler = createViteAuthRequestHandler(
        store,
        vi.fn().mockResolvedValue(new Response('{}', { status: 404 })),
        TEST_INSTALLATION_AUTHORITY
      );
      const browserA = await createBrowser(handler);
      const browserB = await createBrowser(handler);
      seedAuth(store, browserA, AUTH_A);
      seedAuth(store, browserB, AUTH_B);

      const browserACookieId = browserA.cookie.split('=')[1] ?? '';
      const duplicateCookieId = store.createSession().cookieId;
      const browserASession = store.readSession(browserACookieId);
      if (!browserASession) {
        throw new Error('Expected seeded browser A session');
      }
      store.writeSession(duplicateCookieId, browserASession);
      const duplicateCookie = `navet_auth_session=${duplicateCookieId}`;
      const matchingCookies = matchingCookieFirst
        ? `${browserA.cookie}; ${duplicateCookie}`
        : `${duplicateCookie}; ${browserA.cookie}`;

      const deleteResponse = createResponse();
      await handler(
        createRequest({
          method: 'DELETE',
          cookie: `${browserB.cookie}; ${matchingCookies}`,
          headers: {
            Origin: 'http://navet.example',
            'X-Ingress-Path': '/api/hassio_ingress/panel-token',
            [AUTH_BINDING_HEADER]: browserA.metadata.sessionId,
          },
        }),
        deleteResponse.response
      );

      expect(deleteResponse.response.statusCode).toBe(200);
      expect(store.readSession(browserACookieId)).toBeNull();
      expect(store.readSession(duplicateCookieId)).toBeNull();
      expect(store.readSession(browserB.cookie.split('=')[1] ?? '')?.auth).toEqual(AUTH_B);
      expect(deleteResponse.getHeader('set-cookie')).toEqual([
        expect.stringContaining('Path=/api/hassio_ingress/panel-token'),
        expect.stringContaining('Path=/;'),
      ]);
      for (const setCookie of deleteResponse.getHeader('set-cookie') as string[]) {
        expect(setCookie).toContain('Max-Age=0');
      }
    }
  });

  it('does not resurrect OAuth starts or refresh writes that overlap logout', async () => {
    const { store } = createStore();
    const handler = createViteAuthRequestHandler(
      store,
      vi.fn().mockResolvedValue(new Response('{}', { status: 404 })),
      TEST_INSTALLATION_AUTHORITY
    );
    const oauthBrowser = await createBrowser(handler);
    const oauthHeaders = {
      Origin: 'http://navet.example',
      [AUTH_BINDING_HEADER]: oauthBrowser.metadata.sessionId,
    };
    const deferredAuthorize = createDeferredRequest({
      method: 'POST',
      url: '/authorize',
      cookie: oauthBrowser.cookie,
      headers: oauthHeaders,
      body: JSON.stringify({
        hassUrl: AUTH_A.hassUrl,
        returnTo: '/',
      }),
    });
    const authorizeResponse = createResponse();
    const authorizeResult = handler(deferredAuthorize.request, authorizeResponse.response);
    await deferredAuthorize.bodyRead;

    const authorizeLogoutResponse = createResponse();
    await handler(
      createRequest({
        method: 'DELETE',
        cookie: oauthBrowser.cookie,
        headers: oauthHeaders,
      }),
      authorizeLogoutResponse.response
    );
    deferredAuthorize.releaseBody();
    await authorizeResult;

    expect(authorizeLogoutResponse.response.statusCode).toBe(200);
    expect(authorizeResponse.response.statusCode).toBe(409);
    expect(
      resolveViteAuthSession(createRequest({ cookie: oauthBrowser.cookie }), store)
    ).toBeNull();

    const refreshBrowser = await createBrowser(handler);
    seedAuth(store, refreshBrowser, AUTH_A);
    const refreshHeaders = {
      Origin: 'http://navet.example',
      [AUTH_BINDING_HEADER]: refreshBrowser.metadata.sessionId,
      [AUTH_REVISION_HEADER]: String(refreshBrowser.metadata.authRevision),
    };
    const deferredRefresh = createDeferredRequest({
      method: 'PUT',
      cookie: refreshBrowser.cookie,
      headers: refreshHeaders,
      body: JSON.stringify({
        ...AUTH_A,
        access_token: 'late-refresh-token',
      }),
    });
    const refreshResponse = createResponse();
    const refreshResult = handler(deferredRefresh.request, refreshResponse.response);
    await deferredRefresh.bodyRead;

    const refreshLogoutResponse = createResponse();
    await handler(
      createRequest({
        method: 'DELETE',
        cookie: refreshBrowser.cookie,
        headers: refreshHeaders,
      }),
      refreshLogoutResponse.response
    );
    deferredRefresh.releaseBody();
    await refreshResult;

    expect(refreshLogoutResponse.response.statusCode).toBe(200);
    expect(refreshResponse.response.statusCode).toBe(409);
    expect(
      resolveViteAuthSession(createRequest({ cookie: refreshBrowser.cookie }), store)
    ).toBeNull();
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
