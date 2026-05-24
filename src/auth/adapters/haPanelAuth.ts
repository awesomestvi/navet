import type { AuthAdapter, AuthSession } from '../types';

export const haPanelAuth: AuthAdapter = {
  kind: 'ha-panel',
  async init(): Promise<AuthSession | null> {
    return {
      runtime: 'ha-panel',
      hassUrl: window.location.origin,
    };
  },
};
