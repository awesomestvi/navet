import type { AuthSession } from '@/auth/types';

export const oauthSessionFixture = {
  runtime: 'standalone-oauth',
  authMode: 'oauth',
  haBaseUrl: 'https://ha.example.test',
  hassUrl: 'https://ha.example.test',
  expiresAt: Date.now() + 3_600_000,
  tokenPayload: {
    hassUrl: 'https://ha.example.test',
    clientId: 'http://localhost/',
    expires: Date.now() + 3_600_000,
    refresh_token: 'refresh-token',
    access_token: 'access-token',
    expires_in: 3600,
  },
} satisfies Pick<AuthSession, 'runtime' | 'authMode' | 'haBaseUrl' | 'hassUrl' | 'expiresAt'> & {
  tokenPayload: {
    hassUrl: string;
    clientId: string;
    expires: number;
    refresh_token: string;
    access_token: string;
    expires_in: number;
  };
};
