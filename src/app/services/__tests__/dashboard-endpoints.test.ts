import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadDashboardProfile, saveDashboardProfile } from '../dashboard-profile.service';

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
        }
      );
    } finally {
      base.remove();
    }
  });

  it('classifies bad shared-profile writes as permanent failures', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unsupported dashboard profile' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
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
    });

    expect(fetchMock).toHaveBeenCalledWith(`${window.location.origin}/__navet_profile__/default`, {
      method: 'PUT',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: expect.any(String),
    });
  });
});
