import type { HassEntity } from 'home-assistant-js-websocket';
import type { LightDevice } from '@/app/types/device.types';
import { brightnessToPercent, normalizeKelvin } from '../entity-utils';

export function mapLightDevice(
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string
): LightDevice {
  return {
    id: entityId,
    name,
    room,
    size: 'small',
    state: entity.state === 'on',
    brightness: brightnessToPercent(entityId, entity),
    temp: normalizeKelvin(entity),
  };
}
