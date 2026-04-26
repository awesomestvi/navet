import { useState } from 'react';
import { shallow } from 'zustand/shallow';
import { hasMediaPlayerGroupingSupport } from '@/app/constants/media-player-features';
import { isTvMediaDevice, normalizeMediaPlaybackState } from '@/app/features/media';
import { useHomeAssistant, useI18n, useServiceActionHandler } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { useAuth } from '@/app/stores/auth-store';
import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';
import { authSelectors, homeAssistantSelectors } from '@/app/stores/selectors';
import {
  getTvRemoteCommand,
  getTvRemoteProfile,
  type TvRemoteAction,
} from '../../tv-remote-commands';
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

function selectNoMediaPlayerEntities() {
  return null;
}

function selectUndefinedEntity() {
  return undefined;
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
  initialGroupMembers = [],
}: UseMediaCardControllerParams) {
  const authConfig = useAuth(authSelectors.config);
  const { t } = useI18n();
  const isTv = isTvMediaDevice(deviceClass);
  const liveEntity = useHomeAssistant(homeAssistantSelectors.entity(entityId));
  const liveAttrs = liveEntity?.attributes as Record<string, unknown> | undefined;
  const remoteEntityId = entityId.includes('.')
    ? `remote.${entityId.split('.').slice(1).join('.')}`
    : '';
  const remoteEntity = useHomeAssistant(
    remoteEntityId ? homeAssistantSelectors.entity(remoteEntityId) : selectUndefinedEntity
  );
  const mediaPlayerEntities = useHomeAssistant(
    isTv ? selectNoMediaPlayerEntities : selectMediaPlayerEntities,
    shallow
  );
  const runMediaAction = useServiceActionHandler();
  const resolvedInitialState = liveEntity
    ? normalizeMediaPlaybackState(liveEntity.state, deviceClass)
    : initialState;
  const resolvedInitialVolume =
    typeof liveAttrs?.volume_level === 'number'
      ? Math.max(0, Math.min(100, Math.round(liveAttrs.volume_level * 100)))
      : initialVolume;
  const resolvedInitialMuted =
    typeof liveAttrs?.is_volume_muted === 'boolean' ? liveAttrs.is_volume_muted : initialMuted;
  const resolvedInitialElapsedSeconds =
    typeof liveAttrs?.media_position === 'number'
      ? liveAttrs.media_position
      : (initialElapsedSeconds ?? 0);
  const resolvedInitialDurationSeconds =
    typeof liveAttrs?.media_duration === 'number'
      ? liveAttrs.media_duration
      : (initialDurationSeconds ?? 0);
  const resolvedInitialSupportedFeatures =
    typeof liveAttrs?.supported_features === 'number' ? liveAttrs.supported_features : undefined;
  const canSetVolume =
    typeof resolvedInitialSupportedFeatures === 'number'
      ? (resolvedInitialSupportedFeatures & 4) === 4
      : true;
  const canMuteVolume =
    typeof resolvedInitialSupportedFeatures === 'number'
      ? (resolvedInitialSupportedFeatures & 8) === 8
      : true;
  const resolvedInitialSupportsGrouping =
    typeof resolvedInitialSupportedFeatures === 'number'
      ? hasMediaPlayerGroupingSupport(resolvedInitialSupportedFeatures)
      : initialSupportsGrouping;
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
        typeof initialSource === 'string' ? initialSource : undefined,
        typeof initialTitle === 'string' ? initialTitle : undefined,
        typeof initialArtist === 'string' ? initialArtist : undefined,
      ]
    : [
        typeof liveAttrs?.source === 'string' ? liveAttrs.source : undefined,
        typeof initialSource === 'string' ? initialSource : undefined,
      ];
  const source = sourceCandidates.find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0
  );
  const sourceList = Array.isArray(liveAttrs?.source_list)
    ? liveAttrs.source_list.filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0
      )
    : initialSourceList;
  const upNextTitle = [
    liveAttrs?.next_title,
    liveAttrs?.next_track_title,
    liveAttrs?.up_next_title,
    liveAttrs?.next_track,
  ].find((value): value is string => typeof value === 'string' && value.trim().length > 0);

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
  } = useMediaPlayback({ entityId, isPlaying, shuffleEnabled, repeatMode, t });

  // Derive playback fields from liveEntity when available, fall back to initial props.
  const { displayArtist, displayTitle, liveArtworkKey, liveEntityPicture } = useMediaDisplayFields({
    liveAttrs,
    entityPicture,
    artworkKey,
    entityName,
    initialTitle,
    initialArtist,
    nothingPlayingLabel: t('media.nothingPlaying'),
    nothingPlayingDescription: t('media.nothingPlayingDescription'),
  });

  const { albumArt, handleArtworkError } = useMediaArtworkResolution({
    entityId,
    artworkKey,
    liveEntityPicture,
    liveArtworkKey,
    homeAssistantUrl: authConfig?.url,
  });

  useMediaEntitySync({
    liveEntity,
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
    initialElapsedSeconds,
    initialPositionUpdatedAt,
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
  const remoteFriendlyName =
    typeof remoteEntity?.attributes?.friendly_name === 'string'
      ? remoteEntity.attributes.friendly_name
      : undefined;
  const remoteProfile = remoteEntityId
    ? getTvRemoteProfile(remoteEntityId, remoteFriendlyName)
    : 'default';

  const selectSource = (nextSource: string) =>
    void runMediaAction(
      () => homeAssistantService.selectMediaPlayerSource(entityId, nextSource),
      t('media.feedback.updatePlaybackFailed')
    );

  const toggleTvPower = () =>
    void runMediaAction(
      () => homeAssistantService.updateMediaPlayerPower(entityId, state === 'off' ? 'on' : 'off'),
      t('media.feedback.updatePlaybackFailed')
    );

  const sendRemoteCommand = (action: TvRemoteAction) => {
    if (!remoteEntityId) return;

    const command = getTvRemoteCommand(remoteProfile, action);

    void runMediaAction(
      () => homeAssistantService.sendRemoteCommand(remoteEntityId, command),
      t('media.feedback.updatePlaybackFailed')
    );
  };

  return {
    albumArt,
    attachGroupMember,
    availableGroupingPlayers,
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
    isOff: isTv ? state === 'off' : state === 'off' || state === 'idle',
    isMuted,
    isOpen,
    isPlaying,
    remoteAvailable,
    openDialog,
    repeatMode,
    selectSource,
    shuffleEnabled,
    source,
    sourceList,
    startVolumeInteraction,
    supportsGrouping,
    sendRemoteCommand,
    toggleTvPower,
    cycleRepeat,
    toggleShuffle,
    toggleMute,
    togglePlay,
    upNextTitle,
    volume: volumeLevel,
  };
}
