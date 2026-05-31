import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import type { DeviceMetric } from '@navet/app/types/device.types';
import type { IntegrationProviderId } from '@navet/app/types/provider';

export type ProviderId = IntegrationProviderId;

export type PlatformCapability =
  | 'toggle'
  | 'brightness'
  | 'color_temperature'
  | 'lock'
  | 'position'
  | 'temperature_setpoint'
  | 'media_playback'
  | 'camera_snapshot'
  | 'presence'
  | 'numeric_sensor';

export interface PlatformIdentity {
  providerId: ProviderId;
  nativeId: string;
  canonicalId: string;
}

export interface PlatformEntity extends PlatformIdentity {
  name: string;
  room: string;
  size: CardSize;
  capabilities: PlatformCapability[];
}

export interface PlatformDevice extends PlatformEntity {
  kind:
    | 'light'
    | 'fan'
    | 'switch'
    | 'helper'
    | 'climate'
    | 'media'
    | 'weather'
    | 'cover'
    | 'lock'
    | 'scene'
    | 'person'
    | 'sensor'
    | 'vacuum'
    | 'calendar'
    | 'camera'
    | 'grouped-sensor'
    | 'hvac';
  metrics?: DeviceMetric[];
}

export interface PlatformRoom {
  id: string;
  key: string;
  name: string;
  providerIds: ProviderId[];
  canonicalMemberIds: string[];
}

export interface ProviderHealth {
  providerId: ProviderId;
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  implementationStatus: 'implemented' | 'planned';
  lastError: string | null;
}

export interface ProviderSession {
  providerId: ProviderId;
  connected: boolean;
  runtime: string;
}

export interface ProviderRuntimeAdapter {
  providerId: ProviderId;
  getHealth: () => ProviderHealth;
}

export interface ProviderSnapshotAdapter {
  providerId: ProviderId;
  subscribe: (listener: () => void) => () => void;
}

export interface ProviderResourceAdapter {
  providerId: ProviderId;
  resolvePath?: (path: string) => Promise<string> | string;
}
