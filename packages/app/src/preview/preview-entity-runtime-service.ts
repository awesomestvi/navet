import type {
  PlatformEntityRegistryEntry,
  PlatformEntitySnapshotMap,
} from '@navet/core/provider-feature-models';
import type { ProviderEntityRuntimeService } from '@navet/core/provider-feature-services';
import type { NavetEntity } from '@navet/core/types';

interface PreviewEntityRuntimeHomeAssistantState {
  config: unknown;
  entityRegistry: Array<{
    entity_id: string;
    device_id?: string | null;
    area_id?: string | null;
  }>;
}

interface PreviewEntityRuntimeScenario {
  entities: NavetEntity[];
  homeAssistant: PreviewEntityRuntimeHomeAssistantState;
}

interface PreviewEntityRuntimeStoreState {
  scenario: PreviewEntityRuntimeScenario | null;
}

interface PreviewEntityRuntimeStoreSubscription<TState extends PreviewEntityRuntimeStoreState> {
  subscribe: (listener: (state: TState, previousState: TState) => void) => () => void;
}

interface PreviewEntityRuntimeServiceOptions<TState extends PreviewEntityRuntimeStoreState> {
  defaultConfig: unknown;
  getActiveScenario: () => PreviewEntityRuntimeScenario | null;
  getProviderEntities: () => NavetEntity[];
  store: PreviewEntityRuntimeStoreSubscription<TState>;
  timestamp: string;
}

function buildEntitySnapshotMap(
  entities: NavetEntity[],
  timestamp: string
): PlatformEntitySnapshotMap {
  return Object.fromEntries(
    entities.map((entity) => [
      entity.externalId,
      {
        entityId: entity.externalId,
        state:
          entity.primaryState === null || entity.primaryState === undefined
            ? 'unknown'
            : typeof entity.primaryState === 'string'
              ? entity.primaryState
              : String(entity.primaryState),
        attributes: entity.attributes,
        lastChanged: timestamp,
        lastUpdated: entity.lastUpdated ?? timestamp,
      },
    ])
  );
}

let cachedPreviewEntitySnapshotSource: NavetEntity[] | null = null;
let cachedPreviewEntitySnapshots: PlatformEntitySnapshotMap | null = null;
let cachedPreviewEntityRegistrySource:
  | PreviewEntityRuntimeScenario['homeAssistant']['entityRegistry']
  | null = null;
let cachedPreviewEntityRegistryEntries: PlatformEntityRegistryEntry[] = [];
let cachedPreviewEntityRegistryById: Record<string, PlatformEntityRegistryEntry | undefined> = {};

export function resetPreviewEntityRuntimeCaches() {
  cachedPreviewEntitySnapshotSource = null;
  cachedPreviewEntitySnapshots = null;
  cachedPreviewEntityRegistrySource = null;
  cachedPreviewEntityRegistryEntries = [];
  cachedPreviewEntityRegistryById = {};
}

function getPreviewEntitySnapshotMap(
  entities: NavetEntity[],
  timestamp: string
): PlatformEntitySnapshotMap {
  if (cachedPreviewEntitySnapshotSource === entities && cachedPreviewEntitySnapshots) {
    return cachedPreviewEntitySnapshots;
  }

  cachedPreviewEntitySnapshotSource = entities;
  cachedPreviewEntitySnapshots = buildEntitySnapshotMap(entities, timestamp);
  return cachedPreviewEntitySnapshots;
}

function getPreviewEntityRegistryEntries(
  entityRegistry: PreviewEntityRuntimeScenario['homeAssistant']['entityRegistry'] | undefined
): PlatformEntityRegistryEntry[] {
  const nextSource = entityRegistry ?? [];
  if (cachedPreviewEntityRegistrySource === nextSource) {
    return cachedPreviewEntityRegistryEntries;
  }

  cachedPreviewEntityRegistrySource = nextSource;
  cachedPreviewEntityRegistryEntries = nextSource.map(
    (entry): PlatformEntityRegistryEntry => ({
      entityId: entry.entity_id,
      deviceId: entry.device_id,
      areaId: entry.area_id ?? null,
      name: null,
      platform: 'preview',
    })
  );
  cachedPreviewEntityRegistryById = Object.fromEntries(
    cachedPreviewEntityRegistryEntries.map((entry) => [entry.entityId, entry])
  );
  return cachedPreviewEntityRegistryEntries;
}

export function createPreviewEntityRuntimeService<TState extends PreviewEntityRuntimeStoreState>({
  defaultConfig,
  getActiveScenario,
  getProviderEntities,
  store,
  timestamp,
}: PreviewEntityRuntimeServiceOptions<TState>): ProviderEntityRuntimeService {
  return {
    getEntitySnapshots: () => getPreviewEntitySnapshotMap(getProviderEntities(), timestamp),
    subscribeEntitySnapshots: (listener: () => void) =>
      store.subscribe((state, previousState) => {
        if (state.scenario?.entities !== previousState.scenario?.entities) {
          listener();
        }
      }),
    getEntitySnapshot: (entityId: string) =>
      getPreviewEntitySnapshotMap(getProviderEntities(), timestamp)[entityId],
    subscribeEntitySnapshot: (_entityId: string, listener: () => void) =>
      store.subscribe((state, previousState) => {
        if (state.scenario?.entities !== previousState.scenario?.entities) {
          listener();
        }
      }),
    getEntityRegistryEntries: () =>
      getPreviewEntityRegistryEntries(getActiveScenario()?.homeAssistant.entityRegistry),
    subscribeEntityRegistryEntries: (listener: () => void) =>
      store.subscribe((state, previousState) => {
        if (
          state.scenario?.homeAssistant.entityRegistry !==
          previousState.scenario?.homeAssistant.entityRegistry
        ) {
          listener();
        }
      }),
    getEntityRegistryEntry: (entityId: string) => {
      getPreviewEntityRegistryEntries(getActiveScenario()?.homeAssistant.entityRegistry);
      return cachedPreviewEntityRegistryById[entityId];
    },
    subscribeEntityRegistryEntry: (entityId: string, listener: () => void) =>
      store.subscribe((state, previousState) => {
        if (
          state.scenario?.homeAssistant.entityRegistry !==
          previousState.scenario?.homeAssistant.entityRegistry
        ) {
          const previousRegistryEntries = getPreviewEntityRegistryEntries(
            previousState.scenario?.homeAssistant.entityRegistry
          );
          const previousEntry = previousRegistryEntries.find(
            (entry) => entry.entityId === entityId
          );
          const nextRegistryEntries = getPreviewEntityRegistryEntries(
            state.scenario?.homeAssistant.entityRegistry
          );
          const nextEntry = nextRegistryEntries.find((entry) => entry.entityId === entityId);
          if (nextEntry !== previousEntry) {
            listener();
          }
        }
      }),
    getConfig: () => getActiveScenario()?.homeAssistant.config ?? defaultConfig,
    subscribeConfig: (listener: () => void) =>
      store.subscribe((state, previousState) => {
        if (state.scenario?.homeAssistant.config !== previousState.scenario?.homeAssistant.config) {
          listener();
        }
      }),
  };
}
