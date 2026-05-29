import { useMemo } from 'react';
import type { PlatformEntityRegistryEntry } from '@/app/platform/provider-feature-models';
import type { IntegrationProviderId } from '@/app/types/provider';
import { getProviderNativeId, parseProviderScopedId } from '@/app/utils/provider-ids';
import { useIntegrationStore } from './use-integration-store';
import { useProviderEntityRegistryEntries } from './use-provider-entity';

const EMPTY_IDS: string[] = [];

/** HVAC sibling domains: fan, switch, input_boolean, script, button, input_button */
const HVAC_SIBLING_PATTERN = /^(fan|switch|input_boolean|script|button|input_button)\./;

function selectEmptyRegistryDeviceIds(): RegistryDeviceIdsSlice {
  return { deviceId: null, siblingIds: EMPTY_IDS };
}

function selectEmptyEntityRoomRegistryContext(): EntityRoomRegistryContext {
  return { entry: null, deviceAreaId: null };
}

export interface RegistryDeviceIdsSlice {
  deviceId: string | null;
  siblingIds: string[];
}

export type ProviderDeviceTopology = RegistryDeviceIdsSlice;

function collectDeviceSiblingIds(
  registry: PlatformEntityRegistryEntry[],
  entityId: string,
  includeEntity: (e: PlatformEntityRegistryEntry) => boolean
): RegistryDeviceIdsSlice {
  const self = registry.find((entry) => entry.entityId === entityId);
  const deviceId = self?.deviceId ?? null;
  if (!deviceId) {
    return { deviceId: null, siblingIds: EMPTY_IDS };
  }

  const siblingIds = registry
    .filter(
      (entry) => entry.deviceId === deviceId && entry.entityId !== entityId && includeEntity(entry)
    )
    .map((entry) => entry.entityId);

  if (siblingIds.length === 0) {
    return { deviceId, siblingIds: EMPTY_IDS };
  }

  siblingIds.sort((left, right) => left.localeCompare(right));
  return { deviceId, siblingIds };
}

function resolveProviderRegistryTarget(
  entityId: string,
  currentProviderId: IntegrationProviderId
): {
  providerId: IntegrationProviderId | null;
  runtimeEntityId: string | null;
} {
  const scopedId = parseProviderScopedId(entityId);
  if (scopedId) {
    return {
      providerId: scopedId.providerId,
      runtimeEntityId: scopedId.nativeId,
    };
  }

  return {
    providerId: currentProviderId,
    runtimeEntityId: getProviderNativeId(entityId),
  };
}

export function useHvacRegistryDeviceTopology(entityId: string): RegistryDeviceIdsSlice {
  const currentProviderId = useIntegrationStore((state) => state.currentProviderId);
  const { providerId, runtimeEntityId } = resolveProviderRegistryTarget(
    entityId,
    currentProviderId
  );
  const registry = useProviderEntityRegistryEntries({
    providerId: providerId ?? undefined,
    enabled: Boolean(providerId && runtimeEntityId),
  });

  return useMemo(
    () =>
      runtimeEntityId
        ? collectDeviceSiblingIds(registry, runtimeEntityId, (entry) =>
            HVAC_SIBLING_PATTERN.test(entry.entityId)
          )
        : selectEmptyRegistryDeviceIds(),
    [registry, runtimeEntityId]
  );
}

export function useProviderHvacTopology(entityId: string): ProviderDeviceTopology {
  return useHvacRegistryDeviceTopology(entityId);
}

export function useSwitchRegistryDeviceTopology(entityId: string): RegistryDeviceIdsSlice {
  const currentProviderId = useIntegrationStore((state) => state.currentProviderId);
  const { providerId, runtimeEntityId } = resolveProviderRegistryTarget(
    entityId,
    currentProviderId
  );
  const registry = useProviderEntityRegistryEntries({
    providerId: providerId ?? undefined,
    enabled: Boolean(providerId && runtimeEntityId),
  });

  return useMemo(
    () =>
      runtimeEntityId
        ? collectDeviceSiblingIds(registry, runtimeEntityId, (entry) =>
            entry.entityId.startsWith('switch.')
          )
        : selectEmptyRegistryDeviceIds(),
    [registry, runtimeEntityId]
  );
}

export function useProviderSwitchTopology(entityId: string): ProviderDeviceTopology {
  return useSwitchRegistryDeviceTopology(entityId);
}

export function useCameraRegistryDeviceTopology(entityId: string): RegistryDeviceIdsSlice {
  const currentProviderId = useIntegrationStore((state) => state.currentProviderId);
  const { providerId, runtimeEntityId } = resolveProviderRegistryTarget(
    entityId,
    currentProviderId
  );
  const registry = useProviderEntityRegistryEntries({
    providerId: providerId ?? undefined,
    enabled: Boolean(providerId && runtimeEntityId),
  });

  return useMemo(
    () =>
      runtimeEntityId
        ? collectDeviceSiblingIds(registry, runtimeEntityId, () => true)
        : selectEmptyRegistryDeviceIds(),
    [registry, runtimeEntityId]
  );
}

export function useProviderCameraTopology(entityId: string): ProviderDeviceTopology {
  return useCameraRegistryDeviceTopology(entityId);
}

/** Minimal registry fields used by {@link EntityRoomSelector}. */
export interface EntityRoomRegistryPick {
  entity_id: string;
  area_id: string | null;
  device_id: string | null;
}

export interface EntityRoomRegistryContext {
  entry: EntityRoomRegistryPick | null;
  /** `device_registry` area fallback when the entity has no direct `area_id`. */
  deviceAreaId: string | null;
}

export type ProviderEntityRoomContext = EntityRoomRegistryContext;

export function useEntityRoomRegistryContext(entityId: string): EntityRoomRegistryContext {
  const currentProviderId = useIntegrationStore((state) => state.currentProviderId);
  const { providerId, runtimeEntityId } = resolveProviderRegistryTarget(
    entityId,
    currentProviderId
  );
  const registry = useProviderEntityRegistryEntries({
    providerId: providerId ?? undefined,
    enabled: Boolean(providerId && runtimeEntityId),
  });

  return useMemo((): EntityRoomRegistryContext => {
    if (!runtimeEntityId) {
      return selectEmptyEntityRoomRegistryContext();
    }

    const raw = registry.find((entry) => entry.entityId === runtimeEntityId);
    const siblingEntries = raw?.deviceId
      ? registry.filter((entry) => entry.deviceId === raw.deviceId)
      : [];
    const deviceAreaId = siblingEntries.find((entry) => entry.areaId != null)?.areaId ?? null;

    return {
      entry: raw
        ? {
            entity_id: raw.entityId,
            area_id: raw.areaId ?? null,
            device_id: raw.deviceId ?? null,
          }
        : null,
      deviceAreaId,
    };
  }, [registry, runtimeEntityId]);
}

export function useProviderEntityRoomContext(entityId: string): ProviderEntityRoomContext {
  return useEntityRoomRegistryContext(entityId);
}
