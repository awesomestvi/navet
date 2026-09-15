// @ts-expect-error Docker njs runtime modules are JavaScript and have no TypeScript declaration.
import deviceSessionAuthority from '@docker/njs/device-session-authority.js';
// @ts-expect-error Docker njs runtime modules are JavaScript and have no TypeScript declaration.
import installationCookieScope from '@docker/njs/installation-cookie-scope.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { files } = vi.hoisted(() => ({ files: new Map<string, string>() }));

vi.mock('fs', () => {
  const missing = () => Object.assign(new Error('Missing file'), { code: 'ENOENT' });
  const fakeFs = {
    mkdirSync: () => undefined,
    readFileSync(filePath: string) {
      const value = files.get(filePath);
      if (value === undefined) throw missing();
      return value;
    },
    readdirSync(directory: string) {
      const prefix = `${directory}/`;
      return [...files.keys()]
        .filter(
          (filePath) => filePath.startsWith(prefix) && !filePath.slice(prefix.length).includes('/')
        )
        .map((filePath) => filePath.slice(prefix.length));
    },
    renameSync(from: string, to: string) {
      const value = files.get(from);
      if (value === undefined) throw missing();
      files.set(to, value);
      files.delete(from);
    },
    statSync(filePath: string) {
      const value = files.get(filePath);
      if (value === undefined) throw missing();
      return { size: value.length };
    },
    unlinkSync(filePath: string) {
      if (!files.delete(filePath)) throw missing();
    },
    writeFileSync(filePath: string, value: string) {
      files.set(filePath, value);
    },
  };
  return { default: fakeFs, ...fakeFs };
});

const INSTALLATION_KEY = 'a'.repeat(64);
const HA_ID = 'b'.repeat(64);
const OPENHAB_ID = 'c'.repeat(64);
const DEVICE_ID = 'd'.repeat(64);
const HA_PATH = `/data/navet-auth-sessions/${HA_ID}.json`;
const OPENHAB_PATH = `/data/navet-provider-sessions/openhab/${OPENHAB_ID}.json`;
const DEVICE_PATH = `/data/navet-device-sessions/${DEVICE_ID}.json`;

function cookieName(baseName: string) {
  return installationCookieScope.createInstallationCookieNames(baseName, {
    installationKey: INSTALLATION_KEY,
  }).currentName as string;
}

function disconnectRequest(role: 'primary' | 'authorized') {
  files.set('/data/navet-installation-key', INSTALLATION_KEY);
  files.set(HA_PATH, JSON.stringify({ auth: { accessToken: 'test' }, updatedAt: Date.now() }));
  files.set(
    OPENHAB_PATH,
    JSON.stringify({ auth: { hassUrl: 'https://openhab.local' }, updatedAt: Date.now() })
  );
  files.set(
    DEVICE_PATH,
    JSON.stringify({
      version: 1,
      id: DEVICE_ID,
      role: role === 'primary' ? 'primary' : undefined,
      providerCookieIds: { home_assistant: HA_ID, openhab: OPENHAB_ID },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: Date.now() + 60_000,
      revokedAt: null,
    })
  );
  const responses: Array<{ status: number; body: Record<string, unknown> }> = [];
  return {
    headersIn: {
      Host: 'navet.local',
      Origin: 'http://navet.local',
      Cookie: [
        `${cookieName('navet_auth_session')}=${HA_ID}`,
        `${cookieName('navet_openhab_session')}=${OPENHAB_ID}`,
        `${cookieName('navet_device_session')}=${DEVICE_ID}`,
      ].join('; '),
    },
    headersOut: {} as Record<string, unknown>,
    method: 'DELETE',
    requestText: JSON.stringify({ providerId: 'openhab' }),
    uri: '/__navet_devices__/providers',
    variables: { scheme: 'http' },
    return(status: number, body: string) {
      responses.push({ status, body: JSON.parse(body) as Record<string, unknown> });
    },
    responses,
  };
}

describe('production device provider disconnect', () => {
  beforeEach(() => files.clear());

  it('deletes the provider credential before removing its device grants', async () => {
    const request = disconnectRequest('primary');

    await deviceSessionAuthority.handle(request);

    expect(request.responses).toEqual([{ status: 200, body: { invalidated: true } }]);
    expect(files.has(OPENHAB_PATH)).toBe(false);
    expect(files.has(HA_PATH)).toBe(true);
    expect(JSON.parse(files.get(DEVICE_PATH) ?? '{}').providerCookieIds).toEqual({
      home_assistant: HA_ID,
    });
  });

  it('does not let an authorized device delete the primary provider credential', async () => {
    const request = disconnectRequest('authorized');

    await deviceSessionAuthority.handle(request);

    expect(request.responses).toEqual([
      {
        status: 403,
        body: { error: 'Use your primary device to disconnect this provider.' },
      },
    ]);
    expect(files.has(OPENHAB_PATH)).toBe(true);
  });
});
