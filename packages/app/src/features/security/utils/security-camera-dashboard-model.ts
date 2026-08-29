import { defaultTranslate, type TranslateFn } from '@navet/app/i18n';
import type {
  CameraDevice,
  Device,
  DeviceCollection,
  DeviceWithType,
  SecuritySeverity,
} from '@navet/app/types/device.types';
import { getDeviceRoomLabel, UNKNOWN_ROOM_LABEL } from '@navet/app/utils/device-location';
import { collapseOverlappingSecurityDevices, getSecurityAlertCount } from './security-alert-count';

export type SecurityGroupKey =
  | 'alarms'
  | 'access'
  | 'activity'
  | 'hazards'
  | 'cameras'
  | 'sirens'
  | 'presence'
  | 'system';

export type SecurityEntityGroups = Record<SecurityGroupKey, DeviceWithType[]>;

export interface SecurityGroupSummary {
  id: string;
  label: string;
  severity: SecuritySeverity;
  total: number;
  critical: number;
  warning: number;
  active: number;
  unknown: number;
  normal: number;
  summaryText: string;
  entities: DeviceWithType[];
  defaultExpanded: boolean;
}

export interface SecurityDashboardSummary {
  highestSeverity: SecuritySeverity;
  title: string;
  subtitle: string;
  attentionEntities: DeviceWithType[];
  attentionItems: DeviceWithType[];
  attentionEntityCount: number;
  activityItems: DeviceWithType[];
  liveItems: DeviceWithType[];
  unknownItems: DeviceWithType[];
  secureItems: DeviceWithType[];
  securedCounts: {
    openingsClosed: number;
    locksLocked: number;
    hazardSensorsClear: number;
    motionSensorsClear: number;
    camerasAvailable: number;
    totalSecure: number;
  };
  groupSummaries: SecurityGroupSummary[];
  totalEntities: number;
  criticalCount: number;
  warningCount: number;
  activeCount: number;
  unknownCount: number;
  normalCount: number;
}

export interface SecurityDashboardGroup {
  key: SecurityGroupKey;
  devices: DeviceWithType[];
}

export interface CameraDashboardModel {
  allEntities: DeviceWithType[];
  groups: SecurityEntityGroups;
  orderedGroups: SecurityDashboardGroup[];
  summary: SecurityDashboardSummary;
}

export type SecurityDashboardDeviceCollection = Pick<
  DeviceCollection,
  'cameras' | 'locks' | 'sensors'
> &
  Partial<Pick<DeviceCollection, 'covers' | 'persons' | 'helpers'>>;

const GROUP_ORDER: SecurityGroupKey[] = [
  'alarms',
  'access',
  'activity',
  'hazards',
  'cameras',
  'sirens',
  'presence',
  'system',
];

const SEVERITY_ORDER: Record<SecuritySeverity, number> = {
  critical: 0,
  warning: 1,
  active: 2,
  unknown: 3,
  normal: 4,
};
const ATTENTION_SEVERITY_ORDER: Record<SecuritySeverity, number> = {
  critical: 0,
  warning: 1,
  active: 2,
  unknown: 3,
  normal: 4,
};
const SECURE_MOTION_GROUP_ID = 'security.aggregate.motion.secure';
const ATTENTION_GROUP_ID_PREFIX = 'security.aggregate.attention.';

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

function normalizeText(value: string | undefined): string {
  return (value ?? '').replace(/[_-]/g, ' ').toLowerCase();
}

function includesAnyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function readCameraVariantBaseId(camera: CameraDevice): string {
  const value = normalizeText(camera.nativeId ?? camera.id);
  return value.replace(/(?:[_-]\d+)+$/, '');
}

function getCameraGroupingKey(camera: CameraDevice): string {
  if (camera.providerId && camera.sourceDeviceId) {
    return `${camera.providerId}:${camera.sourceDeviceId}`;
  }

  return `${camera.providerId ?? ''}:${readCameraVariantBaseId(camera)}:${normalizeText(
    camera.room
  )}:${normalizeText(camera.name)}`;
}

function compareByNameAndId(
  left: Pick<DeviceWithType, 'name' | 'id'>,
  right: Pick<DeviceWithType, 'name' | 'id'>
) {
  const nameComparison = left.name.localeCompare(right.name);
  if (nameComparison !== 0) {
    return nameComparison;
  }

  return left.id.localeCompare(right.id);
}

function isActiveCameraState(state: string | undefined): boolean {
  return state === 'streaming' || state === 'recording' || state === 'on';
}

