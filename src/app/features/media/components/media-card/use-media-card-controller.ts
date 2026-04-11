import { useState } from 'react';
import { shallow } from 'zustand/shallow';
import { useAuth } from '@/app/contexts/auth-context';
import { useHomeAssistant, useI18n } from '@/app/hooks';
import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';
import { authSelectors, homeAssistantSelectors } from '@/app/stores/selectors';
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

export function useMediaCardController({
  entityId,
  entityPicture,
  artworkKey,
  initialTitle,
  initialArtist,
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
  const liveEntity = useHomeAssistant(homeAssistantSelectors.entity(entityId));
  const mediaPlayerEntities = useHomeAssistant(selectMediaPlayerEntities, shallow);
  const [state, setState] = useState(initialState);
  const [elapsedSeconds, setElapsedSeconds] = useState(initialElapsedSeconds ?? 0);
  const [durationSeconds, setDurationSeconds] = useState(initialDurationSeconds ?? 0);
  const [supportsGrouping, setSupportsGrouping] = useState(initialSupportsGrouping);
  const [groupMembers, setGroupMembers] = useState<string[]>(
    initialGroupMembers.length > 0 ? initialGroupMembers : [entityId]
  );

  const isPlaying = state === 'playing';
  const liveAttrs = liveEntity?.attributes as Record<string, unknown> | undefined;
  const repeatMode = (
    liveAttrs?.repeat === 'one' || liveAttrs?.repeat === 'all' ? liveAttrs.repeat : 'off'
  ) as 'off' | 'one' | 'all';
  const shuffleEnabled = liveAttrs?.shuffle === true;
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
  } = useMediaVolume({ entityId, initialVolume, initialMuted, t });
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
    liveAttrs,
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
    isOff: state === 'off' || state === 'idle',
    isMuted,
    isOpen,
    isPlaying,
    openDialog,
    repeatMode,
    shuffleEnabled,
    startVolumeInteraction,
    supportsGrouping,
    cycleRepeat,
    toggleShuffle,
    toggleMute,
    togglePlay,
    upNextTitle,
    volume: volumeLevel,
  };
}
