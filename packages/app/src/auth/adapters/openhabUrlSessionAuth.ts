import type { AuthAdapter, AuthSession } from '@navet/app/auth/types';

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/$/, '');
}

export const openhabUrlSessionAuth: AuthAdapter = {
  providerId: 'openhab',
  kind: 'standalone-oauth',
  async init() {
    return null;
  },
  async login(input): Promise<AuthSession> {
    if (!input?.hassUrl) {
      throw new Error('openHAB URL is required');
    }

    const baseUrl = normalizeBaseUrl(input.hassUrl);
    try {
      new URL(baseUrl);
    } catch {
      throw new Error('openHAB URL must be a valid absolute URL');
    }

    return {
      providerId: 'openhab',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: baseUrl,
      hassUrl: baseUrl,
    };
  },
  async refresh(session) {
    return session;
  },
  async logout() {},
};
