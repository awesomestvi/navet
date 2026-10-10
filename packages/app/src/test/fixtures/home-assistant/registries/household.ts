import type {
  HomeAssistantAreaRegistryEntry,
  HomeAssistantDeviceRegistryEntry,
  HomeAssistantEntityRegistryEntry,
} from '@navet/app/services/home-assistant.service';

type HouseholdRegistrySnapshot = {
  areas: HomeAssistantAreaRegistryEntry[];
  devices: HomeAssistantDeviceRegistryEntry[];
  entities: HomeAssistantEntityRegistryEntry[];
};

// Registry changes need not change entity state or last_updated.
export const householdRegistryBefore: HouseholdRegistrySnapshot = {
  areas: [
    { area_id: 'kitchen', name: 'Kitchen' },
    { area_id: 'dining_room', name: 'Dining room' },
  ],
  devices: [{ id: 'island_light', name: 'Ceiling light', name_by_user: null, area_id: 'kitchen' }],
  entities: [
    {
      entity_id: 'light.kitchen_island',
      device_id: 'island_light',
      area_id: null,
      name: null,
      original_name: 'Ceiling light',
      platform: 'hue',
    },
  ],
};

export const householdRegistryAfter: HouseholdRegistrySnapshot = {
  areas: [
    { area_id: 'kitchen', name: 'Kitchen and dining' },
    { area_id: 'dining_room', name: 'Dining room' },
  ],
  devices: [
    {
      id: 'island_light',
      name: 'Ceiling light',
      name_by_user: 'Island lights',
      area_id: 'dining_room',
    },
  ],
  entities: [{ ...householdRegistryBefore.entities[0], name: 'Dining lights' }],
};

export const householdRegistryEvents = [
  {
    event_type: 'entity_registry_updated',
    data: { action: 'update', entity_id: 'light.kitchen_island', changes: { name: null } },
  },
  {
    event_type: 'device_registry_updated',
    data: {
      action: 'update',
      device_id: 'island_light',
      changes: { area_id: 'kitchen', name_by_user: null },
    },
  },
  {
    event_type: 'area_registry_updated',
    data: { action: 'update', area_id: 'kitchen', changes: { name: 'Kitchen' } },
  },
];
