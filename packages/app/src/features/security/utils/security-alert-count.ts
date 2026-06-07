import type { DeviceWithType } from '@navet/app/types/device.types';

const SECURITY_OPENING_KINDS = new Set(['door', 'window', 'garageDoor', 'opening']);
const SECURITY_CRITICAL_KINDS = new Set(['smoke', 'carbonMonoxide', 'gas', 'safety']);
const SECURITY_WARNING_KINDS = new Set([
  'battery',
  'connectivity',
  'door',
  'garageDoor',
  'lock',
  'opening',
  'problem',
  'tamper',
  'waterLeak',
  'window',
]);
const STILL_IMAGE_UTILITY_KEYWORDS = ['map', 'floor', 'saved map', 'vacuum', 'robot'];
const SECURITY_CAMERA_KEYWORDS = [
  'camera',
  'cam',
  'doorbell',
  'front door',
  'back door',
  'entrance',
  'garage',
  'driveway',
  'porch',
  'patio',
  'garden',
  'yard',
  'hallway',
];
const SEVERITY_ORDER = {
  critical: 0,
  warning: 1,
  active: 2,
  unknown: 3,
  normal: 4,
} as const;

function getNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeText(value: string | undefined): string {
  return (value ?? '').replace(/[_-]/g, ' ').toLowerCase();
}

function includesAnyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function isSecuritySummaryCandidate(device: DeviceWithType): boolean {
  if (
    device.type === 'persons' ||
    device.securityKind === 'person' ||
    device.securityKind === 'deviceTracker'
  ) {
    return false;
  }

  return (
    Boolean(device.securityKind) ||
    device.type === 'locks' ||
    device.type === 'covers' ||
    device.type === 'cameras' ||
    (device.type === 'sensors' &&
      [
        'door',
        'garage_door',
        'gas',
        'moisture',
        'motion',
        'occupancy',
        'opening',
        'presence',
        'problem',
        'safety',
        'smoke',
        'tamper',
        'window',
      ].includes(String(device.deviceClass ?? '').toLowerCase()))
  );
}

function getSecuritySummarySeverity(
  device: DeviceWithType
): 'critical' | 'warning' | 'unknown' | 'active' | 'normal' {
  if (
    device.type === 'persons' ||
    device.securityKind === 'person' ||
    device.securityKind === 'deviceTracker'
  ) {
    return device.securitySeverity === 'unknown' ? 'unknown' : 'normal';
  }

  if (device.securitySeverity) {
    return device.securitySeverity;
  }

  if (device.type === 'locks') {
    return device.state === false ? 'warning' : 'normal';
  }
  if (device.type === 'covers') {
    return getNumber(device.position) !== null && getNumber(device.position) !== 0
      ? 'warning'
      : 'normal';
  }
  if (device.type === 'sensors') {
    if (device.status === 'unavailable') {
      return 'unknown';
    }

    const securityKind = typeof device.securityKind === 'string' ? device.securityKind : undefined;
    const normalizedDeviceClass = String(device.deviceClass ?? '').toLowerCase();
    const sensorKind =
      securityKind ??
      (normalizedDeviceClass === 'garage_door'
        ? 'garageDoor'
        : normalizedDeviceClass === 'carbon_monoxide'
          ? 'carbonMonoxide'
          : normalizedDeviceClass === 'moisture'
            ? 'waterLeak'
            : normalizedDeviceClass === 'door'
              ? 'door'
              : normalizedDeviceClass === 'window'
                ? 'window'
                : normalizedDeviceClass === 'opening'
                  ? 'opening'
                  : normalizedDeviceClass === 'problem'
                    ? 'problem'
                    : normalizedDeviceClass === 'tamper'
                      ? 'tamper'
                      : normalizedDeviceClass === 'battery'
                        ? 'battery'
                        : normalizedDeviceClass === 'connectivity'
                          ? 'connectivity'
                          : normalizedDeviceClass === 'gas'
                            ? 'gas'
                            : normalizedDeviceClass === 'safety'
                              ? 'safety'
                              : normalizedDeviceClass === 'smoke'
                                ? 'smoke'
                                : normalizedDeviceClass === 'motion'
                                  ? 'motion'
                                  : normalizedDeviceClass === 'occupancy'
                                    ? 'occupancy'
                                    : normalizedDeviceClass === 'presence'
                                      ? 'presence'
                                      : undefined);

    if (device.status === 'active') {
      if (sensorKind && SECURITY_CRITICAL_KINDS.has(sensorKind)) {
        return 'critical';
      }
      if (sensorKind && SECURITY_WARNING_KINDS.has(sensorKind)) {
        return 'warning';
      }
      return 'active';
    }

    return 'normal';
  }
  if (device.type === 'cameras') {
    if (device.motionDetected === true) {
      return 'active';
    }
    return 'normal';
  }

  return 'normal';
}

function isSecurityAlert(device: DeviceWithType): boolean {
  const severity = getSecuritySummarySeverity(device);
  return severity === 'critical' || severity === 'warning' || severity === 'unknown';
}

