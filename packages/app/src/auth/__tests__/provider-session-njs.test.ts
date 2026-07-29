import { randomBytes } from 'node:crypto';
import fs, { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error Docker njs runtime modules are JavaScript and have no TypeScript declaration.
import homeyProxyModule from '@docker/njs/homey-proxy.js';
// @ts-expect-error Docker njs runtime modules are JavaScript and have no TypeScript declaration.
import homeyStoreModule from '@docker/njs/homey-store.js';
// @ts-expect-error Docker njs runtime modules are JavaScript and have no TypeScript declaration.
import openHABProxyModule from '@docker/njs/openhab-proxy.js';
// @ts-expect-error Docker njs runtime modules are JavaScript and have no TypeScript declaration.
import openHABStoreModule from '@docker/njs/openhab-store.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { createHomeyProxy } = homeyProxyModule;
const { createHomeySessionStore, normalizeHomeyRefreshToken } = homeyStoreModule;
const { createOpenHABProxy } = openHABProxyModule;
const { createOpenHABSessionStore, normalizeOpenHABBaseUrl } = openHABStoreModule;

const HOMEY_AUTH_A = {
  accessToken: 'homey-access-a',
  refreshToken: 'homey-refresh-a',
  expiresAt: Date.now() + 3_600_000,
  userId: 'homey-user-a',
  user: {
    id: 'homey-user-a',
    name: 'Wall Panel A',
    avatarUrl: null,
    email: 'panel-a@example.com',
  },
  homeys: [
    {
      id: 'homey-a',
      name: 'Homey A',
      platform: 'local',
      localUrl: null,
      localUrlSecure: 'https://homey-a.example.com',
      remoteUrl: null,
    },
  ],
  selectedHomeyId: 'homey-a',
  homeyBaseUrl: 'https://homey-a.example.com',
  homeySessionToken: 'homey-session-a',
};

const HOMEY_AUTH_B = {
  ...HOMEY_AUTH_A,
  accessToken: 'homey-access-b',
  refreshToken: 'homey-refresh-b',
  userId: 'homey-user-b',
  user: {
    ...HOMEY_AUTH_A.user,
    id: 'homey-user-b',
    name: 'Wall Panel B',
    email: 'panel-b@example.com',
  },
  homeys: [
    {
      ...HOMEY_AUTH_A.homeys[0],
      id: 'homey-b',
      name: 'Homey B',
      localUrlSecure: 'https://homey-b.example.com',
    },
  ],
  selectedHomeyId: 'homey-b',
  homeyBaseUrl: 'https://homey-b.example.com',
  homeySessionToken: 'homey-session-b',
};

const OPENHAB_AUTH_A = {
  hassUrl: 'https://openhab-a.local/base',
  username: 'panel-a',
  password: 'openhab-secret-a',
};

const OPENHAB_AUTH_B = {
  hassUrl: 'http://192.168.1.22',
  username: 'panel-b',
  password: 'openhab-secret-b',
};

const TEST_INSTALLATION_AUTHORITY = {
  authorizeHomeyStart: () => ({ allowed: true, pairingVerified: true }),
  authorizeOpenHAB: () => ({ allowed: true, pairingVerified: true }),
  commitHomey: () => true,
  commitOpenHAB: () => true,
};

interface NjsResult {
  status: number | null;
  body: string;
  redirectLocation: string | null;
}

interface NjsRequestOptions {
  method?: string;
  uri?: string;
  requestUri?: string;
  cookie?: string;
  body?: string;
  headers?: Record<string, string>;
  args?: Record<string, string>;
  remoteAddress?: string;
}

function createRequest(options: NjsRequestOptions = {}) {
  const result: NjsResult = { status: null, body: '', redirectLocation: null };
  const headersIn: Record<string, string> = {
    Host: 'navet.example',
    ...(options.cookie ? { Cookie: options.cookie } : {}),
    ...options.headers,
  };
  const request = {
    method: options.method ?? 'GET',
    uri: options.uri ?? '/session',
    requestText: options.body ?? '',
    args: options.args ?? {},
    headersIn,
    remoteAddress: options.remoteAddress ?? '192.0.2.10',
    headersOut: {} as Record<string, string>,
    variables: {
      scheme: headersIn['X-Forwarded-Proto'] ?? 'http',
      request_uri: options.requestUri ?? options.uri ?? '/session',
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

function cookieHeader(setCookie: string | undefined) {
  expect(setCookie).toBeTruthy();
  return (setCookie ?? '').split(';', 1)[0] ?? '';
}

function createProviderDirectory(provider: 'homey' | 'openhab') {
  const directory = mkdtempSync(join(tmpdir(), `navet-${provider}-njs-`));
  return {
    sessionsDirectory: join(directory, 'sessions'),
    legacySessionPath: join(directory, `legacy-${provider}-session.json`),
    installationAuthority: TEST_INSTALLATION_AUTHORITY,
  };
}

function createProviderCookie(cookieName: string) {
  return `${cookieName}=${randomBytes(32).toString('hex')}`;
}

function providerCookieId(cookie: string) {
  return cookie.split('=')[1] ?? '';
}

function seedProviderAuth(
  store: {
    bindingStore: {
      getRequestSession(request: ReturnType<typeof createRequest>['request']): {
        cookieId: string;
        session: Record<string, unknown>;
      } | null;
      writeSession(cookieId: string, record: Record<string, unknown>): void;
    };
  },
  cookie: string,
  auth: unknown,
  updatedAt = Date.now()
) {
  const cookieId = cookie.split('=')[1] ?? '';
  store.bindingStore.writeSession(cookieId, {
    version: 1,
    createdAt: updatedAt,
    updatedAt,
    auth,
    pending: null,
  });
}

function fillProviderCapacity(
  sessionsDirectory: string,
  auth: typeof HOMEY_AUTH_A | typeof OPENHAB_AUTH_A,
  includePending: boolean
) {
  fs.mkdirSync(sessionsDirectory, { recursive: true });
  const now = Date.now();
  for (let index = 1; index <= 128; index += 1) {
    const record = {
      version: 1,
      createdAt: now,
      updatedAt: now,
      auth,
      ...(includePending ? { pending: null } : {}),
    };
    fs.writeFileSync(
      join(sessionsDirectory, `${index.toString(16).padStart(64, '0')}.json`),
      JSON.stringify(record),
      'utf8'
    );
  }
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('production njs provider credential sessions', () => {
  it('rejects malformed or overflowing Homey refresh expiries', () => {
    for (const expires_in of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MAX_VALUE,
      'not-a-number',
      true,
      {},
      0,
      -1,
    ]) {
      expect(
        normalizeHomeyRefreshToken(
          {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in,
          },
          HOMEY_AUTH_A.refreshToken
        )
      ).toBeNull();
    }

    expect(
      normalizeHomeyRefreshToken(
        {
          access_token: ' new-access-token ',
          expires_in: '3600',
        },
        HOMEY_AUTH_A.refreshToken
      )
    ).toEqual({
      accessToken: 'new-access-token',
      expiresIn: 3600,
      refreshToken: HOMEY_AUTH_A.refreshToken,
    });
  });

  it('canonicalizes supported openHAB targets without URL and rejects unsafe targets', () => {
    expect(normalizeOpenHABBaseUrl('HTTP://PROVIDER-CHECK:80/base/')).toBe(
      'http://provider-check/base'
    );
    expect(normalizeOpenHABBaseUrl('https://OpenHAB.Example.net:443/proxy/')).toBe(
      'https://openhab.example.net/proxy'
    );
    expect(normalizeOpenHABBaseUrl('http://192.168.1.22:8080')).toBe('http://192.168.1.22:8080');
    expect(normalizeOpenHABBaseUrl('https://[fd00::1]:8443/base')).toBe(
      'https://[fd00::1]:8443/base'
    );

    for (const target of [
      'http://openhab.example.net',
      'https://8.8.8.8',
      'http://169.254.169.254/latest/meta-data',
      'https://metadata.google.internal',
      'http://localhost:8080',
      'http://user:password@openhab.local',
      'http://openhab.local/base?target=other',
      'http://openhab.local/base#fragment',
      'http://openhab.local/a/../rest',
      'http://openhab.local/a/%2e%2e/rest',
      'http://openhab.local/a/%252e%252e/rest',
      'http://openhab.local/a%5c..%5crest',
      'http://openhab.local\\@attacker.example',
    ]) {
      expect(normalizeOpenHABBaseUrl(target), target).toBe('');
    }
  });

  it('revokes scoped Homey plus every locally backed legacy duplicate after confirmed expiry', async () => {
    vi.stubEnv('NAVET_HOMEY_CLIENT_ID', 'homey-client-id');
    vi.stubEnv('NAVET_HOMEY_CLIENT_SECRET', 'homey-client-secret');
    const paths = createProviderDirectory('homey');
    const legacyStore = createHomeySessionStore({
      ...paths,
      fetch: vi.fn(),
    });
    const legacyCookieA = createProviderCookie('navet_homey_session');
    const legacyCookieB = createProviderCookie('navet_homey_session');
    seedProviderAuth(legacyStore, legacyCookieA, {
      ...HOMEY_AUTH_A,
      expiresAt: Date.now() - 1,
    });
    seedProviderAuth(legacyStore, legacyCookieB, HOMEY_AUTH_B);

    const scopedStore = createHomeySessionStore({
      ...paths,
      installationKey: '1'.repeat(64),
      fetch: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'invalid_grant' }), {
          status: 400,
        })
      ),
    });
    expect(scopedStore.bindingStore.cookieNames.currentName).toMatch(
      /^navet_homey_session_[a-f0-9]{24}$/
    );
    const scopedCookie = `${scopedStore.bindingStore.cookieNames.currentName}=${providerCookieId(
      legacyCookieA
    )}`;
    const metadata = createRequest({
      uri: '/__navet_homey__/session',
      cookie: `${scopedCookie}; ${legacyCookieA}; ${legacyCookieB}`,
    });
    await scopedStore.handle(metadata.request);

    expect(metadata.result.status).toBe(204);
    expect(scopedStore.bindingStore.readSession(providerCookieId(legacyCookieA))).toBeNull();
    expect(scopedStore.bindingStore.readSession(providerCookieId(legacyCookieB))).toBeNull();
    const deletions = Array.isArray(metadata.request.headersOut['Set-Cookie'])
      ? metadata.request.headersOut['Set-Cookie']
      : [metadata.request.headersOut['Set-Cookie']];
    expect(
      deletions.every((serialized) =>
        serialized.startsWith(`${scopedStore.bindingStore.cookieNames.currentName}=`)
      )
    ).toBe(true);
    expect(deletions.join('; ')).not.toContain('navet_homey_session=');

    const cannotResurrect = createRequest({
      uri: '/__navet_homey__/session',
      cookie: legacyCookieB,
    });
    await scopedStore.handle(cannotResurrect.request);
    expect(cannotResurrect.result.status).toBe(204);
  });

  it('isolates Homey metadata, proxy credentials, and logout between browser cookie jars', async () => {
    const store = createHomeySessionStore({
      ...createProviderDirectory('homey'),
      fetch: vi.fn(),
    });
    const anonymousGet = createRequest({ uri: '/__navet_homey__/session' });
    await store.handle(anonymousGet.request);
    expect(anonymousGet.result.status).toBe(204);
    expect(anonymousGet.request.headersOut['Set-Cookie']).toBeUndefined();

    const browserA = { cookie: createProviderCookie('navet_homey_session') };
    const browserB = { cookie: createProviderCookie('navet_homey_session') };

    expect(browserA.cookie).toMatch(/^navet_homey_session=[a-f0-9]{64}$/);
    expect(browserB.cookie).toMatch(/^navet_homey_session=[a-f0-9]{64}$/);
    expect(browserA.cookie).not.toBe(browserB.cookie);

    seedProviderAuth(store, browserA.cookie, HOMEY_AUTH_A);
    seedProviderAuth(store, browserB.cookie, HOMEY_AUTH_B);

    const metadataA = createRequest({
      uri: '/__navet_homey__/session',
      cookie: browserA.cookie,
    });
    const metadataB = createRequest({
      uri: '/__navet_homey__/session',
      cookie: browserB.cookie,
    });
    await store.handle(metadataA.request);
    await store.handle(metadataB.request);

    expect(JSON.parse(metadataA.result.body)).toMatchObject({
      userId: 'homey-user-a',
      selectedHomeyId: 'homey-a',
      homeyBaseUrl: 'https://homey-a.example.com',
      hasActiveHomeySession: true,
    });
    expect(JSON.parse(metadataB.result.body)).toMatchObject({
      userId: 'homey-user-b',
      selectedHomeyId: 'homey-b',
      homeyBaseUrl: 'https://homey-b.example.com',
      hasActiveHomeySession: true,
    });
    for (const metadata of [metadataA.result.body, metadataB.result.body]) {
      expect(metadata).not.toContain('accessToken');
      expect(metadata).not.toContain('refreshToken');
      expect(metadata).not.toContain('homeySessionToken');
      expect(metadata).not.toContain('homey-access-');
      expect(metadata).not.toContain('homey-refresh-');
      expect(metadata).not.toContain('homey-session-');
    }

    const proxy = createHomeyProxy(store);
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
          headers: {
            Origin: 'http://navet.example',
            Upgrade: 'websocket',
            Connection: 'upgrade',
          },
        }).request
      )
    ).toBe('1');
    const proxyRequestA = createRequest({
      cookie: browserA.cookie,
      requestUri: '/__navet_homey_proxy__/api/manager/devices/device?zone=kitchen',
    }).request;
    const proxyRequestB = createRequest({
      cookie: browserB.cookie,
      requestUri: '/__navet_homey_proxy__/api/manager/devices/device',
    }).request;
    expect(proxy.upstream_url(proxyRequestA)).toBe(
      'https://homey-a.example.com/api/manager/devices/device?zone=kitchen'
    );
    expect(proxy.authorization_header(proxyRequestA)).toBe('Bearer homey-session-a');
    expect(proxy.upstream_url(proxyRequestB)).toBe(
      'https://homey-b.example.com/api/manager/devices/device'
    );
    expect(proxy.authorization_header(proxyRequestB)).toBe('Bearer homey-session-b');

    const unknownCookie = `navet_homey_session=${'f'.repeat(64)}`;
    for (const cookie of [
      `${unknownCookie}; ${browserA.cookie}`,
      `${browserA.cookie}; ${unknownCookie}`,
    ]) {
      expect(proxy.authorization_header(createRequest({ cookie }).request)).toBe(
        'Bearer homey-session-a'
      );
    }
    expect(proxy.upstream_url(createRequest({ cookie: unknownCookie }).request)).toBe('');
    expect(proxy.authorization_header(createRequest().request)).toBe('');

    const anonymousDelete = createRequest({
      method: 'DELETE',
      uri: '/__navet_homey__/session',
      headers: { Origin: 'http://navet.example' },
    });
    await store.handle(anonymousDelete.request);
    expect(anonymousDelete.result.status).toBe(401);

    const wrongCookieDelete = createRequest({
      method: 'DELETE',
      uri: '/__navet_homey__/session',
      cookie: unknownCookie,
      headers: { Origin: 'http://navet.example' },
    });
    await store.handle(wrongCookieDelete.request);
    expect(wrongCookieDelete.result.status).toBe(401);

    const logoutA = createRequest({
      method: 'DELETE',
      uri: '/__navet_homey__/session',
      cookie: browserA.cookie,
      headers: {
        Origin: 'http://navet.example',
        'X-Ingress-Path': '/api/hassio_ingress/navet',
      },
    });
    await store.handle(logoutA.request);
    expect(logoutA.result.status).toBe(200);
    expect(logoutA.request.headersOut['Set-Cookie']).toEqual([
      expect.stringContaining('Path=/api/hassio_ingress/navet;'),
      expect.stringContaining('Path=/;'),
    ]);
    for (const setCookie of logoutA.request.headersOut['Set-Cookie']) {
      expect(setCookie).toContain('Max-Age=0');
    }
    expect(proxy.authorization_header(proxyRequestA)).toBe('');
    expect(proxy.authorization_header(proxyRequestB)).toBe('Bearer homey-session-b');
  });

  it('removes every presented duplicate provider session on logout without touching another browser', async () => {
    const homeyStore = createHomeySessionStore({
      ...createProviderDirectory('homey'),
      fetch: vi.fn(),
    });
    const homeyCookieA = createProviderCookie('navet_homey_session');
    const homeyCookieB = createProviderCookie('navet_homey_session');
    const unrelatedHomeyCookie = createProviderCookie('navet_homey_session');
    seedProviderAuth(homeyStore, homeyCookieA, HOMEY_AUTH_A);
    seedProviderAuth(homeyStore, homeyCookieB, HOMEY_AUTH_B);
    seedProviderAuth(homeyStore, unrelatedHomeyCookie, HOMEY_AUTH_A);

    const homeyLogout = createRequest({
      method: 'DELETE',
      uri: '/__navet_homey__/session',
      cookie: `${homeyCookieB}; ${homeyCookieA}`,
      headers: { Origin: 'http://navet.example' },
    });
    await homeyStore.handle(homeyLogout.request);

    expect(homeyLogout.result.status).toBe(200);
    expect(homeyStore.bindingStore.readSession(providerCookieId(homeyCookieA))).toBeNull();
    expect(homeyStore.bindingStore.readSession(providerCookieId(homeyCookieB))).toBeNull();
    expect(
      homeyStore.bindingStore.readSession(providerCookieId(unrelatedHomeyCookie))?.auth
    ).toEqual(HOMEY_AUTH_A);

    const openHABStore = createOpenHABSessionStore({
      ...createProviderDirectory('openhab'),
      fetch: vi.fn(),
    });
    const openHABCookieA = createProviderCookie('navet_openhab_session');
    const openHABCookieB = createProviderCookie('navet_openhab_session');
    const unrelatedOpenHABCookie = createProviderCookie('navet_openhab_session');
    seedProviderAuth(openHABStore, openHABCookieA, OPENHAB_AUTH_A);
    seedProviderAuth(openHABStore, openHABCookieB, OPENHAB_AUTH_B);
    seedProviderAuth(openHABStore, unrelatedOpenHABCookie, OPENHAB_AUTH_A);

    const openHABLogout = createRequest({
      method: 'DELETE',
      uri: '/__navet_openhab__/session',
      cookie: `${openHABCookieA}; ${openHABCookieB}`,
      headers: { Origin: 'http://navet.example' },
    });
    await openHABStore.handle(openHABLogout.request);

    expect(openHABLogout.result.status).toBe(200);
    expect(openHABStore.bindingStore.readSession(providerCookieId(openHABCookieA))).toBeNull();
    expect(openHABStore.bindingStore.readSession(providerCookieId(openHABCookieB))).toBeNull();
    expect(
      openHABStore.bindingStore.readSession(providerCookieId(unrelatedOpenHABCookie))?.auth
    ).toEqual(OPENHAB_AUTH_A);
  });

  it('preserves provider records across transient filesystem read errors', () => {
    const paths = createProviderDirectory('homey');
    const store = createHomeySessionStore({
      ...paths,
      fetch: vi.fn(),
    });
    const cookie = createProviderCookie('navet_homey_session');
    seedProviderAuth(store, cookie, HOMEY_AUTH_A);
    const cookieId = cookie.split('=')[1] ?? '';
    const sessionPath = join(paths.sessionsDirectory, `${cookieId}.json`);
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

    expect(() => store.bindingStore.readSession(cookieId)).toThrow('temporary I/O failure');
    vi.restoreAllMocks();
    expect(store.bindingStore.readSession(cookieId)?.auth).toEqual(HOMEY_AUTH_A);
  });

  it('preserves valid Homey auth when a replacement record is invalid or oversized', () => {
    const store = createHomeySessionStore({
      ...createProviderDirectory('homey'),
      fetch: vi.fn(),
    });
    const cookie = createProviderCookie('navet_homey_session');
    seedProviderAuth(store, cookie, HOMEY_AUTH_A);
    const cookieId = cookie.split('=')[1] ?? '';
    const current = store.bindingStore.readSession(cookieId);
    expect(current?.auth).toEqual(HOMEY_AUTH_A);
    if (!current) {
      throw new Error('Expected the seeded Homey record');
    }

    expect(() =>
      store.bindingStore.writeSession(cookieId, {
        ...current,
        updatedAt: Date.now(),
        auth: {
          ...HOMEY_AUTH_A,
          expiresAt: Number.NaN,
        },
      })
    ).toThrow('Invalid provider session');

    let failure: unknown;
    try {
      store.bindingStore.writeSession(cookieId, {
        ...current,
        updatedAt: Date.now(),
        auth: {
          ...HOMEY_AUTH_A,
          accessToken: 'x'.repeat(33 * 1024),
        },
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({
      code: 'credential-session-record-too-large',
      statusCode: 507,
    });
    expect(store.bindingStore.readSession(cookieId)?.auth).toEqual(HOMEY_AUTH_A);
  });

  it('preserves every presented Homey record when replacement rotation cannot be written', () => {
    const store = createHomeySessionStore({
      ...createProviderDirectory('homey'),
      fetch: vi.fn(),
    });
    const cookieA = createProviderCookie('navet_homey_session');
    const cookieB = createProviderCookie('navet_homey_session');
    const unrelatedCookie = createProviderCookie('navet_homey_session');
    seedProviderAuth(store, cookieA, HOMEY_AUTH_A);
    seedProviderAuth(store, cookieB, HOMEY_AUTH_B);
    seedProviderAuth(store, unrelatedCookie, HOMEY_AUTH_A);
    const cookieAId = providerCookieId(cookieA);
    const cookieBId = providerCookieId(cookieB);
    const unrelatedCookieId = providerCookieId(unrelatedCookie);
    const current = store.bindingStore.readSession(cookieAId);
    if (!current) {
      throw new Error('Expected the seeded Homey record');
    }

    let failure: unknown;
    const request = createRequest({ cookie: `${cookieA}; ${cookieB}` }).request;
    try {
      store.bindingStore.rotateRequestSession(request, cookieAId, {
        ...current,
        updatedAt: Date.now(),
        auth: {
          ...HOMEY_AUTH_A,
          accessToken: 'x'.repeat(33 * 1024),
        },
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({
      code: 'credential-session-record-too-large',
      statusCode: 507,
    });
    expect(request.headersOut['Set-Cookie']).toBeUndefined();
    expect(store.bindingStore.readSession(cookieAId)?.auth).toEqual(HOMEY_AUTH_A);
    expect(store.bindingStore.readSession(cookieBId)?.auth).toEqual(HOMEY_AUTH_B);
    expect(store.bindingStore.readSession(unrelatedCookieId)?.auth).toEqual(HOMEY_AUTH_A);
  });

  it('preserves valid openHAB auth when the wrapped replacement exceeds its record limit', () => {
    const store = createOpenHABSessionStore({
      ...createProviderDirectory('openhab'),
      fetch: vi.fn(),
    });
    const cookie = createProviderCookie('navet_openhab_session');
    seedProviderAuth(store, cookie, OPENHAB_AUTH_A);
    const cookieId = cookie.split('=')[1] ?? '';
    const current = store.bindingStore.readSession(cookieId);
    expect(current?.auth).toEqual(OPENHAB_AUTH_A);
    if (!current) {
      throw new Error('Expected the seeded openHAB record');
    }

    let failure: unknown;
    try {
      store.bindingStore.writeSession(cookieId, {
        ...current,
        updatedAt: Date.now(),
        auth: {
          ...OPENHAB_AUTH_A,
          password: 'x'.repeat(17 * 1024),
        },
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({
      code: 'credential-session-record-too-large',
      statusCode: 507,
    });
    expect(store.bindingStore.readSession(cookieId)?.auth).toEqual(OPENHAB_AUTH_A);
  });

  it('selects and resets the canonical Homey cookie independent of duplicate-cookie order', async () => {
    const store = createHomeySessionStore({
      ...createProviderDirectory('homey'),
      fetch: vi.fn(),
    });
    const unauthenticatedCookie = createProviderCookie('navet_homey_session');
    const olderAuthenticatedCookie = createProviderCookie('navet_homey_session');
    const newerAuthenticatedCookie = createProviderCookie('navet_homey_session');
    const baseline = Date.now() - 60_000;
    store.bindingStore.writeSession(providerCookieId(unauthenticatedCookie), {
      version: 1,
      createdAt: baseline,
      updatedAt: baseline + 30_000,
      auth: null,
      pending: {
        state: 'f'.repeat(64),
        returnTo: '/',
        expiresAt: Date.now() + 60_000,
      },
    });
    seedProviderAuth(store, olderAuthenticatedCookie, HOMEY_AUTH_A, baseline);
    seedProviderAuth(store, newerAuthenticatedCookie, HOMEY_AUTH_B, baseline + 10_000);

    for (const cookies of [
      [unauthenticatedCookie, newerAuthenticatedCookie, olderAuthenticatedCookie],
      [olderAuthenticatedCookie, newerAuthenticatedCookie, unauthenticatedCookie],
    ]) {
      const metadata = createRequest({
        uri: '/__navet_homey__/session',
        cookie: cookies.join('; '),
      });
      await store.handle(metadata.request);

      expect(metadata.result.status).toBe(200);
      expect(JSON.parse(metadata.result.body)).toMatchObject({
        userId: HOMEY_AUTH_B.userId,
        selectedHomeyId: HOMEY_AUTH_B.selectedHomeyId,
      });
      expect(cookieHeader(metadata.request.headersOut['Set-Cookie'])).toBe(
        newerAuthenticatedCookie
      );
    }
  });

  it('returns a typed capacity response when Homey authenticated sessions fill the store', async () => {
    vi.stubEnv('NAVET_HOMEY_CLIENT_ID', 'homey-client-id');
    const paths = createProviderDirectory('homey');
    const store = createHomeySessionStore({
      ...paths,
      fetch: vi.fn(),
    });
    fillProviderCapacity(paths.sessionsDirectory, HOMEY_AUTH_A, true);

    const authorize = createRequest({
      method: 'POST',
      uri: '/__navet_homey__/authorize',
      body: JSON.stringify({ returnTo: '/' }),
      headers: { Origin: 'http://navet.example' },
    });
    await store.handle(authorize.request);

    expect(authorize.result.status).toBe(507);
    expect(JSON.parse(authorize.result.body)).toMatchObject({
      code: 'credential-session-capacity-reached',
    });
  });

  it('returns typed openHAB capacity errors without consuming the login-attempt budget', async () => {
    const paths = createProviderDirectory('openhab');
    const fetchImpl = vi.fn().mockImplementation(
      async () =>
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    );
    const store = createOpenHABSessionStore({
      ...paths,
      fetch: fetchImpl,
    });
    fillProviderCapacity(paths.sessionsDirectory, OPENHAB_AUTH_A, false);

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const login = createRequest({
        method: 'PUT',
        uri: '/__navet_openhab__/session',
        body: JSON.stringify(OPENHAB_AUTH_A),
        headers: { Origin: 'http://navet.example' },
      });
      await store.handle(login.request);

      expect({
        status: login.result.status,
        payload: JSON.parse(login.result.body),
      }).toMatchObject({
        status: 507,
        payload: {
          code: 'credential-session-capacity-reached',
        },
      });
    }
    expect(fetchImpl).toHaveBeenCalledTimes(6);
  });

  it('caches Homey sessions per request and invalidates them after storage mutations', () => {
    const paths = createProviderDirectory('homey');
    const store = createHomeySessionStore({
      ...paths,
      fetch: vi.fn(),
    });
    const cookie = createProviderCookie('navet_homey_session');
    const otherCookie = createProviderCookie('navet_homey_session');
    const cookieId = cookie.split('=')[1] ?? '';
    seedProviderAuth(store, cookie, HOMEY_AUTH_A, Date.now() - 25 * 60 * 60 * 1000);
    seedProviderAuth(store, otherCookie, HOMEY_AUTH_B);
    const sessionPath = join(paths.sessionsDirectory, `${cookieId}.json`);
    const otherSessionPath = join(
      paths.sessionsDirectory,
      `${otherCookie.split('=')[1] ?? ''}.json`
    );
    const readFile = fs.readFileSync.bind(fs);
    let sessionReads = 0;
    vi.spyOn(fs, 'readFileSync').mockImplementation(((path, ...args) => {
      if (String(path) === sessionPath || String(path) === otherSessionPath) {
        sessionReads += 1;
      }
      return readFile(path, ...args);
    }) as typeof fs.readFileSync);

    const proxy = createHomeyProxy(store);
    const request = createRequest({
      cookie,
      requestUri: '/__navet_homey_proxy__/api/manager/devices/device',
    }).request;
    expect(proxy.upstream_url(request)).toBe(
      'https://homey-a.example.com/api/manager/devices/device'
    );
    expect(store.touchSessionCookie(request)).toContain(cookie);
    expect(proxy.authorization_header(request)).toBe('Bearer homey-session-a');
    expect(sessionReads).toBe(1);

    const otherRequest = createRequest({
      cookie: otherCookie,
      requestUri: '/__navet_homey_proxy__/api/manager/devices/device',
    }).request;
    expect(proxy.upstream_url(otherRequest)).toBe(
      'https://homey-b.example.com/api/manager/devices/device'
    );
    expect(proxy.authorization_header(otherRequest)).toBe('Bearer homey-session-b');
    expect(sessionReads).toBe(2);
    expect(proxy.authorization_header(request)).toBe('Bearer homey-session-a');
    expect(sessionReads).toBe(2);

    seedProviderAuth(store, cookie, HOMEY_AUTH_B);
    expect(proxy.authorization_header(request)).toBe('Bearer homey-session-b');
    expect(sessionReads).toBe(3);

    store.bindingStore.deleteSession(cookieId);
    expect(proxy.authorization_header(request)).toBe('');
    expect(sessionReads).toBe(3);
  });

  it('uses high-entropy, browser-bound Homey OAuth state and consumes it before exchange', async () => {
    vi.stubEnv('NAVET_HOMEY_CLIENT_ID', 'homey-client-id');
    vi.stubEnv('NAVET_HOMEY_CLIENT_SECRET', 'homey-client-secret');
    vi.stubEnv('NAVET_HOMEY_REDIRECT_URI', 'https://navet.example/__navet_homey__/callback');

    let store: ReturnType<typeof createHomeySessionStore>;
    let browserACookie = '';
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith('/oauth2/token')) {
        const context = store.bindingStore.getRequestSession(
          createRequest({ cookie: browserACookie }).request
        );
        expect(context?.session).toMatchObject({
          auth: null,
          pending: {
            returnTo: '/wall?view=home#lights',
          },
        });
        expect(context?.session.pending?.state).not.toBe(state);
        return new Response(
          JSON.stringify({
            access_token: 'oauth-access-a',
            refresh_token: 'oauth-refresh-a',
            expires_in: 3600,
          }),
          { status: 200 }
        );
      }

      expect(url).toBe('https://api.athom.com/user/me');
      return new Response(
        JSON.stringify({
          _id: 'oauth-user-a',
          name: 'OAuth User A',
          email: 'oauth-a@example.com',
          homeys: [],
        }),
        { status: 200 }
      );
    });
    store = createHomeySessionStore({
      ...createProviderDirectory('homey'),
      fetch: fetchImpl,
    });

    const crossSiteStart = createRequest({
      method: 'POST',
      uri: '/__navet_homey__/authorize',
      body: JSON.stringify({ returnTo: '/' }),
      headers: {
        Host: 'navet.example',
        'X-Forwarded-Proto': 'https',
        Origin: 'https://attacker.example',
      },
    });
    await store.handle(crossSiteStart.request);
    expect(crossSiteStart.result.status).toBe(403);
    expect(crossSiteStart.request.headersOut['Set-Cookie']).toBeUndefined();

    const legacyGetStart = createRequest({
      uri: '/__navet_homey__/authorize',
      headers: {
        Host: 'navet.example',
        'X-Forwarded-Proto': 'https',
      },
    });
    await store.handle(legacyGetStart.request);
    expect(legacyGetStart.result.status).toBe(405);
    expect(legacyGetStart.request.headersOut.Allow).toBe('POST');

    const authorizeA = createRequest({
      method: 'POST',
      uri: '/__navet_homey__/authorize',
      body: JSON.stringify({ returnTo: '/wall?view=home#lights' }),
      headers: {
        Host: 'navet.example',
        'X-Forwarded-Proto': 'https',
        Origin: 'https://navet.example',
      },
    });
    await store.handle(authorizeA.request);
    expect(authorizeA.result.status).toBe(200);
    browserACookie = cookieHeader(authorizeA.request.headersOut['Set-Cookie']);
    const authorizeUrl = new URL(
      (JSON.parse(authorizeA.result.body) as { authorizeUrl: string }).authorizeUrl
    );
    const state = authorizeUrl.searchParams.get('state');
    expect(state).toMatch(/^[a-f0-9]{64}$/);
    if (!state) {
      throw new Error('Expected Homey OAuth state');
    }

    const browserB = { cookie: createProviderCookie('navet_homey_session') };
    const wrongBrowserCallback = createRequest({
      uri: '/__navet_homey__/callback',
      cookie: browserB.cookie,
      args: { code: 'homey-code-a', state },
      headers: { 'X-Forwarded-Proto': 'https' },
    });
    await store.handle(wrongBrowserCallback.request);
    expect(wrongBrowserCallback.result.status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();

    const correctCallback = createRequest({
      uri: '/__navet_homey__/callback',
      cookie: browserACookie,
      args: { code: 'homey-code-a', state },
      headers: { 'X-Forwarded-Proto': 'https' },
    });
    await store.handle(correctCallback.request);
    expect(correctCallback.result.status).toBe(302);
    expect(correctCallback.result.redirectLocation).toBe(
      'https://navet.example/wall?view=home&homey_oauth_callback=1#lights'
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const rotatedCookie = cookieHeader(correctCallback.request.headersOut['Set-Cookie']);
    expect(rotatedCookie).not.toBe(browserACookie);

    const replayedCallback = createRequest({
      uri: '/__navet_homey__/callback',
      cookie: browserACookie,
      args: { code: 'homey-code-a', state },
      headers: { 'X-Forwarded-Proto': 'https' },
    });
    await store.handle(replayedCallback.request);
    expect(replayedCallback.result.status).toBe(400);
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    const proxy = createHomeyProxy(store);
    expect(proxy.authorization_header(createRequest({ cookie: browserB.cookie }).request)).toBe('');
    const metadata = createRequest({
      uri: '/__navet_homey__/session',
      cookie: rotatedCookie,
    });
    await store.handle(metadata.request);
    expect(JSON.parse(metadata.result.body)).toMatchObject({
      userId: 'oauth-user-a',
      hasActiveHomeySession: false,
    });
    expect(metadata.result.body).not.toContain('oauth-access-a');
    expect(metadata.result.body).not.toContain('oauth-refresh-a');
  });

  it('matches Homey callback state across duplicate cookies and removes stale records after rotation', async () => {
    vi.stubEnv('NAVET_HOMEY_CLIENT_ID', 'homey-client-id');
    vi.stubEnv('NAVET_HOMEY_CLIENT_SECRET', 'homey-client-secret');
    vi.stubEnv('NAVET_HOMEY_REDIRECT_URI', 'https://navet.example/__navet_homey__/callback');

    for (const pendingCookieFirst of [true, false]) {
      const fetchImpl = vi.fn(async (input: string | URL | Request) => {
        if (String(input).endsWith('/oauth2/token')) {
          return new Response(
            JSON.stringify({
              access_token: 'duplicate-oauth-access',
              refresh_token: 'duplicate-oauth-refresh',
              expires_in: 3600,
            }),
            { status: 200 }
          );
        }

        expect(String(input)).toBe('https://api.athom.com/user/me');
        return new Response(
          JSON.stringify({
            _id: 'duplicate-oauth-user',
            name: 'Duplicate OAuth User',
            email: 'duplicate@example.com',
            homeys: [],
          }),
          { status: 200 }
        );
      });
      const store = createHomeySessionStore({
        ...createProviderDirectory('homey'),
        fetch: fetchImpl,
      });
      const pendingCookie = createProviderCookie('navet_homey_session');
      const staleAuthenticatedCookie = createProviderCookie('navet_homey_session');
      const unrelatedCookie = createProviderCookie('navet_homey_session');
      const state = `${pendingCookieFirst ? 'a' : 'b'}${'c'.repeat(63)}`;
      const now = Date.now();
      store.bindingStore.writeSession(providerCookieId(pendingCookie), {
        version: 1,
        createdAt: now,
        updatedAt: now,
        auth: null,
        pending: {
          state,
          returnTo: '/wall',
          expiresAt: now + 60_000,
          installationPairingVerified: true,
        },
      });
      seedProviderAuth(store, staleAuthenticatedCookie, HOMEY_AUTH_B, now + 1);
      seedProviderAuth(store, unrelatedCookie, HOMEY_AUTH_A, now + 2);
      const presentedCookies = pendingCookieFirst
        ? `${pendingCookie}; ${staleAuthenticatedCookie}`
        : `${staleAuthenticatedCookie}; ${pendingCookie}`;

      const callback = createRequest({
        uri: '/__navet_homey__/callback',
        cookie: presentedCookies,
        args: { code: 'duplicate-homey-code', state },
        headers: { 'X-Forwarded-Proto': 'https' },
      });
      await store.handle(callback.request);

      expect(callback.result.status).toBe(302);
      expect(callback.result.redirectLocation).toBe(
        'https://navet.example/wall?homey_oauth_callback=1'
      );
      expect(fetchImpl).toHaveBeenCalledTimes(2);
      const rotatedCookie = cookieHeader(callback.request.headersOut['Set-Cookie']);
      expect(rotatedCookie).not.toBe(pendingCookie);
      expect(rotatedCookie).not.toBe(staleAuthenticatedCookie);
      expect(store.bindingStore.readSession(providerCookieId(pendingCookie))).toBeNull();
      expect(store.bindingStore.readSession(providerCookieId(staleAuthenticatedCookie))).toBeNull();
      expect(store.bindingStore.readSession(providerCookieId(rotatedCookie))?.auth).toMatchObject({
        userId: 'duplicate-oauth-user',
        accessToken: 'duplicate-oauth-access',
      });
      expect(store.bindingStore.readSession(providerCookieId(unrelatedCookie))?.auth).toEqual(
        HOMEY_AUTH_A
      );
    }
  });

  it('routes a configured Homey callback path without the browser URL constructor', async () => {
    vi.stubEnv('NAVET_HOMEY_CLIENT_ID', 'homey-client-id');
    vi.stubEnv('NAVET_HOMEY_CLIENT_SECRET', 'homey-client-secret');
    vi.stubEnv(
      'NAVET_HOMEY_REDIRECT_URI',
      'https://navet.example/custom/homey/callback?source=navet#configured'
    );
    const fetchImpl = vi.fn();
    const store = createHomeySessionStore({
      ...createProviderDirectory('homey'),
      fetch: fetchImpl,
    });

    const authorize = createRequest({
      method: 'POST',
      uri: '/__navet_homey__/authorize',
      body: JSON.stringify({ returnTo: '/wall#lights' }),
      headers: {
        Host: 'navet.example',
        Origin: 'https://navet.example',
        'X-Forwarded-Proto': 'https',
      },
    });
    await store.handle(authorize.request);
    const state = new URL(
      (JSON.parse(authorize.result.body) as { authorizeUrl: string }).authorizeUrl
    ).searchParams.get('state');
    const cookie = cookieHeader(authorize.request.headersOut['Set-Cookie']);

    const denied = createRequest({
      uri: '/custom/homey/callback',
      cookie,
      args: { error: 'access_denied', state: state ?? '' },
      headers: {
        Host: 'navet.example',
        'X-Forwarded-Proto': 'https',
      },
    });
    await store.handle(denied.request);

    expect(denied.result.status).toBe(302);
    expect(denied.result.redirectLocation).toBe(
      'https://navet.example/wall?homey_oauth_error=access_denied#lights'
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('redirects a trusted Homey denial safely, preserves reauth, and rejects replay', async () => {
    vi.stubEnv('NAVET_HOMEY_CLIENT_ID', 'homey-client-id');
    vi.stubEnv('NAVET_HOMEY_CLIENT_SECRET', 'homey-client-secret');
    vi.stubEnv('NAVET_HOMEY_REDIRECT_URI', 'https://navet.example/__navet_homey__/callback');
    const fetchImpl = vi.fn();
    const store = createHomeySessionStore({
      ...createProviderDirectory('homey'),
      fetch: fetchImpl,
    });
    const cookie = createProviderCookie('navet_homey_session');
    seedProviderAuth(store, cookie, HOMEY_AUTH_A);

    const authorize = createRequest({
      method: 'POST',
      uri: '/__navet_homey__/authorize',
      cookie,
      body: JSON.stringify({
        returnTo: '//attacker.example/steal?homey_oauth_error=old&code=secret&state=secret#token',
      }),
      headers: {
        Host: 'navet.example',
        Origin: 'https://navet.example',
        'X-Forwarded-Proto': 'https',
      },
    });
    await store.handle(authorize.request);
    const state = new URL(
      (JSON.parse(authorize.result.body) as { authorizeUrl: string }).authorizeUrl
    ).searchParams.get('state');
    expect(state).toMatch(/^[a-f0-9]{64}$/);

    const denied = createRequest({
      uri: '/__navet_homey__/callback',
      cookie,
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
      'https://navet.example/?homey_oauth_error=access_denied'
    );
    expect(denied.result.redirectLocation).not.toContain('provider-secret-details');
    expect(fetchImpl).not.toHaveBeenCalled();
    const cookieId = cookie.split('=')[1] ?? '';
    expect(store.bindingStore.readSession(cookieId)).toMatchObject({
      auth: HOMEY_AUTH_A,
      pending: {
        returnTo: '/',
      },
    });
    expect(store.bindingStore.readSession(cookieId)?.pending?.state).not.toBe(state);

    const replay = createRequest({
      uri: '/__navet_homey__/callback',
      cookie,
      args: { error: 'access_denied', state: state ?? '' },
      headers: { 'X-Forwarded-Proto': 'https' },
    });
    await store.handle(replay.request);
    expect(replay.result.status).toBe(400);
    expect(replay.result.redirectLocation).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects an unpaired Homey account before requesting any returned Homey URL', async () => {
    vi.stubEnv('NAVET_HOMEY_CLIENT_ID', 'homey-client-id');
    vi.stubEnv('NAVET_HOMEY_CLIENT_SECRET', 'homey-client-secret');
    vi.stubEnv('NAVET_HOMEY_REDIRECT_URI', 'https://navet.example/__navet_homey__/callback');
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith('/oauth2/token')) {
        return new Response(
          JSON.stringify({
            access_token: 'hostile-access',
            refresh_token: 'hostile-refresh',
            expires_in: 3600,
          }),
          { status: 200 }
        );
      }
      if (url === 'https://api.athom.com/user/me') {
        return new Response(
          JSON.stringify({
            _id: 'hostile-user',
            name: 'Unexpected Homey account',
            homeys: [
              {
                _id: 'hostile-homey',
                name: 'Hostile Homey',
                localUrlSecure: 'https://hostile-homey.example',
              },
            ],
          }),
          { status: 200 }
        );
      }
      throw new Error(`Unexpected upstream request: ${url}`);
    });
    const store = createHomeySessionStore({
      ...createProviderDirectory('homey'),
      fetch: fetchImpl,
      installationAuthority: {
        authorizeHomeyStart: () => ({
          allowed: true,
          pairingVerified: false,
        }),
        commitHomey: () => false,
      },
    });

    const authorize = createRequest({
      method: 'POST',
      uri: '/__navet_homey__/authorize',
      body: JSON.stringify({ returnTo: '/' }),
      headers: {
        Host: 'navet.example',
        'X-Forwarded-Proto': 'https',
        Origin: 'https://navet.example',
      },
    });
    await store.handle(authorize.request);
    const cookie = cookieHeader(authorize.request.headersOut['Set-Cookie']);
    const state = new URL(
      (JSON.parse(authorize.result.body) as { authorizeUrl: string }).authorizeUrl
    ).searchParams.get('state');
    expect(state).toBeTruthy();

    const callback = createRequest({
      uri: '/__navet_homey__/callback',
      cookie,
      args: { code: 'hostile-code', state: state ?? '' },
      headers: { 'X-Forwarded-Proto': 'https' },
    });
    await store.handle(callback.request);

    expect(callback.result.status).toBe(302);
    expect(callback.result.redirectLocation).toBe(
      'https://navet.example/?homey_oauth_error=not_authorized'
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(
      fetchImpl.mock.calls.some(([input]) => String(input).includes('hostile-homey.example'))
    ).toBe(false);
    expect(
      fetchImpl.mock.calls.some(([input]) => String(input).includes('/delegation/token'))
    ).toBe(false);
  });

  it('does not resurrect a Homey session when logout wins an in-flight refresh', async () => {
    vi.stubEnv('NAVET_HOMEY_CLIENT_ID', 'homey-client-id');
    vi.stubEnv('NAVET_HOMEY_CLIENT_SECRET', 'homey-client-secret');
    let resolveRefresh!: (response: Response) => void;
    const refreshResponse = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
    const fetchImpl = vi.fn(() => refreshResponse);
    const store = createHomeySessionStore({
      ...createProviderDirectory('homey'),
      fetch: fetchImpl,
    });
    const cookie = createProviderCookie('navet_homey_session');
    seedProviderAuth(store, cookie, {
      ...HOMEY_AUTH_A,
      expiresAt: Date.now() - 1,
    });

    const refreshing = createRequest({
      uri: '/__navet_homey__/session',
      cookie,
    });
    const refreshPromise = store.handle(refreshing.request);
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));

    const logout = createRequest({
      method: 'DELETE',
      uri: '/__navet_homey__/session',
      cookie,
      headers: { Origin: 'http://navet.example' },
    });
    await store.handle(logout.request);
    expect(logout.result.status).toBe(200);

    resolveRefresh(
      new Response(
        JSON.stringify({
          access_token: 'refreshed-after-logout',
          refresh_token: 'refresh-after-logout',
          expires_in: 3600,
        }),
        { status: 200 }
      )
    );
    await refreshPromise;

    expect(refreshing.result.status).toBe(204);
    expect(store.bindingStore.readSession(cookie.split('=')[1] ?? '')).toBeNull();
  });

  it.each([
    {
      label: 'invalid grant',
      response: new Response(JSON.stringify({ error: 'invalid_grant' }), {
        status: 400,
      }),
    },
    {
      label: 'transient upstream failure',
      response: new Response(JSON.stringify({ error: 'server_error' }), {
        status: 503,
      }),
    },
  ])(
    'keeps the winning Homey refresh when a concurrent refresh has a $label',
    async ({ response }) => {
      vi.stubEnv('NAVET_HOMEY_CLIENT_ID', 'homey-client-id');
      vi.stubEnv('NAVET_HOMEY_CLIENT_SECRET', 'homey-client-secret');
      const resolvers: Array<(response: Response) => void> = [];
      const fetchImpl = vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolvers.push(resolve);
          })
      );
      const store = createHomeySessionStore({
        ...createProviderDirectory('homey'),
        fetch: fetchImpl,
      });
      const cookie = createProviderCookie('navet_homey_session');
      seedProviderAuth(store, cookie, {
        ...HOMEY_AUTH_A,
        expiresAt: Date.now() - 1,
      });

      const winner = createRequest({
        uri: '/__navet_homey__/session',
        cookie,
      });
      const loser = createRequest({
        uri: '/__navet_homey__/session',
        cookie,
      });
      const winnerPromise = store.handle(winner.request);
      const loserPromise = store.handle(loser.request);
      await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));

      resolvers[0](
        new Response(
          JSON.stringify({
            access_token: 'winning-access-token',
            refresh_token: 'winning-refresh-token',
            expires_in: 3600,
          }),
          { status: 200 }
        )
      );
      await winnerPromise;
      resolvers[1](response);
      await loserPromise;

      expect(winner.result.status).toBe(200);
      expect(loser.result.status).toBe(200);
      expect(loser.request.headersOut['Set-Cookie']).not.toContain('Max-Age=0');
      expect(store.bindingStore.readSession(cookie.split('=')[1] ?? '')?.auth).toMatchObject({
        accessToken: 'winning-access-token',
        refreshToken: 'winning-refresh-token',
      });
    }
  );

  it.each([
    {
      label: 'a 401 invalid_client response',
      response: new Response(JSON.stringify({ error: 'invalid_client' }), {
        status: 401,
      }),
      expectedStatus: 200,
      preserved: true,
    },
    {
      label: 'a non-JSON 401 response',
      response: new Response('gateway authentication failed', { status: 401 }),
      expectedStatus: 200,
      preserved: true,
    },
    {
      label: 'an explicit invalid_grant response',
      response: new Response(JSON.stringify({ error: 'invalid_grant' }), {
        status: 400,
      }),
      expectedStatus: 204,
      preserved: false,
    },
  ])(
    'treats $label as confirmed invalid only when Homey identifies the refresh grant',
    async ({ response, expectedStatus, preserved }) => {
      vi.stubEnv('NAVET_HOMEY_CLIENT_ID', 'homey-client-id');
      vi.stubEnv('NAVET_HOMEY_CLIENT_SECRET', 'homey-client-secret');
      const store = createHomeySessionStore({
        ...createProviderDirectory('homey'),
        fetch: vi.fn().mockResolvedValue(response),
      });
      const cookie = createProviderCookie('navet_homey_session');
      seedProviderAuth(store, cookie, {
        ...HOMEY_AUTH_A,
        expiresAt: Date.now() - 1,
      });

      const metadata = createRequest({
        uri: '/__navet_homey__/session',
        cookie,
      });
      await store.handle(metadata.request);

      expect(metadata.result.status).toBe(expectedStatus);
      expect(Boolean(store.bindingStore.readSession(cookie.split('=')[1] ?? '')?.auth)).toBe(
        preserved
      );
    }
  );

  it('keeps the prior Homey session when a successful refresh has an invalid expiry', async () => {
    vi.stubEnv('NAVET_HOMEY_CLIENT_ID', 'homey-client-id');
    vi.stubEnv('NAVET_HOMEY_CLIENT_SECRET', 'homey-client-secret');
    const store = createHomeySessionStore({
      ...createProviderDirectory('homey'),
      fetch: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: 'malformed-refresh-access',
            refresh_token: 'malformed-refresh-token',
            expires_in: 'not-a-number',
          }),
          { status: 200 }
        )
      ),
    });
    const cookie = createProviderCookie('navet_homey_session');
    const expiredAuth = {
      ...HOMEY_AUTH_A,
      expiresAt: Date.now() - 1,
    };
    seedProviderAuth(store, cookie, expiredAuth);

    const metadata = createRequest({
      uri: '/__navet_homey__/session',
      cookie,
    });
    await store.handle(metadata.request);

    expect(metadata.result.status).toBe(200);
    expect(store.bindingStore.readSession(cookie.split('=')[1] ?? '')?.auth).toEqual(expiredAuth);
  });

  it('returns the winning Homey session when concurrent metadata reads renew one record', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-29T00:00:00.000Z'));
    const store = createHomeySessionStore({
      ...createProviderDirectory('homey'),
      fetch: vi.fn(),
    });
    const cookie = createProviderCookie('navet_homey_session');
    seedProviderAuth(store, cookie, HOMEY_AUTH_A);
    vi.advanceTimersByTime(1);

    const first = createRequest({
      uri: '/__navet_homey__/session',
      cookie,
    });
    const second = createRequest({
      uri: '/__navet_homey__/session',
      cookie,
    });
    await Promise.all([store.handle(first.request), store.handle(second.request)]);

    expect(first.result.status).toBe(200);
    expect(second.result.status).toBe(200);
    expect(JSON.parse(second.result.body)).toMatchObject({
      userId: HOMEY_AUTH_A.userId,
      selectedHomeyId: HOMEY_AUTH_A.selectedHomeyId,
    });
  });

  it('does not resurrect an openHAB session when logout wins connection validation', async () => {
    let resolveValidation!: (response: Response) => void;
    const validationResponse = new Promise<Response>((resolve) => {
      resolveValidation = resolve;
    });
    const fetchImpl = vi.fn(() => validationResponse);
    const store = createOpenHABSessionStore({
      ...createProviderDirectory('openhab'),
      fetch: fetchImpl,
    });
    const cookie = createProviderCookie('navet_openhab_session');
    seedProviderAuth(store, cookie, OPENHAB_AUTH_A);

    const saving = createRequest({
      method: 'PUT',
      uri: '/__navet_openhab__/session',
      cookie,
      headers: { Origin: 'http://navet.example' },
      body: JSON.stringify(OPENHAB_AUTH_B),
    });
    const savePromise = store.handle(saving.request);
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));

    const logout = createRequest({
      method: 'DELETE',
      uri: '/__navet_openhab__/session',
      cookie,
      headers: { Origin: 'http://navet.example' },
    });
    await store.handle(logout.request);
    expect(logout.result.status).toBe(200);

    resolveValidation(new Response(JSON.stringify([]), { status: 200 }));
    await savePromise;

    expect(saving.result.status).toBe(409);
    expect(store.bindingStore.readSession(cookie.split('=')[1] ?? '')).toBeNull();
  });

  it('throttles openHAB credential verification per source and recovers after the window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-29T00:00:00.000Z'));
    const validateConnection = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid credentials' }), {
        status: 401,
      })
    );
    const store = createOpenHABSessionStore({
      ...createProviderDirectory('openhab'),
      fetch: validateConnection,
    });
    const createLogin = () =>
      createRequest({
        method: 'PUT',
        uri: '/__navet_openhab__/session',
        remoteAddress: '192.0.2.44',
        headers: { Origin: 'http://navet.example' },
        body: JSON.stringify(OPENHAB_AUTH_A),
      });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const login = createLogin();
      await store.handle(login.request);
      expect(login.result.status).toBe(400);
    }
    const limited = createLogin();
    await store.handle(limited.request);
    expect(limited.result.status).toBe(429);
    expect(limited.request.headersOut['Retry-After']).toBe('60');
    expect(validateConnection).toHaveBeenCalledTimes(5);

    const metadata = createRequest({
      uri: '/__navet_openhab__/session',
      remoteAddress: '192.0.2.44',
    });
    await store.handle(metadata.request);
    expect(metadata.result.status).toBe(204);

    vi.advanceTimersByTime(60_001);
    const recovered = createLogin();
    await store.handle(recovered.request);
    expect(recovered.result.status).toBe(400);
    expect(validateConnection).toHaveBeenCalledTimes(6);
  });

  it('removes every stale presented openHAB record only after a successful login rotation', async () => {
    const validateConnection = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    const store = createOpenHABSessionStore({
      ...createProviderDirectory('openhab'),
      fetch: validateConnection,
    });
    const cookieA = createProviderCookie('navet_openhab_session');
    const cookieB = createProviderCookie('navet_openhab_session');
    const unrelatedCookie = createProviderCookie('navet_openhab_session');
    const baseline = Date.now() - 1_000;
    seedProviderAuth(store, cookieA, OPENHAB_AUTH_A, baseline);
    seedProviderAuth(store, cookieB, OPENHAB_AUTH_B, baseline + 1);
    seedProviderAuth(store, unrelatedCookie, OPENHAB_AUTH_A, baseline + 2);

    const login = createRequest({
      method: 'PUT',
      uri: '/__navet_openhab__/session',
      cookie: `${cookieA}; ${cookieB}`,
      headers: { Origin: 'http://navet.example' },
      body: JSON.stringify(OPENHAB_AUTH_B),
    });
    await store.handle(login.request);

    expect(login.result.status).toBe(200);
    expect(validateConnection).toHaveBeenCalledTimes(1);
    const rotatedCookie = cookieHeader(login.request.headersOut['Set-Cookie']);
    expect(rotatedCookie).not.toBe(cookieA);
    expect(rotatedCookie).not.toBe(cookieB);
    expect(store.bindingStore.readSession(providerCookieId(cookieA))).toBeNull();
    expect(store.bindingStore.readSession(providerCookieId(cookieB))).toBeNull();
    expect(store.bindingStore.readSession(providerCookieId(rotatedCookie))?.auth).toEqual(
      OPENHAB_AUTH_B
    );
    expect(store.bindingStore.readSession(providerCookieId(unrelatedCookie))?.auth).toEqual(
      OPENHAB_AUTH_A
    );
  });

  it('keeps openHAB credentials server-side and isolates mutation and proxy access by cookie', async () => {
    const validateConnection = vi
      .fn()
      .mockImplementation(async () => new Response(JSON.stringify([]), { status: 200 }));
    const store = createOpenHABSessionStore({
      ...createProviderDirectory('openhab'),
      fetch: validateConnection,
    });
    const anonymousGet = createRequest({ uri: '/__navet_openhab__/session' });
    await store.handle(anonymousGet.request);
    expect(anonymousGet.result.status).toBe(204);
    expect(anonymousGet.request.headersOut['Set-Cookie']).toBeUndefined();

    const saveA = createRequest({
      method: 'PUT',
      uri: '/__navet_openhab__/session',
      headers: { Origin: 'http://navet.example' },
      body: JSON.stringify(OPENHAB_AUTH_A),
    });
    const saveB = createRequest({
      method: 'PUT',
      uri: '/__navet_openhab__/session',
      headers: { Origin: 'http://navet.example' },
      body: JSON.stringify(OPENHAB_AUTH_B),
    });
    await store.handle(saveA.request);
    await store.handle(saveB.request);
    expect(saveA.result.status).toBe(200);
    expect(saveB.result.status).toBe(200);
    expect(validateConnection).toHaveBeenCalledTimes(2);
    const browserA = { cookie: cookieHeader(saveA.request.headersOut['Set-Cookie']) };
    const browserB = { cookie: cookieHeader(saveB.request.headersOut['Set-Cookie']) };
    expect(browserA.cookie).toMatch(/^navet_openhab_session=[a-f0-9]{64}$/);
    expect(browserB.cookie).toMatch(/^navet_openhab_session=[a-f0-9]{64}$/);
    expect(browserA.cookie).not.toBe(browserB.cookie);

    const metadataA = createRequest({
      uri: '/__navet_openhab__/session',
      cookie: browserA.cookie,
    });
    const metadataB = createRequest({
      uri: '/__navet_openhab__/session',
      cookie: browserB.cookie,
    });
    await store.handle(metadataA.request);
    await store.handle(metadataB.request);
    expect(JSON.parse(metadataA.result.body)).toEqual({
      authenticated: true,
      hassUrl: 'https://openhab-a.local/base',
    });
    expect(JSON.parse(metadataB.result.body)).toEqual({
      authenticated: true,
      hassUrl: 'http://192.168.1.22',
    });
    for (const metadata of [metadataA.result.body, metadataB.result.body]) {
      expect(metadata).not.toContain('username');
      expect(metadata).not.toContain('password');
      expect(metadata).not.toContain('openhab-secret-');
    }

    const proxy = createOpenHABProxy(store);
    const proxyRequestA = createRequest({
      cookie: browserA.cookie,
      requestUri: '/__navet_openhab_proxy__/rest/items?recursive=false',
    }).request;
    const proxyRequestB = createRequest({
      method: 'POST',
      cookie: browserB.cookie,
      requestUri: '/__navet_openhab_proxy__/rest/items/LivingRoomLamp',
      headers: { Origin: 'http://navet.example' },
    }).request;
    expect(proxy.upstream_url(proxyRequestA)).toBe(
      'https://openhab-a.local/base/rest/items?recursive=false'
    );
    expect(proxy.authorization_header(proxyRequestA)).toBe(
      `Basic ${Buffer.from('panel-a:openhab-secret-a').toString('base64')}`
    );
    expect(proxy.upstream_url(proxyRequestB)).toBe('http://192.168.1.22/rest/items/LivingRoomLamp');
    expect(proxy.authorization_header(proxyRequestB)).toBe(
      `Basic ${Buffer.from('panel-b:openhab-secret-b').toString('base64')}`
    );

    const unknownCookie = `navet_openhab_session=${'f'.repeat(64)}`;
    expect(proxy.authorization_header(createRequest({ cookie: unknownCookie }).request)).toBe('');
    expect(proxy.upstream_url(createRequest().request)).toBe('');

    const missingOriginSave = createRequest({
      method: 'PUT',
      uri: '/__navet_openhab__/session',
      body: JSON.stringify(OPENHAB_AUTH_A),
    });
    await store.handle(missingOriginSave.request);
    expect(missingOriginSave.result.status).toBe(403);

    const wrongCookieDelete = createRequest({
      method: 'DELETE',
      uri: '/__navet_openhab__/session',
      cookie: unknownCookie,
      headers: { Origin: 'http://navet.example' },
    });
    await store.handle(wrongCookieDelete.request);
    expect(wrongCookieDelete.result.status).toBe(401);

    const logoutB = createRequest({
      method: 'DELETE',
      uri: '/__navet_openhab__/session',
      cookie: browserB.cookie,
      headers: { Origin: 'http://navet.example' },
    });
    await store.handle(logoutB.request);
    expect(logoutB.result.status).toBe(200);
    expect(proxy.authorization_header(proxyRequestB)).toBe('');
    expect(proxy.authorization_header(proxyRequestA)).toBe(
      `Basic ${Buffer.from('panel-a:openhab-secret-a').toString('base64')}`
    );

    const metadataAAfterLogoutB = createRequest({
      uri: '/__navet_openhab__/session',
      cookie: browserA.cookie,
    });
    await store.handle(metadataAAfterLogoutB.request);
    expect(JSON.parse(metadataAAfterLogoutB.result.body)).toEqual({
      authenticated: true,
      hassUrl: 'https://openhab-a.local/base',
    });
  });

  it('caches openHAB sessions per request and invalidates them after storage mutations', () => {
    const paths = createProviderDirectory('openhab');
    const store = createOpenHABSessionStore({
      ...paths,
      fetch: vi.fn(),
    });
    const cookie = createProviderCookie('navet_openhab_session');
    const otherCookie = createProviderCookie('navet_openhab_session');
    const cookieId = cookie.split('=')[1] ?? '';
    seedProviderAuth(store, cookie, OPENHAB_AUTH_A, Date.now() - 25 * 60 * 60 * 1000);
    seedProviderAuth(store, otherCookie, OPENHAB_AUTH_B);
    const sessionPath = join(paths.sessionsDirectory, `${cookieId}.json`);
    const otherSessionPath = join(
      paths.sessionsDirectory,
      `${otherCookie.split('=')[1] ?? ''}.json`
    );
    const readFile = fs.readFileSync.bind(fs);
    let sessionReads = 0;
    vi.spyOn(fs, 'readFileSync').mockImplementation(((path, ...args) => {
      if (String(path) === sessionPath || String(path) === otherSessionPath) {
        sessionReads += 1;
      }
      return readFile(path, ...args);
    }) as typeof fs.readFileSync);

    const proxy = createOpenHABProxy(store);
    const request = createRequest({
      cookie,
      requestUri: '/__navet_openhab_proxy__/rest/items?recursive=false',
    }).request;
    expect(proxy.upstream_url(request)).toBe(
      'https://openhab-a.local/base/rest/items?recursive=false'
    );
    expect(store.touchSessionCookie(request)).toContain(cookie);
    expect(proxy.authorization_header(request)).toBe(
      `Basic ${Buffer.from('panel-a:openhab-secret-a').toString('base64')}`
    );
    expect(sessionReads).toBe(1);

    const otherRequest = createRequest({
      cookie: otherCookie,
      requestUri: '/__navet_openhab_proxy__/rest/items?recursive=false',
    }).request;
    expect(proxy.upstream_url(otherRequest)).toBe('http://192.168.1.22/rest/items?recursive=false');
    expect(proxy.authorization_header(otherRequest)).toBe(
      `Basic ${Buffer.from('panel-b:openhab-secret-b').toString('base64')}`
    );
    expect(sessionReads).toBe(2);
    expect(proxy.authorization_header(request)).toBe(
      `Basic ${Buffer.from('panel-a:openhab-secret-a').toString('base64')}`
    );
    expect(sessionReads).toBe(2);

    seedProviderAuth(store, cookie, OPENHAB_AUTH_B);
    expect(proxy.authorization_header(request)).toBe(
      `Basic ${Buffer.from('panel-b:openhab-secret-b').toString('base64')}`
    );
    expect(sessionReads).toBe(3);

    store.bindingStore.deleteSession(cookieId);
    expect(proxy.authorization_header(request)).toBe('');
    expect(sessionReads).toBe(3);
  });
});
