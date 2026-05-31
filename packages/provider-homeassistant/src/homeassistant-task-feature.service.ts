import type {
  PlatformTaskEntityMap,
  PlatformTaskRuntimeSnapshot,
} from '@navet/core/provider-feature-models';
import type { ProviderTaskFeatureService } from '@navet/core/provider-feature-services';
import type { HomeAssistantStoreState } from './homeassistant-service-bridge';
import {
  callHomeAssistantService,
  getHomeAssistantAutomationConfig,
  getHomeAssistantStoreState,
  subscribeHomeAssistantStore,
} from './homeassistant-service-bridge';

function mapTaskEntities(state: HomeAssistantStoreState): PlatformTaskEntityMap | null {
  if (!state.entities) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(state.entities).map(([entityId, entity]) => [
      entityId,
      {
        entityId,
        state: entity.state,
        name:
          typeof entity.attributes.friendly_name === 'string'
            ? entity.attributes.friendly_name
            : undefined,
        attributes: entity.attributes,
      },
    ])
  );
}

let cachedSnapshot: {
  entities: HomeAssistantStoreState['entities'];
  areas: HomeAssistantStoreState['areas'];
  deviceRegistry: HomeAssistantStoreState['deviceRegistry'];
  entityRegistry: HomeAssistantStoreState['entityRegistry'];
  snapshot: PlatformTaskRuntimeSnapshot;
} | null = null;

function createHomeAssistantTaskRuntimeSnapshot(
  state: HomeAssistantStoreState
): PlatformTaskRuntimeSnapshot {
  const entities = state.entities;
  const areas = state.areas;
  const deviceRegistry = state.deviceRegistry;
  const entityRegistry = state.entityRegistry;

  if (
    cachedSnapshot &&
    cachedSnapshot.entities === entities &&
    cachedSnapshot.areas === areas &&
    cachedSnapshot.deviceRegistry === deviceRegistry &&
    cachedSnapshot.entityRegistry === entityRegistry
  ) {
    return cachedSnapshot.snapshot;
  }

  const snapshot: PlatformTaskRuntimeSnapshot = {
    entities: mapTaskEntities(state),
    rooms: areas.map((area) => ({ id: area.area_id, name: area.name })),
    devices: deviceRegistry.map((device) => ({ id: device.id, roomId: device.area_id })),
    entityReferences: entityRegistry.map((entity) => ({
      entityId: entity.entity_id,
      roomId: entity.area_id,
      deviceId: entity.device_id,
    })),
  };

  cachedSnapshot = {
    entities,
    areas,
    deviceRegistry,
    entityRegistry,
    snapshot,
  };

  return snapshot;
}

export const homeAssistantTaskFeatureService: ProviderTaskFeatureService = {
  getTaskRuntimeSnapshot: () =>
    createHomeAssistantTaskRuntimeSnapshot(getHomeAssistantStoreState()),
  subscribeTaskRuntimeSnapshot: (listener) => subscribeHomeAssistantStore(listener),
  getAutomationDetails: async (entityId) => {
    const response = await getHomeAssistantAutomationConfig(entityId);
    return { config: response.config };
  },
  triggerAutomation: async (entityId) =>
    await callHomeAssistantService('automation', 'trigger', {}, { entity_id: entityId }),
};
