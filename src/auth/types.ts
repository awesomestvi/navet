import type { Auth } from 'home-assistant-js-websocket';
import type { HomeyCloudHomey, HomeySnapshot } from '@/app/types/homey';
import type { IntegrationUser } from '@/app/types/integration-user';
import type { IntegrationProviderId } from '@/app/types/provider';
import type { AuthRuntime } from './runtime-types';

export type AuthMode = 'ha_frontend_session' | 'ingress_session' | 'oauth';

export interface BaseAuthSession {
  providerId: IntegrationProviderId;
  runtime: AuthRuntime;
  authMode: AuthMode;
  haBaseUrl: string;
  hassUrl: string;
  auth?: Auth;
  expiresAt?: number;
  userId?: string;
  user?: IntegrationUser;
}

export interface HomeAssistantAuthSession extends BaseAuthSession {
  providerId: 'home_assistant';
}

export interface HomeyAuthSession extends BaseAuthSession {
  providerId: 'homey';
  availableHomeys?: HomeyCloudHomey[];
  selectedHomeyId?: string;
  needsHomeySelection?: boolean;
  homeySnapshot?: HomeySnapshot;
}

export interface OpenHABAuthSession extends BaseAuthSession {
  providerId: 'openhab';
}

export interface HubitatAuthSession extends BaseAuthSession {
  providerId: 'hubitat';
}

export interface SmartThingsAuthSession extends BaseAuthSession {
  providerId: 'smartthings';
}

export type AuthSession =
  | HomeAssistantAuthSession
  | HomeyAuthSession
  | OpenHABAuthSession
  | HubitatAuthSession
  | SmartThingsAuthSession;

export interface AuthAdapter {
  readonly providerId: IntegrationProviderId;
  readonly kind: AuthRuntime;
  init(): Promise<AuthSession | null>;
  login?(input?: {
    hassUrl?: string;
    accessToken?: string;
    providerId?: IntegrationProviderId;
  }): Promise<AuthSession>;
  refresh?(session: AuthSession): Promise<AuthSession>;
  logout?(): Promise<void>;
}

export function isHomeyAuthSession(session: AuthSession): session is HomeyAuthSession {
  return session.providerId === 'homey';
}

export type AuthSessionMap = Partial<Record<IntegrationProviderId, AuthSession>>;
