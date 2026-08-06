import fs, { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import authStoreModule from '@docker/njs/auth-store.js';
import homeAssistantProxyModule from '@docker/njs/ha-proxy.template.js';
import { describe, expect, it, vi } from 'vitest';

const {
  AUTH_BINDING_HEADER,
  AUTH_REVISION_HEADER,
  createAuthSessionStore,
  createHomeAssistantTenantId,
  normalizeHassOrigin,
} = authStoreModule;
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

const TEST_INSTALLATION_AUTHORITY = {
  authorizeHomeAssistant: () => ({ allowed: true, pairingVerified: true }),
  commitHomeAssistant: () => true,
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

function responseSetCookies(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  return typeof value === 'string' ? [value] : [];
}

function cookieHeader(setCookie: unknown) {
  return responseSetCookies(setCookie)[0]?.split(';', 1)[0] ?? '';
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

function createStore(fetchImpl = vi.fn(), installationAuthority = TEST_INSTALLATION_AUTHORITY) {
  const directory = mkdtempSync(join(tmpdir(), 'navet-njs-auth-'));
  const sessionsDirectory = join(directory, 'sessions');
  const legacyAuthPath = join(directory, 'navet-auth-session.json');
  return {
    directory,
    legacyAuthPath,
    sessionsDirectory,
    store: createAuthSessionStore({
      sessionsDirectory,
      legacyAuthPath,
      fetch: fetchImpl,
      installationAuthority,
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
    authRevision: number;
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

describe('production njs standalone OAuth sessions', () => {
  it('migrates only locally backed legacy cookies and revokes every local legacy duplicate on logout', async () => {
    const legacy = createStore();
    const legacyBrowser = await createBrowserSession(legacy.store);
    const secondLegacyBrowser = await createBrowserSession(legacy.store);
    seedAuth(legacy.store, legacyBrowser, AUTH_A);
    seedAuth(legacy.store, secondLegacyBrowser, AUTH_B);
    const installationKey = '1'.repeat(64);
    const scopedStore = createAuthSessionStore({
      sessionsDirectory: legacy.sessionsDirectory,
      legacyAuthPath: legacy.legacyAuthPath,
      installationKey,
      installationAuthority: TEST_INSTALLATION_AUTHORITY,
    });
    const replacementStore = createAuthSessionStore({
      sessionsDirectory: legacy.sessionsDirectory,
      legacyAuthPath: legacy.legacyAuthPath,
      installationKey,
      installationAuthority: TEST_INSTALLATION_AUTHORITY,
    });
    expect(scopedStore.cookieNames).toEqual(replacementStore.cookieNames);
    expect(scopedStore.cookieNames.currentName).toMatch(/^navet_auth_session_[a-f0-9]{24}$/);

    const migrated = createRequest({ cookie: legacyBrowser.cookie });
    await scopedStore.handle(migrated.request);
    expect(JSON.parse(migrated.result.body)).toMatchObject({
      authenticated: true,
      hassUrl: AUTH_A.hassUrl,
    });
    const scopedCookie = cookieHeader(migrated.request.headersOut['Set-Cookie']);
    expect(scopedCookie).toBe(
      `${scopedStore.cookieNames.currentName}=${legacyBrowser.cookie.split('=')[1]}`
    );

    const logout = createRequest({
      method: 'DELETE',
      cookie: `${legacyBrowser.cookie}; ${secondLegacyBrowser.cookie}; ${scopedCookie}`,
      headers: {
        [AUTH_BINDING_HEADER]: legacyBrowser.metadata.sessionId,
        Origin: 'http://navet.example',
      },
    });
    await scopedStore.handle(logout.request);
    expect(logout.result.status).toBe(200);
    expect(
      responseSetCookies(logout.request.headersOut['Set-Cookie']).every((serialized) =>
        serialized.startsWith(`${scopedStore.cookieNames.currentName}=`)
      )
    ).toBe(true);
    expect(responseSetCookies(logout.request.headersOut['Set-Cookie'])).not.toContainEqual(
      expect.stringContaining('navet_auth_session=')
    );
    expect(legacy.store.readSession(legacyBrowser.cookie.split('=')[1] ?? '')).toBeNull();
    expect(legacy.store.readSession(secondLegacyBrowser.cookie.split('=')[1] ?? '')).toBeNull();
    const cannotResurrect = createRequest({ cookie: secondLegacyBrowser.cookie });
    await scopedStore.handle(cannotResurrect.request);
    expect(JSON.parse(cannotResurrect.result.body).authenticated).toBe(false);

    const neighbor = createStore();
    const neighborStore = createAuthSessionStore({
      sessionsDirectory: neighbor.sessionsDirectory,
      legacyAuthPath: neighbor.legacyAuthPath,
      installationKey: '2'.repeat(64),
      installationAuthority: TEST_INSTALLATION_AUTHORITY,
    });
    expect(neighborStore.cookieNames.currentName).not.toBe(scopedStore.cookieNames.currentName);
    const unknownLegacy = createRequest({ cookie: legacyBrowser.cookie });
    await neighborStore.handle(unknownLegacy.request);
    expect(JSON.parse(unknownLegacy.result.body).authenticated).toBe(false);
    expect(
      responseSetCookies(unknownLegacy.request.headersOut['Set-Cookie']).every((serialized) =>
        serialized.startsWith(`${neighborStore.cookieNames.currentName}=`)
      )
    ).toBe(true);
  });

  it('caches Home Assistant auth only within the exact proxied njs request', () => {
    const requestA = createRequest({
      cookie: `navet_auth_session=${'a'.repeat(64)}`,
      requestUri: '/__navet_ha_proxy__/api/states',
    }).request;
    const requestB = createRequest({
      cookie: `navet_auth_session=${'b'.repeat(64)}`,
      requestUri: '/__navet_ha_proxy__/api/states',
    }).request;
    const resolveStandaloneAuthSession = vi.fn(
      (request: ReturnType<typeof createRequest>['request']) =>
        request === requestA
          ? {
              cookieId: 'a'.repeat(64),
              session: { auth: AUTH_A },
            }
          : {
              cookieId: 'b'.repeat(64),
              session: { auth: AUTH_B },
            }
    );
    const proxy = createHomeAssistantProxy({ resolveStandaloneAuthSession });

    expect(proxy.upstream_url(requestA)).toBe('https://ha-a.example.com/api/states');
    expect(proxy.authorization_header(requestA)).toBe('Bearer access-a');
    expect(proxy.websocket_url(requestA)).toBe('https://ha-a.example.com/api/websocket');
    expect(resolveStandaloneAuthSession).toHaveBeenCalledTimes(1);

    expect(proxy.upstream_url(requestB)).toBe('https://ha-b.example.com/api/states');
    expect(proxy.authorization_header(requestB)).toBe('Bearer access-b');
    expect(resolveStandaloneAuthSession).toHaveBeenCalledTimes(2);

    expect(proxy.authorization_header(requestA)).toBe('Bearer access-a');
    expect(resolveStandaloneAuthSession).toHaveBeenCalledTimes(2);
  });

  it('keeps packaged scripts free of APIs unavailable in njs 0.8.10', () => {
    for (const fileName of readdirSync('docker/njs')) {
      if (!fileName.endsWith('.js')) {
        continue;
      }
      const relativePath = join('docker/njs', fileName);
      const source = readFileSync(relativePath, 'utf8');
      expect(source, relativePath).not.toMatch(/\bnew\s+(?:Map|Set|URL|WeakMap|WeakSet)\s*\(/);
      expect(source, relativePath).not.toMatch(/\bIntl\b/);
      expect(source, relativePath).not.toMatch(
        /\.(?:localeCompare|normalize|toLocaleLowerCase|toLocaleUpperCase)\s*\(/
      );
    }
  });

  it('derives an opaque tenant identity from the full canonical Home Assistant base URL', async () => {
    await withoutGlobalUrl(async () => {
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
  });

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
    expect(proxy.request_allowed(createRequest({ method: 'GET' }).request)).toBe('1');
    expect(proxy.request_allowed(createRequest({ method: 'POST' }).request)).toBe('');
    expect(
      proxy.request_allowed(
        createRequest({
          method: 'POST',
          headers: { Origin: 'http://navet.example' },
        }).request
      )
    ).toBe('1');
    expect(
      proxy.request_allowed(
        createRequest({
          method: 'GET',
          headers: { Upgrade: 'h2c', Connection: 'upgrade' },
        }).request
      )
    ).toBe('');
    expect(
      proxy.request_allowed(
        createRequest({
          method: 'GET',
          requestUri: '/__navet_ha_proxy__/api/websocket',
          headers: {
            Origin: 'http://sibling.navet.example',
            Upgrade: 'websocket',
            Connection: 'upgrade',
          },
        }).request
      )
    ).toBe('');
    expect(
      proxy.request_allowed(
        createRequest({
          method: 'GET',
          requestUri: '/__navet_ha_proxy__/api/websocket',
          headers: {
            Origin: 'http://navet.example',
            Upgrade: 'websocket',
            Connection: 'upgrade',
          },
        }).request
      )
    ).toBe('1');
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

    const injectedCookie = `navet_auth_session=${'f'.repeat(64)}`;
    for (const cookie of [
      `${injectedCookie}; ${browserA.cookie}`,
      `${browserA.cookie}; ${injectedCookie}`,
    ]) {
      expect(
        proxy.authorization_header(
          createRequest({ cookie, requestUri: '/__navet_ha_proxy__/api/states' }).request
        )
      ).toBe('Bearer access-a');
    }
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
      authRevision: 0,
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

  it('prefers a current authenticated duplicate over a newer expired record', async () => {
    const { store } = createStore();
    const unauthenticated = await createBrowserSession(store);
    const olderAuthenticated = await createBrowserSession(store);
    const newerAuthenticated = await createBrowserSession(store);
    const newestExpired = await createBrowserSession(store);
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
        // Production njs records use explicit null; the ambient JS declaration models absence
        // as an optional property.
        auth: record.auth as typeof AUTH_A | undefined,
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
      expect(
        store.resolveAuthenticatedPrincipal(createRequest({ cookie, headers }).request)
      ).toEqual({
        providerId: 'home_assistant',
        source: 'standalone_session',
        tenantId: createHomeAssistantTenantId(AUTH_B.hassUrl),
        sessionId: newerAuthenticated.metadata.sessionId,
        userId: null,
        userName: null,
      });

      const metadataRequest = createRequest({ cookie, headers });
      await store.handle(metadataRequest.request);
      expect(JSON.parse(metadataRequest.result.body)).toMatchObject({
        authenticated: true,
        hassUrl: AUTH_B.hassUrl,
        sessionId: newerAuthenticated.metadata.sessionId,
      });
      expect(cookieHeader(metadataRequest.request.headersOut['Set-Cookie'])).toBe(
        newerAuthenticated.cookie
      );
    }
  });

  it('preserves a durable auth record across transient filesystem read errors', async () => {
    const { directory, store } = createStore();
    const browser = await createBrowserSession(store);
    seedAuth(store, browser, AUTH_A);
    const cookieId = browser.cookie.split('=')[1] ?? '';
    const sessionPath = join(directory, 'sessions', `${cookieId}.json`);
    const readFile = fs.readFileSync.bind(fs);
    vi.spyOn(fs, 'readFileSync').mockImplementation(((path, ...args) => {
      if (String(path) === sessionPath) {
        const error = new Error('temporary I/O failure');
        // @ts-expect-error test-only errno
        error.code = 'EIO';
        throw error;
      }
      return readFile(path, ...args);
    }) as typeof fs.readFileSync);

    expect(() => store.readSession(cookieId)).toThrow('temporary I/O failure');
    vi.restoreAllMocks();
    expect(store.readSession(cookieId)?.auth).toEqual(AUTH_A);
  });

  it.each([
    ['malformed JSON', '{"version":2'],
    ['an invalid schema', JSON.stringify({ version: 2, auth: AUTH_A })],
    ['an oversized record', 'x'.repeat(33 * 1024)],
  ])('preserves %s and returns typed storage unavailability', async (_label, serialized) => {
    const { directory, store } = createStore();
    const browser = await createBrowserSession(store);
    const cookieId = browser.cookie.split('=')[1] ?? '';
    const sessionPath = join(directory, 'sessions', `${cookieId}.json`);
    fs.mkdirSync(join(directory, 'sessions'), { recursive: true });
    writeFileSync(sessionPath, serialized, { encoding: 'utf8', mode: 0o600 });

    const request = createRequest({ cookie: browser.cookie });
    await store.handle(request.request);

    expect(request.result.status).toBe(503);
    expect(JSON.parse(request.result.body)).toMatchObject({
      code: 'credential-session-record-unavailable',
    });
    expect(readFileSync(sessionPath, 'utf8')).toBe(serialized);
  });

  it('still removes a genuinely idle auth session', async () => {
    const { directory, store } = createStore();
    const browser = await createBrowserSession(store);
    seedAuth(store, browser, AUTH_A);
    const cookieId = browser.cookie.split('=')[1] ?? '';
    const sessionPath = join(directory, 'sessions', `${cookieId}.json`);
    const stored = store.readSession(cookieId);
    if (!stored) {
      throw new Error('Expected a stored auth session');
    }
    writeFileSync(
      sessionPath,
      JSON.stringify({
        ...stored,
        updatedAt: Date.now() - 91 * 24 * 60 * 60 * 1000,
      }),
      'utf8'
    );

    expect(store.readSession(cookieId)).toBeNull();
    expect(fs.existsSync(sessionPath)).toBe(false);
  });

  it('rejects an oversized wrapped credential record before replacing valid auth', async () => {
    const { store } = createStore();
    const browser = await createBrowserSession(store);
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
    const browser = await createBrowserSession(store);
    const cookieId = browser.cookie.split('=')[1] ?? '';
    const now = Date.now();
    const template = {
      version: 2,
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

    const authorize = createRequest({
      method: 'POST',
      uri: '/__navet_auth__/authorize',
      cookie: browser.cookie,
      headers: {
        [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
        Origin: 'http://navet.example',
      },
      body: JSON.stringify({
        hassUrl: AUTH_A.hassUrl,
        returnTo: '/',
      }),
    });
    await store.handle(authorize.request);

    expect(authorize.result.status).toBe(507);
    expect(JSON.parse(authorize.result.body)).toMatchObject({
      code: 'credential-session-record-too-large',
    });
    expect(store.readSession(cookieId)).toEqual(nearLimit);
  });

  it('returns a typed storage status when authenticated sessions exhaust capacity', async () => {
    const { directory, store } = createStore();
    const browser = await createBrowserSession(store);
    const sessionsDirectory = join(directory, 'sessions');
    fs.mkdirSync(sessionsDirectory, { recursive: true });
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

    const authorize = createRequest({
      method: 'POST',
      uri: '/__navet_auth__/authorize',
      cookie: browser.cookie,
      headers: {
        [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
        Origin: 'http://navet.example',
      },
      body: JSON.stringify({
        hassUrl: AUTH_A.hassUrl,
        returnTo: '/',
      }),
    });
    await store.handle(authorize.request);

    expect(authorize.result.status).toBe(507);
    expect(JSON.parse(authorize.result.body)).toMatchObject({
      code: 'credential-session-capacity-reached',
    });
    expect(readdirSync(sessionsDirectory).filter((name) => name.endsWith('.json'))).toHaveLength(
      256
    );
  });

  it('allows only an existing OAuth session to refresh without changing its target', async () => {
    const { store } = createStore(vi.fn().mockResolvedValue(new Response('{}', { status: 404 })));
    const browser = await createBrowserSession(store);
    const headers = {
      [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
      [AUTH_REVISION_HEADER]: String(browser.metadata.authRevision),
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

  it('rejects a stale refresh from a second tab and preserves the winning tokens', async () => {
    const { store } = createStore();
    const browser = await createBrowserSession(store);
    seedAuth(store, browser, AUTH_A);
    const headers = {
      [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
      [AUTH_REVISION_HEADER]: '0',
      Origin: 'http://navet.example',
    };
    const winnerAuth = {
      ...AUTH_A,
      access_token: 'access-winner',
      expires: AUTH_A.expires + 60_000,
    };
    const loserAuth = {
      ...AUTH_A,
      access_token: 'access-stale-loser',
      expires: AUTH_A.expires + 120_000,
    };

    const winner = createRequest({
      method: 'PUT',
      cookie: browser.cookie,
      body: JSON.stringify(winnerAuth),
      headers,
    });
    await store.handle(winner.request);
    expect(winner.result.status).toBe(200);
    expect(JSON.parse(winner.result.body).authRevision).toBe(1);

    const loser = createRequest({
      method: 'PUT',
      cookie: browser.cookie,
      body: JSON.stringify(loserAuth),
      headers,
    });
    await store.handle(loser.request);
    expect(loser.result.status).toBe(409);
    expect(JSON.parse(loser.result.body)).toMatchObject({
      code: 'credential-session-superseded',
      session: { authRevision: 1 },
    });
    expect(store.readSession(browser.cookie.split('=')[1] ?? '')).toMatchObject({
      authRevision: 1,
      auth: winnerAuth,
    });
  });

  it('rejects stale or mismatched confirmed-invalid cleanup without deleting the winner', async () => {
    const { store } = createStore();
    const browser = await createBrowserSession(store);
    seedAuth(store, browser, AUTH_A);
    const winnerAuth = {
      ...AUTH_A,
      access_token: 'access-winner',
      expires: AUTH_A.expires + 60_000,
    };
    const winner = createRequest({
      method: 'PUT',
      cookie: browser.cookie,
      body: JSON.stringify(winnerAuth),
      headers: {
        [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
        [AUTH_REVISION_HEADER]: '0',
        Origin: 'http://navet.example',
      },
    });
    await store.handle(winner.request);
    expect(winner.result.status).toBe(200);

    for (const headers of [
      {
        [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
        [AUTH_REVISION_HEADER]: '0',
      },
      {
        [AUTH_BINDING_HEADER]: `nas_${'b'.repeat(32)}`,
        [AUTH_REVISION_HEADER]: '1',
      },
    ]) {
      const staleInvalidation = createRequest({
        method: 'DELETE',
        cookie: browser.cookie,
        headers: {
          ...headers,
          Origin: 'http://navet.example',
        },
      });
      await store.handle(staleInvalidation.request);
      expect(staleInvalidation.result.status).toBe(409);
      expect(JSON.parse(staleInvalidation.result.body)).toMatchObject({
        code: 'credential-session-superseded',
        session: {
          authRevision: 1,
          sessionId: browser.metadata.sessionId,
        },
      });
      expect(store.readSession(browser.cookie.split('=')[1] ?? '')).toMatchObject({
        authRevision: 1,
        auth: winnerAuth,
      });
    }
  });

  it('conditionally clears only the confirmed-invalid auth revision', async () => {
    const { store } = createStore();
    const browser = await createBrowserSession(store);
    const anotherBrowser = await createBrowserSession(store);
    seedAuth(store, browser, AUTH_A);
    seedAuth(store, anotherBrowser, AUTH_B);
    const invalidation = createRequest({
      method: 'DELETE',
      cookie: `${anotherBrowser.cookie}; ${browser.cookie}`,
      headers: {
        [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
        [AUTH_REVISION_HEADER]: '0',
        Origin: 'http://navet.example',
      },
    });

    await store.handle(invalidation.request);

    expect(invalidation.result.status).toBe(200);
    expect(store.readSession(browser.cookie.split('=')[1] ?? '')).toBeNull();
    expect(store.readSession(anotherBrowser.cookie.split('=')[1] ?? '')?.auth).toEqual(AUTH_B);
  });

  it('rejects a malformed confirmed-invalid revision without clearing the session', async () => {
    const { store } = createStore();
    const browser = await createBrowserSession(store);
    seedAuth(store, browser, AUTH_A);
    const invalidation = createRequest({
      method: 'DELETE',
      cookie: browser.cookie,
      headers: {
        [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
        [AUTH_REVISION_HEADER]: 'not-a-revision',
        Origin: 'http://navet.example',
      },
    });

    await store.handle(invalidation.request);

    expect(invalidation.result.status).toBe(428);
    expect(JSON.parse(invalidation.result.body)).toMatchObject({
      code: 'credential-session-revision-required',
    });
    expect(store.readSession(browser.cookie.split('=')[1] ?? '')?.auth).toEqual(AUTH_A);
  });

  it('accepts a monotonic refresh from an old tab that omits the revision', async () => {
    const { store } = createStore();
    const browser = await createBrowserSession(store);
    seedAuth(store, browser, AUTH_A);
    const cookieId = browser.cookie.split('=')[1] ?? '';
    const legacyRefresh = {
      ...AUTH_A,
      access_token: 'old-client-refresh',
      expires: AUTH_A.expires + 60_000,
    };
    const oldClientRefresh = createRequest({
      method: 'PUT',
      cookie: browser.cookie,
      body: JSON.stringify(legacyRefresh),
      headers: {
        [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
        Origin: 'http://navet.example',
      },
    });

    await store.handle(oldClientRefresh.request);

    expect(oldClientRefresh.result.status).toBe(200);
    expect(JSON.parse(oldClientRefresh.result.body)).toMatchObject({
      authenticated: true,
      authRevision: 1,
    });
    expect(store.readSession(cookieId)).toMatchObject({
      authRevision: 1,
      auth: legacyRefresh,
    });
  });

  it('treats a stale old-tab refresh as a successful no-op', async () => {
    const { store } = createStore();
    const browser = await createBrowserSession(store);
    const winnerAuth = {
      ...AUTH_A,
      access_token: 'winning-refresh',
      expires: AUTH_A.expires + 120_000,
    };
    seedAuth(store, browser, winnerAuth);
    const cookieId = browser.cookie.split('=')[1] ?? '';
    const before = store.readSession(cookieId);
    const staleRefresh = createRequest({
      method: 'PUT',
      cookie: browser.cookie,
      body: JSON.stringify({
        ...AUTH_A,
        access_token: 'stale-old-client-refresh',
        expires: AUTH_A.expires + 60_000,
      }),
      headers: {
        [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
        Origin: 'http://navet.example',
      },
    });

    await store.handle(staleRefresh.request);

    expect(staleRefresh.result.status).toBe(200);
    expect(JSON.parse(staleRefresh.result.body)).toMatchObject({
      authenticated: true,
      authRevision: 0,
    });
    expect(store.readSession(cookieId)).toEqual(before);
  });

  it.each(['not-a-revision', String(Number.MAX_SAFE_INTEGER), '9999999999999999'])(
    'rejects the invalid nonempty auth revision %s instead of using legacy compatibility',
    async (revision) => {
      const { store } = createStore();
      const browser = await createBrowserSession(store);
      seedAuth(store, browser, AUTH_A);
      const cookieId = browser.cookie.split('=')[1] ?? '';
      const before = store.readSession(cookieId);
      const malformedRefresh = createRequest({
        method: 'PUT',
        cookie: browser.cookie,
        body: JSON.stringify({
          ...AUTH_A,
          access_token: 'malformed-revision-refresh',
          expires: AUTH_A.expires + 60_000,
        }),
        headers: {
          [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
          [AUTH_REVISION_HEADER]: revision,
          Origin: 'http://navet.example',
        },
      });

      await store.handle(malformedRefresh.request);

      expect(malformedRefresh.result.status).toBe(428);
      expect(JSON.parse(malformedRefresh.result.body)).toMatchObject({
        code: 'credential-session-revision-required',
      });
      expect(store.readSession(cookieId)).toEqual(before);
    }
  );

  it('uses the public binding to resolve duplicate backed cookies in either order', async () => {
    const { store } = createStore(vi.fn().mockResolvedValue(new Response('{}', { status: 404 })));
    const browserA = await createBrowserSession(store);
    const browserB = await createBrowserSession(store);
    seedAuth(store, browserA, AUTH_A);
    seedAuth(store, browserB, AUTH_B);

    for (const cookie of [
      `${browserA.cookie}; ${browserB.cookie}`,
      `${browserB.cookie}; ${browserA.cookie}`,
    ]) {
      const credentials = createRequest({
        method: 'POST',
        uri: '/__navet_auth__/session/credentials',
        cookie,
        headers: { [AUTH_BINDING_HEADER]: browserB.metadata.sessionId },
      });
      await store.handle(credentials.request);
      expect(credentials.result.status).toBe(200);
      expect(JSON.parse(credentials.result.body)).toEqual(AUTH_B);
    }

    const refreshedAuth = {
      ...AUTH_B,
      access_token: 'access-b-refreshed',
      expires: AUTH_B.expires + 60_000,
    };
    const refresh = createRequest({
      method: 'PUT',
      cookie: `${browserA.cookie}; ${browserB.cookie}`,
      body: JSON.stringify(refreshedAuth),
      headers: {
        [AUTH_BINDING_HEADER]: browserB.metadata.sessionId,
        [AUTH_REVISION_HEADER]: String(browserB.metadata.authRevision),
        Origin: 'http://navet.example',
      },
    });
    await store.handle(refresh.request);
    expect(refresh.result.status).toBe(200);
    expect(store.readSession(browserA.cookie.split('=')[1] ?? '')?.auth).toEqual(AUTH_A);
    expect(store.readSession(browserB.cookie.split('=')[1] ?? '')?.auth).toEqual(refreshedAuth);
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
        Host: 'navet.example:8443',
        Origin: 'https://navet.example:8443',
        'X-Forwarded-Proto': 'https',
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
    expect(authorizeUrl.searchParams.get('redirect_uri')).toBe(
      'https://navet.example:8443/__navet_auth__/callback'
    );
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
      cookie: `${browserB.cookie}; ${browserA.cookie}`,
      args: { code: 'code-a', state },
      headers: {
        Host: 'navet.example:8443',
        'X-Forwarded-Proto': 'https',
      },
    });
    await withoutGlobalUrl(() => store.handle(correctCallback.request));
    expect(correctCallback.result.status).toBe(302);
    expect(correctCallback.result.redirectLocation).toBe(
      'https://navet.example:8443/wall-panel?view=home&navet_oauth_callback=1#lights'
    );
    const rotatedCookie = cookieHeader(correctCallback.request.headersOut['Set-Cookie']);
    expect(rotatedCookie).not.toBe(browserA.cookie);

    const proxy = createHomeAssistantProxy(store);
    expect(proxy.authorization_header(createRequest({ cookie: browserA.cookie }).request)).toBe('');
    expect(proxy.authorization_header(createRequest({ cookie: rotatedCookie }).request)).toBe(
      'Bearer oauth-access-a'
    );
    expect(proxy.authorization_header(createRequest({ cookie: browserB.cookie }).request)).toBe('');
    expect(fetchImpl.mock.calls.map(([url]) => String(url))).toEqual([
      'https://ha-a.example.com/home-assistant/auth/token',
    ]);
    expect(
      store.resolveAuthenticatedPrincipal(createRequest({ cookie: rotatedCookie }).request)
    ).toMatchObject({
      source: 'standalone_session',
      userId: null,
      userName: null,
    });
  });

  it('uses an alternate browser route only for authorization and verifies it against the trusted upstream', async () => {
    const browserHassUrl = 'http://100.77.118.32:8123';
    const upstreamHassUrl = 'http://homeassistant.local:8123';
    const installationAuthority = {
      authorizeHomeAssistant: vi.fn(() => ({
        allowed: true,
        pairingVerified: false,
        upstreamTarget: upstreamHassUrl,
      })),
      commitHomeAssistant: vi.fn(() => true),
    };
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            access_token: 'vpn-access',
            refresh_token: 'vpn-refresh',
            expires_in: 1800,
          }),
          { status: 200 }
        )
    );
    const { store } = createStore(fetchImpl, installationAuthority);
    const browser = await createBrowserSession(store);
    const authorize = createRequest({
      method: 'POST',
      uri: '/__navet_auth__/authorize',
      cookie: browser.cookie,
      headers: {
        [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
        Origin: 'http://navet.example',
      },
      body: JSON.stringify({ hassUrl: browserHassUrl, returnTo: '/' }),
    });

    await store.handle(authorize.request);
    const authorizeUrl = new URL(
      (JSON.parse(authorize.result.body) as { authorizeUrl: string }).authorizeUrl
    );
    expect(authorizeUrl.origin).toBe(browserHassUrl);
    const state = authorizeUrl.searchParams.get('state');
    expect(state).toMatch(/^[a-f0-9]{64}$/);

    const callback = createRequest({
      uri: '/__navet_auth__/callback',
      cookie: browser.cookie,
      args: { code: 'vpn-code', state: state ?? '' },
    });
    await store.handle(callback.request);

    expect(callback.result.status).toBe(302);
    expect(fetchImpl).toHaveBeenCalledWith(
      `${upstreamHassUrl}/auth/token`,
      expect.objectContaining({ method: 'POST' })
    );
    expect(installationAuthority.commitHomeAssistant).toHaveBeenCalledWith(
      upstreamHassUrl,
      expect.any(Function),
      false
    );
    const rotatedCookie = cookieHeader(callback.request.headersOut['Set-Cookie']);
    expect(store.readSession(rotatedCookie.split('=')[1] ?? '')?.auth).toMatchObject({
      hassUrl: upstreamHassUrl,
      access_token: 'vpn-access',
    });
  });

  it('redirects a trusted Home Assistant denial safely, preserves reauth, and rejects replay', async () => {
    const fetchImpl = vi.fn();
    const { store } = createStore(fetchImpl);
    const browser = await createBrowserSession(store);
    seedAuth(store, browser, AUTH_A);

    const authorize = createRequest({
      method: 'POST',
      uri: '/__navet_auth__/authorize',
      cookie: browser.cookie,
      headers: {
        [AUTH_BINDING_HEADER]: browser.metadata.sessionId,
        Host: 'navet.example',
        Origin: 'https://navet.example',
        'X-Forwarded-Proto': 'https',
      },
      body: JSON.stringify({
        hassUrl: AUTH_A.hassUrl,
        returnTo: '//attacker.example/steal?navet_oauth_error=old&code=secret&state=secret#token',
      }),
    });
    await store.handle(authorize.request);
    const state = new URL(
      (JSON.parse(authorize.result.body) as { authorizeUrl: string }).authorizeUrl
    ).searchParams.get('state');
    expect(state).toMatch(/^[a-f0-9]{64}$/);

    const denied = createRequest({
      uri: '/__navet_auth__/callback',
      cookie: browser.cookie,
      args: {
        error: 'access_denied',
        error_description: 'provider-secret-details',
        state: state ?? '',
      },
      headers: {
        Host: 'navet.example',
        'X-Forwarded-Proto': 'https',
      },
    });
    await store.handle(denied.request);

    expect(denied.result.status).toBe(302);
    expect(denied.result.redirectLocation).toBe(
      'https://navet.example/?navet_oauth_error=access_denied'
    );
    expect(denied.result.redirectLocation).not.toContain('provider-secret-details');
    expect(fetchImpl).not.toHaveBeenCalled();
    const cookieId = browser.cookie.split('=')[1] ?? '';
    expect(store.readSession(cookieId)).toMatchObject({
      auth: AUTH_A,
      pending: {
        returnTo: '/',
      },
    });
    const retainedSession = store.readSession(cookieId) as {
      pending?: { state?: string };
    } | null;
    expect(retainedSession?.pending?.state).not.toBe(state);

    const replay = createRequest({
      uri: '/__navet_auth__/callback',
      cookie: browser.cookie,
      args: { error: 'access_denied', state: state ?? '' },
      headers: { 'X-Forwarded-Proto': 'https' },
    });
    await store.handle(replay.request);
    expect(replay.result.status).toBe(400);
    expect(replay.result.redirectLocation).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
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
    expect(responseSetCookies(deleteA.request.headersOut['Set-Cookie'])[0]).toContain('Max-Age=0');

    const proxy = createHomeAssistantProxy(store);
    expect(proxy.authorization_header(createRequest({ cookie: browserA.cookie }).request)).toBe('');
    expect(proxy.authorization_header(createRequest({ cookie: browserB.cookie }).request)).toBe(
      'Bearer access-b'
    );
    expect(() => writeFileSync(legacyAuthPath, '', { flag: 'wx' })).not.toThrow();
  });

  it('revokes only records with the validated binding and clears ingress plus root paths', async () => {
    for (const matchingCookieFirst of [true, false]) {
      const { store } = createStore();
      const browserA = await createBrowserSession(store);
      const browserB = await createBrowserSession(store);
      seedAuth(store, browserA, AUTH_A);
      seedAuth(store, browserB, AUTH_B);

      const browserACookieId = browserA.cookie.split('=')[1] ?? '';
      const duplicateCookieId = 'c'.repeat(64);
      const browserASession = store.readSession(browserACookieId);
      if (!browserASession) {
        throw new Error('Expected seeded browser A session');
      }
      store.writeSession(duplicateCookieId, browserASession);
      const duplicateCookie = `navet_auth_session=${duplicateCookieId}`;
      const matchingCookies = matchingCookieFirst
        ? `${browserA.cookie}; ${duplicateCookie}`
        : `${duplicateCookie}; ${browserA.cookie}`;

      const logout = createRequest({
        method: 'DELETE',
        cookie: `${browserB.cookie}; ${matchingCookies}`,
        headers: {
          [AUTH_BINDING_HEADER]: browserA.metadata.sessionId,
          Origin: 'https://navet.example',
          'X-Forwarded-Proto': 'https',
          'X-Ingress-Path': '/api/hassio_ingress/navet',
        },
      });
      await store.handle(logout.request);

      expect(logout.result.status).toBe(200);
      expect(store.readSession(browserACookieId)).toBeNull();
      expect(store.readSession(duplicateCookieId)).toBeNull();
      expect(store.readSession(browserB.cookie.split('=')[1] ?? '')?.auth).toEqual(AUTH_B);
      expect(responseSetCookies(logout.request.headersOut['Set-Cookie'])).toEqual([
        expect.stringContaining('Path=/api/hassio_ingress/navet;'),
        expect.stringContaining('Path=/;'),
      ]);
      expect(responseSetCookies(logout.request.headersOut['Set-Cookie'])).toEqual([
        expect.stringContaining('Max-Age=0'),
        expect.stringContaining('Max-Age=0'),
      ]);
    }
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
