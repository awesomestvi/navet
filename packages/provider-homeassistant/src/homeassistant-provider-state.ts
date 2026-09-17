import type { NavetProviderState } from '@navet/core/types';
import {
  buildHomeAssistantProviderRooms,
  type HomeAssistantNavetMappingInput,
  mapHomeAssistantEntitiesToNavetEntities,
} from './homeassistant-mappers';

export type HomeAssistantProviderStateInput = HomeAssistantNavetMappingInput;

export function buildHomeAssistantProviderState(
  input: HomeAssistantProviderStateInput,
  options: Omit<NavetProviderState, 'entities' | 'rooms' | 'providerId'>
): NavetProviderState {
  const entities = mapHomeAssistantEntitiesToNavetEntities(input);

  return {
    providerId: 'home_assistant',
    ...options,
    entities,
    rooms: buildHomeAssistantProviderRooms(input, entities),
  };
}
