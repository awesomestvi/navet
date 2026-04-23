export type MediaEntityTypeKey =
  | 'media.type.player'
  | 'media.type.tv'
  | 'media.type.speaker'
  | 'media.type.receiver'
  | 'media.type.setTopBox'
  | 'media.type.streamingBox'
  | 'media.type.soundbar';

const MEDIA_ENTITY_TYPE_KEY_BY_NORMALIZED_VALUE: Record<string, MediaEntityTypeKey> = {
  player: 'media.type.player',
  mediaplayer: 'media.type.player',
  tv: 'media.type.tv',
  television: 'media.type.tv',
  speaker: 'media.type.speaker',
  speakers: 'media.type.speaker',
  receiver: 'media.type.receiver',
  avr: 'media.type.receiver',
  settopbox: 'media.type.setTopBox',
  settop: 'media.type.setTopBox',
  stb: 'media.type.setTopBox',
  cablebox: 'media.type.setTopBox',
  decoder: 'media.type.setTopBox',
  streamingbox: 'media.type.streamingBox',
  streamer: 'media.type.streamingBox',
  streamingdevice: 'media.type.streamingBox',
  soundbar: 'media.type.soundbar',
};

function normalizeMediaEntityType(value?: string) {
  return (
    value
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') ?? ''
  );
}

export function getMediaEntityTypeKey(
  entityType?: string,
  deviceClass?: string
): MediaEntityTypeKey {
  const normalizedDeviceClass = normalizeMediaEntityType(deviceClass);
  if (normalizedDeviceClass in MEDIA_ENTITY_TYPE_KEY_BY_NORMALIZED_VALUE) {
    return MEDIA_ENTITY_TYPE_KEY_BY_NORMALIZED_VALUE[normalizedDeviceClass]!;
  }

  const normalizedEntityType = normalizeMediaEntityType(entityType);
  if (normalizedEntityType in MEDIA_ENTITY_TYPE_KEY_BY_NORMALIZED_VALUE) {
    return MEDIA_ENTITY_TYPE_KEY_BY_NORMALIZED_VALUE[normalizedEntityType]!;
  }

  return 'media.type.player';
}
