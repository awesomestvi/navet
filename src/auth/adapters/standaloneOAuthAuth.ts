import type { AuthAdapter, AuthSession } from '../types';

const STORAGE_KEY = 'navet_auth_session';

export const standaloneOAuthAuth: AuthAdapter = {
  kind: 'standalone-oauth',
  async init() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  },
  async login(input) {
    if (!input?.hassUrl) {
      throw new Error('Home Assistant URL is required');
    }

    const authUrl = new URL('/auth/authorize', input.hassUrl);
    authUrl.searchParams.set('client_id', window.location.origin);
    authUrl.searchParams.set('redirect_uri', `${window.location.origin}/`);
    authUrl.searchParams.set('response_type', 'code');

    const callbackCode = new URL(window.location.href).searchParams.get('code');
    if (!callbackCode) {
      window.location.assign(authUrl.toString());
      throw new Error('OAuth redirect started');
    }

    const tokenResponse = await fetch(new URL('/auth/token', input.hassUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: callbackCode,
        client_id: window.location.origin,
      }),
    });

    if (!tokenResponse.ok) throw new Error('OAuth token exchange failed');
    const token = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    const session: AuthSession = {
      hassUrl: input.hassUrl,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + token.expires_in * 1000,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return session;
  },
  async refresh(session) {
    if (!session.refreshToken) throw new Error('Missing refresh token');
    const response = await fetch(new URL('/auth/token', session.hassUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken,
        client_id: window.location.origin,
      }),
    });
    if (!response.ok) throw new Error('Refresh failed');
    const token = (await response.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    };
    const updated: AuthSession = {
      ...session,
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? session.refreshToken,
      expiresAt: Date.now() + token.expires_in * 1000,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  },
  async logout() {
    localStorage.removeItem(STORAGE_KEY);
  },
};
