import type {
  CameraDevice,
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
    (device.type === 'covers' ||
      device.securityKind === 'door' ||
      device.securityKind === 'window' ||
      device.securityKind === 'garageDoor' ||
      device.securityKind === 'opening')
  ) {
    return 1;
  }

  if (severity === 'warning' && (device.type === 'locks' || device.securityKind === 'lock')) {
    return 2;
  }

  if (severity === 'warning') {
    return 3;
  }

  if (severity === 'active') {
    return 4;
  }

  if (severity === 'unknown') {
    return 5;
  }

  return 6;
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

function readStateLabel(device: DeviceWithType): string {
  switch (device.type) {
    case 'covers':
      return device.position > 0 ? 'Open' : 'Closed';
    case 'locks':
      return device.state ? 'Locked' : 'Unlocked';
    case 'cameras':
      return normalizeText(device.state).replace(/\b\w/g, (segment) => segment.toUpperCase());
    case 'persons':
      return device.state === 'home' ? 'Home' : 'Away';
    case 'helpers':
      return device.serviceAction === 'press' ? 'Action' : device.state ? 'On' : 'Off';
    case 'sensors':
      return device.value;
    default:
      return 'Active';
  }
}

function getRoomSuffix(device: DeviceWithType): string {
  const room = getDeviceRoomLabel(device);
  return room !== UNKNOWN_ROOM_LABEL ? room : '';
}

function formatAttentionSnippet(device: DeviceWithType): string {
  const room = getRoomSuffix(device);
  const stateLabel = readStateLabel(device).toLowerCase();
  return room ? `${device.name} ${stateLabel} · ${room}` : `${device.name} ${stateLabel}`;
}

function joinSummaryParts(parts: string[]): string {
  return parts.filter(Boolean).join(' · ');
}

