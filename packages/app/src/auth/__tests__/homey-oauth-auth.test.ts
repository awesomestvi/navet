import { beforeEach, describe, expect, it, vi } from 'vitest';
import { homeyOAuthAuth, selectHomey } from '../adapters/homeyOAuthAuth';

describe('homeyOAuthAuth', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState({}, '', '/');
  });

  it('restores a stored Homey OAuth session from the same-origin session endpoint', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          userId: 'user-1',
          user: {
            id: 'user-1',
            name: 'Vishal',
            avatarUrl: 'https://images.example.com/vishal.png',
          },
          homeys: [{ id: 'homey-1', name: 'Living Room Homey' }],
          selectedHomeyId: 'homey-1',
          homeyBaseUrl: 'https://homey.example.com',
          hasActiveHomeySession: true,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    await expect(homeyOAuthAuth.init()).resolves.toMatchObject({
      providerId: 'homey',
      userId: 'user-1',
      user: {
        name: 'Vishal',
        avatarUrl: 'https://images.example.com/vishal.png',
      },
      selectedHomeyId: 'homey-1',
      needsHomeySelection: false,
      haBaseUrl: 'https://homey.example.com',
    });
  });

  it('redirects browser login to the same-origin Homey authorize endpoint', async () => {
    const openMock = vi.spyOn(window, 'open').mockReturnValue(null);

    void homeyOAuthAuth.login?.({ providerId: 'homey' });

    expect(openMock).toHaveBeenCalledWith(
      `${window.location.origin}/__navet_homey__/authorize`,
      '_self'
    );
  });

  it('selects a Homey through the same-origin selection endpoint', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          userId: 'user-1',
          user: {
            id: 'user-1',
            name: 'Vishal',
          },
          homeys: [{ id: 'homey-1', name: 'Living Room Homey' }],
          selectedHomeyId: 'homey-1',
          homeyBaseUrl: 'https://homey.example.com',
          hasActiveHomeySession: true,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    await expect(selectHomey('homey-1')).resolves.toMatchObject({
      providerId: 'homey',
      selectedHomeyId: 'homey-1',
      needsHomeySelection: false,
    });
  });

  it('clears the stored Homey session on logout', async () => {
    const fetchMock = vi
      .spyOn(window, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await homeyOAuthAuth.logout?.();

    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.origin}/__navet_homey__/session`,
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'same-origin',
      })
    );
  });
});
