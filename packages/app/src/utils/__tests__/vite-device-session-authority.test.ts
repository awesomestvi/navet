import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { createViteDeviceSessionAuthority } from '@scripts/vite-device-session-authority.ts';
import { createViteInstallationAuthority } from '@scripts/vite-installation-authority.ts';
import { describe, expect, it, vi } from 'vitest';

function makeRequest(
  method: string,
  url: string,
  body?: unknown,
  cookie = '',
  host = 'localhost',
  headers: Record<string, string> = {}
) {
  const stream = Readable.from(body === undefined ? [] : [JSON.stringify(body)]) as IncomingMessage;
  Object.assign(stream, {
    method,
    url,
    headers: {
      host,
      ...(method === 'GET' ? {} : { origin: `http://${host}` }),
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
    socket: {},
  });
  return stream;
}

function makeResponse() {
  const headers = new Map<string, string | string[]>();
  let text = '';
  const response = {
    statusCode: 200,
    setHeader(name: string, value: string | string[]) {
      headers.set(name.toLowerCase(), value);
    },
    end(value?: string) {
      text = value ?? '';
    },
  } as unknown as ServerResponse;
  return {
    response,
    headers,
    json: () => JSON.parse(text) as Record<string, unknown>,
  };
}

describe('Vite device session authority', () => {
  it('offers device connection only when another active primary provider session exists', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const cacheDirectory = mkdtempSync(path.join(tmpdir(), 'navet-device-availability-'));
    const installationAuthority = createViteInstallationAuthority({
      cacheDirectory,
      installationKey: 'a'.repeat(64),
    });
    const authority = createViteDeviceSessionAuthority(installationAuthority, { cacheDirectory });

    const fresh = makeResponse();
    await authority.handle(makeRequest('GET', '/availability'), fresh.response);
    expect(fresh.json()).toEqual({ available: false });

    const providerDirectory = path.join(cacheDirectory, 'navet-auth-sessions');
    mkdirSync(providerDirectory, { recursive: true });
    writeFileSync(
      path.join(providerDirectory, `${'b'.repeat(64)}.json`),
      JSON.stringify({ auth: { accessToken: 'secret' }, updatedAt: Date.now() })
    );

    const configured = makeResponse();
    await authority.handle(makeRequest('GET', '/availability'), configured.response);
    expect(configured.json()).toEqual({ available: true });

    const providerCookieName =
      installationAuthority.getCookieNames('navet_auth_session').currentName;
    const currentDevice = makeResponse();
    await authority.handle(
      makeRequest('GET', '/availability', undefined, `${providerCookieName}=${'b'.repeat(64)}`),
      currentDevice.response
    );
    expect(currentDevice.json()).toEqual({ available: false });

    writeFileSync(
      path.join(providerDirectory, `${'c'.repeat(64)}.json`),
      JSON.stringify({ auth: { accessToken: 'other-secret' }, updatedAt: Date.now() })
    );
    const otherDevice = makeResponse();
    await authority.handle(
      makeRequest('GET', '/availability', undefined, `${providerCookieName}=${'b'.repeat(64)}`),
      otherDevice.response
    );
    expect(otherDevice.json()).toEqual({ available: true });

    writeFileSync(
      path.join(providerDirectory, `${'b'.repeat(64)}.json`),
      JSON.stringify({ auth: { accessToken: 'secret' }, updatedAt: 0 })
    );
    writeFileSync(
      path.join(providerDirectory, `${'c'.repeat(64)}.json`),
      JSON.stringify({ auth: { accessToken: 'other-secret' }, updatedAt: 0 })
    );
    const expired = makeResponse();
    await authority.handle(makeRequest('GET', '/availability'), expired.response);
    expect(expired.json()).toEqual({ available: false });
  });

  it('keeps migrated legacy sign-ins primary until the user chooses one', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const cacheDirectory = mkdtempSync(path.join(tmpdir(), 'navet-legacy-devices-'));
    const installationAuthority = createViteInstallationAuthority({
      cacheDirectory,
      installationKey: 'a'.repeat(64),
    });
    const authority = createViteDeviceSessionAuthority(installationAuthority, { cacheDirectory });
    const providerDirectory = path.join(cacheDirectory, 'navet-auth-sessions');
    mkdirSync(providerDirectory, { recursive: true });
    for (const cookieId of ['b'.repeat(64), 'c'.repeat(64)]) {
      writeFileSync(
        path.join(providerDirectory, `${cookieId}.json`),
        JSON.stringify({ auth: { accessToken: 'secret' }, updatedAt: Date.now() })
      );
    }
    const providerCookieName =
      installationAuthority.getCookieNames('navet_auth_session').currentName;

    const computer = makeResponse();
    await authority.handle(
      makeRequest(
        'GET',
        '/sessions',
        undefined,
        `${providerCookieName}=${'b'.repeat(64)}`,
        'localhost',
        {
          'x-navet-device-client-id': 'computer_client_01',
          'x-navet-device-name': encodeURIComponent('Computer A1B2'),
        }
      ),
      computer.response
    );
    const computerCookie = String(computer.headers.get('set-cookie')).split(';')[0];
    const computerId = computerCookie.split('=')[1];
    expect(computer.json()).toMatchObject({
      access: 'primary',
      currentDeviceId: computerId,
      devices: [{ id: computerId, name: 'Computer A1B2', role: 'primary' }],
    });

    const phone = makeResponse();
    await authority.handle(
      makeRequest(
        'GET',
        '/sessions',
        undefined,
        `${providerCookieName}=${'c'.repeat(64)}`,
        'localhost',
        {
          'x-navet-device-client-id': 'phone_client_02',
          'x-navet-device-name': encodeURIComponent('Phone C3D4'),
        }
      ),
      phone.response
    );
    const phoneId = String(phone.headers.get('set-cookie')).split(';')[0].split('=')[1];
    expect(phoneId).not.toBe(computerId);
    expect(phone.json()).toMatchObject({
      access: 'primary',
      currentDeviceId: phoneId,
      devices: expect.arrayContaining([
        expect.objectContaining({ id: computerId, name: 'Computer A1B2', role: 'primary' }),
        expect.objectContaining({ id: phoneId, name: 'Phone C3D4', role: 'primary' }),
      ]),
    });

    const phoneCookie = String(phone.headers.get('set-cookie')).split(';')[0];
    const unchanged = makeResponse();
    await authority.handle(
      makeRequest(
        'GET',
        '/sessions',
        undefined,
        `${providerCookieName}=${'c'.repeat(64)}; ${phoneCookie}`
      ),
      unchanged.response
    );
    expect(
      (unchanged.json().devices as Array<{ role: string }>).filter(
        (device) => device.role === 'primary'
      )
    ).toHaveLength(2);

    const selected = makeResponse();
    await authority.handle(
      makeRequest(
        'PATCH',
        '/sessions',
        { id: phoneId, role: 'primary' },
        `${providerCookieName}=${'c'.repeat(64)}; ${phoneCookie}`
      ),
      selected.response
    );
    expect(selected.json()).toEqual({ updated: true });

    const computerAgain = makeResponse();
    await authority.handle(
      makeRequest(
        'GET',
        '/sessions',
        undefined,
        `${providerCookieName}=${'b'.repeat(64)}; ${computerCookie}`,
        'localhost',
        {
          'x-navet-device-client-id': 'computer_client_01',
          'x-navet-device-name': encodeURIComponent('Computer A1B2'),
        }
      ),
      computerAgain.response
    );
    expect(computerAgain.json()).toMatchObject({
      access: 'authorized',
      currentDeviceId: computerId,
      devices: expect.arrayContaining([
        expect.objectContaining({ id: computerId, role: 'authorized' }),
        expect.objectContaining({ id: phoneId, role: 'primary' }),
      ]),
    });

    const rejectedRemoval = makeResponse();
    await authority.handle(
      makeRequest(
        'DELETE',
        '/sessions',
        { id: phoneId },
        `${providerCookieName}=${'b'.repeat(64)}; ${computerCookie}`
      ),
      rejectedRemoval.response
    );
    expect(rejectedRemoval.response.statusCode).toBe(403);

    const removedComputer = makeResponse();
    await authority.handle(
      makeRequest(
        'DELETE',
        '/sessions',
        { id: computerId },
        `${providerCookieName}=${'c'.repeat(64)}; ${phoneCookie}`
      ),
      removedComputer.response
    );
    expect(removedComputer.json()).toEqual({ revoked: true });

    const revokedComputer = makeResponse();
    await authority.handle(
      makeRequest(
        'GET',
        '/sessions',
        undefined,
        `${providerCookieName}=${'b'.repeat(64)}; ${computerCookie}`
      ),
      revokedComputer.response
    );
    expect(revokedComputer.response.statusCode).toBe(403);
  });

  it('allows device authorization on a self-hosted HTTP address', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const cacheDirectory = mkdtempSync(path.join(tmpdir(), 'navet-http-devices-'));
    const installationAuthority = createViteInstallationAuthority({
      cacheDirectory,
      installationKey: 'a'.repeat(64),
    });
    const authority = createViteDeviceSessionAuthority(installationAuthority, { cacheDirectory });
    const created = makeResponse();

    await authority.handle(
      makeRequest('POST', '/request', {}, '', '192.168.1.50:8080'),
      created.response
    );

    expect(created.response.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ code: expect.stringMatching(/^[a-f0-9-]{14}$/) });
  });

  it('issues an independent revocable session and rejects replayed redemption', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const cacheDirectory = mkdtempSync(path.join(tmpdir(), 'navet-devices-'));
    const installationAuthority = createViteInstallationAuthority({
      cacheDirectory,
      installationKey: 'a'.repeat(64),
    });
    const authority = createViteDeviceSessionAuthority(installationAuthority, { cacheDirectory });
    const providerCookieId = 'b'.repeat(64);
    const providerDirectory = path.join(cacheDirectory, 'navet-provider-sessions', 'openhab');
    mkdirSync(providerDirectory, { recursive: true });
    writeFileSync(
      path.join(providerDirectory, `${providerCookieId}.json`),
      JSON.stringify({ auth: { hassUrl: 'https://openhab.local' }, updatedAt: Date.now() })
    );
    const providerCookieName =
      installationAuthority.getCookieNames('navet_openhab_session').currentName;
    const primaryCookie = `${providerCookieName}=${providerCookieId}`;

    const registeredPrimary = makeResponse();
    await authority.handle(
      makeRequest('GET', '/sessions', undefined, primaryCookie, 'localhost', {
        'x-navet-device-client-id': 'primary_client_01',
        'x-navet-device-name': encodeURIComponent('Primary screen'),
      }),
      registeredPrimary.response
    );
    const primaryDeviceCookie = String(registeredPrimary.headers.get('set-cookie')).split(';')[0];
    const primaryDeviceId = primaryDeviceCookie.split('=')[1];

    const created = makeResponse();
    await authority.handle(makeRequest('POST', '/request'), created.response);
    expect(created.response.statusCode).toBe(201);
    const request = created.json() as unknown as {
      id: string;
      requesterSecret: string;
      code: string;
    };

    const approved = makeResponse();
    await authority.handle(
      makeRequest(
        'POST',
        '/approve',
        {
          code: request.code,
          preferences: {
            language: 'sv',
            use24HourTime: true,
            temperatureUnit: 'celsius',
          },
        },
        `${primaryCookie}; ${primaryDeviceCookie}`
      ),
      approved.response
    );
    expect(approved.json()).toMatchObject({ approved: true, providers: ['openhab'] });

    const redeemed = makeResponse();
    await authority.handle(
      makeRequest('POST', '/redeem', {
        id: request.id,
        requesterSecret: request.requesterSecret,
      }),
      redeemed.response
    );
    expect(redeemed.json()).toEqual({
      connected: true,
      preferences: {
        language: 'sv',
        use24HourTime: true,
        temperatureUnit: 'celsius',
      },
    });
    const deviceCookie = String(redeemed.headers.get('set-cookie')).split(';')[0];
    expect(deviceCookie).not.toContain(providerCookieId);
    expect(
      authority.getProviderCookieId(makeRequest('GET', '/', undefined, deviceCookie), 'openhab')
    ).toBe(providerCookieId);
    expect(authority.hasDependentDevices('openhab', providerCookieId)).toBe(true);

    const secondaryOverview = makeResponse();
    await authority.handle(
      makeRequest('GET', '/sessions', undefined, deviceCookie),
      secondaryOverview.response
    );
    expect(secondaryOverview.json()).toMatchObject({
      access: 'authorized',
      currentDeviceId: deviceCookie.split('=')[1],
      devices: expect.arrayContaining([
        expect.objectContaining({
          name: 'Navet screen',
          role: 'authorized',
          providers: ['openhab'],
        }),
        expect.objectContaining({
          id: primaryDeviceId,
          role: 'primary',
        }),
      ]),
    });

    const promoted = makeResponse();
    await authority.handle(
      makeRequest(
        'PATCH',
        '/sessions',
        { id: deviceCookie.split('=')[1], role: 'primary' },
        `${primaryCookie}; ${primaryDeviceCookie}`
      ),
      promoted.response
    );
    expect(promoted.json()).toEqual({ updated: true });

    const promotedOverview = makeResponse();
    await authority.handle(
      makeRequest('GET', '/sessions', undefined, deviceCookie),
      promotedOverview.response
    );
    const promotedDeviceOverview = promotedOverview.json() as unknown as {
      access: string;
      currentDeviceId: string;
      devices: Array<{ id: string; role: string }>;
    };
    expect(promotedDeviceOverview).toMatchObject({
      access: 'primary',
      currentDeviceId: deviceCookie.split('=')[1],
    });
    expect(promotedDeviceOverview.devices.filter((device) => device.role === 'primary')).toEqual([
      expect.objectContaining({ id: deviceCookie.split('=')[1] }),
    ]);
    expect(promotedDeviceOverview.devices).toContainEqual(
      expect.objectContaining({ id: primaryDeviceId, role: 'authorized' })
    );

    const formerPrimaryOverview = makeResponse();
    await authority.handle(
      makeRequest('GET', '/sessions', undefined, `${primaryCookie}; ${primaryDeviceCookie}`),
      formerPrimaryOverview.response
    );
    expect(formerPrimaryOverview.json()).toMatchObject({
      access: 'authorized',
      currentDeviceId: primaryDeviceId,
    });

    const replay = makeResponse();
    await authority.handle(
      makeRequest('POST', '/redeem', {
        id: request.id,
        requesterSecret: request.requesterSecret,
      }),
      replay.response
    );
    expect(replay.response.statusCode).toBe(403);

    const invalidated = makeResponse();
    await authority.handle(
      makeRequest('DELETE', '/providers', { providerId: 'openhab' }, deviceCookie),
      invalidated.response
    );
    expect(invalidated.json()).toEqual({ invalidated: true });
    expect(authority.hasDependentDevices('openhab', providerCookieId)).toBe(false);
    expect(
      authority.getProviderCookieId(makeRequest('GET', '/', undefined, deviceCookie), 'openhab')
    ).toBe('');

    authority.revokeCurrentDevice(makeRequest('DELETE', '/', undefined, deviceCookie));
    expect(
      authority.getProviderCookieId(makeRequest('GET', '/', undefined, deviceCookie), 'openhab')
    ).toBe('');
  });
});
