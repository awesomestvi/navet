import type {
  PlatformTaskEntityMap,
  PlatformTaskRuntimeSnapshot,
} from '@navet/core/provider-feature-models';
import type { ProviderTaskFeatureService } from '@navet/core/provider-feature-services';
import { areDataEqual } from '@navet/core/structural-equality';
import type { HomeAssistantStoreState } from './homeassistant-service-bridge';
import {
  callHomeAssistantService,
  getHomeAssistantAutomationConfig,
  getHomeAssistantStoreState,
  subscribeHomeAssistantStore,
} from './homeassistant-service-bridge';

const TASK_ENTITY_PREFIXES = ['automation.', 'scene.', 'script.'] as const;

function isTaskEntityId(entityId: string) {
  return TASK_ENTITY_PREFIXES.some((prefix) => entityId.startsWith(prefix));
}

let cachedTaskEntities: {
  entityIds: string[];
  mapped: PlatformTaskEntityMap;
  source: NonNullable<HomeAssistantStoreState['entities']>;
} | null = null;

function mapTaskEntities(
  entities: HomeAssistantStoreState['entities'],
  forceEntityIdScan: boolean
): PlatformTaskEntityMap | null {
  if (!entities) {
    cachedTaskEntities = null;
    return null;
  }

  if (cachedTaskEntities?.source === entities) {
    return cachedTaskEntities.mapped;
  }

  // The task runtime snapshot is the list surface consumed by Home, Lights, and Tasks. Keep it
  // limited to routines so unrelated entity updates do not invalidate every task consumer.
  // Automation detail dependencies are resolved on demand through the provider entity runtime.
  const entityIds = Object.keys(entities).filter(isTaskEntityId);
  const previousCache = cachedTaskEntities;
  let taskEntitiesChanged =
    forceEntityIdScan || !previousCache || entityIds.length !== previousCache.entityIds.length;
  if (!taskEntitiesChanged && previousCache) {
    taskEntitiesChanged = entityIds.some(
      (entityId, index) =>
        previousCache.entityIds[index] !== entityId ||
        (previousCache.source[entityId] !== entities[entityId] &&
          (previousCache.mapped[entityId]?.state !== entities[entityId]?.state ||
            previousCache.mapped[entityId]?.name !==
              (typeof entities[entityId]?.attributes.friendly_name === 'string'
                ? entities[entityId].attributes.friendly_name
                : undefined) ||
            !areDataEqual(
              previousCache.mapped[entityId]?.attributes ?? {},
              entities[entityId]?.attributes ?? {}
            )))
    );
  }

  if (!taskEntitiesChanged && cachedTaskEntities) {
    cachedTaskEntities = {
      ...cachedTaskEntities,
      source: entities,
    };
    return cachedTaskEntities.mapped;
  }

  const mapped = Object.fromEntries(
    entityIds.flatMap((entityId) => {
      const entity = entities[entityId];
      const previousEntity = cachedTaskEntities?.source[entityId];
      const previousMapped = cachedTaskEntities?.mapped[entityId];
      const friendlyName =
        typeof entity?.attributes.friendly_name === 'string'
          ? entity.attributes.friendly_name
          : undefined;
      if (
        entity &&
        previousMapped &&
        (previousEntity === entity ||
          (previousMapped.state === entity.state &&
            previousMapped.name === friendlyName &&
            areDataEqual(previousMapped.attributes, entity.attributes)))
      ) {
        return [[entityId, previousMapped]];
      }
      return entity
        ? [
            [
              entityId,
              {
                entityId,
                state: entity.state,
                name: friendlyName,
                attributes: { ...entity.attributes },
              },
            ],
          ]
        : [];
    })
  ) as PlatformTaskEntityMap;

  cachedTaskEntities = {
    entityIds,
    mapped,
    source: entities,
  };

  return mapped;
}

function mapTaskEntityReferences(
  state: HomeAssistantStoreState,
  automationCategoryNames: Map<string, string>
) {
  return state.entityRegistry
    .filter((entity) => isTaskEntityId(entity.entity_id))
    .map((entity) => {
      const category = entity.categories?.automation
        ? automationCategoryNames.get(entity.categories.automation)
        : undefined;
      return {
        entityId: entity.entity_id,
        roomId: entity.area_id,
        deviceId: entity.device_id,
        ...(category ? { category } : {}),
      };
    });
}

let cachedSnapshot: {
  areas: HomeAssistantStoreState['areas'];
  deviceRegistry: HomeAssistantStoreState['deviceRegistry'];
  entityRegistry: HomeAssistantStoreState['entityRegistry'];
  automationCategories: HomeAssistantStoreState['automationCategories'];
  taskEntities: PlatformTaskEntityMap | null;
  snapshot: PlatformTaskRuntimeSnapshot;
} | null = null;

function createHomeAssistantTaskRuntimeSnapshot(
  state: HomeAssistantStoreState
): PlatformTaskRuntimeSnapshot {
  const entities = state.entities;
  const areas = state.areas;
  const deviceRegistry = state.deviceRegistry;
  const entityRegistry = state.entityRegistry;
  const automationCategories = state.automationCategories;
  const taskEntities = mapTaskEntities(
    entities,
    cachedSnapshot !== null && cachedSnapshot.entityRegistry !== entityRegistry
  );

  if (
    cachedSnapshot &&
    cachedSnapshot.taskEntities === taskEntities &&
    cachedSnapshot.areas === areas &&
    cachedSnapshot.deviceRegistry === deviceRegistry &&
    cachedSnapshot.entityRegistry === entityRegistry &&
    cachedSnapshot.automationCategories === automationCategories
  ) {
    return cachedSnapshot.snapshot;
  }

  const automationCategoryNames = new Map(
    automationCategories?.map((category) => [category.category_id, category.name]) ?? []
  );

  const snapshot: PlatformTaskRuntimeSnapshot = {
    entities: taskEntities,
    rooms: areas.map((area) => ({ id: area.area_id, name: area.name })),
    devices: deviceRegistry.map((device) => ({ id: device.id, roomId: device.area_id })),
    entityReferences: mapTaskEntityReferences(state, automationCategoryNames),
  };

  cachedSnapshot = {
    areas,
    deviceRegistry,
    entityRegistry,
    automationCategories,
    taskEntities,
    snapshot,
  };

  return snapshot;
}

export const homeAssistantTaskFeatureService: ProviderTaskFeatureService = {
  getTaskRuntimeSnapshot: () =>
    createHomeAssistantTaskRuntimeSnapshot(getHomeAssistantStoreState()),
  subscribeTaskRuntimeSnapshot: (listener) => {
    let currentSnapshot = createHomeAssistantTaskRuntimeSnapshot(getHomeAssistantStoreState());
    return subscribeHomeAssistantStore(() => {
      const nextSnapshot = createHomeAssistantTaskRuntimeSnapshot(getHomeAssistantStoreState());
      if (nextSnapshot === currentSnapshot) {
        return;
      }
      currentSnapshot = nextSnapshot;
      listener();
    });
  },
  getAutomationDetails: async (entityId) => {
    const response = await getHomeAssistantAutomationConfig(entityId);
    return { config: response.config };
  },
  triggerAutomation: async (entityId) =>
    await callHomeAssistantService('automation', 'trigger', {}, { entityId: entityId }),
};
