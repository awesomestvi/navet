import type { IntegrationProviderId } from '@navet/app/types/provider';

export const AUTH_SESSION_REFRESHED_EVENT = 'navet:auth-session-refreshed';

export interface AuthSessionRefreshedEventDetail {
  providerId: IntegrationProviderId;
}

export function dispatchAuthSessionRefreshed(providerId: IntegrationProviderId) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<AuthSessionRefreshedEventDetail>(AUTH_SESSION_REFRESHED_EVENT, {
      detail: { providerId },
    })
  );
}
