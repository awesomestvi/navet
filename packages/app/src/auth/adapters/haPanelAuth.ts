import type { AuthAdapter, AuthSession } from '../types';

export const haPanelAuth: AuthAdapter = {
  providerId: 'home_assistant',
  kind: 'ha-panel',
  async init(): Promise<AuthSession | null> {
    return {
      providerId: 'home_assistant',
      runtime: 'ha-panel',
      authMode: 'ha_frontend_session',
      haBaseUrl: window.location.origin,
      hassUrl: window.location.origin,
    };
  },
};
