import type { LockDevice } from '@navet/app/types/device.types';
import type { HassEntity } from 'home-assistant-js-websocket';

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
