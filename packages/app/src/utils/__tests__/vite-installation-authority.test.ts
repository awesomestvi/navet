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
    openHABSessionsDirectory: join(directory, 'openhab-sessions'),
    statePath: join(directory, 'authority.json'),
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
    expect(warning).toHaveBeenCalledWith(expect.stringContaining(`#navet_pairing=${key}`));

    warning.mockClear();
    createViteInstallationAuthority({
      cacheDirectory: directory,
      keyPath,
    });
    expect(readFileSync(keyPath, 'utf8').trim()).toBe(key);
    expect(warning).not.toHaveBeenCalled();
    warning.mockRestore();
  });

  it('requires the exact key and persists only verified target authority', () => {
    const { authority, paths } = createFixture();

    expect(
      authority.authorizeOpenHAB(request(), 'http://openhab.local:8080', normalizeTarget).allowed
    ).toBe(false);
    const authorized = authority.authorizeOpenHAB(
      request(INSTALLATION_KEY),
      'http://openhab.local:8080',
      normalizeTarget
    );
    expect(authorized).toEqual({ allowed: true, pairingVerified: true });
    expect(
      authority.commitOpenHAB(
        'http://openhab.local:8080',
        normalizeTarget,
        authorized.pairingVerified
      )
    ).toBe(true);
    expect(readFileSync(paths.statePath, 'utf8')).not.toContain(INSTALLATION_KEY);
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

  it('does not scan legacy sessions after a target authority is enrolled', () => {
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
    ).toEqual({ allowed: false, pairingVerified: false });
  });

  it('rejects disjoint Homey evidence and never grows trust through overlap', () => {
    const disjoint = createFixture();
    writeSession(disjoint.paths.homeySessionsDirectory, 1, {
      homeys: [{ id: 'homey-a' }],
    });
    writeSession(disjoint.paths.homeySessionsDirectory, 2, {
      homeys: [{ id: 'homey-b' }],
    });
    expect(disjoint.authority.authorizeHomeyStart(request()).allowed).toBe(false);

    const chain = createFixture();
    writeSession(chain.paths.homeySessionsDirectory, 1, {
      homeys: [{ id: 'homey-a' }, { id: 'homey-b' }],
    });
    expect(chain.authority.commitHomey(['homey-b', 'homey-c'], false)).toBe(false);
    expect(chain.authority.commitHomey(['homey-c', 'homey-d'], false)).toBe(false);
    expect(chain.authority.commitHomey(['homey-a', 'homey-b'], false)).toBe(true);
    expect(chain.authority.commitHomey(['homey-b', 'homey-c'], false)).toBe(false);
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
