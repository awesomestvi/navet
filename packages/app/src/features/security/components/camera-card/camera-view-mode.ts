import type { CameraFeedMode, CameraViewMode } from '@navet/app/stores/settings-store';

export const CAMERA_AUTO_REFRESH_INTERVAL_MS = 10_000;
export const CAMERA_LIVE_FALLBACK_REFRESH_INTERVAL_MS = 30_000;
export const CAMERA_STREAM_TYPES = ['web_rtc', 'hls'] as const;

export type CameraStreamType = (typeof CAMERA_STREAM_TYPES)[number];
export type CameraImageSourceKind = CameraStreamType | 'go2rtc' | 'mjpeg' | 'snapshot';
export type CameraSelectableFeedKind = Exclude<CameraImageSourceKind, 'snapshot'>;

export interface CameraImageSource {
  url: string | undefined;
  kind: CameraImageSourceKind;
  isFallback: boolean;
}

export function resolveDashboardCameraViewMode({
  cameraDashboardViewMode,
  lowPowerMode,
  hasSnapshot,
}: {
  cameraDashboardViewMode: CameraViewMode;
  lowPowerMode: boolean;
  hasSnapshot: boolean;
}): CameraViewMode {
  if (lowPowerMode && hasSnapshot) {
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
    if (
      resolvedUrl.pathname.includes('/api/camera_proxy/') ||
      resolvedUrl.pathname.includes('/api/camera_proxy_stream/')
    ) {
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

const AUTO_LIVE_FEED_ORDER: CameraSelectableFeedKind[] = ['web_rtc', 'hls', 'go2rtc', 'mjpeg'];

function getLiveFeedOrder({
  cameraFeedMode,
  hasFrontendStreamTypes,
}: {
  cameraFeedMode: CameraFeedMode;
  hasFrontendStreamTypes: boolean;
}): CameraSelectableFeedKind[] {
  const autoLiveFeedOrder =
    hasFrontendStreamTypes && cameraFeedMode === 'auto'
      ? AUTO_LIVE_FEED_ORDER.filter((feedKind) => feedKind !== 'go2rtc')
      : AUTO_LIVE_FEED_ORDER;
  if (cameraFeedMode === 'auto') {
    return autoLiveFeedOrder;
  }

  return [cameraFeedMode, ...autoLiveFeedOrder.filter((feedKind) => feedKind !== cameraFeedMode)];
}

export function selectCameraImageSource({
  cameraViewMode,
  cameraFeedMode,
  hasGo2RtcFeed,
  snapshotUrl,
  mjpegStreamUrl,
  frontendStreamTypes,
  isUnavailable,
  isRunning,
  failedStreamTypes,
}: {
  cameraViewMode: CameraViewMode;
  cameraFeedMode: CameraFeedMode;
  hasGo2RtcFeed: boolean;
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
    for (const feedKind of getLiveFeedOrder({
      cameraFeedMode,
      hasFrontendStreamTypes: frontendStreamTypes.length > 0,
    })) {
      if (feedKind === 'go2rtc' && hasGo2RtcFeed && !failedStreamTypes.has('go2rtc')) {
        return { url: undefined, kind: 'go2rtc', isFallback: false };
      }

      if (
        (feedKind === 'web_rtc' || feedKind === 'hls') &&
        hasUsableStreamType(frontendStreamTypes, failedStreamTypes, feedKind)
      ) {
        return { url: undefined, kind: feedKind, isFallback: false };
      }

      if (feedKind === 'mjpeg' && mjpegStreamUrl && !failedStreamTypes.has('mjpeg')) {
        return {
          url: mjpegStreamUrl,
          kind: 'mjpeg',
          isFallback: false,
        };
      }
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
