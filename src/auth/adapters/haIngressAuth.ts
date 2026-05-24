import { getAuth } from 'home-assistant-js-websocket';
import type { AuthAdapter, AuthSession } from '../types';

export const haIngressAuth: AuthAdapter = {
  kind: 'ha-ingress',
  async init(): Promise<AuthSession | null> {
    const hassUrl = window.location.origin;

    try {
      const auth = await getAuth({ hassUrl });
      if (auth.expired) {
        await auth.refreshAccessToken();
      }

      return {
        runtime: 'ha-ingress',
        hassUrl,
        auth,
        expiresAt: auth.data.expires,
      };
    } catch {
      // Ingress remains an authenticated Home Assistant surface even when the
      // frontend token cache is unavailable. The shared client will surface a
      // connection error if Home Assistant still requires a websocket token.
    }

    return {
      runtime: 'ha-ingress',
      hassUrl: window.location.origin,
    };
  },
};
