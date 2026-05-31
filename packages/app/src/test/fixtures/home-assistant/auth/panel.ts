import type { AuthSession } from '@navet/app/auth/types';

export const panelSessionFixture = {
  runtime: 'ha-panel',
  authMode: 'ha_frontend_session',
  haBaseUrl: 'http://localhost:5173',
  hassUrl: 'http://localhost:5173',
  panelFlag: true,
} satisfies Pick<AuthSession, 'runtime' | 'authMode' | 'haBaseUrl' | 'hassUrl'> & {
  panelFlag: boolean;
};
