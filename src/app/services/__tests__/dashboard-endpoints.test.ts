import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadDashboardProfile } from '../dashboard-profile.service';

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
});
