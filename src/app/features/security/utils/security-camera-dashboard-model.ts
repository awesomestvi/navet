import type {
  PlatformEntitySnapshot,
  PlatformEntitySnapshotMap,
} from '@/app/platform/provider-feature-models';
import type { CameraDevice, DeviceCollection, LockDevice } from '@/app/types/device.types';

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

function getDeviceClass(entity: PlatformEntitySnapshot | undefined): string {
  return typeof entity?.attributes?.device_class === 'string'
    ? entity.attributes.device_class.toLowerCase()
    : '';
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

function getRelatedMotionCount(entities: PlatformEntitySnapshotMap | null | undefined): number {
  if (!entities) {
    return 0;
  }

  return Object.entries(entities).filter(([entityId, entity]) => {
    if (!entityId.startsWith('binary_sensor.')) {
      return false;
    }

    const deviceClass = getDeviceClass(entity);
    const searchText = normalizeText(`${entityId} ${entity.attributes?.friendly_name ?? ''}`);
    const isMotionSensor =
      MOTION_DEVICE_CLASSES.has(deviceClass) ||
      includesAnyKeyword(searchText, ['motion', 'occupancy', 'presence', 'pir']);

    return isMotionSensor && entity.state === 'on';
  }).length;
}

function getOpenSensorCount(entities: PlatformEntitySnapshotMap | null | undefined): number {
  if (!entities) {
    return 0;
  }

  return Object.entries(entities).filter(([entityId, entity]) => {
    if (!entityId.startsWith('binary_sensor.')) {
      return false;
    }

    const deviceClass = getDeviceClass(entity);
    return OPENING_DEVICE_CLASSES.has(deviceClass) && entity.state === 'on';
  }).length;
}

function getActiveAlarmCount(entities: PlatformEntitySnapshotMap | null | undefined): number {
  if (!entities) {
    return 0;
  }

  return Object.entries(entities).filter(
    ([entityId, entity]) =>
      entityId.startsWith('alarm_control_panel.') &&
      !['disarmed', 'unavailable', 'unknown'].includes(entity.state)
  ).length;
}

function getActiveSirenCount(entities: PlatformEntitySnapshotMap | null | undefined): number {
  if (!entities) {
    return 0;
  }

  return Object.entries(entities).filter(
    ([entityId, entity]) => entityId.startsWith('siren.') && entity.state === 'on'
  ).length;
}

export function buildSecurityCameraDashboardModel(
  devices: Pick<DeviceCollection, 'cameras' | 'locks'>,
  entities?: PlatformEntitySnapshotMap | null
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
      motionCount: getRelatedMotionCount(entities),
      lockedCount: locks.length - unlockedCount,
      unlockedCount,
      openSensorCount: getOpenSensorCount(entities),
      activeAlarmCount: getActiveAlarmCount(entities),
      activeSirenCount: getActiveSirenCount(entities),
    },
  };
}
