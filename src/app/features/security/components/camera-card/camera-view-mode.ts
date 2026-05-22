import type { CameraViewMode } from '@/app/stores/settings-store';

export const CAMERA_AUTO_REFRESH_INTERVAL_MS = 10_000;
export const CAMERA_LIVE_FALLBACK_REFRESH_INTERVAL_MS = 30_000;
export const CAMERA_STREAM_TYPES = ['hls', 'web_rtc'] as const;

export type CameraStreamType = (typeof CAMERA_STREAM_TYPES)[number];
export type CameraImageSourceKind = CameraStreamType | 'mjpeg' | 'snapshot';

export interface CameraImageSource {
  url: string | undefined;
  kind: CameraImageSourceKind;
  isFallback: boolean;
}

export function appendCameraCacheBuster(url: string | undefined, refreshKey: number) {
  if (!url) {
    return undefined;
  }

  return `${url}${url.includes('?') ? '&' : '?'}_t=${refreshKey}`;
}

export function resolveCameraMjpegStreamUrl(snapshotUrl: string | undefined) {
  if (!snapshotUrl?.includes('/api/camera_proxy/')) {
    return undefined;
  }

  return snapshotUrl.replace('/api/camera_proxy/', '/api/camera_proxy_stream/');
}

export function readCameraStreamTypes(value: unknown): CameraStreamType[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is CameraStreamType =>
    CAMERA_STREAM_TYPES.includes(item as CameraStreamType)
  );
}

function hasUsableStreamType(
  streamTypes: readonly CameraStreamType[],
  failedStreamTypes: ReadonlySet<CameraImageSourceKind>,
  streamType: CameraStreamType
) {
  return streamTypes.includes(streamType) && !failedStreamTypes.has(streamType);
}

export function selectCameraImageSource({
  cameraViewMode,
  snapshotUrl,
  mjpegStreamUrl,
  frontendStreamTypes,
  isUnavailable,
  isRunning,
  failedStreamTypes,
}: {
  cameraViewMode: CameraViewMode;
  snapshotUrl: string | undefined;
  mjpegStreamUrl: string | undefined;
  frontendStreamTypes: readonly CameraStreamType[];
  isUnavailable: boolean;
  isRunning: boolean;
  failedStreamTypes: ReadonlySet<CameraImageSourceKind>;
}): CameraImageSource {
  if (isUnavailable || !isRunning) {
    return { url: undefined, kind: 'snapshot', isFallback: false };
  }

  if (cameraViewMode === 'live') {
    if (mjpegStreamUrl && !failedStreamTypes.has('mjpeg')) {
      return {
        url: mjpegStreamUrl,
        kind: 'mjpeg',
        isFallback: false,
      };
    }

    if (hasUsableStreamType(frontendStreamTypes, failedStreamTypes, 'web_rtc')) {
      return { url: undefined, kind: 'web_rtc', isFallback: false };
    }

    if (hasUsableStreamType(frontendStreamTypes, failedStreamTypes, 'hls')) {
      return { url: undefined, kind: 'hls', isFallback: false };
    }
  }

  return {
    url: snapshotUrl,
    kind: 'snapshot',
    isFallback: cameraViewMode === 'live' && failedStreamTypes.size > 0,
  };
}

export function getCameraAutoRefreshInterval({
  cameraViewMode,
  imageSourceKind,
  isFallback,
}: {
  cameraViewMode: CameraViewMode;
  imageSourceKind: CameraImageSourceKind;
  isFallback: boolean;
}) {
  if (cameraViewMode === 'snapshot') {
    return null;
  }

  if (cameraViewMode === 'auto') {
    return CAMERA_AUTO_REFRESH_INTERVAL_MS;
  }

  if (
    cameraViewMode === 'live' &&
    (imageSourceKind === 'snapshot' || imageSourceKind === 'mjpeg' || isFallback)
  ) {
    return CAMERA_LIVE_FALLBACK_REFRESH_INTERVAL_MS;
  }

  return null;
}
