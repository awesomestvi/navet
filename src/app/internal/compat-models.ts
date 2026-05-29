import type { NavetResource, NavetResourceKind } from '@navet/core/types';
import type { IntegrationProviderId } from '@/app/types/provider';

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

// Deprecated compatibility-only migration model for current app state. New shared feature work
// should prefer provider-neutral `NavetEntity` from `src/providers/core/types.ts`.
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

export interface NavetRoomDescriptorSource {
  providerId: IntegrationProviderId;
  nativeId: string;
  canonicalId?: string;
  sourceType: 'provider_managed' | 'derived';
  supportsOrdering: boolean;
  supportsDeletion: boolean;
}

export interface NavetRoomDescriptor {
  id: string;
  canonicalId: string;
  name: string;
  normalizedName: string;
  providerIds: IntegrationProviderId[];
  memberIds: string[];
  sources: NavetRoomDescriptorSource[];
}

export interface NavetProviderRuntimeState {
  providerId: IntegrationProviderId;
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  entitiesHydrated: boolean;
  registriesHydrated: boolean;
}

export interface NavetProviderSnapshot {
  providerId: IntegrationProviderId;
  connected: boolean;
  devices: NavetDevice[];
  rooms: NavetRoom[];
}
