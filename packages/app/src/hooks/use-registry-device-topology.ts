import type { PlatformEntityRegistryEntry } from '@navet/app/platform/provider-feature-models';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { getProviderNativeId, parseProviderScopedId } from '@navet/app/utils/provider-ids';
import { useMemo } from 'react';
import { useIntegrationStore } from './use-integration-store';
import { useProviderEntityRegistryEntries } from './use-provider-entity';

const EMPTY_IDS: string[] = [];
const HOME_ASSISTANT_TOPOLOGY_PATTERNS = {
  hvac: /^(fan|switch|input_boolean|script|button|input_button)\./,
  switch: /^switch\./,
} as const;
type ProviderTopologyRole = 'hvac' | 'switch' | 'camera';

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

function includeProviderTopologyEntry(
  providerId: IntegrationProviderId,
  role: ProviderTopologyRole,
  entry: PlatformEntityRegistryEntry
): boolean {
  if (role === 'camera') {
    return true;
  }

  if (providerId !== 'home_assistant') {
    return false;
  }

  if (role === 'hvac') {
    return HOME_ASSISTANT_TOPOLOGY_PATTERNS.hvac.test(entry.entityId);
  }

  return HOME_ASSISTANT_TOPOLOGY_PATTERNS.switch.test(entry.entityId);
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
      runtimeEntityId && providerId
        ? collectDeviceSiblingIds(registry, runtimeEntityId, (entry) =>
            includeProviderTopologyEntry(providerId, 'hvac', entry)
          )
        : selectEmptyRegistryDeviceIds(),
    [providerId, registry, runtimeEntityId]
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
      runtimeEntityId && providerId
        ? collectDeviceSiblingIds(registry, runtimeEntityId, (entry) =>
            includeProviderTopologyEntry(providerId, 'switch', entry)
          )
        : selectEmptyRegistryDeviceIds(),
    [providerId, registry, runtimeEntityId]
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
      runtimeEntityId && providerId
        ? collectDeviceSiblingIds(registry, runtimeEntityId, (entry) =>
            includeProviderTopologyEntry(providerId, 'camera', entry)
          )
        : selectEmptyRegistryDeviceIds(),
    [providerId, registry, runtimeEntityId]
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
