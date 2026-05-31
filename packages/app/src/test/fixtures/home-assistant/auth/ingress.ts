import type { AuthSession } from '@navet/app/auth/types';

export const ingressSessionFixture = {
  runtime: 'ha-ingress',
  authMode: 'ingress_session',
  haBaseUrl: 'http://localhost:5173',
  hassUrl: 'http://localhost:5173',
  ingressPath: '/api/hassio_ingress/navet_dev/dashboard',
} satisfies Pick<AuthSession, 'runtime' | 'authMode' | 'haBaseUrl' | 'hassUrl'> & {
  ingressPath: string;
};
