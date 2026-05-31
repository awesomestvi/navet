/**
 * Home Assistant media player feature flags
 * @see https://developers.home-assistant.io/docs/core/entity/media-player/#supported_features
 */
export const MEDIA_PLAYER_FEATURES = {
  PAUSE: 1,
  SEEK: 2,
  VOLUME_SET: 4,
  VOLUME_MUTE: 8,
  PREVIOUS_TRACK: 16,
  NEXT_TRACK: 32,
  TURN_ON: 128,
  TURN_OFF: 256,
  PLAY_MEDIA: 512,
  VOLUME_STEP: 1024,
  SELECT_SOURCE: 2048,
  STOP: 4096,
  CLEAR_PLAYLIST: 8192,
  PLAY: 16384,
  SHUFFLE_SET: 32768,
  SELECT_SOUND_MODE: 65536,
  BROWSE_MEDIA: 131072,
  REPEAT_SET: 262144,
  GROUPING: 524288,
  MEDIA_ANNOUNCE: 1048576,
  MEDIA_ENQUEUE: 2097152,
  SEARCH_MEDIA: 4194304,
} as const;

export interface MediaPlayerCapabilities {
  canAnnounce: boolean;
  canBrowseMedia: boolean;
  canClearPlaylist: boolean;
  canEnqueue: boolean;
  canGroup: boolean;
  canMuteVolume: boolean;
  canNextTrack: boolean;
  canPlay: boolean;
  canPlayMedia: boolean;
  canPreviousTrack: boolean;
  canRepeat: boolean;
  canSearchMedia: boolean;
  canSeek: boolean;
  canSelectSoundMode: boolean;
  canSelectSource: boolean;
  canSetVolume: boolean;
  canShuffle: boolean;
  canStop: boolean;
  canTurnOff: boolean;
  canTurnOn: boolean;
  canVolumeStep: boolean;
}

function hasMediaPlayerFeature(supportedFeatures: number, feature: number): boolean {
  return (supportedFeatures & feature) === feature;
}

export function getMediaPlayerCapabilities(supportedFeatures: number): MediaPlayerCapabilities {
  return {
    canAnnounce: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.MEDIA_ANNOUNCE),
    canBrowseMedia: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.BROWSE_MEDIA),
    canClearPlaylist: hasMediaPlayerFeature(
      supportedFeatures,
      MEDIA_PLAYER_FEATURES.CLEAR_PLAYLIST
    ),
    canEnqueue: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.MEDIA_ENQUEUE),
    canGroup: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.GROUPING),
    canMuteVolume: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.VOLUME_MUTE),
    canNextTrack: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.NEXT_TRACK),
    canPlay: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.PLAY),
    canPlayMedia: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.PLAY_MEDIA),
    canPreviousTrack: hasMediaPlayerFeature(
      supportedFeatures,
      MEDIA_PLAYER_FEATURES.PREVIOUS_TRACK
    ),
    canRepeat: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.REPEAT_SET),
    canSearchMedia: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.SEARCH_MEDIA),
    canSeek: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.SEEK),
    canSelectSoundMode: hasMediaPlayerFeature(
      supportedFeatures,
      MEDIA_PLAYER_FEATURES.SELECT_SOUND_MODE
    ),
    canSelectSource: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.SELECT_SOURCE),
    canSetVolume: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.VOLUME_SET),
    canShuffle: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.SHUFFLE_SET),
    canStop: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.STOP),
    canTurnOff: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.TURN_OFF),
    canTurnOn: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.TURN_ON),
    canVolumeStep: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.VOLUME_STEP),
  };
}

/**
 * Check if a media player supports grouping
 */
export function hasMediaPlayerGroupingSupport(supportedFeatures: number): boolean {
  return getMediaPlayerCapabilities(supportedFeatures).canGroup;
}

export function hasMediaPlayerPreviousTrackSupport(supportedFeatures: number): boolean {
  return getMediaPlayerCapabilities(supportedFeatures).canPreviousTrack;
}

export function hasMediaPlayerNextTrackSupport(supportedFeatures: number): boolean {
  return getMediaPlayerCapabilities(supportedFeatures).canNextTrack;
}
