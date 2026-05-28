import type {
  PlatformCameraPresentation,
  PlatformCameraSourceKind,
} from '@/app/platform/provider-feature-models';
import type {
  CameraImageSourceKind,
  CameraStreamType,
} from '../components/camera-card/camera-view-mode';
import { useCameraPlaybackPlan } from './use-camera-playback-plan';

interface ResolvePlatformCameraPresentationOptions {
  entityId: string;
  preferredMode: 'live' | 'auto' | 'snapshot';
  preferredTransport: 'auto' | 'hls' | 'web_rtc';
  snapshotUrl?: string;
  mjpegStreamUrl?: string;
  frontendStreamTypes: readonly CameraStreamType[];
  hasGo2RtcFeed: boolean;
  isUnavailable: boolean;
  isRunning: boolean;
  failedTransports: Set<CameraImageSourceKind>;
}

function mapSourceKind(kind: CameraImageSourceKind): PlatformCameraSourceKind {
  return kind;
}

export function usePlatformCameraPresentation(
  options: ResolvePlatformCameraPresentationOptions
): PlatformCameraPresentation {
  const playbackPlan = useCameraPlaybackPlan({
    entityId: options.entityId,
    preferredMode: options.preferredMode,
    preferredTransport: options.preferredTransport,
    snapshotUrl: options.snapshotUrl,
    mjpegStreamUrl: options.mjpegStreamUrl,
    frontendStreamTypes: options.frontendStreamTypes,
    hasGo2RtcFeed: options.hasGo2RtcFeed,
    isUnavailable: options.isUnavailable,
    isRunning: options.isRunning,
    failedTransports: options.failedTransports,
  });

  const resolved =
    playbackPlan?.primary.kind === 'webrtc_stream'
      ? {
          sourceUrl: undefined,
          sourceKind:
            playbackPlan.primary.metadata?.source === 'go2rtc'
              ? ('go2rtc' as const)
              : ('web_rtc' as const),
          isFallback: false,
        }
      : playbackPlan?.primary.kind === 'hls_stream'
        ? {
            sourceUrl: undefined,
            sourceKind: 'hls' as const,
            isFallback: false,
          }
        : playbackPlan?.primary.kind === 'mjpeg_stream'
          ? {
              sourceUrl: playbackPlan.primary.url,
              sourceKind: 'mjpeg' as const,
              isFallback: false,
            }
          : {
              sourceUrl: playbackPlan?.primary.url ?? options.snapshotUrl,
              sourceKind: 'snapshot' as const,
              isFallback: options.preferredMode === 'live',
            };

  return {
    sourceUrl: resolved.sourceUrl,
    sourceKind: mapSourceKind(resolved.sourceKind),
    isFallback: resolved.isFallback,
    videoStreamKind:
      resolved.sourceKind === 'go2rtc' ||
      resolved.sourceKind === 'hls' ||
      resolved.sourceKind === 'web_rtc'
        ? resolved.sourceKind
        : null,
    supportsStreaming:
      options.hasGo2RtcFeed ||
      options.frontendStreamTypes.length > 0 ||
      Boolean(options.mjpegStreamUrl),
    availableStreamTypes: options.hasGo2RtcFeed
      ? ['go2rtc', ...options.frontendStreamTypes]
      : [...options.frontendStreamTypes],
  };
}
