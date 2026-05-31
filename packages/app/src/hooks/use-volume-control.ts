import { useCallback } from 'react';

export interface UseVolumeControlProps {
  /** Current volume level (0-100) */
  volume: number;
  /** Whether audio is muted */
  isMuted: boolean;
  /** Callback when volume changes */
  onVolumeChange: (volume: number) => void;
  /** Callback when mute state toggles */
  onMuteToggle: () => void;
  /** Volume step for up/down buttons (default: 10) */
  step?: number;
  /** Minimum volume (default: 0) */
  min?: number;
  /** Maximum volume (default: 100) */
  max?: number;
}

export interface UseVolumeControlReturn {
  /** Current volume level */
  volume: number;
  /** Whether audio is muted */
  isMuted: boolean;
  /** Increase volume by step */
  onVolumeUp: () => void;
  /** Decrease volume by step */
  onVolumeDown: () => void;
  /** Toggle mute state */
  onMuteToggle: () => void;
  /** Set volume to specific value */
  setVolume: (volume: number) => void;
}

/**
 * Reusable hook for media volume control logic.
 * Handles volume up/down, mute toggle, and boundary checking.
 *
 * @param props - Volume control configuration
 * @returns Volume state and handlers
 *
 * @example
 * ```ts
 * const { volume, isMuted, onVolumeUp, onVolumeDown, onMuteToggle } = useVolumeControl({
 *   volume: 50,
 *   isMuted: false,
 *   onVolumeChange: (vol) => setVolume(vol),
 *   onMuteToggle: () => setIsMuted(prev => !prev),
 *   step: 5,
 * });
 * ```
 */
export function useVolumeControl({
  volume,
  isMuted,
  onVolumeChange,
  onMuteToggle,
  step = 10,
  min = 0,
  max = 100,
}: UseVolumeControlProps): UseVolumeControlReturn {
  const onVolumeUp = useCallback(() => {
    onVolumeChange(Math.min(max, volume + step));
  }, [volume, step, max, onVolumeChange]);

  const onVolumeDown = useCallback(() => {
    onVolumeChange(Math.max(min, volume - step));
  }, [volume, step, min, onVolumeChange]);

  const setVolume = useCallback(
    (newVolume: number) => {
      onVolumeChange(Math.max(min, Math.min(max, newVolume)));
    },
    [min, max, onVolumeChange]
  );

  return {
    volume,
    isMuted,
    onVolumeUp,
    onVolumeDown,
    onMuteToggle,
    setVolume,
  };
}
