export type AuthRuntime = 'ha-panel' | 'ha-ingress' | 'standalone-oauth' | 'legacy-token';

const INGRESS_PATH = '/api/hassio_ingress/';

export function detectAuthRuntime(options?: { forceLegacyToken?: boolean }): AuthRuntime {
  if (options?.forceLegacyToken) {
    return 'legacy-token';
  }

  if (typeof window !== 'undefined' && (window as { __NAVET_PANEL__?: boolean }).__NAVET_PANEL__) {
    return 'ha-panel';
  }

  if (typeof window !== 'undefined' && window.location.pathname.includes(INGRESS_PATH)) {
    return 'ha-ingress';
  }

  return 'standalone-oauth';
}
