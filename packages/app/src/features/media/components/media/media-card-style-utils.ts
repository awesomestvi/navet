export function clampMediaPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function getMediaDisplayVolume(volume: number, isMuted: boolean) {
  return clampMediaPercent(isMuted ? 0 : volume);
}

export function getMediaProgressPercent(elapsedSeconds: number, durationSeconds: number) {
  if (durationSeconds <= 0) {
    return 0;
  }

  return clampMediaPercent((elapsedSeconds / durationSeconds) * 100);
}
