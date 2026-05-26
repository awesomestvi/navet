import type { HassEntity } from 'home-assistant-js-websocket';
import type { TranslateFn } from '@/app/i18n/index';
import type { PersonDevice } from '@/app/types/device.types';

export function mapPersonDevice(
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string,
  t: TranslateFn
): PersonDevice {
  const personState = typeof entity.state === 'string' ? entity.state : 'not_home';
  const personLocation =
    personState === 'home'
      ? t('person.home')
      : personState === 'not_home'
        ? t('person.away')
        : personState
            .split('_')
            .map((segment) =>
              segment.length > 0 ? `${segment[0]?.toUpperCase() ?? ''}${segment.slice(1)}` : segment
            )
            .join(' ');

  return {
    id: entityId,
    name,
    room,
    size: 'small',
    location: personLocation,
    state: personState === 'home' ? 'home' : 'away',
    entityPicture:
      (typeof entity.attributes?.entity_picture === 'string' && entity.attributes.entity_picture) ||
      (typeof entity.attributes?.entity_picture_local === 'string' &&
        entity.attributes.entity_picture_local) ||
      undefined,
  };
}