function getDeviceIdentitySet(device: DeviceWithType): Set<string> {
  const ids = [device.id];
  if ('nativeId' in device && typeof device.nativeId === 'string') {
    ids.push(device.nativeId);
  }
  if ('canonicalId' in device && typeof device.canonicalId === 'string') {
    ids.push(device.canonicalId);
  }

  return new Set(ids);
}

function isOpeningSecurityDevice(device: DeviceWithType): boolean {
  return (
    device.type === 'covers' ||
    (typeof device.securityKind === 'string' && SECURITY_OPENING_KINDS.has(device.securityKind))
  );
}

function readCameraVariantBaseId(camera: DeviceWithType & { type: 'cameras' }): string {
  const value = normalizeText(camera.nativeId ?? camera.id);
  return value.replace(/(?:[_-]\d+)+$/, '');
}

function getCameraGroupingKey(camera: DeviceWithType & { type: 'cameras' }): string {
  if (camera.providerId && camera.sourceDeviceId) {
    return `${camera.providerId}:${camera.sourceDeviceId}`;
  }

  return `${camera.providerId ?? ''}:${readCameraVariantBaseId(camera)}:${normalizeText(
    camera.room
  )}:${normalizeText(camera.name)}`;
}

function isStillImageUtilityCamera(camera: DeviceWithType & { type: 'cameras' }): boolean {
  const searchText = normalizeText(`${camera.id} ${camera.name} ${camera.room}`);
  return (
    camera.isStillImageOnly === true &&
    includesAnyKeyword(searchText, STILL_IMAGE_UTILITY_KEYWORDS) &&
    !includesAnyKeyword(
      searchText,
      SECURITY_CAMERA_KEYWORDS.filter((keyword) => keyword !== 'camera' && keyword !== 'cam')
    )
  );
}

function getCameraVariantPreference(
  camera: DeviceWithType & { type: 'cameras' }
): [number, number, number, string] {
  const severityPenalty = SEVERITY_ORDER[getSecuritySummarySeverity(camera)];
  const livePenalty = camera.isStreamCapable === true && camera.isStillImageOnly !== true ? 0 : 1;
  const utilityPenalty = isStillImageUtilityCamera(camera) ? 1 : 0;
  const freshness = camera.lastUpdated ?? camera.lastChanged ?? '';

  return [severityPenalty, livePenalty, utilityPenalty, freshness];
}

function compareCameraVariantPreference(
  left: DeviceWithType & { type: 'cameras' },
  right: DeviceWithType & { type: 'cameras' }
): number {
  const leftPreference = getCameraVariantPreference(left);
  const rightPreference = getCameraVariantPreference(right);

  for (let index = 0 as 0 | 1 | 2; index < 3; index += 1) {
    if (leftPreference[index] !== rightPreference[index]) {
      return leftPreference[index] - rightPreference[index];
    }
  }

  if (leftPreference[3] !== rightPreference[3]) {
    return rightPreference[3].localeCompare(leftPreference[3]);
  }

  return left.name.localeCompare(right.name);
}

function collapseCameraVariants(devices: DeviceWithType[]): DeviceWithType[] {
  const grouped = new Map<string, Array<DeviceWithType & { type: 'cameras' }>>();
  const passthrough: DeviceWithType[] = [];

  for (const device of devices) {
    if (device.type !== 'cameras') {
      passthrough.push(device);
      continue;
    }

    const key = getCameraGroupingKey(device);
    const variants = grouped.get(key);
    if (variants) {
      variants.push(device);
    } else {
      grouped.set(key, [device]);
    }
  }

  return [
    ...passthrough,
    ...[...grouped.values()].map(
      (variants) => [...variants].sort(compareCameraVariantPreference)[0] ?? variants[0]
    ),
  ];
}

export function collapseOverlappingSecurityDevices(devices: DeviceWithType[]): DeviceWithType[] {
  const openingDevices = devices.filter(isOpeningSecurityDevice);
  if (openingDevices.length < 2) {
    return devices;
  }

  const aggregateDevices = openingDevices
    .filter(
      (device): device is DeviceWithType & { type: 'sensors'; groupMembers: string[] } =>
        device.type === 'sensors' &&
        Array.isArray(device.groupMembers) &&
        device.groupMembers.length > 0 &&
        isSecurityAlert(device)
    )
    .sort((left, right) => right.groupMembers.length - left.groupMembers.length);

  if (aggregateDevices.length === 0) {
    return devices;
  }

  const removalIds = new Set<string>();

  for (const aggregateDevice of aggregateDevices) {
    const memberIds = new Set(aggregateDevice.groupMembers);

    for (const device of openingDevices) {
      if (device.id === aggregateDevice.id || !isSecurityAlert(device)) {
        continue;
      }

      const matchesGroupMember = [...getDeviceIdentitySet(device)].some((id) => memberIds.has(id));
      if (matchesGroupMember) {
        removalIds.add(device.id);
      }
    }
  }

  if (removalIds.size === 0) {
    return devices;
  }

  return devices.filter((device) => !removalIds.has(device.id));
}

export function getSecurityAlertCount(devices: DeviceWithType[]): number {
  const securityDevices = collapseOverlappingSecurityDevices(
    collapseCameraVariants(devices.filter(isSecuritySummaryCandidate))
  );

  return securityDevices.filter(isSecurityAlert).length;
}
