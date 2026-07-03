import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  deleteDashboardProfile,
  loadDashboardProfile,
  saveDashboardProfile,
} from '../dashboard-profile.service';

function installIngressBase() {
  const base = document.createElement('base');
  base.href = `${window.location.origin}/api/hassio_ingress/navet_dev/`;
  document.head.append(base);
  return base;
}

afterEach(() => {
  document.querySelector('base')?.remove();
  vi.restoreAllMocks();
});

describe('dashboard add-on endpoints', () => {
  it('loads the shared profile through the ingress-aware endpoint', async () => {
    const base = installIngressBase();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    try {
      await loadDashboardProfile();

      expect(fetchMock).toHaveBeenCalledWith(
        `${window.location.origin}/api/hassio_ingress/navet_dev/__navet_profile__/default`,
        {
          cache: 'no-store',
          credentials: 'same-origin',
          headers: new Headers(),
        }
      );
    } finally {
      base.remove();
    }
  });

  it('sends If-None-Match when an ETag is available', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, {
        status: 304,
        headers: { ETag: '"etag-2"', 'Last-Modified': 'Tue, 02 Jan 2024 12:00:00 GMT' },
      })
    );

    await expect(loadDashboardProfile({ etag: '"etag-1"' })).resolves.toEqual({
      available: true,
      profile: null,
      notModified: true,
      etag: '"etag-2"',
      lastModified: 'Tue, 02 Jan 2024 12:00:00 GMT',
      generation: null,
    });

    expect(fetchMock).toHaveBeenCalledWith(`${window.location.origin}/__navet_profile__/default`, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: expect.any(Headers),
    });
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).headers).toEqual(
      expect.objectContaining({
        get: expect.any(Function),
      })
    );
    expect(
      ((fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Headers).get('If-None-Match')
    ).toBe('"etag-1"');
  });

  it('classifies bad shared-profile writes as permanent failures and returns metadata', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unsupported dashboard profile' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ETag: '"etag-3"' },
      })
    );

    await expect(
      saveDashboardProfile({
        version: 3,
        app: 'navet',
        exportedAt: new Date().toISOString(),
        theme: {
          theme: 'glass',
          primaryColor: 'blue',
        },
        settings: {},
        navigation: {
          currentRoom: 'all',
          activeSection: 'home',
        },
      })
    ).resolves.toEqual({
      saved: false,
      permanentFailure: true,
      etag: '"etag-3"',
      lastModified: null,
      generation: null,
    });

    expect(fetchMock).toHaveBeenCalledWith(`${window.location.origin}/__navet_profile__/default`, {
      method: 'PUT',
      cache: 'no-store',
      credentials: 'same-origin',
      keepalive: undefined,
      headers: expect.any(Headers),
      body: expect.any(String),
    });
    expect(
      ((fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Headers).get('Content-Type')
    ).toBe('application/json');
  });

  it('sends conditional headers when saving against loaded profile metadata', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ETag: '"etag-4"', 'Last-Modified': 'Wed, 03 Jan 2024 12:00:00 GMT' },
      })
    );

    await expect(
      saveDashboardProfile(
        {
          version: 3,
          app: 'navet',
          exportedAt: new Date().toISOString(),
          theme: {
            theme: 'glass',
            primaryColor: 'blue',
          },
          settings: {},
          navigation: {
            currentRoom: 'all',
            activeSection: 'home',
          },
        },
        { etag: '"etag-3"', lastModified: 'Tue, 02 Jan 2024 12:00:00 GMT' }
      )
    ).resolves.toEqual({
      saved: true,
      permanentFailure: false,
      etag: '"etag-4"',
      lastModified: 'Wed, 03 Jan 2024 12:00:00 GMT',
      generation: null,
    });

    const headers = (fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Headers;
    expect(headers.get('If-Match')).toBe('"etag-3"');
    expect(headers.get('If-Unmodified-Since')).toBeNull();
  });

  it('treats missing shared-profile endpoints as permanent write failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, {
        status: 404,
      })
    );

    await expect(
      saveDashboardProfile({
        version: 3,
        app: 'navet',
        exportedAt: new Date().toISOString(),
        theme: {
          theme: 'glass',
          primaryColor: 'blue',
        },
        settings: {},
        navigation: {
          currentRoom: 'all',
          activeSection: 'home',
        },
      })
    ).resolves.toEqual({
      saved: false,
      permanentFailure: true,
      etag: null,
      lastModified: null,
      generation: null,
    });
  });

  it('returns the server generation when resetting the shared profile', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, {
        status: 204,
        headers: { 'X-Navet-Profile-Generation': 'generation-2' },
      })
    );

    await expect(deleteDashboardProfile()).resolves.toEqual({
      reset: true,
      permanentFailure: false,
      generation: 'generation-2',
    });
  });
});
