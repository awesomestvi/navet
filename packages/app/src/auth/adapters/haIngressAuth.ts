import type { AuthAdapter, AuthSession } from '../types';

function createIngressSession(): AuthSession {
  return {
    providerId: 'home_assistant',
    runtime: 'ha-ingress',
    authMode: 'ingress_session',
    haBaseUrl: window.location.origin,
    hassUrl: window.location.origin,
  };
}

export const haIngressAuth: AuthAdapter = {
  providerId: 'home_assistant',
  kind: 'ha-ingress',
  async init(): Promise<AuthSession | null> {
    return createIngressSession();
  },
  async refresh() {
    return createIngressSession();
  },
};
