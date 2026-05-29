import type {
  NavetRuntimeKind,
  RuntimeAuthMode,
} from '@/app/infrastructure/home-assistant/runtime/runtime-context';
import type { IntegrationProviderId } from '@/app/types/provider';
import type { AuthRuntime } from './runtime-types';
import type { AuthSession, AuthSessionMap } from './types';

export interface AuthSessionSnapshot {
  providerId: IntegrationProviderId;
  runtime: NavetRuntimeKind;
  authMode: RuntimeAuthMode;
  haBaseUrl: string | null;
  accessToken?: string;
  expiresAt?: number;
  userId?: string;
  isAuthenticated: boolean;
  sessions: AuthSessionMap;
  authenticatedProviderIds: IntegrationProviderId[];
}

export interface IntegrationSessionRuntimeRegistration {
  getAuthRuntime(): AuthRuntime;
  getSnapshot(): AuthSessionSnapshot;
  getSession(): AuthSession | null;
  subscribe(
    listener: (snapshot: AuthSessionSnapshot, session: AuthSession | null) => void
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
  replaceSession(session: AuthSession | null): AuthSessionSnapshot;
  setActiveProvider(providerId: IntegrationProviderId): AuthSessionSnapshot;
}
