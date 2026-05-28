import { useCallback, useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import { useHomeAssistant } from '@/app/hooks';
import { useProviderDevice } from '@/app/hooks/use-provider-device';
import { useProviderHealth } from '@/app/hooks/use-provider-health';
import type {
  PlatformEntitySnapshot,
  PlatformEntitySnapshotMap,
} from '@/app/platform/provider-feature-models';
import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { resolveHomeAssistantEntityId } from '@/app/utils/provider-entity-id';

const EMPTY_DEVICE_RECORD: PlatformEntitySnapshotMap = {};

function selectUndefinedEntity() {
  return undefined;
}

function selectEmptyDeviceRecord() {
  return EMPTY_DEVICE_RECORD;
}

export interface ProviderCameraLiveData {
  connected: boolean;
  deviceEntities: Record<string, PlatformEntitySnapshot | undefined>;
  isHomeAssistantProvider: boolean;
  liveEntity: PlatformEntitySnapshot | undefined;
}

function toPlatformEntitySnapshot(
  entityId: string,
  entity: {
    state: string;
    attributes?: Record<string, unknown>;
    last_changed?: string;
    last_updated?: string;
  }
): PlatformEntitySnapshot {
  return {
    entityId,
    state: entity.state,
    attributes: (entity.attributes as Record<string, unknown> | undefined) ?? {},
    lastChanged: entity.last_changed,
    lastUpdated: entity.last_updated,
  };
}

export function useProviderCameraLiveData(
  entityId: string,
  deviceEntityIds: string[]
): ProviderCameraLiveData {
  const providerDevice = useProviderDevice(entityId);
  const homeAssistantEntityId = useMemo(
    () => resolveHomeAssistantEntityId(entityId, providerDevice?.providerId),
    [entityId, providerDevice?.providerId]
  );
  const isHomeAssistantProvider = homeAssistantEntityId !== null;
  const providerHealth = useProviderHealth('home_assistant');
  const liveEntity = useHomeAssistant(
    homeAssistantEntityId
      ? (state) => {
          const entity = homeAssistantSelectors.entity(homeAssistantEntityId)(state);
          return entity ? toPlatformEntitySnapshot(homeAssistantEntityId, entity) : undefined;
        }
      : selectUndefinedEntity
  );
  const deviceEntitySelector = useCallback(
    (state: HomeAssistantStore): Record<string, PlatformEntitySnapshot | undefined> => {
      if (!homeAssistantEntityId || deviceEntityIds.length === 0 || !state.entities) {
        return EMPTY_DEVICE_RECORD;
      }

      return Object.fromEntries(
        deviceEntityIds.map((providerScopedEntityId) => {
          const nativeEntityId =
            resolveHomeAssistantEntityId(providerScopedEntityId, 'home_assistant') ??
            providerScopedEntityId;
          const entity = state.entities?.[nativeEntityId];
          return [
            nativeEntityId,
            entity ? toPlatformEntitySnapshot(nativeEntityId, entity) : undefined,
          ];
        })
      );
    },
    [deviceEntityIds, homeAssistantEntityId]
  );
  const deviceEntities = useHomeAssistant(
    homeAssistantEntityId ? deviceEntitySelector : selectEmptyDeviceRecord,
    shallow
  );

  return {
    connected: isHomeAssistantProvider ? providerHealth.connected : false,
    deviceEntities,
    isHomeAssistantProvider,
    liveEntity,
  };
}
