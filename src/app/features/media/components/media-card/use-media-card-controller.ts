import { useState } from 'react';
import { shallow } from 'zustand/shallow';
import {
  getMediaPlayerCapabilities,
  hasMediaPlayerGroupingSupport,
  hasMediaPlayerNextTrackSupport,
  hasMediaPlayerPreviousTrackSupport,
} from '@/app/constants/media-player-features';
import { readNavetMediaState } from '@/app/core/navet-device-state';
import { isTvMediaDevice, normalizeMediaPlaybackState } from '@/app/features/media';
import {
  getTvRemoteCommand,
  resolveTvRemoteProfile,
  supportsTvRemotePlaybackCommand,
  type TvRemoteAction,
} from '@/app/features/media/tv-remote-commands';
import { useHomeAssistant, useI18n, useServiceActionHandler } from '@/app/hooks';
import { useProviderDevice } from '@/app/hooks/use-provider-device';
import { integrationMediaFeatureService } from '@/app/services/integration-media-feature.service';
import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { createProviderScopedId, parseProviderScopedId } from '@/app/utils/provider-ids';
import type { UseMediaCardControllerParams } from './media-card-controller.types';
import { useMediaArtworkResolution } from './use-media-artwork-resolution';
import { useMediaDisplayFields } from './use-media-display-fields';
import { useMediaEntitySync } from './use-media-entity-sync';
import { useMediaGrouping } from './use-media-grouping';
import { useMediaPlayback } from './use-media-playback';
import { useMediaPlaybackProgress } from './use-media-playback-progress';
import { useMediaVolume } from './use-media-volume';

// useMediaGrouping only needs media_player.* entities to build the grouping picker.
// Defined at module scope so the reference is stable and shallow equality can
// suppress re-renders when unrelated entities (lights, sensors, etc.) update.
function selectMediaPlayerEntities(state: HomeAssistantStore) {
  if (!state.entities) return null;
  return Object.fromEntries(
    Object.entries(state.entities).filter(([id]) => id.startsWith('media_player.'))
  );
}

function selectUndefinedEntity() {
  return undefined;
}

function selectEntityRegistry(state: HomeAssistantStore) {
  return state.entityRegistry;
}

