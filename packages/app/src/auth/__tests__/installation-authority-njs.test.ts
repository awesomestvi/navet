import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error Docker njs runtime modules are JavaScript and have no TypeScript declaration.
import installationAuthorityModule from '@docker/njs/installation-authority.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
    setupCodePath: join(directory, 'setup-code.json'),
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

function request(key?: string, serverPort?: string) {
  return {
    headersIn: key ? { [PAIRING_HEADER]: key } : {},
    variables: serverPort ? { server_port: serverPort } : {},
  };
}

describe('production njs installation authority', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses one setup policy for every implemented provider', () => {
    const { authority } = createFixture();
    expect(authority.getProviderSetupStatus(request(), 'home_assistant').state).toBe('ready');
    expect(authority.getProviderSetupStatus(request(), 'homey').state).toBe('ready');
    expect(authority.getProviderSetupStatus(request(), 'openhab').state).toBe('ready');

    for (const providerId of ['home_assistant', 'homey', 'openhab']) {
      expect(authority.getProviderSetupStatus(request(INSTALLATION_KEY), providerId)).toEqual({
        state: 'ready',
        authorization: 'none',
      });
    }
  });

  it('exchanges a temporary setup code once for an HttpOnly setup grant', () => {
    const { authority, paths } = createFixture();
    const code = '1234-5678-9abc-def0';
    writeFileSync(
      paths.setupCodePath,
      JSON.stringify({ version: 1, code, expiresAt: Date.now() + 60_000 }),
      'utf8'
    );

    const exchange = authority.exchangeSetupCode(request(), code);
    expect(exchange.approved).toBe(true);
    expect(exchange.setCookie).toContain('HttpOnly');
    expect(authority.exchangeSetupCode(request(), code).approved).toBe(false);
    const cookie = exchange.setCookie.split(';')[0];
    expect(
      authority.getProviderSetupStatus({ headersIn: { Cookie: cookie } }, 'home_assistant')
    ).toEqual({ state: 'ready', authorization: 'none' });
  });

  it('trusts add-on identity only on the dedicated Ingress listener', () => {
    vi.stubEnv('NAVET_TRUST_HOME_ASSISTANT_INGRESS', 'true');
    vi.stubEnv('NAVET_HOME_ASSISTANT_INGRESS_PORT', '8099');
    const { authority } = createFixture({
      config: { hassUrl: 'https://ha.example.com' },
    });

    expect(
      authority.authorizeHomeAssistant(
        request(undefined, '8099'),
        'https://different-ha.example.com',
        normalizeTarget
      )
    ).toEqual({ allowed: true, pairingVerified: false });
    expect(
      authority.authorizeHomeAssistant(
        request(undefined, '8080'),
        'https://different-ha.example.com',
        normalizeTarget
      )
    ).toEqual({
      allowed: true,
      pairingVerified: false,
      upstreamTarget: 'https://ha.example.com',
    });
  });

  it('allows fresh Home Assistant enrollment without a setup code', () => {
    const { authority, paths } = createFixture();
    expect(
      authority.authorizeHomeAssistant(request(), 'https://ha.example.com', normalizeTarget)
    ).toEqual({ allowed: true, pairingVerified: false });
    expect(
      authority.commitHomeAssistant(request(), 'https://ha.example.com', normalizeTarget, false)
    ).toBe(true);
    expect(JSON.parse(readFileSync(paths.statePath, 'utf8')).homeAssistantTarget).toBe(
      'https://ha.example.com'
    );
    expect(authority.authorizeHomeAssistant(request(), 'invalid', normalizeTarget).allowed).toBe(
      false
    );
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
    expect(
      authority.commitHomeAssistant(request(), 'https://ha-b.example.com', normalizeTarget, false)
    ).toBe(true);
    expect(JSON.parse(readFileSync(paths.statePath, 'utf8'))).toMatchObject({
      homeAssistantTarget: 'https://ha-b.example.com',
    });
  });

  it('uses the entered Home Assistant route instead of a remembered target', () => {
    const { authority, paths } = createFixture();
    const authorized = authority.authorizeHomeAssistant(
      request(INSTALLATION_KEY),
      'https://ha-a.example.com',
      normalizeTarget
    );
    expect(
      authority.commitHomeAssistant(
        request(),
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

  it('allows target changes while retaining explicit operator pins', () => {
    const unpinned = createFixture().authority;
    expect(
      unpinned.authorizeHomeAssistantChange(
        request(),
        'https://demo-ha.example.com',
        normalizeTarget
      )
    ).toEqual({ allowed: true, pairingVerified: false });

    const pinned = createFixture({
      config: { hassUrl: 'https://ha.example.com' },
    }).authority;
    expect(
      pinned.authorizeHomeAssistantChange(request(), 'https://demo-ha.example.com', normalizeTarget)
    ).toEqual({ allowed: false, pairingVerified: false });
  });

  it('records replacement Home Assistant targets after provider verification', () => {
    const { authority, paths } = createFixture();
    const first = authority.authorizeHomeAssistant(
      request(INSTALLATION_KEY),
      'https://ha-a.example.com',
      normalizeTarget
    );
    expect(
      authority.commitHomeAssistant(
        request(),
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
    expect(replacement).toEqual({ allowed: true, pairingVerified: false });
    expect(
      authority.commitHomeAssistant(
        request(),
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

  it('accepts Homeys verified by OAuth without separate setup approval', () => {
    const { authority } = createFixture();
    expect(authority.authorizeHomeyStart(request()).allowed).toBe(true);
    expect(authority.commitHomey(request(), ['homey-a'], false)).toBe(true);
    expect(authority.commitHomey(request(), ['homey-b'], false)).toBe(true);
    expect(authority.commitHomey(request(), [], false)).toBe(false);
  });
});
