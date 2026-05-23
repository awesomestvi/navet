import { beforeEach, describe, expect, it, vi } from 'vitest';
import { haIngressAuth } from '../adapters/haIngressAuth';
import { haPanelAuth } from '../adapters/haPanelAuth';
import { legacyTokenAuth } from '../adapters/legacyTokenAuth';
import { standaloneOAuthAuth } from '../adapters/standaloneOAuthAuth';

describe('auth adapters', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
    vi.restoreAllMocks();
  });

  it('creates panel session', async () => {
    const session = await haPanelAuth.init();
    expect(session?.accessToken).toContain('__ha_panel_session__');
  });

  it('creates ingress session', async () => {
    const session = await haIngressAuth.init();
    expect(session?.accessToken).toContain('__ha_ingress_session__');
  });

  it('supports legacy token login fallback', async () => {
    const session = await legacyTokenAuth.login?.({
      hassUrl: 'https://ha.example.com',
      token: 'abc',
    });
    expect(session?.accessToken).toBe('abc');
  });

  it('restores persisted standalone OAuth session', async () => {
    localStorage.setItem(
      'navet_auth_session',
      JSON.stringify({ hassUrl: 'https://ha.example.com', accessToken: 'token' })
    );
    const session = await standaloneOAuthAuth.init();
    expect(session?.hassUrl).toBe('https://ha.example.com');
    expect(session?.accessToken).toBe('token');
  });

  it('refreshes standalone OAuth access tokens', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'next-access-token',
          refresh_token: 'next-refresh-token',
          expires_in: 1800,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const refreshed = await standaloneOAuthAuth.refresh?.({
      hassUrl: 'https://ha.example.com',
      accessToken: 'old',
      refreshToken: 'old-refresh',
      expiresAt: Date.now() - 1,
    });

    expect(refreshed?.accessToken).toBe('next-access-token');
    expect(refreshed?.refreshToken).toBe('next-refresh-token');
    expect(localStorage.getItem('navet_auth_session')).toContain('next-access-token');
  });
});