function getSecuritySeverity(device: DeviceWithType): SecuritySeverity {
  if (device.type === 'covers') {
    return device.position > 0 ? 'warning' : 'normal';
  }

  if (device.type === 'cameras' || device.securityKind === 'camera') {
    if (device.securitySeverity === 'unknown') {
      return 'unknown';
    }

    return device.type === 'cameras' && isActiveCameraState(device.state) ? 'active' : 'normal';
  }

  if (
    device.type === 'persons' ||
    device.securityKind === 'person' ||
    device.securityKind === 'deviceTracker'
  ) {
    return device.securitySeverity === 'unknown' ? 'unknown' : 'normal';
  }

  return device.securitySeverity ?? 'normal';
}

function isPresenceDevice(device: DeviceWithType): boolean {
  return (
    device.type === 'persons' ||
    device.securityKind === 'person' ||
    device.securityKind === 'deviceTracker'
  );
}

function compareSecurityDevices(left: DeviceWithType, right: DeviceWithType) {
  const severityDifference =
    SEVERITY_ORDER[getSecuritySeverity(left)] - SEVERITY_ORDER[getSecuritySeverity(right)];
  if (severityDifference !== 0) {
    return severityDifference;
  }

  return compareByNameAndId(left, right);
}

function getAttentionPriority(device: DeviceWithType): number {
  const severity = getSecuritySeverity(device);

  if (severity === 'critical') {
    return 0;
  }

  if (
    severity === 'warning' &&
    (device.securityKind === 'smoke' ||
      device.securityKind === 'carbonMonoxide' ||
      device.securityKind === 'gas' ||
      device.securityKind === 'waterLeak' ||
      device.securityKind === 'safety')
  ) {
    return 1;
  }

  if (severity === 'warning' && (device.type === 'locks' || device.securityKind === 'lock')) {
    return 2;
  }

  if (
    severity === 'warning' &&
    (device.type === 'covers' ||
      device.securityKind === 'door' ||
      device.securityKind === 'window' ||
      device.securityKind === 'garageDoor' ||
      device.securityKind === 'opening')
  ) {
    return 3;
  }

  if (severity === 'warning') {
    return 4;
  }

  if (severity === 'active') {
    return 5;
  }

  if (severity === 'unknown') {
    return 6;
  }

  return 7;
}

function compareAttentionDevices(left: DeviceWithType, right: DeviceWithType) {
  const attentionPriorityDifference = getAttentionPriority(left) - getAttentionPriority(right);
  if (attentionPriorityDifference !== 0) {
    return attentionPriorityDifference;
  }

  const severityDifference =
    ATTENTION_SEVERITY_ORDER[getSecuritySeverity(left)] -
    ATTENTION_SEVERITY_ORDER[getSecuritySeverity(right)];
  if (severityDifference !== 0) {
    return severityDifference;
  }

  return compareByNameAndId(left, right);
}

function getCameraVariantPreference(camera: CameraDevice): [number, number, number, string] {
  const severityPenalty = SEVERITY_ORDER[getSecuritySeverity({ ...camera, type: 'cameras' })];
  const livePenalty = camera.isStreamCapable === true && camera.isStillImageOnly !== true ? 0 : 1;
  const suffixPenalty = camera.nativeId && /(?:[_-]\d+)+$/.test(camera.nativeId) ? 1 : 0;
  const freshness = camera.lastUpdated ?? camera.lastChanged ?? '';

  return [severityPenalty, livePenalty, suffixPenalty, freshness];
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

  return left.name.localeCompare(right.name);
}

function collapseCameraVariants(cameras: CameraDevice[]): CameraDevice[] {
  const grouped = new Map<string, CameraDevice[]>();

  for (const camera of cameras) {
    const key = getCameraGroupingKey(camera);
    const variants = grouped.get(key);
    if (variants) {
      variants.push(camera);
    } else {
      grouped.set(key, [camera]);
    }
  }

  return [...grouped.values()].map(
    (variants) => [...variants].sort(compareCameraVariantPreference)[0] ?? variants[0]
  );
}

