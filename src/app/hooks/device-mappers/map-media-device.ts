import type { HassEntity } from 'home-assistant-js-websocket';
import {
  hasMediaPlayerGroupingSupport,
  hasMediaPlayerNextTrackSupport,
  hasMediaPlayerPreviousTrackSupport,
} from '@/app/constants/media-player-features';
import type { TranslateFn } from '@/app/i18n/index';
import type { MediaDevice } from '@/app/types/device.types';
import { formatMediaEntityType, parseNumberish } from '../entity-utils';

export function mapMediaDevice(
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string,
  t: TranslateFn
): MediaDevice {
  const supportedFeatures = parseNumberish(entity.attributes?.supported_features) ?? 0;
  const mediaDeviceClass =
    typeof entity.attributes?.device_class === 'string'
      ? entity.attributes.device_class
      : undefined;
  const entityPicture =
    (typeof entity.attributes?.entity_picture === 'string' && entity.attributes.entity_picture) ||
    (typeof entity.attributes?.entity_picture_local === 'string' &&
      entity.attributes.entity_picture_local) ||
    (typeof entity.attributes?.media_image_url === 'string' && entity.attributes.media_image_url) ||
    undefined;

  const normalizedState: MediaDevice['state'] =
    entity.state === 'playing'
      ? 'playing'
      : entity.state === 'paused'
        ? 'paused'
        : entity.state === 'idle'
          ? 'idle'
          : 'off';

  const mediaTitle =
    (typeof entity.attributes?.media_title === 'string' && entity.attributes.media_title) ||
    (typeof entity.attributes?.app_name === 'string' && entity.attributes.app_name) ||
    (typeof entity.attributes?.media_channel === 'string' && entity.attributes.media_channel) ||
    (typeof entity.attributes?.media_series_title === 'string' &&
      entity.attributes.media_series_title) ||
    (normalizedState === 'off' ? t('media.nothingPlaying') : name);

  const mediaArtist =
    (typeof entity.attributes?.media_artist === 'string' && entity.attributes.media_artist) ||
    (typeof entity.attributes?.media_album_name === 'string' &&
      entity.attributes.media_album_name) ||
    (typeof entity.attributes?.media_series_title === 'string' &&
      entity.attributes.media_series_title) ||
    (typeof entity.attributes?.app_name === 'string' && entity.attributes.app_name) ||
    (typeof entity.attributes?.source === 'string' && entity.attributes.source) ||
    (normalizedState === 'off' ? t('media.nothingPlayingDescription') : t('media.readyToPlay'));

  const mediaSource =
    typeof entity.attributes?.source === 'string' ? entity.attributes.source : undefined;
  const mediaSourceList = Array.isArray(entity.attributes?.source_list)
    ? entity.attributes.source_list.filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0
      )
    : [];

  const volumeLevel = parseNumberish(entity.attributes?.volume_level);
  const mediaPosition = parseNumberish(entity.attributes?.media_position);
  const mediaDuration = parseNumberish(entity.attributes?.media_duration);
  const positionUpdatedAt =
    typeof entity.attributes?.media_position_updated_at === 'string'
      ? entity.attributes.media_position_updated_at
      : undefined;

  const groupMembers = Array.isArray(entity.attributes?.group_members)
    ? entity.attributes.group_members.filter(
        (value): value is string => typeof value === 'string' && value.length > 0
      )
    : [];

  return {
    id: entityId,
    name,
    room,
    size: 'medium',
    resources: entityPicture
      ? {
          artwork: {
            kind: 'media_artwork',
            entityId,
            path: entityPicture,
          },
        }
      : undefined,
    title: mediaTitle,
    artist: mediaArtist,
    entityType: formatMediaEntityType(mediaDeviceClass, t),
    deviceClass: mediaDeviceClass,
    source: mediaSource,
    sourceList: mediaSourceList,
    entityPicture,
    state: normalizedState,
    volume:
      typeof volumeLevel === 'number'
        ? Math.max(0, Math.min(100, Math.round(volumeLevel * 100)))
        : 0,
    isMuted: entity.attributes?.is_volume_muted === true,
    elapsedSeconds:
      typeof mediaPosition === 'number' ? Math.max(0, Math.floor(mediaPosition)) : undefined,
    durationSeconds:
      typeof mediaDuration === 'number' ? Math.max(0, Math.floor(mediaDuration)) : undefined,
    positionUpdatedAt,
    supportsGrouping: hasMediaPlayerGroupingSupport(supportedFeatures),
    supportsPreviousTrack: hasMediaPlayerPreviousTrackSupport(supportedFeatures),
    supportsNextTrack: hasMediaPlayerNextTrackSupport(supportedFeatures),
    supportedFeatures,
    groupMembers,
  };
}
