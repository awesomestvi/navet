import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error Docker njs runtime modules are JavaScript and have no TypeScript declaration.
import installationAuthorityModule from '@docker/njs/installation-authority.js';
import { describe, expect, it } from 'vitest';

const { createInstallationAuthority } = installationAuthorityModule;
const INSTALLATION_KEY = 'a'.repeat(64);
const PAIRING_HEADER = 'X-Navet-Installation-Key';

function normalizeTarget(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return '';
  }
}

function createFixture(options?: { config?: { hassUrl?: string; openhabUrl?: string } }) {
  const directory = mkdtempSync(join(tmpdir(), 'navet-installation-authority-njs-'));
  const paths = {
    authSessionsDirectory: join(directory, 'auth-sessions'),
    homeySessionsDirectory: join(directory, 'homey-sessions'),
    openHABSessionsDirectory: join(directory, 'openhab-sessions'),
    statePath: join(directory, 'authority.json'),
  };
  return {
    directory,
    paths,
    authority: createInstallationAuthority({
      ...paths,
      config: options?.config ?? {},
      installationKey: INSTALLATION_KEY,
    }),
  };
}

function request(key?: string) {
  return {
    headersIn: key ? { [PAIRING_HEADER]: key } : {},
  };
}

function writeSession(directory: string, index: number, auth: Record<string, unknown>) {
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    join(directory, `${index.toString(16).padStart(64, '0')}.json`),
    JSON.stringify({
      auth,
      updatedAt: Date.now(),
    }),
    'utf8'
  );
}

