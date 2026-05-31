export type MediaPlaybackState = 'playing' | 'paused' | 'idle' | 'off';

export function isTvMediaDevice(deviceClass: unknown): boolean {
  return typeof deviceClass === 'string' && deviceClass.trim().toLowerCase() === 'tv';
}

export function normalizeMediaPlaybackState(
  rawState: unknown,
  deviceClass?: unknown
): MediaPlaybackState {
  if (rawState === 'playing' || rawState === 'buffering') {
    return 'playing';
  }

  if (rawState === 'paused') {
    return 'paused';
  }

  if (
    rawState === 'off' ||
    rawState === 'standby' ||
    rawState === 'unavailable' ||
    rawState === 'unknown'
  ) {
    return 'off';
  }

  if (isTvMediaDevice(deviceClass)) {
    return rawState === 'on' ? 'idle' : 'off';
  }

  return 'idle';
}
