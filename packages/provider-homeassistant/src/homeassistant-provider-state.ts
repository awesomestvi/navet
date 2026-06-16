import type { NavetProviderState } from '@navet/core/types';
import {
  buildHomeAssistantProviderRooms,
  type HomeAssistantNavetMappingInput,
  mapHomeAssistantEntitiesToNavetEntities,
} from './homeassistant-mappers';

export type HomeAssistantProviderStateInput = HomeAssistantNavetMappingInput;

export function buildHomeAssistantProviderState(
  input: HomeAssistantProviderStateInput,
  options: { connected: boolean }
): NavetProviderState {
  return {
    providerId: 'home_assistant',
    connected: options.connected,
    entities: mapHomeAssistantEntitiesToNavetEntities(input),
    rooms: buildHomeAssistantProviderRooms(input),
  };
}
