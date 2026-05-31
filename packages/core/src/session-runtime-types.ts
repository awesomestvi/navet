import type { IntegrationProviderId } from './integration-providers';
import type { NavetProviderSessionInput, NavetProviderSessionMap } from './provider-contract';

export type AuthRuntime = 'ha-panel' | 'ha-ingress' | 'standalone-oauth';
export type AuthMode = 'ha_frontend_session' | 'ingress_session' | 'oauth';
export type NavetRuntimeKind = 'ha_panel' | 'ha_ingress' | 'standalone' | 'dev';

export interface AuthSessionSnapshot {
  providerId: IntegrationProviderId;
  runtime: NavetRuntimeKind;
  authMode: AuthMode;
  haBaseUrl: string | null;
  accessToken?: string;
  expiresAt?: number;
  userId?: string;
  isAuthenticated: boolean;
  sessions: NavetProviderSessionMap;
  authenticatedProviderIds: IntegrationProviderId[];
}

export interface IntegrationSessionRuntimeRegistration {
  getAuthRuntime(): AuthRuntime;
  getSnapshot(): AuthSessionSnapshot;
  getSession(): NavetProviderSessionInput | null;
  subscribe(
    listener: (snapshot: AuthSessionSnapshot, session: NavetProviderSessionInput | null) => void
  ): () => void;
  init(): Promise<AuthSessionSnapshot>;
  login(input?: {
    hassUrl?: string;
    haBaseUrl?: string;
    accessToken?: string;
    providerId?: IntegrationProviderId;
  }): Promise<AuthSessionSnapshot>;
  logout(providerId?: IntegrationProviderId): Promise<void>;
  refresh(providerId?: IntegrationProviderId): Promise<AuthSessionSnapshot>;
  replaceSession(session: NavetProviderSessionInput | null): AuthSessionSnapshot;
  setActiveProvider(providerId: IntegrationProviderId): AuthSessionSnapshot;
}
