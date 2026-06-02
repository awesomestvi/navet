import { getMediaPlayerCapabilities } from '@navet/app/constants/media-player-features';
import { readNavetMediaState } from '@navet/app/core/navet-device-state';
import {
  useProviderMediaCompanionEntity,
  useProviderMediaEntity,
  useProviderMediaEntityRegistry,
  useProviderMediaPlayerEntities,
} from '@navet/app/features/media/hooks/use-provider-media-playback-data';
import {
  isTvMediaDevice,
  normalizeMediaPlaybackState,
} from '@navet/app/features/media/media-state';
import {
  getTvRemoteCommand,
  resolveTvRemoteProfile,
  supportsTvRemotePlaybackCommand,
  type TvRemoteAction,
} from '@navet/app/features/media/tv-remote-commands';
import { useI18n, useServiceActionHandler } from '@navet/app/hooks';
import { useIntegrationStore } from '@navet/app/hooks/use-integration-store';
import { useProviderEntityModel } from '@navet/app/hooks/use-provider-device';
import { integrationMediaFeatureService } from '@navet/app/services/integration-media-feature.service';
import { integrationSelectors } from '@navet/app/stores/selectors';
import { getProviderNativeId, parseProviderScopedId } from '@navet/app/utils/provider-ids';
import { useState } from 'react';
import type { UseMediaCardControllerParams } from './media-card-controller.types';
import { useMediaArtworkResolution } from './use-media-artwork-resolution';
import { useMediaDisplayFields } from './use-media-display-fields';
import { useMediaEntitySync } from './use-media-entity-sync';
import { useMediaGrouping } from './use-media-grouping';
import { useMediaPlayback } from './use-media-playback';
import { useMediaPlaybackProgress } from './use-media-playback-progress';
import { useMediaVolume } from './use-media-volume';

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
  initialMediaCapabilities,
  initialSupportedFeatures: _initialSupportedFeatures,
  initialGroupMembers = [],
}: UseMediaCardControllerParams) {
  const { t } = useI18n();
  const isTv = isTvMediaDevice(deviceClass);
  const providerEntity = useProviderEntityModel(entityId);
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const resolvedProviderId =
    providerEntity?.providerId ?? parseProviderScopedId(entityId)?.providerId ?? currentProviderId;
  const runtimeEntityId = resolvedProviderId ? getProviderNativeId(entityId) : '';
  const remoteEntityId = runtimeEntityId
    ? `remote.${runtimeEntityId.split('.').slice(1).join('.')}`
    : '';
  const liveEntity = useProviderMediaEntity(entityId);
  const liveAttrs = liveEntity?.attributes as Record<string, unknown> | undefined;
  const providerState = readNavetMediaState(providerEntity);
  const remoteEntity = useProviderMediaCompanionEntity(entityId, 'remote');
  const entityRegistry = useProviderMediaEntityRegistry(entityId);
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
  const mediaCapabilities = providerState?.mediaCapabilities ??
    initialMediaCapabilities ?? {
      ...getMediaPlayerCapabilities(0),
      canGroup: providerState?.supportsGrouping ?? initialSupportsGrouping,
      canMuteVolume: true,
      canNextTrack: providerState?.supportsNextTrack ?? initialSupportsNextTrack,
      canPlay: true,
      canPreviousTrack: providerState?.supportsPreviousTrack ?? initialSupportsPreviousTrack,
      canSetVolume: true,
    };
  const canSetVolume = mediaCapabilities?.canSetVolume ?? true;
  const canMuteVolume = mediaCapabilities?.canMuteVolume ?? true;
  const resolvedInitialSupportsGrouping =
    mediaCapabilities?.canGroup ?? providerState?.supportsGrouping ?? initialSupportsGrouping;
  const canPreviousTrack =
    mediaCapabilities?.canPreviousTrack ??
    providerState?.supportsPreviousTrack ??
    initialSupportsPreviousTrack;
  const canNextTrack =
    mediaCapabilities?.canNextTrack ?? providerState?.supportsNextTrack ?? initialSupportsNextTrack;
  // Only subscribe to all media player entities if grouping is actually supported.
  // Use the resolved live capability when available so grouping stays functional
  // even when the initial prop was stale.
  const mediaPlayerEntities = useProviderMediaPlayerEntities(
    entityId,
    resolvedInitialSupportsGrouping
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
    providerId: resolvedProviderId,
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
    initialMediaCapabilities: mediaCapabilities ?? undefined,
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
  const remoteRegistryEntry = entityRegistry.find((entry) => entry.entityId === remoteEntityId);
  const mediaRegistryEntry = entityRegistry.find(
    (entry) => entry.entityId === (runtimeEntityId || entityId)
  );
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
