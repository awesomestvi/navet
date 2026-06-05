import type {
  PlatformCameraPlaybackModel,
  PlatformCameraState,
  PlatformCameraTransport,
} from '@navet/app/platform/provider-feature-models';
import { getCameraPlaybackPlan } from '@navet/app/services/integration-camera-runtime.service';
import type { CameraStreamPreference } from '@navet/app/stores/settings-store';
import { useEffect, useMemo, useState } from 'react';

interface UseCameraPlaybackPlanOptions {
  entityId: string;
  cameraState: PlatformCameraState;
  preferredMode: 'auto' | 'live' | 'snapshot';
  preferredTransport: CameraStreamPreference;
  snapshotUrl?: string;
  isStreamCapable: boolean;
  motionDetectionEnabled: boolean | null;
  failedTransports?: ReadonlySet<PlatformCameraTransport>;
}

export function useCameraPlaybackPlan(options: UseCameraPlaybackPlanOptions) {
  const [plan, setPlan] = useState<PlatformCameraPlaybackModel | null>(null);
  const failedTransportKey = [...(options.failedTransports ?? [])].sort().join(',');
  const stableOptions = useMemo(
    () => ({
      entityId: options.entityId,
      cameraState: options.cameraState,
      preferredMode: options.preferredMode,
      preferredTransport: options.preferredTransport,
      snapshotUrl: options.snapshotUrl,
      isStreamCapable: options.isStreamCapable,
      motionDetectionEnabled: options.motionDetectionEnabled,
      failedTransports: new Set(
        failedTransportKey.length > 0
          ? (failedTransportKey.split(',') as PlatformCameraTransport[])
          : []
      ),
    }),
    [
      options.entityId,
      options.cameraState,
      options.preferredMode,
      options.preferredTransport,
      options.snapshotUrl,
      options.isStreamCapable,
      options.motionDetectionEnabled,
      failedTransportKey,
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
