import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  appendHomeyOAuthCallbackMarker,
  appendHomeyOAuthFailureMarker,
  createViteHomeySessionStore,
  HOMEY_SESSION_COOKIE_NAME,
  type HomeySessionData,
  isConfirmedInvalidHomeyRefreshError,
  normalizeHomeyRefreshTokenPayload,
  type ViteStoredHomeySession,
} from '@scripts/vite-homey-session-store';
import {
  clearViteProviderSessionCookie,
  deleteViteProviderRequestSessions,
  findViteProviderRequestSession,
  getViteProviderRequestSession,
  rotateViteProviderRequestSession,
} from '@scripts/vite-provider-session-store';
import { describe, expect, it } from 'vitest';

const HOMEY_SESSION: HomeySessionData = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresAt: Date.now() + 60_000,
  userId: 'user-1',
  user: {
    id: 'user-1',
    name: 'Vishal',
    avatarUrl: 'https://images.example.com/vishal.png',
    email: 'vishal@example.com',
  },
  homeys: [
    {
      id: 'homey-1',
      name: 'Living Room Homey',
      localUrlSecure: 'https://homey.example.com',
    },
  ],
  selectedHomeyId: 'homey-1',
  homeyBaseUrl: 'https://homey.example.com',
  homeySessionToken: 'homey-session-token',
};

function createFixture() {
  const tempDir = mkdtempSync(join(tmpdir(), 'navet-homey-store-'));
  const sessionsDirectory = join(tempDir, 'sessions');
  const legacySessionPath = join(tempDir, 'navet-homey-session.json');
  return {
    legacySessionPath,
    sessionsDirectory,
    store: createViteHomeySessionStore({ legacySessionPath, sessionsDirectory }),
  };
}

function withAuth(
  record: ViteStoredHomeySession,
  auth: HomeySessionData,
  updatedAt = Date.now()
): ViteStoredHomeySession {
  return {
    ...record,
    updatedAt,
    auth,
  };
}

function withPending(
  record: ViteStoredHomeySession,
  state: string,
  updatedAt = Date.now()
): ViteStoredHomeySession {
  return {
    ...record,
    updatedAt,
    auth: null,
    pending: {
      expiresAt: Date.now() + 60_000,
      returnTo: '/dashboard',
      state,
    },
  };
}

function createRequest(cookie: string): IncomingMessage {
  return {
    headers: {
      cookie,
      host: 'navet.example',
    },
    socket: {},
  } as unknown as IncomingMessage;
}

function createResponse() {
  let setCookie: string | string[] | number | undefined;
  const response = {
    setHeader(name: string, value: string | string[] | number) {
      if (name.toLowerCase() === 'set-cookie') {
        setCookie = value;
      }
      return this;
    },
  } as unknown as ServerResponse;
  return {
    getSetCookie: () => setCookie,
    response,
  };
}