export function useMediaCardController({
  entityId,
  entityName,
  deviceClass,
  entityPicture,
  artworkKey,
  initialTitle,
  initialArtist,
  initialSource,
  initialSourceList = [],
  initialState,
  initialVolume,
  initialMuted,
  initialElapsedSeconds,
  initialDurationSeconds,
  initialPositionUpdatedAt,
  initialSupportsGrouping = false,
  initialSupportsPreviousTrack = true,
  initialSupportsNextTrack = true,
  initialSupportedFeatures,
  initialGroupMembers = [],
}: UseMediaCardControllerParams) {
  const { t } = useI18n();
  const isTv = isTvMediaDevice(deviceClass);
  const providerDevice = useProviderDevice(entityId);
  const liveEntity = useHomeAssistant(homeAssistantSelectors.entity(entityId));
  const parsedEntityId = parseProviderScopedId(entityId);
  const liveAttrs = liveEntity?.attributes as Record<string, unknown> | undefined;
  const providerState = readNavetMediaState(providerDevice);
  const remoteNativeId =
    parsedEntityId?.nativeId.includes('.') || entityId.includes('.')
      ? `remote.${(parsedEntityId?.nativeId ?? entityId).split('.').slice(1).join('.')}`
      : '';
  const remoteEntityId =
    remoteNativeId && parsedEntityId
      ? createProviderScopedId(parsedEntityId.providerId, remoteNativeId)
      : remoteNativeId;
  const remoteEntity = useHomeAssistant(
    remoteEntityId ? homeAssistantSelectors.entity(remoteEntityId) : selectUndefinedEntity
  );
  const entityRegistry = useHomeAssistant(selectEntityRegistry);
  const resolvedInitialState = liveEntity
    ? normalizeMediaPlaybackState(liveEntity.state, deviceClass)
    : typeof providerState?.value === 'string'
      ? normalizeMediaPlaybackState(providerState.value, deviceClass)
      : initialState;
  const resolvedInitialVolume =
    typeof liveAttrs?.volume_level === 'number'
      ? Math.max(0, Math.min(100, Math.round(liveAttrs.volume_level * 100)))
      : typeof providerState?.volume === 'number'
        ? providerState.volume
        : initialVolume;
  const resolvedInitialMuted =
    typeof liveAttrs?.is_volume_muted === 'boolean'
      ? liveAttrs.is_volume_muted
      : providerState?.isMuted === true
        ? true
        : initialMuted;
  const resolvedInitialElapsedSeconds =
    typeof liveAttrs?.media_position === 'number'
      ? liveAttrs.media_position
      : typeof providerState?.elapsedSeconds === 'number'
        ? providerState.elapsedSeconds
        : (initialElapsedSeconds ?? 0);
  const resolvedInitialDurationSeconds =
    typeof liveAttrs?.media_duration === 'number'
      ? liveAttrs.media_duration
      : typeof providerState?.durationSeconds === 'number'
        ? providerState.durationSeconds
        : (initialDurationSeconds ?? 0);
  const resolvedInitialSupportedFeatures =
    typeof liveAttrs?.supported_features === 'number'
      ? liveAttrs.supported_features
      : typeof providerState?.supportedFeatures === 'number'
        ? providerState.supportedFeatures
        : initialSupportedFeatures;
  const mediaCapabilities =
    typeof resolvedInitialSupportedFeatures === 'number'
      ? getMediaPlayerCapabilities(resolvedInitialSupportedFeatures)
      : {
          ...getMediaPlayerCapabilities(0),
          canGroup: initialSupportsGrouping,
          canMuteVolume: true,
          canNextTrack: initialSupportsNextTrack,
          canPlay: true,
          canPreviousTrack: initialSupportsPreviousTrack,
          canSetVolume: true,
        };
  const canSetVolume =
    typeof resolvedInitialSupportedFeatures === 'number' ? mediaCapabilities.canSetVolume : true;
  const canMuteVolume =
    typeof resolvedInitialSupportedFeatures === 'number' ? mediaCapabilities.canMuteVolume : true;
  const resolvedInitialSupportsGrouping =
    typeof resolvedInitialSupportedFeatures === 'number'
      ? hasMediaPlayerGroupingSupport(resolvedInitialSupportedFeatures)
      : initialSupportsGrouping;
  const canPreviousTrack =
    typeof resolvedInitialSupportedFeatures === 'number'
      ? hasMediaPlayerPreviousTrackSupport(resolvedInitialSupportedFeatures)
      : initialSupportsPreviousTrack;
  const canNextTrack =
    typeof resolvedInitialSupportedFeatures === 'number'
      ? hasMediaPlayerNextTrackSupport(resolvedInitialSupportedFeatures)
      : initialSupportsNextTrack;
  // Only subscribe to all media player entities if grouping is actually supported.
  // Use the resolved live capability when available so grouping stays functional
  // even when the initial prop was stale.
  const mediaPlayerEntities = useHomeAssistant(
    resolvedInitialSupportsGrouping ? selectMediaPlayerEntities : selectUndefinedEntity,
    shallow
  );
  const runMediaAction = useServiceActionHandler();
  const resolvedInitialGroupMembersFromEntity = Array.isArray(liveAttrs?.group_members)
    ? liveAttrs.group_members.filter(
        (value): value is string => typeof value === 'string' && value.length > 0
      )
    : [];
  const resolvedInitialGroupMembers =
    resolvedInitialGroupMembersFromEntity.length > 0
      ? resolvedInitialGroupMembersFromEntity
      : initialGroupMembers.length > 0
        ? initialGroupMembers
        : [entityId];
  const [state, setState] = useState(resolvedInitialState);
  const [elapsedSeconds, setElapsedSeconds] = useState(resolvedInitialElapsedSeconds);
  const [durationSeconds, setDurationSeconds] = useState(resolvedInitialDurationSeconds);
  const [supportsGrouping, setSupportsGrouping] = useState(resolvedInitialSupportsGrouping);
  const [groupMembers, setGroupMembers] = useState<string[]>(resolvedInitialGroupMembers);

  const isPlaying = state === 'playing';
  const repeatMode = (
    liveAttrs?.repeat === 'one' || liveAttrs?.repeat === 'all' ? liveAttrs.repeat : 'off'
  ) as 'off' | 'one' | 'all';
  const shuffleEnabled = liveAttrs?.shuffle === true;
  const sourceCandidates = isTv
    ? [
        typeof liveAttrs?.app_name === 'string' ? liveAttrs.app_name : undefined,
        typeof liveAttrs?.media_title === 'string' ? liveAttrs.media_title : undefined,
        typeof liveAttrs?.media_channel === 'string' ? liveAttrs.media_channel : undefined,
        typeof liveAttrs?.media_series_title === 'string'
          ? liveAttrs.media_series_title
          : undefined,
        typeof liveAttrs?.source === 'string' ? liveAttrs.source : undefined,
        typeof providerState?.source === 'string' ? providerState.source : undefined,
        typeof initialSource === 'string' ? initialSource : undefined,
        typeof initialTitle === 'string' ? initialTitle : undefined,
        typeof initialArtist === 'string' ? initialArtist : undefined,
      ]
    : [
        typeof liveAttrs?.source === 'string' ? liveAttrs.source : undefined,
        typeof providerState?.source === 'string' ? providerState.source : undefined,
        typeof initialSource === 'string' ? initialSource : undefined,
      ];
  const source = sourceCandidates.find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0
  );
  const sourceList = Array.isArray(liveAttrs?.source_list)
    ? liveAttrs.source_list.filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0
      )
    : Array.isArray(providerState?.sourceList)
      ? providerState.sourceList.filter(
          (value): value is string => typeof value === 'string' && value.trim().length > 0
        )
      : initialSourceList;
  const upNextTitle = [
    liveAttrs?.next_title,
    liveAttrs?.next_track_title,
    liveAttrs?.up_next_title,
    liveAttrs?.next_track,
  ].find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  const soundMode =
    typeof liveAttrs?.sound_mode === 'string' && liveAttrs.sound_mode.trim().length > 0
      ? liveAttrs.sound_mode
      : undefined;
  const soundModeList = Array.isArray(liveAttrs?.sound_mode_list)
    ? liveAttrs.sound_mode_list.filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0
      )
    : [];

  const {
    volume: volumeLevel,
    isMuted,
    isAdjustingVolume,
    setVolume,
    setIsMuted,
    setPreviousVolume,
    toggleMute,
    handleVolumeChange,
    startVolumeInteraction,
    endVolumeInteraction,
  } = useMediaVolume({
    canMuteVolume,
    canSetVolume,
    entityId,
    initialVolume: resolvedInitialVolume,
    initialMuted: resolvedInitialMuted,
    t,
  });
  const {
    cycleRepeat,
    handleNext,
    handlePrevious,
    isOpen,
    runAction,
    togglePlay,
    toggleShuffle,
    openDialog,
    closeDialog,
  } = useMediaPlayback({
    entityId,
    canPreviousTrack,
    canNextTrack,
    shuffleEnabled,
    repeatMode,
    t,
  });

  // Derive playback fields from liveEntity when available, fall back to initial props.
  const { displayArtist, displayTitle, liveArtworkKey, liveEntityPicture } = useMediaDisplayFields({
    liveAttrs,
    entityPicture,
    artworkKey,
    entityName,
    playbackState: state,
    initialTitle,
    initialArtist,
    nothingPlayingLabel: t('media.nothingPlaying'),
    nothingPlayingDescription: t('media.nothingPlayingDescription'),
    readyToPlayLabel: t('media.readyToPlay'),
  });

  const { albumArt, artworkResource, handleArtworkError } = useMediaArtworkResolution({
    entityId,
    providerId: parsedEntityId?.providerId,
    artworkKey,
    liveEntityPicture,
    liveArtworkKey,
  });

  useMediaEntitySync({
    liveEntity,
    providerState,
    entityId,
    deviceClass,
    currentMuted: isMuted,
    initialState,
    initialVolume,
    initialMuted,
    initialElapsedSeconds,
    initialDurationSeconds,
    initialSupportsGrouping,
    initialGroupMembers,
    isAdjustingVolume,
    setState,
    setElapsedSeconds,
    setDurationSeconds,
    setVolume,
    setPreviousVolume,
    setIsMuted,
    setSupportsGrouping,
    setGroupMembers,
  });

  useMediaPlaybackProgress({
    isPlaying,
    durationSeconds,
    mediaPosition:
      typeof liveAttrs?.media_position === 'number' ? liveAttrs.media_position : undefined,
    mediaPositionUpdatedAt:
      typeof liveAttrs?.media_position_updated_at === 'string'
        ? liveAttrs.media_position_updated_at
        : undefined,
    initialElapsedSeconds: liveEntity ? undefined : initialElapsedSeconds,
    initialPositionUpdatedAt: liveEntity ? undefined : initialPositionUpdatedAt,
    setElapsedSeconds,
  });

  const { availableGroupingPlayers, attachGroupMember, detachGroupMember } = useMediaGrouping({
    entityId,
    entities: mediaPlayerEntities,
    groupMembers,
    runAction,
    t,
  });
  const remoteAvailable = isTv && Boolean(remoteEntity);
  const remoteRegistryEntry = entityRegistry.find((entry) => entry.entity_id === remoteEntityId);
  const mediaRegistryEntry = entityRegistry.find((entry) => entry.entity_id === entityId);
  const remoteFriendlyName =
    typeof remoteEntity?.attributes?.friendly_name === 'string'
      ? remoteEntity.attributes.friendly_name
      : undefined;
  const remoteProfile = resolveTvRemoteProfile({
    remotePlatform: remoteRegistryEntry?.platform,
    mediaPlatform: mediaRegistryEntry?.platform,
    remoteEntityId,
    remoteFriendlyName,
  });

  const selectSource = (nextSource: string) =>
    void runMediaAction(
      () => integrationMediaFeatureService.selectMediaPlayerSource(entityId, nextSource),
      t('media.feedback.updatePlaybackFailed')
    );

  const selectSoundMode = (nextSoundMode: string) =>
    void runMediaAction(
      () => integrationMediaFeatureService.selectMediaPlayerSoundMode(entityId, nextSoundMode),
      t('media.feedback.updateSoundModeFailed')
    );

  const seekTo = (nextElapsedSeconds: number) =>
    void runMediaAction(
      () => integrationMediaFeatureService.seekMediaPlayer(entityId, nextElapsedSeconds),
      t('media.feedback.seekFailed')
    );

  const clearPlaylist = () =>
    void runMediaAction(
      () => integrationMediaFeatureService.clearMediaPlayerPlaylist(entityId),
      t('media.feedback.clearPlaylistFailed')
    );

  const toggleTvPower = () =>
    void runMediaAction(
      () =>
        integrationMediaFeatureService.updateMediaPlayerPower(
          entityId,
          state === 'off' ? 'on' : 'off'
        ),
      t('media.feedback.updatePlaybackFailed')
    );

  const toggleTvPlayback = () => {
    if (!remoteEntityId || !remoteAvailable || !supportsTvRemotePlaybackCommand(remoteProfile)) {
      togglePlay();
      return;
    }

    void runMediaAction(
      () =>
        integrationMediaFeatureService.sendRemoteCommand(
          remoteEntityId,
          getTvRemoteCommand(remoteProfile, 'playPause')
        ),
      t('media.feedback.updatePlaybackFailed')
    );
  };

  const sendRemoteCommand = (action: TvRemoteAction) => {
    if (!remoteEntityId) return;

    const command = getTvRemoteCommand(remoteProfile, action);

    void runMediaAction(
      () => integrationMediaFeatureService.sendRemoteCommand(remoteEntityId, command),
      t('media.feedback.updatePlaybackFailed')
    );
  };

  return {
    albumArt,
    attachGroupMember,
    artworkResource,
    availableGroupingPlayers,
    canNextTrack,
    canPreviousTrack,
    closeDialog,
    detachGroupMember,
    displayArtist,
    displayTitle,
    durationSeconds,
    elapsedSeconds,
    endVolumeInteraction,
    groupMembers,
    handleArtworkError,
    handleNext,
    handlePrevious,
    handleVolumeChange,
    mediaCapabilities,
    isOff: state === 'off',
    isMuted,
    isOpen,
    isPlaying,
    remoteAvailable,
    openDialog,
    repeatMode,
    clearPlaylist,
    selectSource,
    selectSoundMode,
    seekTo,
    shuffleEnabled,
    soundMode,
    soundModeList,
    source,
    sourceList,
    startVolumeInteraction,
    supportsGrouping,
    sendRemoteCommand,
    toggleTvPower,
    cycleRepeat,
    toggleShuffle,
    toggleMute,
    togglePlay: isTv ? toggleTvPlayback : togglePlay,
    upNextTitle,
    volume: volumeLevel,
  };
}
