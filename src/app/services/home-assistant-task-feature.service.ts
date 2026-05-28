import type {
  PlatformTaskEntityMap,
  PlatformTaskRuntimeSnapshot,
} from '@/app/platform/provider-feature-models';
import type { ProviderTaskFeatureService } from '@/app/platform/provider-feature-services';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { type HomeAssistantStore, homeAssistantStore } from '@/app/stores/home-assistant-store';

function mapTaskEntities(state: HomeAssistantStore): PlatformTaskEntityMap | null {
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
  entities: HomeAssistantStore['entities'];
  areas: HomeAssistantStore['areas'];
  deviceRegistry: HomeAssistantStore['deviceRegistry'];
  entityRegistry: HomeAssistantStore['entityRegistry'];
  snapshot: PlatformTaskRuntimeSnapshot;
} | null = null;

function createHomeAssistantTaskRuntimeSnapshot(
  state: HomeAssistantStore
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
    createHomeAssistantTaskRuntimeSnapshot(homeAssistantStore.getState()),
  subscribeTaskRuntimeSnapshot: (listener) => homeAssistantStore.subscribe(listener),
  getAutomationDetails: async (entityId) => {
    const response = await homeAssistantService.getAutomationConfig(entityId);
    return { config: response.config };
  },
};
