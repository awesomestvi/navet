import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/app/contexts/auth-context';
import { useHomeAssistant, useI18n } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import {
  resolveHomeAssistantAbsoluteUrl,
  resolveHomeAssistantProxyUrl,
} from '@/app/utils/home-assistant-url';

interface UseMediaCardControllerParams {
  entityId: string;
  entityPicture?: string;
  artworkKey?: string;
  initialTitle: string;
  initialArtist: string;
  initialState: 'playing' | 'paused' | 'idle' | 'off';
  initialVolume: number;
  initialMuted: boolean;
  initialElapsedSeconds?: number;
  initialDurationSeconds?: number;
  initialPositionUpdatedAt?: string;
  initialSupportsGrouping?: boolean;
  initialGroupMembers?: string[];
}

function isFailedArtworkCandidate(
  candidate: string | null | undefined,
  failedArtworkUrl: string | null
) {
  return Boolean(candidate) && candidate === failedArtworkUrl;
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
  const { config: authConfig } = useAuth();
  const { t } = useI18n();
  const liveEntity = useHomeAssistant(homeAssistantSelectors.entity(entityId));
  const entities = useHomeAssistant(homeAssistantSelectors.entities);
  const [state, setState] = useState(initialState);
  const [volume, setVolume] = useState(initialVolume);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [previousVolume, setPreviousVolume] = useState(initialVolume > 0 ? initialVolume : 50);
  const [isOpen, setIsOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(initialElapsedSeconds ?? 0);
  const [durationSeconds, setDurationSeconds] = useState(initialDurationSeconds ?? 0);
  const [failedArtworkUrl, setFailedArtworkUrl] = useState<string | null>(null);
  const [resolvedAlbumArt, setResolvedAlbumArt] = useState<string | null>(null);
  const [supportsGrouping, setSupportsGrouping] = useState(initialSupportsGrouping);
  const [groupMembers, setGroupMembers] = useState<string[]>(
    initialGroupMembers.length > 0 ? initialGroupMembers : [entityId]
  );
  const [isAdjustingVolume, setIsAdjustingVolume] = useState(false);
  const pendingVolumeRef = useRef<number | null>(null);
  const volumeCommitTimeoutRef = useRef<number | null>(null);

  // Derive playback fields from liveEntity when available, fall back to initial props.
  const liveAttrs = liveEntity?.attributes as Record<string, unknown> | undefined;
  const liveEntityPicture =
    typeof liveAttrs?.entity_picture === 'string' ? liveAttrs.entity_picture : entityPicture;
  const hasLiveMediaMetadata =
    typeof liveAttrs?.media_title === 'string' ||
    typeof liveAttrs?.app_name === 'string' ||
    typeof liveAttrs?.media_artist === 'string' ||
    typeof liveAttrs?.media_album_name === 'string' ||
    typeof liveAttrs?.source === 'string';
  const displayTitle =
    (typeof liveAttrs?.media_title === 'string' && liveAttrs.media_title) ||
    (typeof liveAttrs?.app_name === 'string' && liveAttrs.app_name) ||
    (hasLiveMediaMetadata ? initialTitle : t('media.nothingPlaying'));
  const displayArtist =
    (typeof liveAttrs?.media_artist === 'string' && liveAttrs.media_artist) ||
    (typeof liveAttrs?.media_album_name === 'string' && liveAttrs.media_album_name) ||
    (typeof liveAttrs?.source === 'string' && liveAttrs.source) ||
    (hasLiveMediaMetadata ? initialArtist : t('media.nothingPlayingDescription'));
  const liveArtworkKey =
    typeof liveAttrs?.media_content_id === 'string' ? liveAttrs.media_content_id : artworkKey;
  const artworkRequestKey = [entityId, liveArtworkKey].filter(Boolean).join('::');
  const fallbackArtwork = liveEntityPicture
    ? import.meta.env.DEV
      ? resolveHomeAssistantProxyUrl(liveEntityPicture, authConfig?.url)
      : resolveHomeAssistantAbsoluteUrl(liveEntityPicture, authConfig?.url)
    : null;

  // Single effect syncs all HA-driven fields in one batch, producing one re-render per entity
  // update instead of 5–7 sequential re-renders from separate effects.
  useEffect(() => {
    if (liveEntity) {
      const attrs = liveEntity.attributes as Record<string, unknown>;
      const rawState = liveEntity.state;
      const nextState: typeof initialState =
        rawState === 'playing' || rawState === 'paused' || rawState === 'idle' ? rawState : 'off';
      const nextVolume =
        typeof attrs.volume_level === 'number'
          ? Math.round(attrs.volume_level * 100)
          : initialVolume;
      const nextMuted = attrs.is_volume_muted === true || nextVolume === 0;
      const nextElapsed =
        typeof attrs.media_position === 'number'
          ? attrs.media_position
          : (initialElapsedSeconds ?? 0);
      const nextDuration =
        typeof attrs.media_duration === 'number'
          ? attrs.media_duration
          : (initialDurationSeconds ?? 0);
      const nextSupportedFeatures =
        typeof attrs.supported_features === 'number' ? attrs.supported_features : 0;
      const nextGroupMembers = Array.isArray(attrs.group_members)
        ? attrs.group_members.filter(
            (value): value is string => typeof value === 'string' && value.length > 0
          )
        : [];
      setState(nextState);
      setElapsedSeconds(nextElapsed);
      setDurationSeconds(nextDuration);
      if (!isAdjustingVolume) {
        setVolume(nextVolume);
        if (nextVolume > 0) setPreviousVolume(nextVolume);
        setIsMuted(nextMuted);
      }
      setSupportsGrouping((nextSupportedFeatures & 524288) === 524288);
      setGroupMembers(nextGroupMembers.length > 0 ? nextGroupMembers : [entityId]);
      return;
    }
    setState(initialState);
    setElapsedSeconds(initialElapsedSeconds ?? 0);
    setDurationSeconds(initialDurationSeconds ?? 0);
    if (!isAdjustingVolume) {
      setVolume(initialVolume);
      if (initialVolume > 0) {
        setPreviousVolume(initialVolume);
      }
      setIsMuted(initialMuted || initialVolume === 0);
    }
    setSupportsGrouping(initialSupportsGrouping);
    setGroupMembers(initialGroupMembers.length > 0 ? initialGroupMembers : [entityId]);
  }, [
    liveEntity,
    initialState,
    initialVolume,
    initialMuted,
    initialElapsedSeconds,
    initialDurationSeconds,
    initialSupportsGrouping,
    initialGroupMembers,
    entityId,
    isAdjustingVolume,
  ]);

  // Artwork key changing means a new track — reset failed URL then resolve new artwork.
  useEffect(() => {
    if (artworkRequestKey) {
      setFailedArtworkUrl(null);
    }
    setResolvedAlbumArt(
      isFailedArtworkCandidate(fallbackArtwork, failedArtworkUrl) ? null : fallbackArtwork
    );
  }, [artworkRequestKey, fallbackArtwork, failedArtworkUrl]);

  const isPlaying = state === 'playing';
  const availableGroupingPlayers = Object.values(entities ?? {})
    .filter(
      (entity): entity is NonNullable<typeof entity> =>
        Boolean(entity) &&
        entity.entity_id.startsWith('media_player.') &&
        entity.entity_id !== entityId &&
        typeof entity.attributes?.supported_features === 'number' &&
        (entity.attributes.supported_features & 524288) === 524288
    )
    .map((entity) => ({
      id: entity.entity_id,
      name:
        typeof entity.attributes?.friendly_name === 'string' && entity.attributes.friendly_name
          ? entity.attributes.friendly_name
          : entity.entity_id,
      isAttached: groupMembers.includes(entity.entity_id),
    }));

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const positionUpdatedAt =
      typeof liveAttrs?.media_position_updated_at === 'string'
        ? liveAttrs.media_position_updated_at
        : initialPositionUpdatedAt;
    const baseElapsedSeconds =
      typeof liveAttrs?.media_position === 'number'
        ? liveAttrs.media_position
        : (initialElapsedSeconds ?? 0);

    const getBaseElapsed = () => {
      if (!positionUpdatedAt) {
        return baseElapsedSeconds;
      }

      const updatedAtMs = Date.parse(positionUpdatedAt);
      if (Number.isNaN(updatedAtMs)) {
        return baseElapsedSeconds;
      }

      const driftSeconds = Math.max(0, Math.floor((Date.now() - updatedAtMs) / 1000));
      return baseElapsedSeconds + driftSeconds;
    };

    const syncElapsed = () => {
      const nextElapsed = Math.min(
        durationSeconds || Number.POSITIVE_INFINITY,
        Math.max(0, getBaseElapsed())
      );
      setElapsedSeconds(nextElapsed);
    };

    syncElapsed();
    const timerId = window.setInterval(syncElapsed, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [durationSeconds, liveAttrs, initialElapsedSeconds, initialPositionUpdatedAt, isPlaying]);

  useEffect(() => {
    return () => {
      if (volumeCommitTimeoutRef.current !== null) {
        window.clearTimeout(volumeCommitTimeoutRef.current);
      }
    };
  }, []);

  const runAction = useCallback(async (action: () => Promise<void>, errorMessage: string) => {
    try {
      await action();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : errorMessage);
    }
  }, []);

  const togglePlay = useCallback(() => {
    const nextState = isPlaying ? 'paused' : 'playing';
    setState(nextState);
    void runAction(
      () => homeAssistantService.updateMediaPlayerPlayback(entityId, isPlaying ? 'pause' : 'play'),
      t('media.feedback.updatePlaybackFailed')
    );
  }, [entityId, isPlaying, runAction, t]);

  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (nextMuted) {
      const nextPreviousVolume = volume > 0 ? volume : previousVolume;
      setPreviousVolume(nextPreviousVolume);
      setVolume(0);
      void runAction(
        () => homeAssistantService.setMediaPlayerVolume(entityId, 0),
        t('media.feedback.updateVolumeFailed')
      );
      return;
    }

    const restoredVolume = previousVolume > 0 ? previousVolume : 50;
    setVolume(restoredVolume);
    void runAction(
      () => homeAssistantService.setMediaPlayerVolume(entityId, restoredVolume),
      t('media.feedback.updateVolumeFailed')
    );
  }, [entityId, isMuted, previousVolume, runAction, t, volume]);

  const handleVolumeChange = useCallback(
    (nextVolume: number) => {
      setVolume(nextVolume);
      if (nextVolume > 0) {
        setPreviousVolume(nextVolume);
      }

      if (nextVolume > 0 && isMuted) {
        setIsMuted(false);
      } else if (nextVolume === 0) {
        setIsMuted(true);
      }

      pendingVolumeRef.current = nextVolume;
      if (volumeCommitTimeoutRef.current !== null) {
        window.clearTimeout(volumeCommitTimeoutRef.current);
      }
      volumeCommitTimeoutRef.current = window.setTimeout(() => {
        const pendingVolume = pendingVolumeRef.current;
        volumeCommitTimeoutRef.current = null;
        if (pendingVolume === null) {
          return;
        }
        void runAction(
          () => homeAssistantService.setMediaPlayerVolume(entityId, pendingVolume),
          t('media.feedback.updateVolumeFailed')
        );
      }, 120);
    },
    [entityId, isMuted, runAction, t]
  );

  const startVolumeInteraction = useCallback(() => {
    setIsAdjustingVolume(true);
  }, []);

  const endVolumeInteraction = useCallback(() => {
    setIsAdjustingVolume(false);
    if (volumeCommitTimeoutRef.current !== null) {
      window.clearTimeout(volumeCommitTimeoutRef.current);
      volumeCommitTimeoutRef.current = null;
    }

    const pendingVolume = pendingVolumeRef.current;
    pendingVolumeRef.current = null;
    if (pendingVolume === null) {
      return;
    }

    void runAction(
      () => homeAssistantService.setMediaPlayerVolume(entityId, pendingVolume),
      t('media.feedback.updateVolumeFailed')
    );
  }, [entityId, runAction, t]);

  const openDialog = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeDialog = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  const handlePrevious = useCallback(() => {
    void runAction(
      () => homeAssistantService.updateMediaPlayerPlayback(entityId, 'previous'),
      t('media.feedback.previousTrackFailed')
    );
  }, [entityId, runAction, t]);

  const handleNext = useCallback(() => {
    void runAction(
      () => homeAssistantService.updateMediaPlayerPlayback(entityId, 'next'),
      t('media.feedback.nextTrackFailed')
    );
  }, [entityId, runAction, t]);

  const attachGroupMember = useCallback(
    (memberEntityId: string) => {
      const nextGroupMembers = [...new Set([...groupMembers, memberEntityId])].filter(
        (memberId) => memberId !== entityId
      );
      if (nextGroupMembers.length === 0) {
        return;
      }

      void runAction(
        () => homeAssistantService.joinMediaPlayers(entityId, nextGroupMembers),
        t('media.feedback.groupAttachFailed')
      );
    },
    [entityId, groupMembers, runAction, t]
  );

  const detachGroupMember = useCallback(
    (memberEntityId: string) => {
      if (memberEntityId === entityId) {
        return;
      }

      void runAction(
        () => homeAssistantService.unjoinMediaPlayer(memberEntityId),
        t('media.feedback.groupDetachFailed')
      );
    },
    [entityId, runAction, t]
  );

  const handleArtworkError = useCallback((imageUrl?: string | null) => {
    if (!imageUrl) {
      return;
    }

    setResolvedAlbumArt((current) => (current === imageUrl ? null : current));
    setFailedArtworkUrl((current) => current ?? imageUrl);
  }, []);

  return {
    albumArt: resolvedAlbumArt,
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
    isOff: state === 'off',
    isMuted,
    isOpen,
    isPlaying,
    openDialog,
    startVolumeInteraction,
    supportsGrouping,
    toggleMute,
    togglePlay,
    volume,
  };
}
