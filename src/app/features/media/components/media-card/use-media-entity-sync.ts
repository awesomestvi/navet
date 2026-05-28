import { type Dispatch, type SetStateAction, useEffect, useRef } from 'react';
import { hasMediaPlayerGroupingSupport } from '@/app/constants/media-player-features';
import type { NavetMediaState } from '@/app/core/navet-device-state';
import { normalizeMediaPlaybackState } from '@/app/features/media';

function areStringArraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) {
    return false;
  }

  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      return false;
    }
  }

  return true;
}

interface UseMediaEntitySyncParams {
  liveEntity: { state: string; attributes: Record<string, unknown> } | undefined;
  providerState?: NavetMediaState | null;
  entityId: string;
  deviceClass?: string;
  currentMuted: boolean;
  initialState: 'playing' | 'paused' | 'idle' | 'off';
  initialVolume: number;
  initialMuted: boolean;
  initialElapsedSeconds?: number;
  initialDurationSeconds?: number;
  initialSupportsGrouping: boolean;
  initialGroupMembers: string[];
  isAdjustingVolume: boolean;
  setState: Dispatch<SetStateAction<'playing' | 'paused' | 'idle' | 'off'>>;
  setElapsedSeconds: Dispatch<SetStateAction<number>>;
  setDurationSeconds: Dispatch<SetStateAction<number>>;
  setVolume: Dispatch<SetStateAction<number>>;
  setPreviousVolume: Dispatch<SetStateAction<number>>;
  setIsMuted: Dispatch<SetStateAction<boolean>>;
  setSupportsGrouping: Dispatch<SetStateAction<boolean>>;
  setGroupMembers: Dispatch<SetStateAction<string[]>>;
}

