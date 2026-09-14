import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import type { IncomingMessage } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createViteInstallationAuthority,
  INSTALLATION_KEY_HEADER,
} from '@scripts/vite-installation-authority';
import { describe, expect, it, vi } from 'vitest';

const INSTALLATION_KEY = 'a'.repeat(64);

function request(key?: string) {
  return {
    headers: key ? { [INSTALLATION_KEY_HEADER.toLowerCase()]: key } : {},
  } as IncomingMessage;
}

function normalizeTarget(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }
  try {
    const parsed = new URL(value);
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return '';
  }
}

function createFixture(options?: { hassUrlPin?: string; openhabUrlPin?: string }) {
  const directory = mkdtempSync(join(tmpdir(), 'navet-installation-authority-vite-'));
  const paths = {
    authSessionsDirectory: join(directory, 'auth-sessions'),
    homeySessionsDirectory: join(directory, 'homey-sessions'),
    keyPath: join(directory, 'installation-key'),
    openHABSessionsDirectory: join(directory, 'openhab-sessions'),
    statePath: join(directory, 'authority.json'),
    setupCodePath: join(directory, 'setup-code.json'),
  };
  return {
    directory,
    paths,
    authority: createViteInstallationAuthority({
      ...paths,
      ...options,
      installationKey: INSTALLATION_KEY,
    }),
  };
}

function writeSession(directory: string, index: number, auth: Record<string, unknown>) {
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    join(directory, `${index.toString(16).padStart(64, '0')}.json`),
    JSON.stringify({ auth, updatedAt: Date.now() }),
    'utf8'
  );
}

