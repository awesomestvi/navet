import type {
  PlatformEntityRegistryEntry,
  PlatformEntitySnapshot,
  PlatformEntitySnapshotMap,
} from '@navet/app/platform/provider-feature-models';
import type { ProviderEntityRuntimeService } from '@navet/app/platform/provider-feature-services';
import type { HomeyCapabilityState, HomeyDevice, HomeySnapshot } from '@navet/app/types/homey';
import { areDataEqual } from '@navet/core/structural-equality';
import { homeyService } from './homey.service';

const EMPTY_ENTITY_REGISTRY: PlatformEntityRegistryEntry[] = [];
let cachedEntitySnapshotSource: HomeySnapshot | null = null;
let cachedEntitySnapshots: PlatformEntitySnapshotMap | null = null;
let cachedEntityRegistrySource: HomeySnapshot | null = null;
let cachedEntityRegistry: PlatformEntityRegistryEntry[] = EMPTY_ENTITY_REGISTRY;
let cachedEntityRegistryById: Record<string, PlatformEntityRegistryEntry> = {};

function areEquivalentHomeyDeviceSnapshots(previous: HomeySnapshot | null, next: HomeySnapshot) {
  if (previous === next) {
    return true;
  }

  if (!previous) {
    return false;
  }

  const previousDeviceIds = Object.keys(previous.devices);
  const nextDeviceIds = Object.keys(next.devices);
  if (previousDeviceIds.length !== nextDeviceIds.length) {
    return false;
  }

  for (const deviceId of nextDeviceIds) {
    const previousDevice = previous.devices[deviceId];
    const nextDevice = next.devices[deviceId];
    if (!previousDevice || !nextDevice) {
      return false;
    }

    if (
      previousDevice.name !== nextDevice.name ||
      previousDevice.zone !== nextDevice.zone ||
      previousDevice.available !== nextDevice.available ||
      previousDevice.class !== nextDevice.class ||
      !areDataEqual(previousDevice.capabilitiesObj ?? {}, nextDevice.capabilitiesObj ?? {}) ||
      resolveHomeyRoom(previousDevice, previous) !== resolveHomeyRoom(nextDevice, next)
    ) {
      return false;
    }
  }

  return true;
}

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
  if (
    (snapshot === cachedEntitySnapshotSource ||
      areEquivalentHomeyDeviceSnapshots(cachedEntitySnapshotSource, snapshot)) &&
    cachedEntitySnapshots
  ) {
    cachedEntitySnapshotSource = snapshot;
    return cachedEntitySnapshots;
  }

  const previousSnapshot = cachedEntitySnapshotSource;
  const previousEntities = cachedEntitySnapshots;
  const entities: PlatformEntitySnapshotMap = {};

  for (const device of Object.values(snapshot.devices)) {
    const room = resolveHomeyRoom(device, snapshot);
    const nextDeviceSnapshot = {
      entityId: device.id,
      state: normalizeHomeyState(device),
      attributes: {
        friendly_name: device.name,
        room,
        zone: room,
        available: device.available,
        device_class: device.class ?? undefined,
      },
    } satisfies PlatformEntitySnapshot;
    const previousDeviceSnapshot = previousEntities?.[device.id];
    const previousDevice = previousSnapshot?.devices[device.id];
    entities[device.id] =
      previousDeviceSnapshot &&
      previousDevice &&
      previousDevice.name === device.name &&
      previousDevice.zone === device.zone &&
      previousDevice.available === device.available &&
      previousDevice.class === device.class &&
      previousDevice.capabilitiesObj?.onoff?.value === device.capabilitiesObj?.onoff?.value &&
      previousDevice.capabilitiesObj?.dim?.value === device.capabilitiesObj?.dim?.value &&
      resolveHomeyRoom(previousDevice, previousSnapshot) === room
        ? previousDeviceSnapshot
        : nextDeviceSnapshot;

    for (const [capabilityId, capability] of Object.entries(device.capabilitiesObj ?? {})) {
      if (!capabilityId.startsWith('measure_') && !capabilityId.startsWith('alarm_')) {
        continue;
      }

      const entityId = `${device.id}#${capabilityId}`;
      const nextCapabilitySnapshot = {
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
      } satisfies PlatformEntitySnapshot;
      const previousCapabilitySnapshot = previousEntities?.[entityId];
      const previousCapability =
        previousSnapshot?.devices[device.id]?.capabilitiesObj?.[capabilityId];
      entities[entityId] =
        previousCapabilitySnapshot &&
        previousCapability &&
        previousCapability.value === capability.value &&
        previousCapability.units === capability.units &&
        previousCapability.title === capability.title &&
        previousDevice?.zone === device.zone &&
        previousDevice?.name === device.name &&
        resolveHomeyRoom(previousDevice, previousSnapshot) === room
          ? previousCapabilitySnapshot
          : nextCapabilitySnapshot;
    }
  }

  cachedEntitySnapshotSource = snapshot;
  cachedEntitySnapshots = entities;
  return entities;
}

