import type { CameraAccessoryEntity } from './types';

export function getCameraAccessoryDomain(accessory: CameraAccessoryEntity) {
  return accessory.id.replace(/^[^:]+:/, '').split('.')[0] ?? '';
}

export function getCameraAccessoryDisplayName(accessory: CameraAccessoryEntity) {
  const friendlyName = accessory.entity.attributes?.friendly_name;
  if (typeof friendlyName === 'string' && friendlyName.trim()) return friendlyName.trim();

  const nativeId = accessory.id.replace(/^[^:]+:/, '');
  return nativeId
    .replace(/^[^.]+\./, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function isCameraFullscreenTelemetryAccessory(accessory: CameraAccessoryEntity) {
  const domain = getCameraAccessoryDomain(accessory);
  return (
    accessory.entity.state !== 'unavailable' &&
    domain !== 'light' &&
    !(domain === 'binary_sensor' && accessory.entity.attributes?.device_class === 'motion')
  );
}
