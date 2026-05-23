import type { AuthAdapter, AuthSession } from '../types';

export const haIngressAuth: AuthAdapter = {
  kind: 'ha-ingress',
  async init(): Promise<AuthSession | null> {
    return {
      hassUrl: window.location.origin,
      accessToken: '__ha_ingress_session__',
    };
  },
};
