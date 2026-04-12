import { type Dispatch, type SetStateAction, useEffect } from 'react';
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
      const resolvedGroupMembers = nextGroupMembers.length > 0 ? nextGroupMembers : [entityId];
      const nextSupportsGrouping = (nextSupportedFeatures & 524288) === 524288;

      setState((currentState) => (currentState === nextState ? currentState : nextState));
      setElapsedSeconds((currentElapsedSeconds) =>
        currentElapsedSeconds === nextElapsed ? currentElapsedSeconds : nextElapsed
      );
      setDurationSeconds((currentDurationSeconds) =>
        currentDurationSeconds === nextDuration ? currentDurationSeconds : nextDuration
      );
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
      initialGroupMembers.length > 0 ? initialGroupMembers : [entityId];
    const resolvedInitialElapsedSeconds = initialElapsedSeconds ?? 0;
    const resolvedInitialDurationSeconds = initialDurationSeconds ?? 0;

    setState((currentState) => (currentState === initialState ? currentState : initialState));
    setElapsedSeconds((currentElapsedSeconds) =>
      currentElapsedSeconds === resolvedInitialElapsedSeconds
        ? currentElapsedSeconds
        : resolvedInitialElapsedSeconds
    );
    setDurationSeconds((currentDurationSeconds) =>
      currentDurationSeconds === resolvedInitialDurationSeconds
        ? currentDurationSeconds
        : resolvedInitialDurationSeconds
    );
    if (!isAdjustingVolume) {
      setVolume((currentVolume) =>
        currentVolume === initialVolume ? currentVolume : initialVolume
      );
      if (initialVolume > 0) {
        setPreviousVolume((previousVolume) =>
          previousVolume === initialVolume ? previousVolume : initialVolume
        );
      }
      setIsMuted((previousMuted) =>
        previousMuted === initialMuted ? previousMuted : initialMuted
      );
    }
    setSupportsGrouping((currentSupportsGrouping) =>
      currentSupportsGrouping === initialSupportsGrouping
        ? currentSupportsGrouping
        : initialSupportsGrouping
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
