import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { createViteDeviceSessionAuthority } from '@scripts/vite-device-session-authority.ts';
import { createViteInstallationAuthority } from '@scripts/vite-installation-authority.ts';
import { describe, expect, it, vi } from 'vitest';

function makeRequest(method: string, url: string, body?: unknown, cookie = '', host = 'localhost') {
  const stream = Readable.from(body === undefined ? [] : [JSON.stringify(body)]) as IncomingMessage;
  Object.assign(stream, {
    method,
    url,
    headers: {
      host,
      ...(method === 'GET' ? {} : { origin: `http://${host}` }),
      ...(cookie ? { cookie } : {}),
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
  it('offers device connection only when an active primary provider session exists', async () => {
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

    writeFileSync(
      path.join(providerDirectory, `${'b'.repeat(64)}.json`),
      JSON.stringify({ auth: { accessToken: 'secret' }, updatedAt: 0 })
    );
    const expired = makeResponse();
    await authority.handle(makeRequest('GET', '/availability'), expired.response);
    expect(expired.json()).toEqual({ available: false });
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
        primaryCookie
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
      devices: [
        {
          name: 'Navet screen',
          providers: ['openhab'],
        },
      ],
    });

    const promoted = makeResponse();
    await authority.handle(
      makeRequest(
        'PATCH',
        '/sessions',
        { id: deviceCookie.split('=')[1], role: 'primary' },
        primaryCookie
      ),
      promoted.response
    );
    expect(promoted.json()).toEqual({ updated: true });

    const promotedOverview = makeResponse();
    await authority.handle(
      makeRequest('GET', '/sessions', undefined, deviceCookie),
      promotedOverview.response
    );
    expect(promotedOverview.json()).toMatchObject({
      access: 'primary',
      currentDeviceId: deviceCookie.split('=')[1],
      devices: [{ role: 'primary' }],
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
      makeRequest('DELETE', '/providers', { providerId: 'openhab' }, primaryCookie),
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
