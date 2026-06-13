import type { CameraViewMode, EffectsQuality } from '@navet/app/stores/settings-store';

export const CAMERA_AUTO_REFRESH_INTERVAL_MS = 10_000;
export const CAMERA_LIVE_FALLBACK_REFRESH_INTERVAL_MS = 30_000;
export const CAMERA_REDUCED_REFRESH_INTERVAL_MS = 45_000;
export const CAMERA_STREAM_TYPES = ['web_rtc', 'hls', 'mjpeg'] as const;

export type CameraStreamType = (typeof CAMERA_STREAM_TYPES)[number];
export type CameraImageSourceKind = CameraStreamType | 'snapshot';

export interface CameraImageSource {
  url: string | undefined;
  kind: CameraImageSourceKind;
  isFallback: boolean;
}

export function resolveDashboardCameraViewMode({
  cameraDashboardViewMode,
  lowPowerMode,
  effectsQuality = 'high',
  hasSnapshot,
}: {
  cameraDashboardViewMode: CameraViewMode;
  lowPowerMode: boolean;
  effectsQuality?: EffectsQuality;
  hasSnapshot: boolean;
}): CameraViewMode {
  if ((lowPowerMode || effectsQuality === 'low') && hasSnapshot) {
    return 'snapshot';
  }

  return cameraDashboardViewMode;
}

export function resolveViewerInitialCameraViewMode({
  isStreamCapable,
  hasSnapshot,
}: {
  isStreamCapable: boolean;
  hasSnapshot: boolean;
}): CameraViewMode {
  if (isStreamCapable) {
    return 'live';
  }

  return hasSnapshot ? 'snapshot' : 'auto';
}

export function appendCameraCacheBuster(url: string | undefined, refreshKey: number) {
  if (!url) {
    return undefined;
  }

  return `${url}${url.includes('?') ? '&' : '?'}_t=${refreshKey}`;
}

export function normalizeCameraSnapshotUrl(url: string | undefined) {
  if (!url) {
    return undefined;
  }

  try {
    const resolvedUrl = new URL(url, window.location.origin);
    if (resolvedUrl.pathname.includes('/api/camera_proxy/')) {
      resolvedUrl.search = '';
      return resolvedUrl.origin === window.location.origin
        ? `${resolvedUrl.pathname}${resolvedUrl.hash}`
        : resolvedUrl.toString();
    }
  } catch {
    return url;
  }

  return url;
}

export function readCameraStreamTypes(value: unknown): CameraStreamType[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is CameraStreamType =>
    CAMERA_STREAM_TYPES.includes(item as CameraStreamType)
  );
}

export function getCameraAutoRefreshInterval({
  cameraViewMode,
  imageSourceKind,
  isFallback,
  reducePolling = false,
}: {
  cameraViewMode: CameraViewMode;
  imageSourceKind: CameraImageSourceKind;
  isFallback: boolean;
  reducePolling?: boolean;
}) {
  if (cameraViewMode === 'snapshot') {
    return null;
  }

  if (cameraViewMode === 'auto') {
    return reducePolling ? CAMERA_REDUCED_REFRESH_INTERVAL_MS : CAMERA_AUTO_REFRESH_INTERVAL_MS;
  }

  if (cameraViewMode === 'live' && (imageSourceKind === 'snapshot' || isFallback)) {
    return reducePolling
      ? CAMERA_REDUCED_REFRESH_INTERVAL_MS
      : CAMERA_LIVE_FALLBACK_REFRESH_INTERVAL_MS;
  }

  return null;
}