function toEntityRegistryEntries(snapshot: HomeySnapshot): PlatformEntityRegistryEntry[] {
  if (
    (snapshot === cachedEntityRegistrySource ||
      areEquivalentHomeyDeviceSnapshots(cachedEntityRegistrySource, snapshot)) &&
    cachedEntityRegistry !== EMPTY_ENTITY_REGISTRY
  ) {
    cachedEntityRegistrySource = snapshot;
    return cachedEntityRegistry;
  }

  const entries: PlatformEntityRegistryEntry[] = [];
  const previousSnapshot = cachedEntityRegistrySource;
  const previousEntriesById = cachedEntityRegistryById;

  for (const device of Object.values(snapshot.devices)) {
    const nextDeviceEntry = {
      entityId: device.id,
      deviceId: device.id,
      areaId: device.zone ?? null,
      name: device.name,
      platform: 'homey',
    } satisfies PlatformEntityRegistryEntry;
    const previousDeviceEntry = previousEntriesById[device.id];
    const previousDevice = previousSnapshot?.devices[device.id];
    entries.push(
      previousDeviceEntry &&
        previousDevice &&
        previousDevice.name === device.name &&
        previousDevice.zone === device.zone
        ? previousDeviceEntry
        : nextDeviceEntry
    );

    for (const [capabilityId, capability] of Object.entries(device.capabilitiesObj ?? {})) {
      if (!capabilityId.startsWith('measure_') && !capabilityId.startsWith('alarm_')) {
        continue;
      }

      const entityId = `${device.id}#${capabilityId}`;
      const nextCapabilityEntry = {
        entityId,
        deviceId: device.id,
        areaId: device.zone ?? null,
        name: capability.title?.trim() || `${device.name} ${capabilityId}`.trim(),
        platform: 'homey',
      } satisfies PlatformEntityRegistryEntry;
      const previousCapabilityEntry = previousEntriesById[entityId];
      const previousCapability =
        previousSnapshot?.devices[device.id]?.capabilitiesObj?.[capabilityId];
      const previousDevice = previousSnapshot?.devices[device.id];
      entries.push(
        previousCapabilityEntry &&
          previousCapability &&
          previousCapability.title === capability.title &&
          previousDevice?.zone === device.zone &&
          previousDevice?.name === device.name
          ? previousCapabilityEntry
          : nextCapabilityEntry
      );
    }
  }

  cachedEntityRegistrySource = snapshot;
  cachedEntityRegistry = entries;
  cachedEntityRegistryById = Object.fromEntries(entries.map((entry) => [entry.entityId, entry]));
  return entries;
}

function subscribeHomeyEntitySnapshot(entityId: string, listener: () => void) {
  let previousSnapshot = toEntitySnapshots(homeyService.getSnapshot())?.[entityId];

  return homeyService.subscribe(() => {
    const nextSnapshot = toEntitySnapshots(homeyService.getSnapshot())?.[entityId];
    if (nextSnapshot === previousSnapshot) {
      return;
    }

    previousSnapshot = nextSnapshot;
    listener();
  });
}

function subscribeHomeyEntityRegistryEntry(entityId: string, listener: () => void) {
  const currentSnapshot = homeyService.getSnapshot();
  let previousEntry = getHomeyEntityRegistryEntryFromSnapshot(currentSnapshot, entityId);

  return homeyService.subscribe(() => {
    const snapshot = homeyService.getSnapshot();
    const nextEntry = getHomeyEntityRegistryEntryFromSnapshot(snapshot, entityId);
    if (nextEntry === previousEntry) {
      return;
    }

    previousEntry = nextEntry;
    listener();
  });
}

function getHomeyEntityRegistryEntryFromSnapshot(snapshot: HomeySnapshot, entityId: string) {
  if (Object.keys(snapshot.devices).length === 0) {
    return undefined;
  }

  toEntityRegistryEntries(snapshot);
  return cachedEntityRegistryById[entityId];
}

export const homeyEntityRuntimeService: ProviderEntityRuntimeService = {
  getEntitySnapshots: () => toEntitySnapshots(homeyService.getSnapshot()),
  subscribeEntitySnapshots: (listener) => homeyService.subscribe(() => listener()),
  getEntitySnapshot: (entityId) => toEntitySnapshots(homeyService.getSnapshot())?.[entityId],
  subscribeEntitySnapshot: (entityId, listener) => subscribeHomeyEntitySnapshot(entityId, listener),
  getEntityRegistryEntries: () => {
    const snapshot = homeyService.getSnapshot();
    return Object.keys(snapshot.devices).length > 0
      ? toEntityRegistryEntries(snapshot)
      : EMPTY_ENTITY_REGISTRY;
  },
  subscribeEntityRegistryEntries: (listener) => homeyService.subscribe(() => listener()),
  getEntityRegistryEntry: (entityId) =>
    getHomeyEntityRegistryEntryFromSnapshot(homeyService.getSnapshot(), entityId),
  subscribeEntityRegistryEntry: (entityId, listener) =>
    subscribeHomeyEntityRegistryEntry(entityId, listener),
  getConfig: () => null,
  subscribeConfig: () => () => {},
};

export function resetHomeyEntityRuntimeServiceCachesForTests() {
  cachedEntitySnapshotSource = null;
  cachedEntitySnapshots = null;
  cachedEntityRegistrySource = null;
  cachedEntityRegistry = EMPTY_ENTITY_REGISTRY;
  cachedEntityRegistryById = {};
}
