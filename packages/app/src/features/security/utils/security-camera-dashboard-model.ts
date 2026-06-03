import type {
  CameraDevice,
  DeviceCollection,
  LockDevice,
  SensorDevice,
} from '@navet/app/types/device.types';

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

const STILL_IMAGE_UTILITY_KEYWORDS = ['map', 'floor', 'saved map', 'vacuum', 'robot'];
const MOTION_DEVICE_CLASSES = new Set(['motion', 'occupancy', 'presence']);
const OPENING_DEVICE_CLASSES = new Set(['door', 'window', 'opening', 'garage_door']);
const CAMERA_LIVE_STATES = new Set(['streaming', 'recording', 'on']);
const CAMERA_UNAVAILABLE_STATES = new Set(['unavailable', 'unknown']);

export interface CameraDashboardSummary {
  totalCameras: number;
  liveCount: number;
  idleCount: number;
  unavailableCount: number;
  motionCount: number;
  lockedCount: number;
  unlockedCount: number;
  openSensorCount: number;
  activeAlarmCount: number;
  activeSirenCount: number;
}

export interface CameraDashboardModel {
  primaryCameras: CameraDevice[];
  stillImageCameras: CameraDevice[];
  unavailableCameras: CameraDevice[];
  locks: LockDevice[];
  summary: CameraDashboardSummary;
}

function normalizeText(value: string | undefined): string {
  return (value ?? '').replace(/[_-]/g, ' ').toLowerCase();
}

function includesAnyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function getDeviceClass(device: SensorDevice | undefined): string {
  return typeof device?.deviceClass === 'string' ? device.deviceClass.toLowerCase() : '';
}

function isUnavailableCamera(camera: CameraDevice): boolean {
  return CAMERA_UNAVAILABLE_STATES.has(camera.state.toLowerCase());
}

function isLiveCamera(camera: CameraDevice): boolean {
  return CAMERA_LIVE_STATES.has(camera.state.toLowerCase());
}

function getCameraSearchText(camera: CameraDevice): string {
  return normalizeText(`${camera.id} ${camera.name} ${camera.room}`);
}

function readCameraVariantBaseId(camera: CameraDevice): string {
  const value = normalizeText(camera.nativeId ?? camera.id);
  return value.replace(/(?:[_-]\d+)+$/, '');
}

function getCameraGroupingKey(camera: CameraDevice): string {
  if (camera.providerId && camera.sourceDeviceId) {
    return `${camera.providerId}:${camera.sourceDeviceId}`;
  }

  return `${camera.providerId ?? ''}:${readCameraVariantBaseId(camera)}:${normalizeText(camera.room)}:${normalizeText(camera.name)}`;
}

function getCameraVariantPreference(camera: CameraDevice): [number, number, number, string] {
  const livePenalty = camera.isStreamCapable === true && camera.isStillImageOnly !== true ? 0 : 1;
  const suffixPenalty = camera.nativeId && /(?:[_-]\d+)+$/.test(camera.nativeId) ? 1 : 0;
  const statePenalty = isLiveCamera(camera) ? 0 : 1;
  const freshness = camera.lastUpdated ?? camera.lastChanged ?? '';

  return [livePenalty, suffixPenalty, statePenalty, freshness];
}

function compareCameraVariantPreference(left: CameraDevice, right: CameraDevice): number {
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

  return compareByRoomAndName(left, right);
}

function collapseCameraVariants(cameras: CameraDevice[]): CameraDevice[] {
  const grouped = new Map<string, CameraDevice[]>();

  for (const camera of cameras) {
    const key = getCameraGroupingKey(camera);
    const existing = grouped.get(key);
    if (existing) {
      existing.push(camera);
    } else {
      grouped.set(key, [camera]);
    }
  }

  return [...grouped.values()].map(
    (variants) => [...variants].sort(compareCameraVariantPreference)[0] ?? variants[0]
  );
}

export function isStillImageUtilityCamera(camera: CameraDevice): boolean {
  const searchText = getCameraSearchText(camera);
  return (
    camera.isStillImageOnly === true &&
    includesAnyKeyword(searchText, STILL_IMAGE_UTILITY_KEYWORDS) &&
    !includesAnyKeyword(
      searchText,
      SECURITY_CAMERA_KEYWORDS.filter((keyword) => keyword !== 'camera' && keyword !== 'cam')
    )
  );
}

function compareByRoomAndName(
  left: Pick<CameraDevice, 'room' | 'name'>,
  right: Pick<CameraDevice, 'room' | 'name'>
): number {
  const roomCompare = left.room.localeCompare(right.room);
  if (roomCompare !== 0) {
    return roomCompare;
  }

  return left.name.localeCompare(right.name);
}

function getRelatedMotionCount(sensors: SensorDevice[]): number {
  return sensors.filter((device) => {
    const entityId = device.nativeId ?? device.id;
    const deviceClass = getDeviceClass(device);
    const searchText = normalizeText(`${entityId} ${device.name}`);
    const isMotionSensor =
      MOTION_DEVICE_CLASSES.has(deviceClass) ||
      includesAnyKeyword(searchText, ['motion', 'occupancy', 'presence', 'pir']);

    return isMotionSensor && device.status === 'active';
  }).length;
}

function getOpenSensorCount(sensors: SensorDevice[]): number {
  return sensors.filter((device) => {
    const deviceClass = getDeviceClass(device);
    return OPENING_DEVICE_CLASSES.has(deviceClass) && device.status === 'active';
  }).length;
}

function getActiveAlarmCount(sensors: SensorDevice[]): number {
  return sensors.filter((device) => {
    const entityId = device.nativeId ?? device.id;
    return (
      entityId.startsWith('alarm_control_panel.') &&
      !['clear', 'unavailable'].includes(device.status ?? 'measurement')
    );
  }).length;
}

function getActiveSirenCount(sensors: SensorDevice[]): number {
  return sensors.filter((device) => {
    const entityId = device.nativeId ?? device.id;
    return entityId.startsWith('siren.') && device.status === 'active';
  }).length;
}

export function buildSecurityCameraDashboardModel(
  devices: Pick<DeviceCollection, 'cameras' | 'locks' | 'sensors'>
): CameraDashboardModel {
  const cameras = collapseCameraVariants(devices.cameras).sort(compareByRoomAndName);
  const unavailableCameras = cameras.filter(isUnavailableCamera);
  const availableCameras = cameras.filter((camera) => !isUnavailableCamera(camera));
  const stillImageCameras = availableCameras.filter(isStillImageUtilityCamera);
  const stillImageIds = new Set(stillImageCameras.map((camera) => camera.id));
  const primaryCameras = availableCameras.filter((camera) => !stillImageIds.has(camera.id));
  const locks = [...devices.locks].sort(compareByRoomAndName);
  const liveCount = primaryCameras.filter(
    (camera) => camera.isStreamCapable || isLiveCamera(camera)
  ).length;
  const idleCount = primaryCameras.length - liveCount;
  const unlockedCount = locks.filter((lock) => !lock.state).length;

  return {
    primaryCameras,
    stillImageCameras,
    unavailableCameras,
    locks,
    summary: {
      totalCameras: cameras.length,
      liveCount,
      idleCount,
      unavailableCount: unavailableCameras.length,
      motionCount: getRelatedMotionCount(devices.sensors),
      lockedCount: locks.length - unlockedCount,
      unlockedCount,
      openSensorCount: getOpenSensorCount(devices.sensors),
      activeAlarmCount: getActiveAlarmCount(devices.sensors),
      activeSirenCount: getActiveSirenCount(devices.sensors),
    },
  };
}
