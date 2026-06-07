import type { NavetCapabilityId } from './capabilities';
import type { IntegrationProviderId } from './integration-providers';

export type NavetResourceKind =
  | 'primary_image'
  | 'media_artwork'
  | 'camera_snapshot'
  | 'camera_stream';

export interface NavetResource {
  kind: NavetResourceKind;
  providerId: IntegrationProviderId;
  entityId: string;
  path?: string;
}

export type NavetEntityType =
  | 'light'
  | 'fan'
  | 'switch'
  | 'sensor'
  | 'binary_sensor'
  | 'helper'
  | 'climate'
  | 'media_player'
  | 'weather'
  | 'cover'
  | 'lock'
  | 'scene'
  | 'person'
  | 'vacuum'
  | 'calendar'
  | 'camera'
  | 'grouped_sensor'
  | 'hvac'
  | 'energy'
  | 'unknown';

export type NavetEntityPrimaryState = string | number | boolean | null;

export type NavetEntityAvailability = 'available' | 'unavailable' | 'unknown';

export interface NavetEntity {
  id: string;
  canonicalId: string;
  providerId: IntegrationProviderId;
  externalId: string;
  type: NavetEntityType;
  name: string;
  room?: string;
  primaryState: NavetEntityPrimaryState;
  availability: NavetEntityAvailability;
  attributes: Record<string, unknown>;
  capabilities: NavetCapabilityId[];
  resources?: Partial<Record<NavetResourceKind, NavetResource>>;
  lastUpdated?: string;
}

export interface NavetProviderRoom {
  id: string;
  canonicalId: string;
  providerId: IntegrationProviderId;
  externalId: string;
  name: string;
  normalizedName: string;
  alias?: string;
  memberIds: string[];
}

export interface NavetProviderState {
  providerId: IntegrationProviderId;
  connected: boolean;
  entities: NavetEntity[];
  rooms: NavetProviderRoom[];
}

// Shared UI should emit only provider-neutral commands. Keep `service` as an adapter/app shim.
export type NavetCommand =
  | { type: 'turn_on'; entityId: string }
  | { type: 'turn_off'; entityId: string }
  | { type: 'set_fan_speed'; entityId: string; percentage: number }
  | { type: 'play_pause'; entityId: string }
  | { type: 'previous_track'; entityId: string }
  | { type: 'next_track'; entityId: string }
  | { type: 'set_volume'; entityId: string; volume: number }
  | { type: 'mute'; entityId: string }
  | { type: 'unmute'; entityId: string }
  | { type: 'set_shuffle'; entityId: string; shuffle: boolean }
  | { type: 'set_repeat_mode'; entityId: string; repeatMode: 'off' | 'one' | 'all' }
  | { type: 'join_group'; entityId: string; members: string[] }
  | { type: 'leave_group'; entityId: string }
  | { type: 'set_climate_mode'; entityId: string; mode: string }
  | { type: 'set_brightness'; entityId: string; brightness: number }
  | { type: 'set_color_temperature'; entityId: string; kelvin: number }
  | { type: 'set_temperature'; entityId: string; temperature: number }
  | { type: 'lock'; entityId: string }
  | { type: 'unlock'; entityId: string }
  | { type: 'arm_home'; entityId: string; code?: string }
  | { type: 'arm_away'; entityId: string; code?: string }
  | { type: 'arm_night'; entityId: string; code?: string }
  | { type: 'arm_vacation'; entityId: string; code?: string }
  | { type: 'arm_custom_bypass'; entityId: string; code?: string }
  | { type: 'disarm'; entityId: string; code?: string }
  | { type: 'trigger'; entityId: string; code?: string }
  | { type: 'open'; entityId: string }
  | { type: 'close'; entityId: string }
  | { type: 'start'; entityId: string }
  | { type: 'stop'; entityId: string }
  | { type: 'return_home'; entityId: string }
  | {
      type: 'service';
      entityId: string;
      domain: string;
      service: string;
      serviceData?: Record<string, unknown>;
      target?: Record<string, unknown>;
    };

export type NavetUiCommand = Exclude<NavetCommand, { type: 'service' }>;

export interface CommandResult {
  accepted: boolean;
  providerRequestId?: string;
  optimisticState?: Partial<Pick<NavetEntity, 'primaryState' | 'availability' | 'attributes'>>;
  requiresEventConfirmation: boolean;
  error?: string;
}

export type NavetEntityEvent =
  | {
      type: 'entity_added' | 'entity_updated' | 'entity_removed';
      providerId: IntegrationProviderId;
      entityId: string;
      entity?: NavetEntity;
      at: string;
    }
  | {
      type: 'connection_changed';
      providerId: IntegrationProviderId;
      connected: boolean;
      at: string;
    };

export type Unsubscribe = () => void;
