import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createViteOpenHABSessionStore,
  normalizeOpenHABBaseUrl,
  OPENHAB_SESSION_COOKIE_NAME,
  type OpenHABSessionData,
  type ViteStoredOpenHABSession,
} from '@scripts/vite-openhab-session-store';
import {
  deleteViteProviderRequestSessions,
  rotateViteProviderRequestSession,
} from '@scripts/vite-provider-session-store';
import { describe, expect, it } from 'vitest';

const OPENHAB_SESSION: OpenHABSessionData = {
  hassUrl: 'https://openhab.local/base',
  username: 'navet',
  password: 'browser-a-secret',
};

function createFixture() {
  const tempDir = mkdtempSync(join(tmpdir(), 'navet-openhab-store-'));
  const sessionsDirectory = join(tempDir, 'sessions');
  const legacySessionPath = join(tempDir, 'navet-openhab-session.json');
  return {
    legacySessionPath,
    sessionsDirectory,
    store: createViteOpenHABSessionStore({ legacySessionPath, sessionsDirectory }),
  };
}

function withAuth(
  record: ViteStoredOpenHABSession,
  auth: OpenHABSessionData,
  updatedAt = Date.now()
): ViteStoredOpenHABSession {
  return {
    ...record,
    updatedAt,
    auth,
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

describe('vite openHAB session store', () => {
  it('matches production target canonicalization and SSRF boundaries', () => {
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

  it('keeps credentials isolated between browser-bound records', () => {
    const { store } = createFixture();
    const browserA = store.createSession();
    const browserB = store.createSession();
    const sessionB = {
      ...OPENHAB_SESSION,
      hassUrl: 'http://192.168.1.22',
      password: 'browser-b-secret',
    };

    store.writeSession(browserA.cookieId, withAuth(browserA.session, OPENHAB_SESSION));
    store.writeSession(browserB.cookieId, withAuth(browserB.session, sessionB));

    expect(store.readSession(browserA.cookieId)?.auth).toEqual(OPENHAB_SESSION);
    expect(store.readSession(browserB.cookieId)?.auth).toEqual(sessionB);
  });

  it('rotates every presented duplicate while preserving an unrelated browser', () => {
    const { store } = createFixture();
    const currentSession = store.createSession();
    const staleSession = store.createSession();
    const unrelatedSession = store.createSession();
    const staleAuth = { ...OPENHAB_SESSION, password: 'stale-secret' };
    const unrelatedAuth = { ...OPENHAB_SESSION, password: 'unrelated-secret' };

    store.writeSession(currentSession.cookieId, withAuth(currentSession.session, OPENHAB_SESSION));
    store.writeSession(staleSession.cookieId, withAuth(staleSession.session, staleAuth));
    store.writeSession(
      unrelatedSession.cookieId,
      withAuth(unrelatedSession.session, unrelatedAuth)
    );

    const { getSetCookie, response } = createResponse();
    const rotated = rotateViteProviderRequestSession(
      createRequest(
        [
          `${OPENHAB_SESSION_COOKIE_NAME}=${staleSession.cookieId}`,
          `${OPENHAB_SESSION_COOKIE_NAME}=${currentSession.cookieId}`,
        ].join('; ')
      ),
      response,
      OPENHAB_SESSION_COOKIE_NAME,
      store,
      currentSession.cookieId,
      withAuth(currentSession.session, {
        ...OPENHAB_SESSION,
        password: 'rotated-secret',
      })
    );

    expect(store.readSession(currentSession.cookieId)).toBeNull();
    expect(store.readSession(staleSession.cookieId)).toBeNull();
    expect(store.readSession(rotated.cookieId)?.auth?.password).toBe('rotated-secret');
    expect(store.readSession(unrelatedSession.cookieId)?.auth).toEqual(unrelatedAuth);
    expect(getSetCookie()).toEqual(
      expect.stringContaining(`${OPENHAB_SESSION_COOKIE_NAME}=${rotated.cookieId}`)
    );
  });

  it('deletes presented duplicate records on logout and preserves an unrelated browser', () => {
    const { store } = createFixture();
    const browserA = store.createSession();
    const browserB = store.createSession();
    const unrelatedBrowser = store.createSession();
    const unrelatedAuth = { ...OPENHAB_SESSION, password: 'unrelated-secret' };

    store.writeSession(browserA.cookieId, withAuth(browserA.session, OPENHAB_SESSION));
    store.writeSession(
      browserB.cookieId,
      withAuth(browserB.session, { ...OPENHAB_SESSION, password: 'browser-b-secret' })
    );
    store.writeSession(
      unrelatedBrowser.cookieId,
      withAuth(unrelatedBrowser.session, unrelatedAuth)
    );

    deleteViteProviderRequestSessions(
      createRequest(
        [
          `${OPENHAB_SESSION_COOKIE_NAME}=${browserA.cookieId}`,
          `${OPENHAB_SESSION_COOKIE_NAME}=${browserB.cookieId}`,
        ].join('; ')
      ),
      OPENHAB_SESSION_COOKIE_NAME,
      store
    );

    expect(store.readSession(browserA.cookieId)).toBeNull();
    expect(store.readSession(browserB.cookieId)).toBeNull();
    expect(store.readSession(unrelatedBrowser.cookieId)?.auth).toEqual(unrelatedAuth);
  });

  it('rejects an oversized wrapped record before replacing valid auth', () => {
    const { store } = createFixture();
    const browser = store.createSession();
    store.writeSession(browser.cookieId, withAuth(browser.session, OPENHAB_SESSION));
    const current = store.readSession(browser.cookieId);
    expect(current?.auth).toEqual(OPENHAB_SESSION);
    if (!current) {
      throw new Error('Expected the seeded openHAB record');
    }

    let failure: unknown;
    try {
      store.writeSession(
        browser.cookieId,
        withAuth(current, {
          ...OPENHAB_SESSION,
          password: 'x'.repeat(17 * 1024),
        })
      );
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({
      code: 'credential-session-record-too-large',
      statusCode: 507,
    });
    expect(store.readSession(browser.cookieId)?.auth).toEqual(OPENHAB_SESSION);
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
          auth: OPENHAB_SESSION,
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

  it('does not migrate the legacy global credential file', () => {
    const { legacySessionPath, store } = createFixture();
    writeFileSync(legacySessionPath, JSON.stringify(OPENHAB_SESSION), 'utf8');

    store.createSession();

    expect(existsSync(legacySessionPath)).toBe(false);
  });
});
