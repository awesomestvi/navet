import type { HassEntity } from 'home-assistant-js-websocket';

export type SecurityEntityKind =
  | 'alarm'
  | 'lock'
  | 'camera'
  | 'siren'
  | 'door'
  | 'window'
  | 'garageDoor'
  | 'opening'
  | 'motion'
  | 'occupancy'
  | 'presence'
  | 'tamper'
  | 'smoke'
  | 'carbonMonoxide'
  | 'gas'
  | 'waterLeak'
  | 'vibration'
  | 'sound'
  | 'safety'
  | 'problem'
  | 'connectivity'
  | 'battery'
  | 'person'
  | 'deviceTracker'
  | 'button'
  | 'event';

export type SecuritySeverity = 'critical' | 'warning' | 'active' | 'normal' | 'unknown';

const BINARY_SENSOR_SECURITY_KINDS: Record<string, SecurityEntityKind> = {
  battery: 'battery',
  carbon_monoxide: 'carbonMonoxide',
  connectivity: 'connectivity',
  door: 'door',
  garage_door: 'garageDoor',
  gas: 'gas',
  lock: 'lock',
  moisture: 'waterLeak',
  motion: 'motion',
  occupancy: 'occupancy',
  opening: 'opening',
  presence: 'presence',
  problem: 'problem',
  safety: 'safety',
  smoke: 'smoke',
  sound: 'sound',
  tamper: 'tamper',
  vibration: 'vibration',
  window: 'window',
};

const SECURITY_BUTTON_EVENT_TOKENS = [
  'alarm',
  'arm',
  'carbon_monoxide',
  'chime',
  'co',
  'door',
  'doorbell',
  'emergency',
  'fire',
  'flood',
  'garage',
  'gas',
  'intrusion',
  'leak',
  'lock',
  'motion',
  'occupancy',
  'panic',
  'presence',
  'safety',
  'security',
  'siren',
  'smoke',
  'tamper',
  'unlock',
  'vibration',
  'water',
  'window',
];

function getDomain(entity: HassEntity): string {
  const entityId = entity.entity_id;
  const separatorIndex = entityId.indexOf('.');
  return separatorIndex === -1 ? entityId : entityId.slice(0, separatorIndex);
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeState(entity: HassEntity): string {
  return normalizeString(entity.state);
}

function isUnknownState(state: string): boolean {
  return state === 'unknown' || state === 'unavailable';
}

function looksSecurityRelatedButtonOrEvent(entity: HassEntity): boolean {
  const attributes = entity.attributes as Record<string, unknown> | undefined;
  const searchFields = [
    entity.entity_id,
    attributes?.friendly_name,
    attributes?.name,
    attributes?.device_class,
    attributes?.category,
    attributes?.entity_category,
    attributes?.translation_key,
    attributes?.event_type,
    attributes?.event_types,
    attributes?.event,
    entity.state,
  ]
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.toLowerCase());

  return SECURITY_BUTTON_EVENT_TOKENS.some((token) =>
    searchFields.some((field) => field.includes(token))
  );
}

function isBinarySensorActiveState(state: string): boolean {
  return ['on', 'detected', 'open', 'wet', 'problem', 'unsafe'].includes(state);
}

export function classifySecurityEntity(entity: HassEntity): SecurityEntityKind | null {
  const domain = getDomain(entity);
  const attributes = entity.attributes as Record<string, unknown> | undefined;

  switch (domain) {
    case 'alarm_control_panel':
      return 'alarm';
    case 'lock':
      return 'lock';
    case 'camera':
      return 'camera';
    case 'siren':
      return 'siren';
    case 'person':
      return 'person';
    case 'device_tracker':
      return 'deviceTracker';
    case 'button':
    case 'input_button':
      return looksSecurityRelatedButtonOrEvent(entity) ? 'button' : null;
    case 'event':
      return looksSecurityRelatedButtonOrEvent(entity) ? 'event' : null;
    case 'binary_sensor': {
      const deviceClass = normalizeString(attributes?.device_class);
      return BINARY_SENSOR_SECURITY_KINDS[deviceClass] ?? null;
    }
    default:
      return null;
  }
}

export function getSecuritySeverity(
  entity: HassEntity,
  kind: SecurityEntityKind
): SecuritySeverity {
  const domain = getDomain(entity);
  const state = normalizeState(entity);

  if (isUnknownState(state)) {
    return 'unknown';
  }

  switch (kind) {
    case 'alarm':
      if (state === 'triggered') {
        return 'critical';
      }
      if (state === 'pending' || state === 'arming' || state === 'disarming') {
        return 'warning';
      }
      if (
        [
          'armed_home',
          'armed_away',
          'armed_night',
          'armed_vacation',
          'armed_custom_bypass',
        ].includes(state)
      ) {
        return 'active';
      }
      return 'normal';
    case 'lock':
      if (domain === 'binary_sensor') {
        return isBinarySensorActiveState(state) ? 'warning' : 'normal';
      }
      if (state === 'jammed') {
        return 'critical';
      }
      if (state === 'unlocked' || state === 'open') {
        return 'warning';
      }
      if (state === 'locking' || state === 'unlocking' || state === 'opening') {
        return 'active';
      }
      return 'normal';
    case 'siren':
      return state === 'on' ? 'critical' : 'normal';
    case 'camera':
      return state === 'streaming' || state === 'recording' || state === 'on' ? 'active' : 'normal';
    case 'smoke':
    case 'carbonMonoxide':
    case 'gas':
    case 'safety':
      return isBinarySensorActiveState(state) ? 'critical' : 'normal';
    case 'waterLeak':
    case 'tamper':
    case 'problem':
    case 'connectivity':
    case 'battery':
      return isBinarySensorActiveState(state) ? 'warning' : 'normal';
    case 'door':
    case 'window':
    case 'garageDoor':
    case 'opening':
      return isBinarySensorActiveState(state) ? 'warning' : 'normal';
    case 'motion':
    case 'occupancy':
    case 'presence':
    case 'vibration':
    case 'sound':
      return isBinarySensorActiveState(state) ? 'active' : 'normal';
    case 'person':
    case 'deviceTracker':
    case 'button':
    case 'event':
      return 'normal';
    default:
      return 'normal';
  }
}
