import type {
  HomeAssistantAreaRegistryEntry,
  HomeAssistantDeviceRegistryEntry,
  HomeAssistantEntityRegistryEntry,
} from '@navet/app/services/home-assistant.service';

export interface HADeviceRegistryMaps {
  areaMap: Map<string, string>;
  deviceRegistryMap: Map<string, HomeAssistantDeviceRegistryEntry>;
  entityRegistryMap: Map<string, HomeAssistantEntityRegistryEntry>;
}

export function getEntityCategory(
  entityEntry: { entity_category?: unknown } | undefined
): 'config' | 'diagnostic' | null {
  const raw = entityEntry?.entity_category;
  return raw === 'config' || raw === 'diagnostic' ? raw : null;
}

export function createRegistryMaps(
  areas: HomeAssistantAreaRegistryEntry[],
  deviceRegistry: HomeAssistantDeviceRegistryEntry[],
  entityRegistry: HomeAssistantEntityRegistryEntry[]
): HADeviceRegistryMaps {
  return {
    areaMap: new Map(areas.map((area) => [area.area_id, area.name])),
    entityRegistryMap: new Map(
      entityRegistry.map((registryEntry) => [registryEntry.entity_id, registryEntry])
    ),
    deviceRegistryMap: new Map(deviceRegistry.map((device) => [device.id, device])),
  };
}