describe('production njs installation authority', () => {
  it('requires the exact pairing key for an unknown target and never persists the key', () => {
    const { authority, paths } = createFixture();

    expect(
      authority.authorizeHomeAssistant(request(), 'https://ha.example.com', normalizeTarget)
    ).toEqual({ allowed: false, pairingVerified: false });
    expect(
      authority.authorizeHomeAssistant(
        request('b'.repeat(64)),
        'https://ha.example.com',
        normalizeTarget
      )
    ).toEqual({ allowed: false, pairingVerified: false });

    const authorized = authority.authorizeHomeAssistant(
      request(INSTALLATION_KEY),
      'https://ha.example.com',
      normalizeTarget
    );
    expect(authorized).toEqual({ allowed: true, pairingVerified: true });
    expect(
      authority.commitHomeAssistant(
        'https://ha.example.com',
        normalizeTarget,
        authorized.pairingVerified
      )
    ).toBe(true);

    const state = readFileSync(paths.statePath, 'utf8');
    expect(JSON.parse(state)).toMatchObject({
      homeAssistantTarget: 'https://ha.example.com',
    });
    expect(state).not.toContain(INSTALLATION_KEY);
    expect(
      authority.authorizeHomeAssistant(request(), 'https://ha.example.com', normalizeTarget)
    ).toEqual({ allowed: true, pairingVerified: false });
  });

  it('lets an exact operator pin replace stale authority only after verification', () => {
    const { authority, paths } = createFixture({
      config: { hassUrl: 'https://ha-b.example.com' },
    });
    writeFileSync(
      paths.statePath,
      JSON.stringify({
        version: 1,
        homeAssistantTarget: 'https://ha-a.example.com',
        openHABTarget: null,
        homeyIds: [],
      }),
      'utf8'
    );

    expect(
      authority.authorizeHomeAssistant(request(), 'https://ha-a.example.com', normalizeTarget)
    ).toEqual({
      allowed: true,
      pairingVerified: false,
      upstreamTarget: 'https://ha-b.example.com',
    });
    const pinned = authority.authorizeHomeAssistant(
      request(),
      'https://ha-b.example.com',
      normalizeTarget
    );
    expect(pinned).toEqual({ allowed: true, pairingVerified: false });
    expect(authority.commitHomeAssistant('https://ha-b.example.com', normalizeTarget, false)).toBe(
      true
    );
    expect(JSON.parse(readFileSync(paths.statePath, 'utf8'))).toMatchObject({
      homeAssistantTarget: 'https://ha-b.example.com',
    });
  });

  it('uses enrolled authority as the upstream for an alternate browser route', () => {
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
      upstreamTarget: 'https://ha-a.example.com',
    });
  });

  it('still requires pairing to replace enrolled authority', () => {
    const { authority, paths } = createFixture();
    const first = authority.authorizeHomeAssistant(
      request(INSTALLATION_KEY),
      'https://ha-a.example.com',
      normalizeTarget
    );
    expect(
      authority.commitHomeAssistant(
        'https://ha-a.example.com',
        normalizeTarget,
        first.pairingVerified
      )
    ).toBe(true);

    const replacement = authority.authorizeHomeAssistant(
      request(INSTALLATION_KEY),
      'https://ha-b.example.com',
      normalizeTarget
    );
    expect(replacement).toEqual({ allowed: true, pairingVerified: true });
    expect(
      authority.commitHomeAssistant(
        'https://ha-b.example.com',
        normalizeTarget,
        replacement.pairingVerified
      )
    ).toBe(true);
    expect(JSON.parse(readFileSync(paths.statePath, 'utf8'))).toMatchObject({
      homeAssistantTarget: 'https://ha-b.example.com',
    });
  });

  it('does not treat alternate openHAB URLs as browser-only routes', () => {
    const { authority } = createFixture({
      config: { openhabUrl: 'http://openhab.local:8080' },
    });

    expect(
      authority.authorizeOpenHAB(request(), 'http://100.64.0.10:8080', normalizeTarget)
    ).toEqual({ allowed: false, pairingVerified: false });
  });

  it('rejects disjoint legacy Homey evidence and prevents overlap chains from expanding trust', () => {
    const disjoint = createFixture();
    writeSession(disjoint.paths.homeySessionsDirectory, 1, {
      homeys: [{ id: 'homey-a' }],
    });
    writeSession(disjoint.paths.homeySessionsDirectory, 2, {
      homeys: [{ id: 'homey-b' }],
    });
    expect(disjoint.authority.authorizeHomeyStart(request())).toEqual({
      allowed: false,
      pairingVerified: false,
    });

    const chain = createFixture();
    writeSession(chain.paths.homeySessionsDirectory, 1, {
      homeys: [{ id: 'homey-a' }, { id: 'homey-b' }],
    });
    expect(chain.authority.authorizeHomeyStart(request()).allowed).toBe(true);
    expect(chain.authority.commitHomey(['homey-b', 'homey-c'], false)).toBe(false);
    expect(chain.authority.commitHomey(['homey-c', 'homey-d'], false)).toBe(false);
    expect(chain.authority.commitHomey(['homey-a', 'homey-b'], false)).toBe(true);
    expect(chain.authority.commitHomey(['homey-b', 'homey-c'], false)).toBe(false);
    expect(JSON.parse(readFileSync(chain.paths.statePath, 'utf8'))).toMatchObject({
      homeyIds: ['homey-a', 'homey-b'],
    });
  });

  it('uses only the common IDs from multiple consistent legacy Homey records', () => {
    const { authority, paths } = createFixture();
    writeSession(paths.homeySessionsDirectory, 1, {
      homeys: [{ id: 'homey-a' }, { id: 'homey-b' }],
    });
    writeSession(paths.homeySessionsDirectory, 2, {
      homeys: [{ id: 'homey-b' }, { id: 'homey-c' }],
    });

    expect(authority.authorizeHomeyStart(request()).allowed).toBe(true);
    expect(authority.commitHomey(['homey-b'], false)).toBe(true);
    expect(authority.commitHomey(['homey-b', 'homey-c'], false)).toBe(false);
    expect(JSON.parse(readFileSync(paths.statePath, 'utf8'))).toMatchObject({
      homeyIds: ['homey-b'],
    });
  });
});
