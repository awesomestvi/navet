import type { HassEntity } from 'home-assistant-js-websocket';
import type { CoverDevice } from '../../types/device.types';
import { parseNumberish } from '../ha-entity-utils';

function normalizeCoverPosition(value: unknown) {
  const parsed = parseNumberish(value);
  if (parsed === null) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function resolveCoverStatePosition(state: string) {
  return state === 'open' || state === 'opening' ? 100 : 0;
}

function resolveCoverDeviceClass(value: unknown) {
  if (
    value === 'blind' ||
    value === 'shade' ||
    value === 'curtain' ||
    value === 'garage' ||
    value === 'gate' ||
    value === 'awning' ||
    value === 'shutter' ||
    value === 'door'
  ) {
    return value;
  }

  return undefined;
}

export function mapCoverDevice(
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string
): CoverDevice {
  const currentPosition = normalizeCoverPosition(entity.attributes?.current_position);
  const currentTiltPosition = normalizeCoverPosition(entity.attributes?.current_tilt_position);
  const supportedFeatures = parseNumberish(entity.attributes?.supported_features);
  const positionMode =
    currentPosition !== null ? 'position' : currentTiltPosition !== null ? 'tilt' : undefined;

  return {
    id: entityId,
    name,
    room,
    size: 'medium',
    position: currentPosition ?? currentTiltPosition ?? resolveCoverStatePosition(entity.state),
    positionMode,
    deviceClass: resolveCoverDeviceClass(entity.attributes?.device_class),
    supportedFeatures: supportedFeatures === null ? undefined : Math.round(supportedFeatures),
    hasPosition: currentPosition !== null || currentTiltPosition !== null,
  };
}
