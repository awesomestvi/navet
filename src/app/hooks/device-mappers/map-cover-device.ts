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

export function mapCoverDevice(
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string
): CoverDevice {
  const currentPosition = normalizeCoverPosition(entity.attributes?.current_position);
  const supportedFeatures = parseNumberish(entity.attributes?.supported_features);

  return {
    id: entityId,
    name,
    room,
    size: 'medium',
    position: currentPosition ?? 0,
    supportedFeatures: supportedFeatures === null ? undefined : Math.round(supportedFeatures),
    hasPosition: currentPosition !== null,
  };
}
