import type { AuthAdapter, AuthSession } from '../types';

export const haPanelAuth: AuthAdapter = {
  kind: 'ha-panel',
  async init(): Promise<AuthSession | null> {
    return {
      hassUrl: window.location.origin,
      accessToken: '__ha_panel_session__',
    };
  },
};