export function useMediaEntitySync({
  liveEntity,
  providerState,
  entityId,
  deviceClass,
  currentMuted,
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
}: UseMediaEntitySyncParams) {
  const lastPlaybackSnapshotKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (liveEntity) {
      const attrs = liveEntity.attributes;
      const rawState = liveEntity.state;
      const nextState: typeof initialState = normalizeMediaPlaybackState(rawState, deviceClass);
      const nextVolume =
        typeof attrs.volume_level === 'number'
          ? Math.round(attrs.volume_level * 100)
          : initialVolume;
      const nextMuted =
        typeof attrs.is_volume_muted === 'boolean' ? attrs.is_volume_muted : currentMuted;
      const hasLiveElapsed = typeof attrs.media_position === 'number';
      const nextElapsed = hasLiveElapsed
        ? (attrs.media_position as number)
        : (initialElapsedSeconds ?? 0);
      const nextPositionUpdatedAt =
        typeof attrs.media_position_updated_at === 'string' ? attrs.media_position_updated_at : '';
      const nextPlaybackSnapshotKey = hasLiveElapsed
        ? `${nextState}::${nextElapsed}::${nextPositionUpdatedAt}`
        : null;
      const hasLiveDuration = typeof attrs.media_duration === 'number';
      const nextDuration = hasLiveDuration
        ? (attrs.media_duration as number)
        : (initialDurationSeconds ?? 0);
      const nextSupportedFeatures =
        typeof attrs.supported_features === 'number' ? attrs.supported_features : 0;
      const nextGroupMembers = Array.isArray(attrs.group_members)
        ? attrs.group_members.filter(
            (value): value is string => typeof value === 'string' && value.length > 0
          )
        : [];
      const resolvedGroupMembers = nextGroupMembers.length > 0 ? nextGroupMembers : [entityId];
      const nextSupportsGrouping = hasMediaPlayerGroupingSupport(nextSupportedFeatures);

      setState((currentState) => (currentState === nextState ? currentState : nextState));
      if (
        nextPlaybackSnapshotKey !== null &&
        lastPlaybackSnapshotKeyRef.current !== nextPlaybackSnapshotKey
      ) {
        lastPlaybackSnapshotKeyRef.current = nextPlaybackSnapshotKey;
        setElapsedSeconds((currentElapsedSeconds) =>
          currentElapsedSeconds === nextElapsed ? currentElapsedSeconds : nextElapsed
        );
      }
      if (hasLiveDuration || nextDuration > 0) {
        setDurationSeconds((currentDurationSeconds) =>
          currentDurationSeconds === nextDuration ? currentDurationSeconds : nextDuration
        );
      }
      if (!isAdjustingVolume) {
        setVolume((currentVolume) => (currentVolume === nextVolume ? currentVolume : nextVolume));
        if (nextVolume > 0) {
          setPreviousVolume((previousVolume) =>
            previousVolume === nextVolume ? previousVolume : nextVolume
          );
        }
        setIsMuted((previousMuted) => (previousMuted === nextMuted ? previousMuted : nextMuted));
      }
      setSupportsGrouping((currentSupportsGrouping) =>
        currentSupportsGrouping === nextSupportsGrouping
          ? currentSupportsGrouping
          : nextSupportsGrouping
      );
      setGroupMembers((currentGroupMembers) =>
        areStringArraysEqual(currentGroupMembers, resolvedGroupMembers)
          ? currentGroupMembers
          : resolvedGroupMembers
      );
      return;
    }

    const resolvedInitialGroupMembers =
      Array.isArray(providerState?.groupMembers) && providerState.groupMembers.length > 0
        ? providerState.groupMembers
        : initialGroupMembers.length > 0
          ? initialGroupMembers
          : [entityId];
    const resolvedInitialElapsedSeconds =
      typeof providerState?.elapsedSeconds === 'number'
        ? providerState.elapsedSeconds
        : (initialElapsedSeconds ?? 0);
    const resolvedInitialDurationSeconds =
      typeof providerState?.durationSeconds === 'number'
        ? providerState.durationSeconds
        : (initialDurationSeconds ?? 0);
    const resolvedInitialState =
      typeof providerState?.value === 'string'
        ? normalizeMediaPlaybackState(providerState.value, deviceClass)
        : initialState;
    const initialPlaybackSnapshotKey = `${resolvedInitialState}::${resolvedInitialElapsedSeconds}::`;
    const resolvedInitialVolume =
      typeof providerState?.volume === 'number' ? providerState.volume : initialVolume;

    setState((currentState) =>
      currentState === resolvedInitialState ? currentState : resolvedInitialState
    );
    if (lastPlaybackSnapshotKeyRef.current !== initialPlaybackSnapshotKey) {
      lastPlaybackSnapshotKeyRef.current = initialPlaybackSnapshotKey;
      setElapsedSeconds((currentElapsedSeconds) =>
        currentElapsedSeconds === resolvedInitialElapsedSeconds
          ? currentElapsedSeconds
          : resolvedInitialElapsedSeconds
      );
    }
    setDurationSeconds((currentDurationSeconds) =>
      currentDurationSeconds === resolvedInitialDurationSeconds
        ? currentDurationSeconds
        : resolvedInitialDurationSeconds
    );
    if (!isAdjustingVolume) {
      setVolume((currentVolume) =>
        currentVolume === resolvedInitialVolume ? currentVolume : resolvedInitialVolume
      );
      if (resolvedInitialVolume > 0) {
        setPreviousVolume((previousVolume) =>
          previousVolume === resolvedInitialVolume ? previousVolume : resolvedInitialVolume
        );
      }
      setIsMuted((previousMuted) =>
        previousMuted === (providerState?.isMuted ?? initialMuted)
          ? previousMuted
          : (providerState?.isMuted ?? initialMuted)
      );
    }
    setSupportsGrouping((currentSupportsGrouping) =>
      currentSupportsGrouping === (providerState?.supportsGrouping ?? initialSupportsGrouping)
        ? currentSupportsGrouping
        : (providerState?.supportsGrouping ?? initialSupportsGrouping)
    );
    setGroupMembers((currentGroupMembers) =>
      areStringArraysEqual(currentGroupMembers, resolvedInitialGroupMembers)
        ? currentGroupMembers
        : resolvedInitialGroupMembers
    );
  }, [
    liveEntity,
    initialState,
    currentMuted,
    deviceClass,
    providerState,
    initialVolume,
    initialMuted,
    initialElapsedSeconds,
    initialDurationSeconds,
    initialSupportsGrouping,
    initialGroupMembers,
    entityId,
    isAdjustingVolume,
    setState,
    setElapsedSeconds,
    setDurationSeconds,
    setVolume,
    setPreviousVolume,
    setIsMuted,
    setSupportsGrouping,
    setGroupMembers,
  ]);
}
