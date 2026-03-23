import type { TranslationKey } from '../i18n';
import type { DeviceCollection } from '../types/device.types';

export const DEVICE_TYPE_LABEL_KEYS: Record<keyof DeviceCollection, TranslationKey> = {
  lights: 'deviceType.light',
  hvac: 'deviceType.hvac',
  climate: 'deviceType.climate',
  power: 'deviceType.power',
  media: 'deviceType.media',
  weather: 'deviceType.weather',
  switches: 'deviceType.switch',
  covers: 'deviceType.cover',
  locks: 'deviceType.lock',
  scenes: 'deviceType.scene',
  persons: 'deviceType.person',
  sensors: 'deviceType.sensor',
  vacuums: 'deviceType.vacuum',
  calendars: 'deviceType.calendar',
  cameras: 'deviceType.camera',
  'grouped-sensors': 'deviceType.sensorGroup',
};

export function getDeviceTypeLabel(
  type: string,
  translate?: (key: TranslationKey) => string
): string {
  const key = DEVICE_TYPE_LABEL_KEYS[type as keyof DeviceCollection];
  return key && translate ? translate(key) : type;
}
