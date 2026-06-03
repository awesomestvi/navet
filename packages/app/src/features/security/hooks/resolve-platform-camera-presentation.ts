import type {
  PlatformCameraPresentation,
  PlatformCameraSourceKind,
  PlatformCameraTransport,
} from '@navet/app/platform/provider-feature-models';
import type { CameraImageSourceKind } from '../components/camera-card/camera-view-mode';
import { useCameraPlaybackPlan } from './use-camera-playback-plan';

interface ResolvePlatformCameraPresentationOptions {
  entityId: string;
  cameraState: 'unavailable' | 'off' | 'idle' | 'streaming' | 'recording';
  preferredMode: 'live' | 'auto' | 'snapshot';
  snapshotUrl?: string;
  isStreamCapable: boolean;
  motionDetectionEnabled: boolean | null;
  failedTransports: Set<PlatformCameraTransport>;
}

function mapSourceKind(kind: CameraImageSourceKind): PlatformCameraSourceKind {
  return kind;
}

export function usePlatformCameraPresentation(
  options: ResolvePlatformCameraPresentationOptions
): PlatformCameraPresentation {
  const playbackPlan = useCameraPlaybackPlan({
    entityId: options.entityId,
    cameraState: options.cameraState,
    preferredMode: options.preferredMode,
    snapshotUrl: options.snapshotUrl,
    isStreamCapable: options.isStreamCapable,
    motionDetectionEnabled: options.motionDetectionEnabled,
    failedTransports: options.failedTransports,
  });

  if (!playbackPlan) {
    return {
      sourceUrl: undefined,
      sourceKind: 'snapshot',
      isFallback: false,
      videoStreamKind: null,
      supportsStreaming: false,
      availableStreamTypes: [],
    };
  }

  const resolved =
    playbackPlan.selectedTransport === 'web_rtc'
      ? {
          sourceUrl: undefined,
          sourceKind: 'web_rtc' as const,
          isFallback: false,
        }
      : playbackPlan.selectedTransport === 'hls'
        ? {
            sourceUrl: undefined,
            sourceKind: 'hls' as const,
            isFallback: false,
          }
        : playbackPlan.selectedTransport === 'mjpeg'
          ? {
              sourceUrl: undefined,
              sourceKind: 'mjpeg' as const,
              isFallback: false,
            }
          : {
              sourceUrl: playbackPlan.snapshotResource?.url,
              sourceKind: 'snapshot' as const,
              isFallback: playbackPlan.isSnapshotFallback,
            };

  return {
    sourceUrl: resolved.sourceUrl,
    sourceKind: mapSourceKind(resolved.sourceKind),
    isFallback: resolved.isFallback,
    videoStreamKind:
      resolved.sourceKind === 'hls' ||
      resolved.sourceKind === 'web_rtc' ||
      resolved.sourceKind === 'mjpeg'
        ? resolved.sourceKind
        : null,
    supportsStreaming: playbackPlan.supportsStreaming,
    availableStreamTypes: [...playbackPlan.liveTransports],
  };
}
