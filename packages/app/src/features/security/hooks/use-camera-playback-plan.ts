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
import { isDirectCameraStreamSource } from '@navet/app/stores/settings-store';
import { useEffect, useMemo, useState } from 'react';

const CAMERA_CAPABILITIES_REFRESH_LIMIT = 3;

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
  directStreamFailed?: boolean;
}

export function normalizeCameraDirectStreamUrl(
  value: string | undefined,
  pageProtocol = window.location.protocol
) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const streamUrl = new URL(trimmed, window.location.href);
    if (streamUrl.protocol !== 'http:' && streamUrl.protocol !== 'https:') {
      return null;
    }
    if (pageProtocol === 'https:' && streamUrl.protocol === 'http:') {
      return null;
    }
    const streamSources = streamUrl.searchParams
      .getAll('src')
      .map((source) => source.trim())
      .filter(Boolean);
    if (streamSources.length !== 1) {
      return null;
    }

    return trimmed;
  } catch {
    return null;
  }
}

function createDirectStreamResource(entityId: string, streamUrl: string): ResolvedPlatformResource {
  return {
    id: `${entityId}:direct:${streamUrl}`,
    kind: 'webrtc_stream',
    url: streamUrl,
    cacheKey: `${entityId}:direct:${streamUrl}`,
    authStrategy: 'none',
    metadata: { source: 'direct_stream_url' },
  };
}

function applyCameraStreamSource(
  plan: PlatformCameraPlaybackModel,
  options: UseCameraPlaybackPlanOptions
): PlatformCameraPlaybackModel {
  const directSource = options.webRtcStreamSource ?? 'provider';
  if (!isDirectCameraStreamSource(directSource)) {
    return plan;
  }

  const directStreamUrl = normalizeCameraDirectStreamUrl(options.directStreamUrl);
  const providerSupportedTransports = plan.supportedTransports ?? plan.liveTransports;
  const shouldUseDirectStream =
    directStreamUrl !== null &&
    !options.directStreamFailed &&
    options.preferredMode !== 'snapshot' &&
    options.cameraState !== 'unavailable' &&
    options.cameraState !== 'off';

  if (!shouldUseDirectStream) {
    const hasSnapshotFallback =
      options.preferredMode !== 'snapshot' && plan.snapshotResource !== null;
    return {
      ...plan,
      supportedTransports: providerSupportedTransports,
      liveTransports: directStreamUrl ? ['web_rtc'] : [],
      fallbackTransports: [],
      selectedTransport: null,
      selectedStreamResource: null,
      supportsStreaming: directStreamUrl !== null,
      isSnapshotFallback: hasSnapshotFallback,
      shouldStartWithSnapshot: plan.snapshotResource !== null,
    };
  }

  return {
    ...plan,
    supportedTransports: providerSupportedTransports,
    liveTransports: ['web_rtc'],
    fallbackTransports: [],
    selectedTransport: 'web_rtc',
    selectedStreamResource: createDirectStreamResource(options.entityId, directStreamUrl),
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
      directStreamFailed: options.directStreamFailed,
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
      options.directStreamFailed,
      failedTransportKey,
    ]
  );

  useEffect(() => {
    let cancelled = false;
    let capabilitiesRefreshTimeout: number | null = null;

    const loadPlan = (capabilitiesRefreshCount = 0) => {
      void getCameraPlaybackPlan({
        ...stableOptions,
        webRtcStreamSource: 'provider',
        directStreamUrl: undefined,
      })
        .then((nextPlan) => {
          if (cancelled) {
            return;
          }

          setPlan(applyCameraStreamSource(nextPlan, stableOptions));
          const refreshDelay = nextPlan.refreshPolicy.capabilitiesRefreshMs;
          if (
            refreshDelay !== undefined &&
            capabilitiesRefreshCount < CAMERA_CAPABILITIES_REFRESH_LIMIT
          ) {
            capabilitiesRefreshTimeout = window.setTimeout(
              () => loadPlan(capabilitiesRefreshCount + 1),
              refreshDelay
            );
          }
        })
        .catch(() => {
          if (!cancelled) {
            setPlan(null);
          }
        });
    };

    loadPlan();

    return () => {
      cancelled = true;
      if (capabilitiesRefreshTimeout !== null) {
        window.clearTimeout(capabilitiesRefreshTimeout);
      }
    };
  }, [stableOptions]);

  return plan;
}
