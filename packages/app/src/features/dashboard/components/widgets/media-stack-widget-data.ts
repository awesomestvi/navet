import type { MediaDevice } from '@navet/app/types/device.types';

export type MediaStackIdleBehavior = 'compact' | 'hidden' | 'top-priority';

export interface MediaStackWidgetData extends Record<string, unknown> {
  entityIds?: string[];
  priorityOrder?: string[];
  idleBehavior?: MediaStackIdleBehavior;
}

export interface MediaStackSelectionResult {
  device: MediaDevice;
  isFallback: boolean;
}

function isMediaStackIdleBehavior(value: unknown): value is MediaStackIdleBehavior {
  return value === 'compact' || value === 'hidden' || value === 'top-priority';
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

export function normalizeMediaStackWidgetData(
  data: Record<string, unknown> | undefined
): MediaStackWidgetData | undefined {
  if (!data) {
    return data;
  }

  const entityIds = normalizeStringArray(data.entityIds);
  const priorityOrderInput = normalizeStringArray(data.priorityOrder);
  const priorityOrder = [
    ...priorityOrderInput.filter((entityId, index) => {
      return entityIds.includes(entityId) && priorityOrderInput.indexOf(entityId) === index;
    }),
    ...entityIds.filter((entityId) => !priorityOrderInput.includes(entityId)),
  ];
  const idleBehavior = isMediaStackIdleBehavior(data.idleBehavior) ? data.idleBehavior : 'compact';

  return {
    ...data,
    entityIds,
    priorityOrder,
    idleBehavior,
  };
}

function getPriorityOrder(
  devices: MediaDevice[],
  data: MediaStackWidgetData | undefined
): string[] {
  if (Array.isArray(data?.priorityOrder) && data.priorityOrder.length > 0) {
    return data.priorityOrder;
  }

  if (Array.isArray(data?.entityIds) && data.entityIds.length > 0) {
    return data.entityIds;
  }

  return devices.map((device) => device.id);
}

function getStateRank(device: MediaDevice): number {
  switch (device.state) {
    case 'playing':
      return 4;
    case 'paused':
      return 3;
    case 'idle':
      return device.isPoweredOn ? 2 : 1;
    default:
      return 0;
  }
}

function isActiveState(device: MediaDevice): boolean {
  return device.state === 'playing' || device.state === 'paused' || device.isPoweredOn === true;
}

export function selectMediaStackDevice(
  devices: MediaDevice[],
  data: MediaStackWidgetData | undefined
): MediaStackSelectionResult | null {
  if (devices.length === 0) {
    return null;
  }

  const priorityOrder = getPriorityOrder(devices, data);
  const priorityIndex = new Map(priorityOrder.map((entityId, index) => [entityId, index]));
  const sortedDevices = [...devices].sort((left, right) => {
    const leftIndex = priorityIndex.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = priorityIndex.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex;
  });
  const activeCandidates = [...sortedDevices].sort((left, right) => {
    const stateRankDifference = getStateRank(right) - getStateRank(left);
    if (stateRankDifference !== 0) {
      return stateRankDifference;
    }

    const leftIndex = priorityIndex.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = priorityIndex.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex;
  });
  const activeDevice = activeCandidates.find(isActiveState);

  if (activeDevice) {
    return {
      device: activeDevice,
      isFallback: false,
    };
  }

  if (data?.idleBehavior === 'hidden') {
    return null;
  }

  const fallbackDevice = sortedDevices[0] ?? activeCandidates[0] ?? null;
  if (!fallbackDevice) {
    return null;
  }

  return {
    device: fallbackDevice,
    isFallback: true,
  };
}

export function shouldShowMediaStackWidget(
  devices: MediaDevice[],
  data: MediaStackWidgetData | undefined
): boolean {
  return selectMediaStackDevice(devices, data) !== null;
}
