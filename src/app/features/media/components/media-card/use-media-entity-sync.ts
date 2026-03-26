import { useEffect } from 'react';

interface UseMediaEntitySyncParams {
  liveEntity: { state: string; attributes: Record<string, unknown> } | undefined;
  entityId: string;
  initialState: 'playing' | 'paused' | 'idle' | 'off';
  initialVolume: number;
  initialMuted: boolean;
  initialElapsedSeconds?: number;
  initialDurationSeconds?: number;
  initialSupportsGrouping: boolean;
  initialGroupMembers: string[];
  isAdjustingVolume: boolean;
  setState: (state: 'playing' | 'paused' | 'idle' | 'off') => void;
  setElapsedSeconds: (seconds: number) => void;
  setDurationSeconds: (seconds: number) => void;
  setVolume: (volume: number) => void;
  setPreviousVolume: (volume: number) => void;
  setIsMuted: (muted: boolean) => void;
  setSupportsGrouping: (supports: boolean) => void;
  setGroupMembers: (groupMembers: string[]) => void;
}

export function useMediaEntitySync({
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
}: UseMediaEntitySyncParams) {
  useEffect(() => {
    if (liveEntity) {
      const attrs = liveEntity.attributes;
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
        if (nextVolume > 0) {
          setPreviousVolume(nextVolume);
        }
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
