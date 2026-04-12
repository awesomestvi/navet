import { useCallback } from 'react';
import type { HomeAssistantEntityRegistryEntry } from '@/app/services/home-assistant.service';
import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';
import { useHomeAssistant } from './use-home-assistant';

const EMPTY_IDS: string[] = [];

/** HVAC sibling domains: switch, input_boolean, script, button, input_button */
const HVAC_SIBLING_PATTERN = /^(switch|input_boolean|script|button|input_button)\./;

export interface RegistryDeviceIdsSlice {
  deviceId: string | null;
  siblingIds: string[];
}

function registryDeviceIdsEqual(a: RegistryDeviceIdsSlice, b: RegistryDeviceIdsSlice): boolean {
  if (a.deviceId !== b.deviceId) {
    return false;
  }

  if (a.siblingIds.length !== b.siblingIds.length) {
    return false;
  }

  for (let i = 0; i < a.siblingIds.length; i++) {
    if (a.siblingIds[i] !== b.siblingIds[i]) {
      return false;
    }
  }

  return true;
}

function collectDeviceSiblingIds(
  registry: HomeAssistantEntityRegistryEntry[],
  entityId: string,
  includeEntity: (e: HomeAssistantEntityRegistryEntry) => boolean
): RegistryDeviceIdsSlice {
  const self = registry.find((entry) => entry.entity_id === entityId);
  const deviceId = self?.device_id ?? null;
  if (!deviceId) {
    return { deviceId: null, siblingIds: EMPTY_IDS };
  }

  const siblingIds = registry
    .filter((e) => e.device_id === deviceId && e.entity_id !== entityId && includeEntity(e))
    .map((e) => e.entity_id);

  if (siblingIds.length === 0) {
    return { deviceId, siblingIds: EMPTY_IDS };
  }

  siblingIds.sort((left, right) => left.localeCompare(right));
  return { deviceId, siblingIds };
}

export function useHvacRegistryDeviceTopology(entityId: string): RegistryDeviceIdsSlice {
  const selector = useCallback(
    (state: HomeAssistantStore) =>
      collectDeviceSiblingIds(state.entityRegistry, entityId, (e) =>
        HVAC_SIBLING_PATTERN.test(e.entity_id)
      ),
    [entityId]
  );

  return useHomeAssistant(selector, registryDeviceIdsEqual);
}

export function useSwitchRegistryDeviceTopology(entityId: string): RegistryDeviceIdsSlice {
  const selector = useCallback(
    (state: HomeAssistantStore) =>
      collectDeviceSiblingIds(state.entityRegistry, entityId, (e) =>
        e.entity_id.startsWith('switch.')
      ),
    [entityId]
  );

  return useHomeAssistant(selector, registryDeviceIdsEqual);
}

export function useCameraRegistryDeviceTopology(entityId: string): RegistryDeviceIdsSlice {
  const selector = useCallback(
    (state: HomeAssistantStore) =>
      collectDeviceSiblingIds(state.entityRegistry, entityId, (_e) => true),
    [entityId]
  );

  return useHomeAssistant(selector, registryDeviceIdsEqual);
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

function entityRoomRegistryContextEqual(
  a: EntityRoomRegistryContext,
  b: EntityRoomRegistryContext
): boolean {
  if (a.deviceAreaId !== b.deviceAreaId) {
    return false;
  }

  if (a.entry === b.entry) {
    return true;
  }

  if (!a.entry || !b.entry) {
    return a.entry === b.entry;
  }

  return (
    a.entry.entity_id === b.entry.entity_id &&
    a.entry.area_id === b.entry.area_id &&
    a.entry.device_id === b.entry.device_id
  );
}

export function useEntityRoomRegistryContext(entityId: string): EntityRoomRegistryContext {
  const selector = useCallback(
    (state: HomeAssistantStore): EntityRoomRegistryContext => {
      const raw = state.entityRegistry.find((e) => e.entity_id === entityId);
      const entry = raw
        ? {
            entity_id: raw.entity_id,
            area_id: raw.area_id ?? null,
            device_id: raw.device_id ?? null,
          }
        : null;

      const did = entry?.device_id;
      const deviceAreaId = did
        ? (state.deviceRegistry.find((d) => d.id === did)?.area_id ?? null)
        : null;

      return { entry, deviceAreaId };
    },
    [entityId]
  );

  return useHomeAssistant(selector, entityRoomRegistryContextEqual);
}
