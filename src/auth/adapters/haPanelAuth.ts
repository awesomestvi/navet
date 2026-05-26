import type { AuthAdapter, AuthSession } from '../types';

export const haPanelAuth: AuthAdapter = {
  kind: 'ha-panel',
  async init(): Promise<AuthSession | null> {
    return {
      runtime: 'ha-panel',
      authMode: 'ha_frontend_session',
      haBaseUrl: window.location.origin,
      hassUrl: window.location.origin,
    };
  },
};
