import type {
  CameraPlaybackPlan,
  PlatformCameraStreamType,
} from '@navet/app/platform/provider-feature-models';
import { getCameraPlaybackPlan } from '@navet/app/services/integration-camera-runtime.service';
import type { CameraFeedMode } from '@navet/app/stores/settings-store';
import { useEffect, useMemo, useState } from 'react';

interface UseCameraPlaybackPlanOptions {
  entityId: string;
  preferredMode: 'auto' | 'live' | 'snapshot';
  preferredTransport: CameraFeedMode;
  snapshotUrl?: string;
  mjpegStreamUrl?: string;
  frontendStreamTypes: readonly PlatformCameraStreamType[];
  hasGo2RtcFeed: boolean;
  isUnavailable: boolean;
  isRunning: boolean;
  failedTransports?: ReadonlySet<'hls' | 'web_rtc' | 'mjpeg' | 'go2rtc' | 'snapshot'>;
}

export function useCameraPlaybackPlan(options: UseCameraPlaybackPlanOptions) {
  const [plan, setPlan] = useState<CameraPlaybackPlan | null>(null);
  const stableOptions = useMemo(
    () => ({
      entityId: options.entityId,
      preferredMode: options.preferredMode,
      preferredTransport: options.preferredTransport,
      snapshotUrl: options.snapshotUrl,
      mjpegStreamUrl: options.mjpegStreamUrl,
      hasGo2RtcFeed: options.hasGo2RtcFeed,
      isUnavailable: options.isUnavailable,
      isRunning: options.isRunning,
      frontendStreamTypes: [...options.frontendStreamTypes],
      failedTransports: new Set(options.failedTransports ?? []),
    }),
    [
      options.entityId,
      options.preferredMode,
      options.preferredTransport,
      options.snapshotUrl,
      options.mjpegStreamUrl,
      options.frontendStreamTypes,
      options.hasGo2RtcFeed,
      options.isUnavailable,
      options.isRunning,
      options.failedTransports,
    ]
  );

  useEffect(() => {
    let cancelled = false;

    void getCameraPlaybackPlan(stableOptions)
      .then((nextPlan) => {
        if (!cancelled) {
          setPlan(nextPlan);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPlan(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [stableOptions]);

  return plan;
}
