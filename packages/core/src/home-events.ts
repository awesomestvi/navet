import type { IntegrationProviderId } from './integration-providers';

export type HomeEventSource = 'manual' | 'automation' | 'provider' | 'navet' | 'unknown';

export type HomeEventAction =
  | 'turned_on'
  | 'turned_off'
  | 'state_changed'
  | 'brightness_changed'
  | 'temperature_changed'
  | 'presence_changed'
  | 'energy_sampled'
  | 'context_sampled';

export interface EventContext {
  roomId?: string;
  occupancy?: 'occupied' | 'vacant' | 'unknown';
  lux?: number | null;
  sunPosition?: 'night' | 'dawn' | 'day' | 'dusk' | 'unknown';
  userPresence?: 'home' | 'away' | 'unknown';
  previousState?: string | number | boolean | null;
  currentState?: string | number | boolean | null;
  deviceState?: Record<string, string | number | boolean | null>;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface HomeEvent {
  id: string;
  providerId: IntegrationProviderId;
  entityId: string;
  canonicalEntityId: string;
  domain: string;
  roomId?: string;
  action: HomeEventAction;
  source: HomeEventSource;
  timestamp: string;
  previousState?: string | number | boolean | null;
  currentState?: string | number | boolean | null;
  context: EventContext;
}
