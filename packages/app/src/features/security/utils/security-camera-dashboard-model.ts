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
  const cameras = [...devices.cameras].sort(compareByRoomAndName);
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
