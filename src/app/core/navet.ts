import type { ProviderMediaFeatureService } from '@/app/platform/provider-feature-services';
import type { ResolvedPlatformResource } from '@/app/platform/resources';
import type { IntegrationProviderId } from '@/app/types/provider';
import type { AuthSessionMap } from '@/auth/types';

export type NavetCapability =
  | 'toggle'
  | 'brightness'
  | 'color_temperature'
  | 'fan_speed'
  | 'lock'
  | 'position'
  | 'temperature_setpoint'
  | 'media_playback'
  | 'camera_snapshot'
  | 'presence'
  | 'numeric_sensor';

export type NavetResourceKind =
  | 'primary_image'
  | 'media_artwork'
  | 'camera_snapshot'
  | 'camera_stream';

export type NavetDeviceKind =
  | 'light'
  | 'fan'
  | 'switch'
  | 'sensor'
  | 'helper'
  | 'climate'
  | 'media'
  | 'weather'
  | 'cover'
  | 'lock'
  | 'scene'
  | 'person'
  | 'vacuum'
  | 'calendar'
  | 'camera'
  | 'grouped-sensor'
  | 'hvac';

export interface NavetResource {
  kind: NavetResourceKind;
  providerId: IntegrationProviderId;
  entityId: string;
  path?: string;
}

export interface NavetProviderHealth {
  providerId: IntegrationProviderId;
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  implementationStatus: 'implemented' | 'planned';
  lastError: string | null;
}

export interface NavetProviderSession {
  providerId: IntegrationProviderId;
  connected: boolean;
  runtime?: string;
  authMode?: string;
}

export interface NavetDevice {
  id: string;
  canonicalId: string;
  providerId: IntegrationProviderId;
  nativeId: string;
  kind: NavetDeviceKind;
  name: string;
  room: string;
  capabilities: NavetCapability[];
  state: Record<string, unknown>;
  resources?: Partial<Record<NavetResourceKind, NavetResource>>;
}

export interface NavetRoom {
  id: string;
  canonicalId: string;
  providerId: IntegrationProviderId;
  nativeId: string;
  name: string;
  normalizedName: string;
  alias?: string;
  memberIds: string[];
}

export interface NavetProviderSnapshot {
  providerId: IntegrationProviderId;
  connected: boolean;
  devices: NavetDevice[];
  rooms: NavetRoom[];
}

export interface NavetActionIntent {
  targetId: string;
  providerId: IntegrationProviderId;
  actionId: string;
  payload?: Record<string, unknown>;
}

export interface NavetResourceResolveRequest {
  deviceId: string;
  providerId: IntegrationProviderId;
  kind: NavetResourceKind;
  attrs?: Record<string, unknown>;
  fallbackPicture?: string;
}

export interface NavetProviderContract {
  providerId: IntegrationProviderId;
  bootstrapSession?: (sessions: AuthSessionMap) => NavetProviderSession | null;
  getSnapshot: () => NavetProviderSnapshot;
  dispatchAction: (intent: NavetActionIntent) => Promise<void>;
  resolveResource?: (
    request: NavetResourceResolveRequest
  ) => Promise<ResolvedPlatformResource> | ResolvedPlatformResource;
  media?: ProviderMediaFeatureService;
}
