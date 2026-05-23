import type { AuthAdapter, AuthSession } from '../types';

export const legacyTokenAuth: AuthAdapter = {
  kind: 'legacy-token',
  async init() {
    return null;
  },
  async login(input) {
    if (!input?.hassUrl || !input.token) {
      throw new Error('Legacy login requires URL and token');
    }
    return { hassUrl: input.hassUrl, accessToken: input.token } as AuthSession;
  },
};
