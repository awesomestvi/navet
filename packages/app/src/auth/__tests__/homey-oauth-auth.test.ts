import { beforeEach, describe, expect, it, vi } from 'vitest';
import { homeyOAuthAuth, homeyOAuthNavigation, selectHomey } from '../adapters/homeyOAuthAuth';
import { DurableAuthSessionUnavailableError } from '../session-errors';

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

  it.each([
    {
      name: 'network failure',
      response: () => Promise.reject(new TypeError('connection refused')),
    },
    {
      name: 'missing server route',
      response: () => Promise.resolve(new Response(null, { status: 404 })),
    },
  ])('keeps Homey restoration retryable after a $name', async ({ response }) => {
    vi.spyOn(window, 'fetch').mockImplementation(response);

    await expect(homeyOAuthAuth.init()).rejects.toBeInstanceOf(DurableAuthSessionUnavailableError);
  });

  it('maps a trusted Homey callback failure to a visible retry message', async () => {
    window.history.replaceState(
      {},
      '',
      '/?homey_oauth_error=temporarily_unavailable&code=discarded&state=discarded'
    );
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

    await expect(homeyOAuthAuth.init()).rejects.toThrow(
      'Homey sign-in could not be completed. Please try again.'
    );
    expect(window.location.search).toBe('');
  });

  it('keeps an existing Homey session after a failed reauthentication callback', async () => {
    window.history.replaceState({}, '', '/?homey_oauth_error=access_denied');
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          userId: 'user-1',
          user: { id: 'user-1', name: 'Vishal' },
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
      selectedHomeyId: 'homey-1',
    });
    expect(window.location.search).toBe('');
  });

  it('redirects browser login to the same-origin Homey authorize endpoint', async () => {
    const authorizeUrl = 'https://api.athom.com/oauth2/authorise?state=server-state';
    const fetchMock = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ authorizeUrl }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const assignMock = vi.spyOn(homeyOAuthNavigation, 'assign').mockImplementation(() => undefined);

    void homeyOAuthAuth.login?.({ providerId: 'homey' });

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `${window.location.origin}/__navet_homey__/authorize`,
        expect.objectContaining({
          method: 'POST',
          credentials: 'same-origin',
        })
      );
      expect(assignMock).toHaveBeenCalledWith(authorizeUrl);
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.origin}/__navet_homey__/authorize`,
      expect.objectContaining({
        body: JSON.stringify({ returnTo: '/' }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
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
