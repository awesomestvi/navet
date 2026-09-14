import type { HomeyCapabilityState, HomeyDevice } from './homey-types';

export function getHomeySensorName(
  device: HomeyDevice,
  capabilityId: string,
  capability: HomeyCapabilityState
): string {
  const baseId = capabilityId.split('.')[0];
  const label =
    baseId === 'alarm_battery' || baseId === 'measure_battery'
      ? 'Battery'
      : capability.title?.trim() || capabilityId;
  return `${device.name} · ${label}`;
}

const alarmKinds = {
  contact: ['opening', 'opening'],
  motion: ['motion', 'motion'],
  occupancy: ['occupancy', 'occupancy'],
  presence: ['presence', 'presence'],
  smoke: ['smoke', 'smoke'],
  co: ['carbonMonoxide', 'carbon_monoxide'],
  gas: ['gas', 'gas'],
  water: ['waterLeak', 'moisture'],
  moisture: ['waterLeak', 'moisture'],
  heat: ['safety', 'safety'],
  tamper: ['tamper', 'tamper'],
  vibration: ['vibration', 'vibration'],
  sound: ['sound', 'sound'],
  battery: ['battery', 'battery'],
  generic: ['problem', 'problem'],
} as const;

const criticalKinds = new Set(['smoke', 'carbonMonoxide', 'gas', 'safety']);
const warningKinds = new Set(['opening', 'waterLeak', 'tamper', 'battery', 'problem']);

/** Translate Homey alarm identities and values into Navet security semantics. */
export function getHomeySensorState(
  device: HomeyDevice,
  capabilityId: string,
  capability: HomeyCapabilityState
) {
  const baseId = capabilityId.split('.')[0];
  const alarm = baseId.startsWith('alarm_');
  const suffix = baseId.replace(/^(measure_|meter_|alarm_)/, '');
  const [securityKind, deviceClass] = alarm
    ? (alarmKinds[suffix as keyof typeof alarmKinds] ?? ['problem', 'problem'])
    : baseId === 'measure_battery'
      ? ['battery', 'battery']
      : [undefined, baseId === 'meter_power' ? 'energy' : suffix];
  const validValue = alarm
    ? typeof capability.value === 'boolean'
    : typeof capability.value === 'number' && Number.isFinite(capability.value);
  const unknown = device.available === false || !validValue;
  const active = alarm
    ? capability.value === true
    : securityKind === 'battery' && typeof capability.value === 'number' && capability.value <= 20;
  const securitySeverity = unknown
    ? 'unknown'
    : !active
      ? 'normal'
      : criticalKinds.has(securityKind ?? '')
        ? 'critical'
        : warningKinds.has(securityKind ?? '')
          ? 'warning'
          : 'active';

  return {
    value: securityKind ? (validValue ? capability.value : null) : capability.value,
    available: device.available ?? true,
    unit: capability.units,
    sourceDeviceId: device.id,
    sourceDeviceName: device.name,
    deviceClass,
    ...(securityKind
      ? {
          securityKind,
          securitySeverity,
          entityType: alarm ? 'binary_sensor' : 'sensor',
          status: unknown
            ? 'unavailable'
            : alarm
              ? active
                ? 'active'
                : 'inactive'
              : 'measurement',
        }
      : {}),
  };
}
