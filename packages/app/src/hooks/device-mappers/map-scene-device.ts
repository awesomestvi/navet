import type { SceneDevice } from '@navet/app/types/device.types';
import type { HassEntity } from 'home-assistant-js-websocket';

export function mapSceneDevice(
  entityId: string,
  _entity: HassEntity,
  name: string,
  room: string
): SceneDevice {
  return {
    id: entityId,
    name,
    room,
    size: 'small',
  };
}