function getSecureCountSummaryText(
  securedCounts: SecurityDashboardSummary['securedCounts']
): string {
  const parts = [
    securedCounts.openingsClosed > 0 ? `${securedCounts.openingsClosed} openings closed` : '',
    securedCounts.locksLocked > 0 ? `${securedCounts.locksLocked} locks locked` : '',
    securedCounts.hazardSensorsClear > 0
      ? `${securedCounts.hazardSensorsClear} hazard sensors clear`
      : '',
    securedCounts.motionSensorsClear > 0
      ? `${securedCounts.motionSensorsClear} motion sensors clear`
      : '',
    securedCounts.camerasAvailable > 0 ? `${securedCounts.camerasAvailable} cameras available` : '',
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
  securedCounts: SecurityDashboardSummary['securedCounts']
): DeviceWithType[] {
  const items: DeviceWithType[] = [];

  if (securedCounts.openingsClosed > 0) {
    items.push({
      id: 'security.aggregate.openings.secure',
      type: 'sensors',
      name: 'Openings',
      room: UNKNOWN_ROOM_LABEL,
      size: 'small',
      value: `${securedCounts.openingsClosed} closed`,
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
      name: 'Locks',
      room: UNKNOWN_ROOM_LABEL,
      size: 'small',
      value: `${securedCounts.locksLocked} locked`,
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
      name: 'Motion & occupancy',
      room: UNKNOWN_ROOM_LABEL,
      size: 'small',
      value: `${securedCounts.motionSensorsClear} clear`,
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
      name: 'Hazards',
      room: UNKNOWN_ROOM_LABEL,
      size: 'small',
      value: `${securedCounts.hazardSensorsClear} clear`,
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

function buildAttentionOverviewItems(groupSummaries: SecurityGroupSummary[]): DeviceWithType[] {
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
        value: buildGroupSummaryText(group.id, attentionEntities),
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

function buildGroupedSecureMotionItem(motionDevices: DeviceWithType[]): DeviceWithType {
  const firstMotionDevice = motionDevices[0];
  const count = motionDevices.length;

  return {
    id: SECURE_MOTION_GROUP_ID,
    type: 'sensors',
    name: 'Motion sensors',
    room: firstMotionDevice?.room ?? UNKNOWN_ROOM_LABEL,
    size: 'small',
    value: `${count} clear`,
    unit: '',
    securityKind: 'motion',
    securitySeverity: 'normal',
    status: 'clear',
    groupMembers: motionDevices.map((device) => device.id),
  };
}

function collapseSecureMotionDevices(devices: DeviceWithType[]): DeviceWithType[] {
  const motionDevices = devices.filter(isSecureMotionSensor);

  if (motionDevices.length <= 1) {
    return devices;
  }

  return [
    ...devices.filter((device) => !isSecureMotionSensor(device)),
    buildGroupedSecureMotionItem(motionDevices),
  ].sort(compareSecurityDevices);
}

function getSecureItems(
  securedCounts: SecurityDashboardSummary['securedCounts']
): DeviceWithType[] {
  return buildSecureOverviewItems(securedCounts);
}

function getLiveItems(allEntities: DeviceWithType[]): DeviceWithType[] {
  return allEntities
    .filter((entity) => {
      if (isPresenceDevice(entity) || getSecuritySeverity(entity) === 'unknown') {
        return false;
      }

      if (entity.type === 'cameras' || entity.securityKind === 'camera') {
        return true;
      }

      return getSecuritySeverity(entity) === 'active';
    })
    .sort(compareSecurityDevices);
}

function buildHeroCopy(
  allEntities: DeviceWithType[],
  attentionItems: DeviceWithType[],
  activityItems: DeviceWithType[],
  unknownItems: DeviceWithType[],
  securedCounts: SecurityDashboardSummary['securedCounts']
) {
  const highestSeverity = getHighestSeverity(allEntities);

  if (highestSeverity === 'critical') {
    const topItem = attentionItems.find((item) => getSecuritySeverity(item) === 'critical');
    return {
      highestSeverity,
      title: 'Critical alert',
      subtitle: topItem ? formatAttentionSnippet(topItem) : 'Immediate attention required',
    };
  }

  if (highestSeverity === 'warning') {
    const warningItems = attentionItems.filter((item) => getSecuritySeverity(item) === 'warning');
    return {
      highestSeverity,
      title: `${warningItems.length} ${warningItems.length === 1 ? 'thing needs attention' : 'things need attention'}`,
      subtitle: joinSummaryParts(warningItems.slice(0, 2).map(formatAttentionSnippet)),
    };
  }

  if (highestSeverity === 'active') {
    return {
      highestSeverity,
      title: 'Security active',
      subtitle:
        joinSummaryParts(activityItems.slice(0, 2).map(formatAttentionSnippet)) ||
        'Live security activity detected',
    };
  }

  if (highestSeverity === 'unknown') {
    return {
      highestSeverity,
      title: 'Some devices unavailable',
      subtitle: `${unknownItems.length} ${unknownItems.length === 1 ? 'device is' : 'devices are'} unavailable`,
    };
  }

  return {
    highestSeverity,
    title: 'All secure',
    subtitle: getSecureCountSummaryText(securedCounts) || 'No security issues found',
  };
}

function getGroupSeverity(entities: DeviceWithType[]): SecuritySeverity {
  return getHighestSeverity(entities);
}

function buildSeverityBreakdownText(entities: DeviceWithType[]): string {
  const counts = countBySeverity(entities);
  const parts = [
    counts.critical > 0 ? `${counts.critical} critical` : '',
    counts.warning > 0 ? `${counts.warning} attention` : '',
    counts.active > 0 ? `${counts.active} active` : '',
    counts.unknown > 0 ? `${counts.unknown} unavailable` : '',
    counts.normal > 0 ? `${counts.normal} normal` : '',
  ];
  return joinSummaryParts(parts);
}

function buildGroupSummaryText(id: string, entities: DeviceWithType[]): string {
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
        normalCount > 0 ? `${normalCount} closed` : '',
        warningCount > 0 ? `${warningCount} open` : '',
        unknownCount > 0 ? `${unknownCount} unavailable` : '',
      ]);
    case 'locks':
      return joinSummaryParts([
        normalCount > 0 ? `${normalCount} locked` : '',
        warningCount > 0 ? `${warningCount} unlocked` : '',
        activeCount > 0 ? `${activeCount} changing` : '',
        unknownCount > 0 ? `${unknownCount} unavailable` : '',
      ]);
    case 'motion-occupancy':
      return joinSummaryParts([
        activeCount > 0 ? `${activeCount} active` : '',
        normalCount > 0 ? `${normalCount} clear` : '',
        unknownCount > 0 ? `${unknownCount} unavailable` : '',
      ]);
    case 'hazards':
      return joinSummaryParts([
        criticalCount + warningCount > 0 ? `${criticalCount + warningCount} alerts` : '',
        normalCount > 0 ? `${normalCount} clear` : '',
        unknownCount > 0 ? `${unknownCount} unavailable` : '',
      ]);
    case 'cameras':
      return joinSummaryParts([
        activeCount > 0 ? `${activeCount} live` : '',
        normalCount > 0 ? `${normalCount} available` : '',
        unknownCount > 0 ? `${unknownCount} unavailable` : '',
      ]);
    case 'sirens':
      return joinSummaryParts([
        criticalCount > 0 ? `${criticalCount} on` : '',
        normalCount > 0 ? `${normalCount} off` : '',
        unknownCount > 0 ? `${unknownCount} unavailable` : '',
      ]);
    case 'alarms':
      return joinSummaryParts([
        criticalCount > 0 ? `${criticalCount} triggered` : '',
        warningCount > 0 ? `${warningCount} pending` : '',
        activeCount > 0 ? `${activeCount} armed` : '',
        normalCount > 0 ? `${normalCount} disarmed` : '',
        unknownCount > 0 ? `${unknownCount} unavailable` : '',
      ]);
    case 'presence':
      return joinSummaryParts([
        normalCount > 0 ? `${normalCount} settled` : '',
        unknownCount > 0 ? `${unknownCount} unavailable` : '',
      ]);
    case 'system':
      return joinSummaryParts([
        warningCount + criticalCount > 0 ? `${warningCount + criticalCount} issues` : '',
        unknownCount > 0 ? `${unknownCount} unavailable` : '',
        normalCount > 0 ? `${normalCount} healthy` : '',
      ]);
    case 'actions':
      return joinSummaryParts([
        normalCount > 0 ? `${normalCount} ready` : '',
        activeCount > 0 ? `${activeCount} active` : '',
        unknownCount > 0 ? `${unknownCount} unavailable` : '',
      ]);
    default:
      return buildSeverityBreakdownText(entities);
  }
}

function buildGroupSummaries(allEntities: DeviceWithType[]): SecurityGroupSummary[] {
  const definitions: Array<{
    id: string;
    label: string;
    include: (device: DeviceWithType) => boolean;
  }> = [
    {
      id: 'alarms',
      label: 'Alarm',
      include: (device) => device.securityKind === 'alarm',
    },
    {
      id: 'doors-windows',
      label: 'Doors & windows',
      include: (device) =>
        device.type === 'covers' ||
        ['door', 'window', 'garageDoor', 'opening'].includes(device.securityKind ?? ''),
    },
    {
      id: 'locks',
      label: 'Locks',
      include: (device) => device.type === 'locks' || device.securityKind === 'lock',
    },
    {
      id: 'motion-occupancy',
      label: 'Motion & occupancy',
      include: (device) =>
        ['motion', 'occupancy', 'presence', 'vibration', 'sound'].includes(
          device.securityKind ?? ''
        ),
    },
    {
      id: 'hazards',
      label: 'Hazards',
      include: (device) =>
        ['smoke', 'carbonMonoxide', 'gas', 'waterLeak', 'safety'].includes(
          device.securityKind ?? ''
        ),
    },
    {
      id: 'cameras',
      label: 'Cameras',
      include: (device) => device.type === 'cameras' || device.securityKind === 'camera',
    },
    {
      id: 'sirens',
      label: 'Sirens',
      include: (device) => device.securityKind === 'siren',
    },
    {
      id: 'presence',
      label: 'Presence',
      include: (device) =>
        device.type === 'persons' ||
        device.securityKind === 'person' ||
        device.securityKind === 'deviceTracker',
    },
    {
      id: 'system',
      label: 'System',
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
                rawEntities.filter(
                  (entity) =>
                    !isSecureMotionSensor(entity) || getSecuritySeverity(entity) === 'normal'
                )
              ),
              ...rawEntities.filter(
                (entity) => isSecureMotionSensor(entity) && getSecuritySeverity(entity) !== 'normal'
              ),
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
        summaryText: buildGroupSummaryText(definition.id, rawEntities),
        entities,
        defaultExpanded: severity === 'critical' || severity === 'warning',
      } satisfies SecurityGroupSummary;
    })
    .filter((group): group is SecurityGroupSummary => group !== null);
}

export function buildSecurityCameraDashboardModel(
  devices: Pick<DeviceCollection, 'cameras' | 'locks' | 'sensors'> &
    Partial<Pick<DeviceCollection, 'covers' | 'persons' | 'helpers'>>
): CameraDashboardModel {
  const groups = createEmptyGroups();
  const dedupedCameras = collapseCameraVariants(devices.cameras);
  const candidates = collapseOverlappingSecurityDevices([
    ...toTypedDevices(dedupedCameras, 'cameras'),
    ...toTypedDevices(devices.covers ?? [], 'covers'),
    ...toTypedDevices(devices.locks, 'locks'),
    ...toTypedDevices(devices.sensors, 'sensors'),
    ...toTypedDevices(devices.persons ?? [], 'persons'),
    ...toTypedDevices(devices.helpers ?? [], 'helpers'),
  ]);

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
  const severityCounts = countBySeverity(allEntities);
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
  const unknownItems = allEntities
    .filter((entity) => getSecuritySeverity(entity) === 'unknown')
    .sort(compareSecurityDevices);
  const secureItems = getSecureItems(securedCounts);
  const groupSummaries = buildGroupSummaries(allEntities);
  const attentionItems = buildAttentionOverviewItems(groupSummaries);
  const hero = buildHeroCopy(
    allEntities,
    attentionEntityItems,
    activityItems,
    unknownItems,
    securedCounts
  );

  return {
    allEntities,
    groups,
    orderedGroups: GROUP_ORDER.map((key) => ({ key, devices: groups[key] })).filter(
      (group) => group.devices.length > 0
    ),
    summary: {
      ...hero,
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
