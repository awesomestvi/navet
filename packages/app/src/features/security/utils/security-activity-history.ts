import type { PlatformEntityHistorySeries } from '@navet/app/platform/provider-feature-models';
import type { DeviceWithType } from '@navet/app/types/device.types';

export type SecurityActivityKind =
  | 'alarm'
  | 'closed'
  | 'hazard'
  | 'hazard-cleared'
  | 'locked'
  | 'motion'
  | 'opened'
  | 'system'
  | 'unlocked';

export interface SecurityActivityEvent {
  id: string;
  entityId: string;
  device: DeviceWithType;
  kind: SecurityActivityKind;
  source: 'current' | 'history';
  state: string;
  timestampMs: number | null;
}

const ACTIVE_STATES = new Set([
  'active',
  'detected',
  'gas',
  'on',
  'open',
  'opening',
  'problem',
  'smoke',
  'triggered',
  'unlocked',
  'unsafe',
  'wet',
]);
const CLEAR_STATES = new Set([
  'clear',
  'closed',
  'closing',
  'dry',
  'idle',
  'locked',
  'normal',
  'off',
  'safe',
]);
const IGNORED_STATES = new Set(['unknown', 'unavailable', 'none', 'null', '']);
const ACTIVITY_KINDS = new Set(['motion', 'occupancy', 'vibration', 'sound']);
const OPENING_KINDS = new Set(['door', 'window', 'garageDoor', 'opening']);
const HAZARD_KINDS = new Set(['smoke', 'carbonMonoxide', 'gas', 'waterLeak', 'safety']);

function normalizeState(state: string) {
  return state
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function isActiveState(state: string) {
  const normalized = normalizeState(state);
  return ACTIVE_STATES.has(normalized) || normalized.startsWith('armed_');
}

function isClearState(state: string) {
  return CLEAR_STATES.has(normalizeState(state));
}

function classifySecurityActivity(
  device: DeviceWithType,
  state: string
): SecurityActivityKind | null {
  const normalized = normalizeState(state);
  if (IGNORED_STATES.has(normalized)) {
    return null;
  }

  if (
    device.type === 'persons' ||
    device.securityKind === 'person' ||
    device.securityKind === 'deviceTracker' ||
    device.type === 'cameras' ||
    device.securityKind === 'camera'
  ) {
    return null;
  }

  if (device.type === 'locks' || device.securityKind === 'lock') {
    if (normalized === 'unlocked' || normalized === 'unlocking' || normalized === 'open') {
      return 'unlocked';
    }
    if (normalized === 'locked' || normalized === 'locking' || normalized === 'closed') {
      return 'locked';
    }
    return null;
  }

  if (OPENING_KINDS.has(device.securityKind ?? '')) {
    if (normalized === 'open' || normalized === 'opening' || normalized === 'on') {
      return 'opened';
    }
    if (normalized === 'closed' || normalized === 'closing' || normalized === 'off') {
      return 'closed';
    }
    return null;
  }

  if (ACTIVITY_KINDS.has(device.securityKind ?? '')) {
    return isActiveState(normalized) ? 'motion' : null;
  }

  if (HAZARD_KINDS.has(device.securityKind ?? '')) {
    if (isClearState(normalized)) {
      return 'hazard-cleared';
    }
    return isActiveState(normalized) ? 'hazard' : null;
  }

  if (device.securityKind === 'alarm') {
    return 'alarm';
  }

  if (
    device.securityKind === 'problem' ||
    device.securityKind === 'tamper' ||
    device.securityKind === 'connectivity' ||
    device.securityKind === 'battery' ||
    device.securityKind === 'siren'
  ) {
    return isActiveState(normalized) ? 'system' : null;
  }

  return null;
}

function readCurrentState(device: DeviceWithType) {
  switch (device.type) {
    case 'cameras':
      return device.motionDetected ? 'detected' : device.state;
    case 'locks':
      return device.state ? 'locked' : 'unlocked';
    case 'covers':
      return device.position > 0 ? 'open' : 'closed';
    case 'sensors':
      return device.value;
    default:
      return 'active';
  }
}

function readCurrentTimestamp(device: DeviceWithType) {
  if (device.type !== 'cameras') {
    return null;
  }

  const value = device.motionChangedAt ?? device.lastChanged ?? device.lastUpdated;
  if (!value) {
    return null;
  }

  const timestampMs = Date.parse(value);
  return Number.isFinite(timestampMs) ? timestampMs : null;
}

export function buildCurrentSecurityActivityEvents(
  devices: readonly DeviceWithType[]
): SecurityActivityEvent[] {
  return devices.flatMap((device) => {
    if (device.type === 'cameras' && device.motionDetected) {
      return [
        {
          id: `current:${device.id}:motion`,
          entityId: device.id,
          device,
          kind: 'motion' as const,
          source: 'current' as const,
          state: 'detected',
          timestampMs: readCurrentTimestamp(device),
        },
      ];
    }

    const state = readCurrentState(device);
    const kind = classifySecurityActivity(device, state);
    if (!kind) {
      return [];
    }

    return [
      {
        id: `current:${device.id}:${kind}`,
        entityId: device.id,
        device,
        kind,
        source: 'current' as const,
        state,
        timestampMs: readCurrentTimestamp(device),
      },
    ];
  });
}

export function buildSecurityActivityEvents({
  devices,
  histories,
  nowMs = Date.now(),
  lookbackMs = 24 * 60 * 60 * 1_000,
}: {
  devices: readonly DeviceWithType[];
  histories: readonly PlatformEntityHistorySeries[];
  nowMs?: number;
  lookbackMs?: number;
}): SecurityActivityEvent[] {
  const devicesById = new Map(devices.map((device) => [device.id, device]));
  const earliestTimestamp = nowMs - lookbackMs;
  const events: SecurityActivityEvent[] = [];

  for (const history of histories) {
    const device = devicesById.get(history.entityId);
    if (!device || history.points.length < 2) {
      continue;
    }

    let previousState = normalizeState(history.points[0]?.state ?? '');
    for (const point of history.points.slice(1)) {
      const state = normalizeState(point.state);
      const timestampMs = Date.parse(point.changedAt);
      if (
        !Number.isFinite(timestampMs) ||
        timestampMs < earliestTimestamp ||
        state === previousState
      ) {
        previousState = state;
        continue;
      }

      const kind = classifySecurityActivity(device, state);
      if (kind) {
        events.push({
          id: `history:${device.id}:${timestampMs}:${kind}`,
          entityId: device.id,
          device,
          kind,
          source: 'history',
          state,
          timestampMs,
        });
      }
      previousState = state;
    }
  }

  events.sort((left, right) => (right.timestampMs ?? 0) - (left.timestampMs ?? 0));

  const seen = new Set<string>();
  return events.filter((event) => {
    const timestampBucket = Math.floor((event.timestampMs ?? 0) / 60_000);
    const key = `${event.entityId}:${event.kind}:${timestampBucket}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