describe('Vite installation authority', () => {
  it('generates one persisted high-entropy operator key when none is configured', () => {
    const directory = mkdtempSync(join(tmpdir(), 'navet-installation-key-vite-'));
    const keyPath = join(directory, 'installation-key');
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    createViteInstallationAuthority({
      cacheDirectory: directory,
      keyPath,
    });
    const key = readFileSync(keyPath, 'utf8').trim();
    expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(warning).not.toHaveBeenCalledWith(expect.stringContaining(key));
    expect(warning).toHaveBeenCalledWith('Navet installation security initialized.');

    warning.mockClear();
    createViteInstallationAuthority({
      cacheDirectory: directory,
      keyPath,
    });
    expect(readFileSync(keyPath, 'utf8').trim()).toBe(key);
    expect(warning).not.toHaveBeenCalled();
    warning.mockRestore();
  });

  it('persists a configured key once and rejects later key rotation', () => {
    const directory = mkdtempSync(join(tmpdir(), 'navet-configured-installation-key-vite-'));
    const keyPath = join(directory, 'installation-key');
    createViteInstallationAuthority({
      cacheDirectory: directory,
      installationKey: INSTALLATION_KEY,
      keyPath,
    });
    expect(readFileSync(keyPath, 'utf8').trim()).toBe(INSTALLATION_KEY);

    expect(() =>
      createViteInstallationAuthority({
        cacheDirectory: directory,
        installationKey: INSTALLATION_KEY,
        keyPath,
      })
    ).not.toThrow();
    expect(() =>
      createViteInstallationAuthority({
        cacheDirectory: directory,
        installationKey: 'b'.repeat(64),
        keyPath,
      })
    ).toThrow('does not match the persisted Navet installation key');
    expect(readFileSync(keyPath, 'utf8').trim()).toBe(INSTALLATION_KEY);
  });

  it('exchanges a temporary setup code once for a browser setup grant', () => {
    const { authority, paths } = createFixture();
    const record = { code: '1234-5678-9abc-def0', expiresAt: Date.now() + 60_000 };
    writeFileSync(paths.setupCodePath, JSON.stringify(record));
    const exchange = authority.exchangeSetupCode?.(request(), record.code);

    expect(exchange?.approved).toBe(true);
    expect(exchange?.setCookie).toContain('HttpOnly');
    expect(authority.exchangeSetupCode?.(request(), record.code).approved).toBe(false);

    const cookie = exchange?.setCookie?.split(';')[0] ?? '';
    const grantedRequest = { headers: { cookie } } as IncomingMessage;
    expect(authority.getProviderSetupStatus?.(grantedRequest, 'home_assistant')).toEqual({
      state: 'ready',
      authorization: 'none',
    });
  });

  it('allows openHAB enrollment without a setup code and records successful connections', () => {
    const { authority, paths } = createFixture();
    expect(
      authority.authorizeOpenHAB(request(), 'http://openhab.local:8080', normalizeTarget)
    ).toEqual({ allowed: true, pairingVerified: false });
    expect(authority.commitOpenHAB('http://openhab.local:8080', normalizeTarget, false)).toBe(true);
    expect(readFileSync(paths.statePath, 'utf8')).not.toContain(INSTALLATION_KEY);
    expect(authority.authorizeOpenHAB(request(), 'invalid', normalizeTarget).allowed).toBe(false);
  });

  it('lets an exact configured pin replace stale authority after verification', () => {
    const { authority, paths } = createFixture({
      openhabUrlPin: 'http://openhab-b.local:8080',
    });
    writeFileSync(
      paths.statePath,
      JSON.stringify({
        version: 1,
        homeAssistantTarget: null,
        openHABTarget: 'http://openhab-a.local:8080',
        homeyIds: [],
      }),
      'utf8'
    );

    const pinned = authority.authorizeOpenHAB(
      request(),
      'http://openhab-b.local:8080',
      normalizeTarget
    );
    expect(pinned).toEqual({ allowed: true, pairingVerified: false });
    expect(authority.commitOpenHAB('http://openhab-b.local:8080', normalizeTarget, false)).toBe(
      true
    );
    expect(JSON.parse(readFileSync(paths.statePath, 'utf8'))).toMatchObject({
      openHABTarget: 'http://openhab-b.local:8080',
    });
  });

  it('uses the entered Home Assistant route instead of silently substituting a remembered target', () => {
    const { authority, paths } = createFixture();
    const authorized = authority.authorizeHomeAssistant(
      request(INSTALLATION_KEY),
      'https://ha-a.example.com',
      normalizeTarget
    );
    expect(
      authority.commitHomeAssistant(
        'https://ha-a.example.com',
        normalizeTarget,
        authorized.pairingVerified
      )
    ).toBe(true);
    writeFileSync(paths.authSessionsDirectory, 'not a session directory', 'utf8');

    expect(
      authority.authorizeHomeAssistant(request(), 'https://ha-b.example.com', normalizeTarget)
    ).toEqual({
      allowed: true,
      pairingVerified: false,
    });
  });

  it('does not treat an alternate browser route as an exact provider pin', () => {
    const { authority } = createFixture({
      hassUrlPin: 'http://homeassistant.local:8123',
      openhabUrlPin: 'http://openhab.local:8080',
    });

    expect(
      authority.authorizeHomeAssistant(request(), 'http://100.77.118.32:8123', normalizeTarget)
    ).toEqual({
      allowed: true,
      pairingVerified: false,
      upstreamTarget: 'http://homeassistant.local:8123',
    });
    expect(
      authority.authorizeOpenHAB(request(), 'http://100.64.0.10:8080', normalizeTarget)
    ).toEqual({ allowed: false, pairingVerified: false });
    expect(
      authority.authorizeHomeAssistantChange?.(
        request(),
        'http://100.77.118.32:8123',
        normalizeTarget
      )
    ).toEqual({ allowed: false, pairingVerified: false });
  });

  it('allows every implemented provider to connect without setup approval', () => {
    const { authority } = createFixture();
    for (const id of ['home_assistant', 'homey', 'openhab']) {
      expect(authority.getProviderSetupStatus?.(request(), id)).toEqual({
        state: 'ready',
        authorization: 'none',
      });
    }
    expect(
      authority.authorizeHomeAssistantChange?.(
        request(),
        'https://demo-ha.example.com',
        normalizeTarget
      )
    ).toEqual({ allowed: true, pairingVerified: false });
  });

  it('accepts Homeys verified by OAuth without a separate enrollment grant', () => {
    const { authority } = createFixture();
    expect(authority.authorizeHomeyStart(request()).allowed).toBe(true);
    expect(authority.commitHomey(['homey-a'], false)).toBe(true);
    expect(authority.commitHomey(['homey-b'], false)).toBe(true);
    expect(authority.commitHomey([], false)).toBe(false);
  });

  it('ignores corrupt session records without weakening valid migration evidence', () => {
    const { authority, paths } = createFixture();
    mkdirSync(paths.authSessionsDirectory, { recursive: true });
    writeFileSync(join(paths.authSessionsDirectory, `${'f'.repeat(64)}.json`), '{"auth":', 'utf8');
    writeSession(paths.authSessionsDirectory, 1, {
      hassUrl: 'https://ha.example.com',
    });

    expect(
      authority.authorizeHomeAssistant(request(), 'https://ha.example.com', normalizeTarget)
    ).toEqual({ allowed: true, pairingVerified: false });
  });
});
