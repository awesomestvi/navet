import type {
  PlatformEntityRegistryEntry,
  PlatformEntitySnapshotMap,
} from '@navet/app/platform/provider-feature-models';
import type { ProviderEntityRuntimeService } from '@navet/app/platform/provider-feature-services';
import type { HomeyCapabilityState, HomeyDevice, HomeySnapshot } from '@navet/app/types/homey';
import { homeyService } from './homey.service';

const EMPTY_ENTITY_REGISTRY: PlatformEntityRegistryEntry[] = [];
let cachedEntitySnapshotSource: HomeySnapshot | null = null;
let cachedEntitySnapshots: PlatformEntitySnapshotMap | null = null;
let cachedEntityRegistrySource: HomeySnapshot | null = null;
let cachedEntityRegistry: PlatformEntityRegistryEntry[] = EMPTY_ENTITY_REGISTRY;

function getCapabilityState(
  device: HomeyDevice,
  capabilityId: string
): HomeyCapabilityState | undefined {
  return device.capabilitiesObj?.[capabilityId];
}

function getNumericCapability(device: HomeyDevice, capabilityId: string): number | null {
  const value = getCapabilityState(device, capabilityId)?.value;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function resolveHomeyRoom(device: HomeyDevice, snapshot: HomeySnapshot): string | undefined {
  const zoneId = typeof device.zone === 'string' && device.zone.length > 0 ? device.zone : null;
  return zoneId ? snapshot.zones[zoneId]?.name : undefined;
}

function normalizeHomeyState(device: HomeyDevice): 'on' | 'off' {
  const onoff = getCapabilityState(device, 'onoff')?.value;
  if (typeof onoff === 'boolean') {
    return onoff ? 'on' : 'off';
  }

  const dim = getNumericCapability(device, 'dim');
  return dim !== null && dim > 0 ? 'on' : 'off';
}

function toCapabilityEntityState(value: unknown): string {
  if (typeof value === 'boolean') {
    return value ? 'on' : 'off';
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  return 'unknown';
}

function toCapabilityDeviceClass(capabilityId: string): string | undefined {
  if (capabilityId.startsWith('measure_')) {
    return capabilityId.slice('measure_'.length);
  }

  if (capabilityId.startsWith('alarm_')) {
    return capabilityId.slice('alarm_'.length);
  }

  return undefined;
}

function toEntitySnapshots(snapshot: HomeySnapshot): PlatformEntitySnapshotMap {
  if (snapshot === cachedEntitySnapshotSource && cachedEntitySnapshots) {
    return cachedEntitySnapshots;
  }

  const entities: PlatformEntitySnapshotMap = {};

  for (const device of Object.values(snapshot.devices)) {
    const room = resolveHomeyRoom(device, snapshot);
    entities[device.id] = {
      entityId: device.id,
      state: normalizeHomeyState(device),
      attributes: {
        friendly_name: device.name,
        room,
        zone: room,
        available: device.available,
        device_class: device.class ?? undefined,
      },
    };

    for (const [capabilityId, capability] of Object.entries(device.capabilitiesObj ?? {})) {
      if (!capabilityId.startsWith('measure_') && !capabilityId.startsWith('alarm_')) {
        continue;
      }

      const entityId = `${device.id}#${capabilityId}`;
      entities[entityId] = {
        entityId,
        state: toCapabilityEntityState(capability.value),
        attributes: {
          friendly_name: capability.title?.trim() || `${device.name} ${capabilityId}`.trim(),
          unit_of_measurement: capability.units,
          device_class: toCapabilityDeviceClass(capabilityId),
          room,
          zone: room,
          source_device_id: device.id,
        },
      };
    }
  }

  cachedEntitySnapshotSource = snapshot;
  cachedEntitySnapshots = entities;
  return entities;
}

function toEntityRegistryEntries(snapshot: HomeySnapshot): PlatformEntityRegistryEntry[] {
  if (snapshot === cachedEntityRegistrySource && cachedEntityRegistry !== EMPTY_ENTITY_REGISTRY) {
    return cachedEntityRegistry;
  }

  const entries: PlatformEntityRegistryEntry[] = [];

  for (const device of Object.values(snapshot.devices)) {
    entries.push({
      entityId: device.id,
      deviceId: device.id,
      areaId: device.zone ?? null,
      name: device.name,
      platform: 'homey',
    });

    for (const [capabilityId, capability] of Object.entries(device.capabilitiesObj ?? {})) {
      if (!capabilityId.startsWith('measure_') && !capabilityId.startsWith('alarm_')) {
        continue;
      }

      entries.push({
        entityId: `${device.id}#${capabilityId}`,
        deviceId: device.id,
        areaId: device.zone ?? null,
        name: capability.title?.trim() || `${device.name} ${capabilityId}`.trim(),
        platform: 'homey',
      });
    }
  }

  cachedEntityRegistrySource = snapshot;
  cachedEntityRegistry = entries;
  return entries;
}

export const homeyEntityRuntimeService: ProviderEntityRuntimeService = {
  getEntitySnapshots: () => toEntitySnapshots(homeyService.getSnapshot()),
  subscribeEntitySnapshots: (listener) => homeyService.subscribe(() => listener()),
  getEntityRegistryEntries: () => {
    const snapshot = homeyService.getSnapshot();
    return Object.keys(snapshot.devices).length > 0
      ? toEntityRegistryEntries(snapshot)
      : EMPTY_ENTITY_REGISTRY;
  },
  subscribeEntityRegistryEntries: (listener) => homeyService.subscribe(() => listener()),
  getConfig: () => null,
  subscribeConfig: () => () => {},
};
