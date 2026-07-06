import type {
  PlatformCameraPlaybackModel,
  PlatformCameraState,
  PlatformCameraTransport,
} from '@navet/app/platform/provider-feature-models';
import type { ResolvedPlatformResource } from '@navet/app/platform/resources';
import { getCameraPlaybackPlan } from '@navet/app/services/integration-camera-runtime.service';
import type {
  CameraStreamPreference,
  CameraWebRtcStreamSource,
} from '@navet/app/stores/settings-store';
import { useEffect, useMemo, useState } from 'react';

interface UseCameraPlaybackPlanOptions {
  entityId: string;
  webRtcStreamSource?: CameraWebRtcStreamSource;
  directStreamUrl?: string;
  cameraState: PlatformCameraState;
  preferredMode: 'auto' | 'live' | 'snapshot';
  preferredTransport: CameraStreamPreference;
  snapshotUrl?: string;
  isStreamCapable: boolean;
  motionDetectionEnabled: boolean | null;
  failedTransports?: ReadonlySet<PlatformCameraTransport>;
}

function normalizeDirectStreamUrl(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const streamUrl = new URL(trimmed, window.location.href);
    return streamUrl.protocol === 'http:' || streamUrl.protocol === 'https:'
      ? streamUrl.toString()
      : null;
  } catch {
    return null;
  }
}

function createDirectWebRtcResource(entityId: string, streamUrl: string): ResolvedPlatformResource {
  return {
    id: `${entityId}:direct:${streamUrl}`,
    kind: 'webrtc_stream',
    url: streamUrl,
    cacheKey: `${entityId}:direct:${streamUrl}`,
    authStrategy: 'none',
    metadata: { source: 'direct_stream_url' },
  };
}

function applyDirectWebRtcOverride(
  plan: PlatformCameraPlaybackModel,
  options: UseCameraPlaybackPlanOptions
): PlatformCameraPlaybackModel {
  if (options.preferredTransport !== 'web_rtc' || options.webRtcStreamSource !== 'direct') {
    return plan;
  }

  if (options.failedTransports?.has('web_rtc')) {
    return plan;
  }

  const directStreamUrl = normalizeDirectStreamUrl(options.directStreamUrl);
  if (!directStreamUrl) {
    return {
      ...plan,
      liveTransports: [],
      fallbackTransports: [],
      selectedTransport: null,
      selectedStreamResource: null,
      supportsStreaming: false,
      isSnapshotFallback: plan.supportsSnapshot,
      shouldStartWithSnapshot: plan.supportsSnapshot,
    };
  }

  const remainingTransports = plan.liveTransports.filter((transport) => transport !== 'web_rtc');
  return {
    ...plan,
    liveTransports: ['web_rtc', ...remainingTransports],
    fallbackTransports: remainingTransports,
    selectedTransport: 'web_rtc',
    selectedStreamResource: createDirectWebRtcResource(options.entityId, directStreamUrl),
    supportsStreaming: true,
    isSnapshotFallback: false,
    shouldStartWithSnapshot: false,
  };
}

export function useCameraPlaybackPlan(options: UseCameraPlaybackPlanOptions) {
  const [plan, setPlan] = useState<PlatformCameraPlaybackModel | null>(null);
  const failedTransportKey = [...(options.failedTransports ?? [])].sort().join(',');
  const stableOptions = useMemo(
    () => ({
      entityId: options.entityId,
      webRtcStreamSource: options.webRtcStreamSource,
      directStreamUrl: options.directStreamUrl,
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
      options.webRtcStreamSource,
      options.directStreamUrl,
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
          setPlan(applyDirectWebRtcOverride(nextPlan, stableOptions));
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
