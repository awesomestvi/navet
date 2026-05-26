import type { HassEntity } from 'home-assistant-js-websocket';
import type { LockDevice } from '@/app/types/device.types';

export function mapLockDevice(
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string
): LockDevice {
  return {
    id: entityId,
    name,
    room,
    size: 'small',
    state: entity.state === 'locked',
  };
}