describe('vite Homey session store', () => {
  it('creates bounded OAuth redirects without callback secrets or external targets', () => {
    expect(
      appendHomeyOAuthFailureMarker(
        '/wall?view=home&homey_oauth_callback=1&homey_oauth_error=invalid_response&code=secret&state=secret&error_description=secret#lights',
        'access_denied'
      )
    ).toBe('/wall?view=home&homey_oauth_error=access_denied#lights');
    expect(
      appendHomeyOAuthCallbackMarker(
        '/wall?view=home&homey_oauth_error=temporarily_unavailable#lights'
      )
    ).toBe('/wall?view=home&homey_oauth_callback=1#lights');
    expect(
      appendHomeyOAuthFailureMarker('//attacker.example/steal', 'temporarily_unavailable')
    ).toBe('/?homey_oauth_error=temporarily_unavailable');
  });

  it('only classifies an explicit Homey invalid_grant as confirmed credential loss', () => {
    expect(isConfirmedInvalidHomeyRefreshError({ error: 'invalid_grant' })).toBe(true);
    expect(isConfirmedInvalidHomeyRefreshError({ error: 'invalid_client' })).toBe(false);
    expect(isConfirmedInvalidHomeyRefreshError(null)).toBe(false);
    expect(isConfirmedInvalidHomeyRefreshError('gateway authentication failed')).toBe(false);
  });

  it('rejects invalid Homey refresh expiries before constructing persisted auth', () => {
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
        normalizeHomeyRefreshTokenPayload(
          {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in,
          },
          HOMEY_SESSION.refreshToken
        )
      ).toBeNull();
    }

    expect(
      normalizeHomeyRefreshTokenPayload(
        {
          access_token: 'new-access-token',
          expires_in: '3600',
        },
        HOMEY_SESSION.refreshToken
      )
    ).toEqual({
      accessToken: 'new-access-token',
      expiresIn: 3600,
      refreshToken: HOMEY_SESSION.refreshToken,
    });
  });

  it('clears both current ingress and legacy root cookie paths', () => {
    const request = {
      headers: {
        host: 'navet.example',
        'x-forwarded-proto': 'https',
        'x-ingress-path': '/api/hassio_ingress/navet',
      },
      socket: {},
    } as unknown as IncomingMessage;
    let setCookie: string | string[] | number | undefined;
    const response = {
      setHeader(name: string, value: string | string[] | number) {
        if (name.toLowerCase() === 'set-cookie') {
          setCookie = value;
        }
        return this;
      },
    } as unknown as ServerResponse;

    clearViteProviderSessionCookie(request, response, 'navet_homey_session');

    expect(setCookie).toEqual([
      expect.stringContaining('Path=/api/hassio_ingress/navet;'),
      expect.stringContaining('Path=/;'),
    ]);
  });

  it('persists independent browser-bound sessions', () => {
    const { legacySessionPath, sessionsDirectory, store } = createFixture();
    const browserA = store.createSession();
    const browserB = store.createSession();
    const sessionB = { ...HOMEY_SESSION, accessToken: 'browser-b-token' };

    store.writeSession(browserA.cookieId, withAuth(browserA.session, HOMEY_SESSION));
    store.writeSession(browserB.cookieId, withAuth(browserB.session, sessionB));

    const restored = createViteHomeySessionStore({
      legacySessionPath,
      sessionsDirectory,
    });
    expect(restored.readSession(browserA.cookieId)?.auth).toEqual(HOMEY_SESSION);
    expect(restored.readSession(browserB.cookieId)?.auth).toEqual(sessionB);
    expect(
      JSON.parse(readFileSync(join(sessionsDirectory, `${browserA.cookieId}.json`), 'utf8'))
    ).toMatchObject({ auth: HOMEY_SESSION });

    const injectedCookie = `navet_homey_session=${'f'.repeat(64)}`;
    for (const cookie of [
      `${injectedCookie}; navet_homey_session=${browserA.cookieId}`,
      `navet_homey_session=${browserA.cookieId}; ${injectedCookie}`,
    ]) {
      const request = {
        headers: { cookie },
      } as IncomingMessage;
      expect(
        getViteProviderRequestSession(request, 'navet_homey_session', restored)?.session.auth
      ).toEqual(HOMEY_SESSION);
    }
  });

  it('selects one canonical duplicate cookie independent of browser cookie order', () => {
    const { store } = createFixture();
    const now = Date.now();
    const newestPending = store.createSession();
    const olderAuthenticated = store.createSession();
    const newestAuthenticated = store.createSession();
    const pendingState = 'a'.repeat(64);

    store.writeSession(
      newestPending.cookieId,
      withPending(newestPending.session, pendingState, now)
    );
    store.writeSession(
      olderAuthenticated.cookieId,
      withAuth(
        olderAuthenticated.session,
        { ...HOMEY_SESSION, accessToken: 'older-auth-token' },
        now - 2_000
      )
    );
    store.writeSession(
      newestAuthenticated.cookieId,
      withAuth(
        newestAuthenticated.session,
        { ...HOMEY_SESSION, accessToken: 'newest-auth-token' },
        now - 1_000
      )
    );

    const cookieIds = [
      newestPending.cookieId,
      olderAuthenticated.cookieId,
      newestAuthenticated.cookieId,
    ];
    for (const order of [cookieIds, [...cookieIds].reverse()]) {
      const context = getViteProviderRequestSession(
        createRequest(
          order.map((cookieId) => `${HOMEY_SESSION_COOKIE_NAME}=${cookieId}`).join('; ')
        ),
        HOMEY_SESSION_COOKIE_NAME,
        store
      );
      expect(context?.cookieId).toBe(newestAuthenticated.cookieId);
      expect(context?.session.auth?.accessToken).toBe('newest-auth-token');
    }
  });

  it('matches a Homey OAuth callback state across every valid duplicate cookie', () => {
    const { store } = createFixture();
    const authenticated = store.createSession();
    const pending = store.createSession();
    const targetState = 'b'.repeat(64);

    store.writeSession(authenticated.cookieId, withAuth(authenticated.session, HOMEY_SESSION));
    store.writeSession(pending.cookieId, withPending(pending.session, targetState));

    const cookieIds = [authenticated.cookieId, pending.cookieId];
    for (const order of [cookieIds, [...cookieIds].reverse()]) {
      const context = findViteProviderRequestSession(
        createRequest(
          order.map((cookieId) => `${HOMEY_SESSION_COOKIE_NAME}=${cookieId}`).join('; ')
        ),
        HOMEY_SESSION_COOKIE_NAME,
        store,
        ({ session }) => session.pending?.state === targetState
      );
      expect(context?.cookieId).toBe(pending.cookieId);
    }
  });

  it('rotates duplicate cookies only after durable replacement and preserves unrelated browsers', () => {
    const { store } = createFixture();
    const callbackSession = store.createSession();
    const staleSession = store.createSession();
    const unrelatedSession = store.createSession();
    const targetState = 'c'.repeat(64);
    const staleAuth = { ...HOMEY_SESSION, accessToken: 'stale-token' };
    const unrelatedAuth = { ...HOMEY_SESSION, accessToken: 'unrelated-token' };

    store.writeSession(callbackSession.cookieId, withPending(callbackSession.session, targetState));
    store.writeSession(staleSession.cookieId, withAuth(staleSession.session, staleAuth));
    store.writeSession(
      unrelatedSession.cookieId,
      withAuth(unrelatedSession.session, unrelatedAuth)
    );

    const request = createRequest(
      [
        `${HOMEY_SESSION_COOKIE_NAME}=${staleSession.cookieId}`,
        `${HOMEY_SESSION_COOKIE_NAME}=${callbackSession.cookieId}`,
      ].join('; ')
    );
    const { getSetCookie, response } = createResponse();
    const replacement = withAuth(callbackSession.session, {
      ...HOMEY_SESSION,
      accessToken: 'rotated-token',
    });
    const rotated = rotateViteProviderRequestSession(
      request,
      response,
      HOMEY_SESSION_COOKIE_NAME,
      store,
      callbackSession.cookieId,
      replacement
    );

    expect(store.readSession(callbackSession.cookieId)).toBeNull();
    expect(store.readSession(staleSession.cookieId)).toBeNull();
    expect(store.readSession(rotated.cookieId)?.auth?.accessToken).toBe('rotated-token');
    expect(store.readSession(unrelatedSession.cookieId)?.auth).toEqual(unrelatedAuth);
    expect(getSetCookie()).toEqual(
      expect.stringContaining(`${HOMEY_SESSION_COOKIE_NAME}=${rotated.cookieId}`)
    );
  });

  it('preserves every existing record when duplicate-cookie rotation cannot persist', () => {
    const { store } = createFixture();
    const callbackSession = store.createSession();
    const staleSession = store.createSession();
    const unrelatedSession = store.createSession();
    const callbackAuth = { ...HOMEY_SESSION, accessToken: 'callback-token' };
    const staleAuth = { ...HOMEY_SESSION, accessToken: 'stale-token' };
    const unrelatedAuth = { ...HOMEY_SESSION, accessToken: 'unrelated-token' };

    store.writeSession(callbackSession.cookieId, withAuth(callbackSession.session, callbackAuth));
    store.writeSession(staleSession.cookieId, withAuth(staleSession.session, staleAuth));
    store.writeSession(
      unrelatedSession.cookieId,
      withAuth(unrelatedSession.session, unrelatedAuth)
    );

    const request = createRequest(
      [
        `${HOMEY_SESSION_COOKIE_NAME}=${callbackSession.cookieId}`,
        `${HOMEY_SESSION_COOKIE_NAME}=${staleSession.cookieId}`,
      ].join('; ')
    );
    const { getSetCookie, response } = createResponse();
    let failure: unknown;
    try {
      rotateViteProviderRequestSession(
        request,
        response,
        HOMEY_SESSION_COOKIE_NAME,
        store,
        callbackSession.cookieId,
        withAuth(callbackSession.session, {
          ...HOMEY_SESSION,
          accessToken: 'x'.repeat(33 * 1024),
        })
      );
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({
      code: 'credential-session-record-too-large',
      statusCode: 507,
    });
    expect(store.readSession(callbackSession.cookieId)?.auth).toEqual(callbackAuth);
    expect(store.readSession(staleSession.cookieId)?.auth).toEqual(staleAuth);
    expect(store.readSession(unrelatedSession.cookieId)?.auth).toEqual(unrelatedAuth);
    expect(getSetCookie()).toBeUndefined();
  });

  it('deletes every presented duplicate on logout without affecting another browser', () => {
    const { store } = createFixture();
    const browserA = store.createSession();
    const browserB = store.createSession();
    const unrelatedBrowser = store.createSession();
    const unrelatedAuth = { ...HOMEY_SESSION, accessToken: 'unrelated-token' };

    store.writeSession(browserA.cookieId, withAuth(browserA.session, HOMEY_SESSION));
    store.writeSession(
      browserB.cookieId,
      withAuth(browserB.session, { ...HOMEY_SESSION, accessToken: 'browser-b-token' })
    );
    store.writeSession(
      unrelatedBrowser.cookieId,
      withAuth(unrelatedBrowser.session, unrelatedAuth)
    );

    deleteViteProviderRequestSessions(
      createRequest(
        [
          `${HOMEY_SESSION_COOKIE_NAME}=${browserA.cookieId}`,
          `${HOMEY_SESSION_COOKIE_NAME}=${browserB.cookieId}`,
        ].join('; ')
      ),
      HOMEY_SESSION_COOKIE_NAME,
      store
    );

    expect(store.readSession(browserA.cookieId)).toBeNull();
    expect(store.readSession(browserB.cookieId)).toBeNull();
    expect(store.readSession(unrelatedBrowser.cookieId)?.auth).toEqual(unrelatedAuth);
  });

  it('preserves valid auth when a replacement record is invalid or oversized', () => {
    const { store } = createFixture();
    const browser = store.createSession();
    store.writeSession(browser.cookieId, withAuth(browser.session, HOMEY_SESSION));
    const current = store.readSession(browser.cookieId);
    expect(current?.auth).toEqual(HOMEY_SESSION);
    if (!current) {
      throw new Error('Expected the seeded Homey record');
    }

    expect(() =>
      store.writeSession(
        browser.cookieId,
        withAuth(current, {
          ...HOMEY_SESSION,
          expiresAt: Number.NaN,
        })
      )
    ).toThrow('Invalid provider session');

    let failure: unknown;
    try {
      store.writeSession(
        browser.cookieId,
        withAuth(current, {
          ...HOMEY_SESSION,
          accessToken: 'x'.repeat(33 * 1024),
        })
      );
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({
      code: 'credential-session-record-too-large',
      statusCode: 507,
    });
    expect(store.readSession(browser.cookieId)?.auth).toEqual(HOMEY_SESSION);
  });

  it('throws a typed capacity error when authenticated sessions fill the store', () => {
    const { sessionsDirectory, store } = createFixture();
    mkdirSync(sessionsDirectory, { recursive: true });
    const now = Date.now();
    for (let index = 1; index <= 128; index += 1) {
      writeFileSync(
        join(sessionsDirectory, `${index.toString(16).padStart(64, '0')}.json`),
        JSON.stringify({
          version: 1,
          createdAt: now,
          updatedAt: now,
          auth: HOMEY_SESSION,
          pending: null,
        }),
        'utf8'
      );
    }

    let failure: unknown;
    try {
      store.createSession();
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({
      code: 'credential-session-capacity-reached',
      statusCode: 507,
    });
  });

  it('ignores malformed browser records and discards the legacy global credential file', () => {
    const { legacySessionPath, sessionsDirectory, store } = createFixture();
    const browser = store.createSession();
    writeFileSync(
      join(sessionsDirectory, `${browser.cookieId}.json`),
      JSON.stringify({ homeys: [] }),
      'utf8'
    );
    writeFileSync(legacySessionPath, JSON.stringify(HOMEY_SESSION), 'utf8');

    expect(store.readSession(browser.cookieId)).toBeNull();
    expect(existsSync(legacySessionPath)).toBe(false);
  });
});