export function isStillImageUtilityCamera(camera: CameraDevice): boolean {
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

function getSecurityGroupKey(device: DeviceWithType): SecurityGroupKey | null {
  const securityKind = device.securityKind;

  if (device.type === 'cameras' || securityKind === 'camera') {
    return 'cameras';
  }

  if (
    device.type === 'covers' ||
    device.type === 'locks' ||
    securityKind === 'lock' ||
    securityKind === 'door' ||
    securityKind === 'window' ||
    securityKind === 'garageDoor' ||
    securityKind === 'opening'
  ) {
    return 'access';
  }

  if (
    securityKind === 'motion' ||
    securityKind === 'occupancy' ||
    securityKind === 'presence' ||
    securityKind === 'vibration' ||
    securityKind === 'sound'
  ) {
    return 'activity';
  }

  if (
    securityKind === 'smoke' ||
    securityKind === 'carbonMonoxide' ||
    securityKind === 'gas' ||
    securityKind === 'waterLeak' ||
    securityKind === 'safety'
  ) {
    return 'hazards';
  }

  if (securityKind === 'alarm') {
    return 'alarms';
  }

  if (securityKind === 'siren') {
    return 'sirens';
  }

  if (device.type === 'persons' || securityKind === 'person' || securityKind === 'deviceTracker') {
    return 'presence';
  }

  if (
    securityKind === 'connectivity' ||
    securityKind === 'battery' ||
    securityKind === 'problem' ||
    securityKind === 'tamper'
  ) {
    return 'system';
  }

  return null;
}

export function isSecurityDashboardDevice(device: Device): boolean {
  return getSecurityGroupKey(device as DeviceWithType) !== null;
}

function createEmptyGroups(): SecurityEntityGroups {
  return {
    alarms: [],
    access: [],
    activity: [],
    hazards: [],
    cameras: [],
    sirens: [],
    presence: [],
    system: [],
  };
}

function toTypedDevices<TType extends keyof DeviceCollection>(
  devices: DeviceCollection[TType],
  type: TType
): Array<DeviceCollection[TType][number] & { type: TType }> {
  return devices.map((device) => ({ ...device, type }));
}

function buildSecurityDashboardCandidates(
  devices: SecurityDashboardDeviceCollection
): DeviceWithType[] {
  const dedupedCameras = collapseCameraVariants(devices.cameras);
  return collapseOverlappingSecurityDevices([
    ...toTypedDevices(dedupedCameras, 'cameras'),
    ...toTypedDevices(devices.covers ?? [], 'covers'),
    ...toTypedDevices(devices.locks, 'locks'),
    ...toTypedDevices(devices.sensors, 'sensors'),
    ...toTypedDevices(devices.persons ?? [], 'persons'),
    ...toTypedDevices(devices.helpers ?? [], 'helpers'),
  ]);
}

export function getSecurityDashboardAlertCount(devices: SecurityDashboardDeviceCollection): number {
  return getSecurityAlertCount(
    buildSecurityDashboardCandidates(devices).filter(
      (device) => getSecurityGroupKey(device) !== null
    )
  );
}

function countBySeverity(entities: DeviceWithType[]) {
  return entities.reduce(
    (counts, entity) => {
      counts[getSecuritySeverity(entity)] += 1;
      return counts;
    },
    {
      critical: 0,
      warning: 0,
      active: 0,
      unknown: 0,
      normal: 0,
    }
  );
}

function getHighestSeverity(entities: DeviceWithType[]): SecuritySeverity {
  if (entities.length === 0) {
    return 'normal';
  }

  return [...entities]
    .map((entity) => getSecuritySeverity(entity))
    .sort((left, right) => SEVERITY_ORDER[left] - SEVERITY_ORDER[right])[0];
}

function readStateLabel(device: DeviceWithType, t: TranslateFn): string {
  switch (device.type) {
    case 'covers':
      return device.position > 0 ? t('common.open') : t('security.status.closed');
    case 'locks':
      return device.state ? t('security.status.locked') : t('security.status.unlocked');
    case 'cameras':
      return normalizeText(device.state).replace(/\b\w/g, (segment) => segment.toUpperCase());
    case 'persons':
      return device.state === 'home' ? t('security.status.home') : t('security.status.away');
    case 'helpers':
      return device.serviceAction === 'press'
        ? t('security.status.action')
        : device.state
          ? t('common.on')
          : t('common.off');
    case 'sensors':
      return device.value;
    default:
      return t('security.severity.active');
  }
}

function getRoomSuffix(device: DeviceWithType): string {
  const room = getDeviceRoomLabel(device);
  return room !== UNKNOWN_ROOM_LABEL ? room : '';
}

function formatAttentionSnippet(device: DeviceWithType, t: TranslateFn): string {
  const room = getRoomSuffix(device);
  const stateLabel = readStateLabel(device, t).toLocaleLowerCase();
  return room ? `${device.name} ${stateLabel} · ${room}` : `${device.name} ${stateLabel}`;
}

function joinSummaryParts(parts: string[]): string {
  return parts.filter(Boolean).join(' · ');
}

function getSecureCountSummaryText(
  securedCounts: SecurityDashboardSummary['securedCounts'],
  t: TranslateFn
): string {
  const parts = [
    securedCounts.openingsClosed > 0
      ? t('security.summary.openingsClosed', { count: securedCounts.openingsClosed })
      : '',
    securedCounts.locksLocked > 0
      ? t('security.summary.locksLocked', { count: securedCounts.locksLocked })
      : '',
    securedCounts.hazardSensorsClear > 0
      ? t('security.summary.hazardSensorsClear', { count: securedCounts.hazardSensorsClear })
      : '',
    securedCounts.motionSensorsClear > 0
      ? t('security.summary.motionSensorsClear', { count: securedCounts.motionSensorsClear })
      : '',
    securedCounts.camerasAvailable > 0
      ? t('security.summary.camerasAvailable', { count: securedCounts.camerasAvailable })
      : '',
  ];

  return joinSummaryParts(parts.slice(0, 3).filter(Boolean));
}

function buildSecuredCounts(allEntities: DeviceWithType[]) {
  const secureItems = getRawSecureItems(allEntities);
  const availableCameraEntities = allEntities.filter(
    (entity) =>
      (entity.type === 'cameras' || entity.securityKind === 'camera') &&
      getSecuritySeverity(entity) !== 'unknown'
  );

  const openingsClosed = secureItems.filter(
    (entity) =>
      entity.type === 'covers' ||
      entity.securityKind === 'door' ||
      entity.securityKind === 'window' ||
      entity.securityKind === 'garageDoor' ||
      entity.securityKind === 'opening'
  ).length;
  const locksLocked = secureItems.filter(
    (entity) => entity.type === 'locks' || entity.securityKind === 'lock'
  ).length;
  const hazardSensorsClear = secureItems.filter((entity) =>
    ['smoke', 'carbonMonoxide', 'gas', 'waterLeak', 'safety'].includes(entity.securityKind ?? '')
  ).length;
  const motionSensorsClear = secureItems.filter((entity) =>
    ['motion', 'occupancy', 'presence', 'vibration', 'sound'].includes(entity.securityKind ?? '')
  ).length;
  const camerasAvailable = secureItems.filter(
    (entity) => entity.type === 'cameras' || entity.securityKind === 'camera'
  ).length;
  const availableCameraCount = Math.max(camerasAvailable, availableCameraEntities.length);

  return {
    openingsClosed,
    locksLocked,
    hazardSensorsClear,
    motionSensorsClear,
    camerasAvailable: availableCameraCount,
    totalSecure:
      openingsClosed + locksLocked + hazardSensorsClear + motionSensorsClear + availableCameraCount,
  };
}

function buildSecureOverviewItems(
  securedCounts: SecurityDashboardSummary['securedCounts'],
  t: TranslateFn
): DeviceWithType[] {
  const items: DeviceWithType[] = [];

  if (securedCounts.openingsClosed > 0) {
    items.push({
      id: 'security.aggregate.openings.secure',
      type: 'sensors',
      name: t('security.group.openings'),
      room: UNKNOWN_ROOM_LABEL,
      size: 'small',
      value: t('security.summary.closed', { count: securedCounts.openingsClosed }),
      unit: '',
      deviceClass: 'door',
      securityKind: 'opening',
      securitySeverity: 'normal',
      status: 'clear',
    });
  }

  if (securedCounts.locksLocked > 0) {
    items.push({
      id: 'security.aggregate.locks.secure',
      type: 'sensors',
      name: t('security.group.locks'),
      room: UNKNOWN_ROOM_LABEL,
      size: 'small',
      value: t('security.summary.locked', { count: securedCounts.locksLocked }),
      unit: '',
      deviceClass: 'lock',
      securityKind: 'lock',
      securitySeverity: 'normal',
      status: 'clear',
    });
  }

  if (securedCounts.motionSensorsClear > 0) {
    items.push({
      id: 'security.aggregate.motion.secure',
      type: 'sensors',
      name: t('security.group.motionOccupancy'),
      room: UNKNOWN_ROOM_LABEL,
      size: 'small',
      value: t('security.summary.clear', { count: securedCounts.motionSensorsClear }),
      unit: '',
      deviceClass: 'motion',
      securityKind: 'motion',
      securitySeverity: 'normal',
      status: 'clear',
    });
  }

  if (securedCounts.hazardSensorsClear > 0) {
    items.push({
      id: 'security.aggregate.hazards.secure',
      type: 'sensors',
      name: t('security.group.hazards'),
      room: UNKNOWN_ROOM_LABEL,
      size: 'small',
      value: t('security.summary.clear', { count: securedCounts.hazardSensorsClear }),
      unit: '',
      deviceClass: 'smoke',
      securityKind: 'safety',
      securitySeverity: 'normal',
      status: 'clear',
    });
  }

  return items;
}

function getAttentionGroupIconShape(groupId: string): {
  securityKind: DeviceWithType['securityKind'];
  deviceClass?: string;
} {
  switch (groupId) {
    case 'doors-windows':
      return { securityKind: 'opening', deviceClass: 'door' };
    case 'locks':
      return { securityKind: 'lock', deviceClass: 'lock' };
    case 'motion-occupancy':
      return { securityKind: 'motion', deviceClass: 'motion' };
    case 'hazards':
      return { securityKind: 'smoke', deviceClass: 'smoke' };
    case 'cameras':
      return { securityKind: 'camera', deviceClass: 'camera' };
    case 'sirens':
      return { securityKind: 'siren', deviceClass: 'siren' };
    case 'alarms':
      return { securityKind: 'alarm', deviceClass: 'safety' };
    case 'system':
      return { securityKind: 'problem', deviceClass: 'problem' };
    default:
      return { securityKind: 'problem' };
  }
}

function buildAttentionOverviewItems(
  groupSummaries: SecurityGroupSummary[],
  t: TranslateFn
): DeviceWithType[] {
  return groupSummaries
    .filter((group) => group.id !== 'presence')
    .filter((group) =>
      group.entities.some((entity) => {
        if (isPresenceDevice(entity)) {
          return false;
        }

        const severity = getSecuritySeverity(entity);
        return severity === 'critical' || severity === 'warning' || severity === 'unknown';
      })
    )
    .map((group) => {
      const attentionEntities = group.entities.filter((entity) => {
        if (isPresenceDevice(entity)) {
          return false;
        }

        const severity = getSecuritySeverity(entity);
        return severity === 'critical' || severity === 'warning' || severity === 'unknown';
      });
      const iconShape = getAttentionGroupIconShape(group.id);
      return {
        id: `${ATTENTION_GROUP_ID_PREFIX}${group.id}`,
        type: 'sensors',
        name: group.label,
        room: UNKNOWN_ROOM_LABEL,
        size: 'small',
        value: buildGroupSummaryText(group.id, attentionEntities, t),
        unit: '',
        deviceClass: iconShape.deviceClass,
        securityKind: iconShape.securityKind,
        securitySeverity: getHighestSeverity(attentionEntities),
        status: attentionEntities.some((entity) => getSecuritySeverity(entity) === 'unknown')
          ? 'unavailable'
          : 'active',
      } satisfies DeviceWithType;
    })
    .sort(compareAttentionDevices);
}

function isSecureOverviewEntity(device: DeviceWithType): boolean {
  const severity = getSecuritySeverity(device);
  if (severity !== 'normal') {
    return false;
  }

  if (isPresenceDevice(device)) {
    return false;
  }

  if (device.type === 'cameras' || device.securityKind === 'camera') {
    return false;
  }

  return (
    device.type === 'covers' ||
    device.type === 'locks' ||
    [
      'lock',
      'door',
      'window',
      'garageDoor',
      'opening',
      'motion',
      'occupancy',
      'presence',
      'vibration',
      'sound',
      'smoke',
      'carbonMonoxide',
      'gas',
      'waterLeak',
      'safety',
    ].includes(device.securityKind ?? '')
  );
}

function getRawSecureItems(allEntities: DeviceWithType[]): DeviceWithType[] {
  return allEntities.filter(isSecureOverviewEntity).sort(compareSecurityDevices);
}

function isSecureMotionSensor(device: DeviceWithType): boolean {
  return device.type === 'sensors' && device.securityKind === 'motion';
}

function buildGroupedSecureMotionItem(
  motionDevices: DeviceWithType[],
  t: TranslateFn
): DeviceWithType {
  const firstMotionDevice = motionDevices[0];
  const count = motionDevices.length;

  return {
    id: SECURE_MOTION_GROUP_ID,
    type: 'sensors',
    name: t('security.group.motionSensors'),
    room: firstMotionDevice?.room ?? UNKNOWN_ROOM_LABEL,
    size: 'small',
    value: t('security.summary.clear', { count }),
    unit: '',
    securityKind: 'motion',
    securitySeverity: 'normal',
    status: 'clear',
    groupMembers: motionDevices.map((device) => device.id),
  };
}

function collapseSecureMotionDevices(devices: DeviceWithType[], t: TranslateFn): DeviceWithType[] {
  const motionDevices = devices.filter(isSecureMotionSensor);

  if (motionDevices.length <= 1) {
    return devices;
  }

  return [
    ...devices.filter((device) => !isSecureMotionSensor(device)),
    buildGroupedSecureMotionItem(motionDevices, t),
  ].sort(compareSecurityDevices);
}

function getSecureItems(
  securedCounts: SecurityDashboardSummary['securedCounts'],
  t: TranslateFn
): DeviceWithType[] {
  return buildSecureOverviewItems(securedCounts, t);
}

function getLiveItems(allEntities: DeviceWithType[]): DeviceWithType[] {
  return allEntities
    .filter(
      (entity) =>
        (entity.type === 'cameras' || entity.securityKind === 'camera') &&
        getSecuritySeverity(entity) !== 'unknown'
    )
    .sort(compareSecurityDevices);
}

function buildHeroCopy(
  allEntities: DeviceWithType[],
  attentionItems: DeviceWithType[],
  activityItems: DeviceWithType[],
  unknownItems: DeviceWithType[],
  securedCounts: SecurityDashboardSummary['securedCounts'],
  t: TranslateFn
) {
  const highestSeverity = getHighestSeverity(allEntities);

  if (highestSeverity === 'critical') {
    const topItem = attentionItems.find((item) => getSecuritySeverity(item) === 'critical');
    return {
      highestSeverity,
      title: t('security.overview.hero.critical'),
      subtitle: topItem
        ? formatAttentionSnippet(topItem, t)
        : t('security.overview.hero.immediate'),
    };
  }

  if (highestSeverity === 'warning') {
    const warningItems = attentionItems.filter((item) => getSecuritySeverity(item) === 'warning');
    return {
      highestSeverity,
      title: t(
        warningItems.length === 1
          ? 'security.overview.hero.attentionOne'
          : 'security.overview.hero.attention',
        { count: warningItems.length }
      ),
      subtitle: joinSummaryParts(
        warningItems.slice(0, 2).map((item) => formatAttentionSnippet(item, t))
      ),
    };
  }

  if (highestSeverity === 'active') {
    return {
      highestSeverity,
      title: t('security.overview.hero.active'),
      subtitle:
        joinSummaryParts(
          activityItems.slice(0, 2).map((item) => formatAttentionSnippet(item, t))
        ) || t('security.overview.hero.liveDetected'),
    };
  }

  if (highestSeverity === 'unknown') {
    return {
      highestSeverity,
      title: t('security.overview.hero.unavailable'),
      subtitle: t(
        unknownItems.length === 1
          ? 'security.overview.hero.unavailableOne'
          : 'security.overview.hero.unavailableCount',
        { count: unknownItems.length }
      ),
    };
  }

  return {
    highestSeverity,
    title: t('security.overview.hero.allSecure'),
    subtitle: getSecureCountSummaryText(securedCounts, t) || t('security.overview.hero.noIssues'),
  };
}

function getGroupSeverity(entities: DeviceWithType[]): SecuritySeverity {
  return getHighestSeverity(entities);
}

function buildSeverityBreakdownText(entities: DeviceWithType[], t: TranslateFn): string {
  const counts = countBySeverity(entities);
  const parts = [
    counts.critical > 0 ? t('security.summary.critical', { count: counts.critical }) : '',
    counts.warning > 0 ? t('security.summary.attention', { count: counts.warning }) : '',
    counts.active > 0 ? t('security.summary.active', { count: counts.active }) : '',
    counts.unknown > 0 ? t('security.summary.unavailable', { count: counts.unknown }) : '',
    counts.normal > 0 ? t('security.summary.normal', { count: counts.normal }) : '',
  ];
  return joinSummaryParts(parts);
}

function buildGroupSummaryText(id: string, entities: DeviceWithType[], t: TranslateFn): string {
  const normalCount = entities.filter((entity) => getSecuritySeverity(entity) === 'normal').length;
  const warningCount = entities.filter(
    (entity) => getSecuritySeverity(entity) === 'warning'
  ).length;
  const criticalCount = entities.filter(
    (entity) => getSecuritySeverity(entity) === 'critical'
  ).length;
  const activeCount = entities.filter((entity) => getSecuritySeverity(entity) === 'active').length;
  const unknownCount = entities.filter(
    (entity) => getSecuritySeverity(entity) === 'unknown'
  ).length;

  switch (id) {
    case 'doors-windows':
      return joinSummaryParts([
        normalCount > 0 ? t('security.summary.closed', { count: normalCount }) : '',
        warningCount > 0 ? t('security.summary.open', { count: warningCount }) : '',
        unknownCount > 0 ? t('security.summary.unavailable', { count: unknownCount }) : '',
      ]);
    case 'locks':
      return joinSummaryParts([
        normalCount > 0 ? t('security.summary.locked', { count: normalCount }) : '',
        warningCount > 0 ? t('security.summary.unlocked', { count: warningCount }) : '',
        activeCount > 0 ? t('security.summary.changing', { count: activeCount }) : '',
        unknownCount > 0 ? t('security.summary.unavailable', { count: unknownCount }) : '',
      ]);
    case 'motion-occupancy':
      return joinSummaryParts([
        activeCount > 0 ? t('security.summary.active', { count: activeCount }) : '',
        normalCount > 0 ? t('security.summary.clear', { count: normalCount }) : '',
        unknownCount > 0 ? t('security.summary.unavailable', { count: unknownCount }) : '',
      ]);
    case 'hazards':
      return joinSummaryParts([
        criticalCount + warningCount > 0
          ? t('security.summary.alerts', { count: criticalCount + warningCount })
          : '',
        normalCount > 0 ? t('security.summary.clear', { count: normalCount }) : '',
        unknownCount > 0 ? t('security.summary.unavailable', { count: unknownCount }) : '',
      ]);
    case 'cameras':
      return joinSummaryParts([
        activeCount > 0 ? t('security.summary.live', { count: activeCount }) : '',
        normalCount > 0 ? t('security.summary.available', { count: normalCount }) : '',
        unknownCount > 0 ? t('security.summary.unavailable', { count: unknownCount }) : '',
      ]);
    case 'sirens':
      return joinSummaryParts([
        criticalCount > 0 ? t('security.summary.on', { count: criticalCount }) : '',
        normalCount > 0 ? t('security.summary.off', { count: normalCount }) : '',
        unknownCount > 0 ? t('security.summary.unavailable', { count: unknownCount }) : '',
      ]);
    case 'alarms':
      return joinSummaryParts([
        criticalCount > 0 ? t('security.summary.triggered', { count: criticalCount }) : '',
        warningCount > 0 ? t('security.summary.pending', { count: warningCount }) : '',
        activeCount > 0 ? t('security.summary.armed', { count: activeCount }) : '',
        normalCount > 0 ? t('security.summary.disarmed', { count: normalCount }) : '',
        unknownCount > 0 ? t('security.summary.unavailable', { count: unknownCount }) : '',
      ]);
    case 'presence':
      return joinSummaryParts([
        normalCount > 0 ? t('security.summary.settled', { count: normalCount }) : '',
        unknownCount > 0 ? t('security.summary.unavailable', { count: unknownCount }) : '',
      ]);
    case 'system':
      return joinSummaryParts([
        warningCount + criticalCount > 0
          ? t('security.summary.issues', { count: warningCount + criticalCount })
          : '',
        unknownCount > 0 ? t('security.summary.unavailable', { count: unknownCount }) : '',
        normalCount > 0 ? t('security.summary.healthy', { count: normalCount }) : '',
      ]);
    case 'actions':
      return joinSummaryParts([
        normalCount > 0 ? t('security.summary.ready', { count: normalCount }) : '',
        activeCount > 0 ? t('security.summary.active', { count: activeCount }) : '',
        unknownCount > 0 ? t('security.summary.unavailable', { count: unknownCount }) : '',
      ]);
    default:
      return buildSeverityBreakdownText(entities, t);
  }
}

function buildGroupSummaries(
  allEntities: DeviceWithType[],
  t: TranslateFn
): SecurityGroupSummary[] {
  const cameraDeviceIds = new Set(
    allEntities
      .filter((entity) => entity.type === 'cameras')
      .map((camera) => camera.underlyingDeviceId)
      .filter((deviceId): deviceId is string => typeof deviceId === 'string')
  );
  const shouldKeepMotionSensorIndividual = (entity: DeviceWithType) =>
    isSecureMotionSensor(entity) &&
    (getSecuritySeverity(entity) !== 'normal' ||
      (typeof entity.underlyingDeviceId === 'string' &&
        cameraDeviceIds.has(entity.underlyingDeviceId)));
  const definitions: Array<{
    id: string;
    label: string;
    include: (device: DeviceWithType) => boolean;
  }> = [
    {
      id: 'alarms',
      label: t('security.group.alarm'),
      include: (device) => device.securityKind === 'alarm',
    },
    {
      id: 'doors-windows',
      label: t('security.group.doorsWindows'),
      include: (device) =>
        device.type === 'covers' ||
        ['door', 'window', 'garageDoor', 'opening'].includes(device.securityKind ?? ''),
    },
    {
      id: 'locks',
      label: t('security.group.locks'),
      include: (device) => device.type === 'locks' || device.securityKind === 'lock',
    },
    {
      id: 'motion-occupancy',
      label: t('security.group.motionOccupancy'),
      include: (device) =>
        ['motion', 'occupancy', 'presence', 'vibration', 'sound'].includes(
          device.securityKind ?? ''
        ),
    },
    {
      id: 'hazards',
      label: t('security.group.hazards'),
      include: (device) =>
        ['smoke', 'carbonMonoxide', 'gas', 'waterLeak', 'safety'].includes(
          device.securityKind ?? ''
        ),
    },
    {
      id: 'cameras',
      label: t('security.group.cameras'),
      include: (device) => device.type === 'cameras' || device.securityKind === 'camera',
    },
    {
      id: 'sirens',
      label: t('security.group.sirens'),
      include: (device) => device.securityKind === 'siren',
    },
    {
      id: 'presence',
      label: t('security.group.presence'),
      include: (device) =>
        device.type === 'persons' ||
        device.securityKind === 'person' ||
        device.securityKind === 'deviceTracker',
    },
    {
      id: 'system',
      label: t('security.group.system'),
      include: (device) =>
        ['connectivity', 'battery', 'problem', 'tamper'].includes(device.securityKind ?? ''),
    },
  ];

  return definitions
    .map((definition) => {
      const rawEntities = allEntities.filter(definition.include);
      if (rawEntities.length === 0) {
        return null;
      }

      const entities =
        definition.id === 'motion-occupancy'
          ? [
              ...collapseSecureMotionDevices(
                rawEntities.filter((entity) => !shouldKeepMotionSensorIndividual(entity)),
                t
              ),
              ...rawEntities.filter(shouldKeepMotionSensorIndividual),
            ].sort(compareSecurityDevices)
          : rawEntities;
      const severityCounts = countBySeverity(rawEntities);
      const severity = getGroupSeverity(rawEntities);

      return {
        id: definition.id,
        label: definition.label,
        severity,
        total: rawEntities.length,
        ...severityCounts,
        summaryText: buildGroupSummaryText(definition.id, rawEntities, t),
        entities,
        defaultExpanded: severity === 'critical' || severity === 'warning',
      } satisfies SecurityGroupSummary;
    })
    .filter((group): group is SecurityGroupSummary => group !== null);
}

export function buildSecurityRoomGroupSummaries(
  allEntities: DeviceWithType[],
  t: TranslateFn = defaultTranslate
): SecurityGroupSummary[] {
  const entitiesByRoom = new Map<string, DeviceWithType[]>();

  for (const entity of allEntities) {
    const room = getDeviceRoomLabel(entity);
    const roomEntities = entitiesByRoom.get(room) ?? [];
    roomEntities.push(entity);
    entitiesByRoom.set(room, roomEntities);
  }

  return [...entitiesByRoom.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([room, roomEntities]) => {
      const entities = [...roomEntities].sort(compareSecurityDevices);
      const severityCounts = countBySeverity(entities);
      const severity = getGroupSeverity(entities);

      return {
        id: `room-${encodeURIComponent(room)}`,
        label: room,
        severity,
        total: entities.length,
        ...severityCounts,
        summaryText: buildSeverityBreakdownText(entities, t),
        entities,
        defaultExpanded: severity === 'critical' || severity === 'warning',
      } satisfies SecurityGroupSummary;
    });
}

export function buildSecurityCameraDashboardModel(
  devices: SecurityDashboardDeviceCollection,
  t: TranslateFn = defaultTranslate
): CameraDashboardModel {
  const groups = createEmptyGroups();
  const candidates = buildSecurityDashboardCandidates(devices);

  for (const device of candidates) {
    const groupKey = getSecurityGroupKey(device);
    if (!groupKey) {
      continue;
    }

    groups[groupKey].push(device);
  }

  for (const key of GROUP_ORDER) {
    groups[key].sort(compareSecurityDevices);
  }

  const allEntities = GROUP_ORDER.flatMap((key) => groups[key]);
  const summaryEntities = allEntities.filter(
    (entity) => !(isPresenceDevice(entity) && getSecuritySeverity(entity) === 'unknown')
  );
  const severityCounts = countBySeverity(summaryEntities);
  const attentionEntityItems = allEntities
    .filter((entity) => {
      if (isPresenceDevice(entity)) {
        return false;
      }
      const severity = getSecuritySeverity(entity);
      return severity === 'critical' || severity === 'warning' || severity === 'unknown';
    })
    .sort(compareAttentionDevices);
  const activityItems = allEntities
    .filter((entity) => !isPresenceDevice(entity) && getSecuritySeverity(entity) === 'active')
    .sort(compareSecurityDevices);
  const securedCounts = buildSecuredCounts(allEntities);
  const liveItems = getLiveItems(allEntities);
  const unknownItems = summaryEntities
    .filter((entity) => getSecuritySeverity(entity) === 'unknown')
    .sort(compareSecurityDevices);
  const secureItems = getSecureItems(securedCounts, t);
  const groupSummaries = buildGroupSummaries(allEntities, t);
  const attentionItems = buildAttentionOverviewItems(groupSummaries, t);
  const hero = buildHeroCopy(
    summaryEntities,
    attentionEntityItems,
    activityItems,
    unknownItems,
    securedCounts,
    t
  );

  return {
    allEntities,
    groups,
    orderedGroups: GROUP_ORDER.map((key) => ({ key, devices: groups[key] })).filter(
      (group) => group.devices.length > 0
    ),
    summary: {
      ...hero,
      attentionEntities: attentionEntityItems,
      attentionItems,
      attentionEntityCount: getSecurityAlertCount(allEntities),
      activityItems,
      liveItems,
      unknownItems,
      secureItems,
      securedCounts,
      groupSummaries,
      totalEntities: allEntities.length,
      criticalCount: severityCounts.critical,
      warningCount: severityCounts.warning,
      activeCount: severityCounts.active,
      unknownCount: severityCounts.unknown,
      normalCount: severityCounts.normal,
    },
  };
}
