import type { SecuritySeverity, SensorDevice } from '@navet/app/types/device.types';
import type { InfoTone } from './info-display-model';

export function getBatteryDisplayModel(
  value: string,
  unit: string,
  status: SensorDevice['status'],
  severity?: SecuritySeverity
) {
  const numericValue = value.trim() === '' ? Number.NaN : Number(value);
  const level =
    status === 'measurement' &&
    unit === '%' &&
    Number.isFinite(numericValue) &&
    numericValue >= 0 &&
    numericValue <= 100
      ? numericValue
      : null;
  const unavailable = status === 'unavailable' || (status === 'measurement' && level === null);
  const low =
    !unavailable &&
    (status === 'active' || severity === 'warning' || (level !== null && level <= 20));
  const tone: InfoTone = unavailable ? 'neutral' : low ? 'amber' : 'green';

  return {
    level: unavailable ? null : level,
    status: unavailable ? 'unavailable' : low ? 'low' : 'okay',
    tone,
  } as const;
}
