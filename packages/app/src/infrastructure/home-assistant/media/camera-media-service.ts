import type {
  PlatformCameraCapabilities,
  PlatformCameraPlaybackModel,
  PlatformCameraState,
  PlatformCameraStream,
  PlatformCameraTransport,
} from '@navet/app/platform/provider-feature-models';
import type { ResolvedPlatformResource } from '@navet/app/platform/resources';
import { getProviderNativeId } from '@navet/core/ids';
import type { HomeAssistantResourceResolver } from '../resources/resource-resolver';

interface CameraPlaybackPlanInput {
  entityId: string;
  webRtcStreamSource?: 'provider' | 'direct';
  directStreamUrl?: string;
  cameraState: PlatformCameraState;
  preferredMode: 'auto' | 'live' | 'snapshot';
  preferredTransport: 'auto' | PlatformCameraTransport;
  snapshotUrl?: string;
  isStreamCapable: boolean;
  motionDetectionEnabled: boolean | null;
  failedTransports?: ReadonlySet<PlatformCameraTransport>;
}

const CAMERA_RETRY_DELAYS_MS = [1_000, 3_000, 7_000];
const CAMERA_SNAPSHOT_REFRESH_MS = 10_000;
const CAMERA_FALLBACK_REFRESH_MS = 30_000;
const CAMERA_CAPABILITIES_TIMEOUT_MS = 750;

function canAttemptLivePlayback(
  cameraState: PlatformCameraState,
  preferredMode: 'auto' | 'live' | 'snapshot'
) {
  return preferredMode !== 'snapshot' && cameraState !== 'unavailable' && cameraState !== 'off';
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

function resolveDirectStreamResource(input: {
  entityId: string;
  directStreamUrl?: string;
}): ResolvedPlatformResource | null {
  const streamUrl = normalizeDirectStreamUrl(input.directStreamUrl);
  if (!streamUrl) {
    return null;
  }

  return {
    id: `${input.entityId}:direct:${streamUrl}`,
    kind: 'webrtc_stream',
    url: streamUrl,
    cacheKey: `${input.entityId}:direct:${streamUrl}`,
    authStrategy: 'none',
    metadata: { source: 'direct_stream_url' },
  };
}

export class CameraMediaService {
  private cachedStreamTypes = new Map<string, PlatformCameraTransport[]>();

  constructor(
    private resolver: HomeAssistantResourceResolver,
    private getCameraCapabilities: (entityId: string) => Promise<PlatformCameraCapabilities>,
    private getCameraStream: (entityId: string, format: 'hls') => Promise<PlatformCameraStream>,
    private getCameraStreamPaths: (
      entityId: string
    ) => Promise<Partial<Record<PlatformCameraTransport, string>>>
  ) {}

  async getPlaybackPlan(input: CameraPlaybackPlanInput): Promise<PlatformCameraPlaybackModel> {
    const nativeEntityId = getProviderNativeId(input.entityId);
    const failedTransports = input.failedTransports ?? new Set<PlatformCameraTransport>();

    const snapshotResource = input.snapshotUrl
      ? await this.resolver.resolve({
          kind: 'camera_snapshot',
          entityId: input.entityId,
          rawPath: input.snapshotUrl,
        })
      : null;

    const supportsSnapshot = Boolean(snapshotResource?.url);
    const canPlayLive = canAttemptLivePlayback(input.cameraState, input.preferredMode);
    const liveTransports: PlatformCameraTransport[] = [];
    const fallbackTransports: PlatformCameraTransport[] = [];
    let selectedTransport: PlatformCameraTransport | null = null;
    let selectedStreamResource: ResolvedPlatformResource | null = null;

    if (canPlayLive) {
      const directWebRtcSelected =
        input.preferredTransport === 'web_rtc' && input.webRtcStreamSource === 'direct';
      const directStreamResource = directWebRtcSelected
        ? resolveDirectStreamResource({
            entityId: input.entityId,
            directStreamUrl: input.directStreamUrl,
          })
        : null;
      const orderedStreamTypes = await this.readOrderedStreamTypes(
        nativeEntityId,
        input.isStreamCapable
      );
      const candidateStreamTypes: PlatformCameraTransport[] =
        directWebRtcSelected && !directStreamResource
          ? []
          : directStreamResource
            ? ['web_rtc', ...orderedStreamTypes.filter((transport) => transport !== 'web_rtc')]
            : orderedStreamTypes;
      const streamTypes = this.applyPreferredTransport(
        candidateStreamTypes,
        input.preferredTransport
      );
      for (const transport of streamTypes) {
        if (failedTransports.has(transport)) {
          continue;
        }

        if (transport === 'web_rtc') {
          liveTransports.push('web_rtc');
          if (!selectedStreamResource && directStreamResource) {
            selectedStreamResource = directStreamResource;
          }
          continue;
        }

        try {
          if (transport === 'mjpeg') {
            const streamPaths = await this.getCameraStreamPaths(nativeEntityId);
            const mjpegPath = streamPaths.mjpeg;
            if (!mjpegPath) {
              continue;
            }

            const resolvedStream = await this.resolver.resolve({
              kind: 'camera_stream',
              entityId: input.entityId,
              stream: 'mjpeg',
              rawPath: mjpegPath,
            });
            liveTransports.push('mjpeg');
            if (!selectedStreamResource) {
              selectedStreamResource = {
                ...resolvedStream,
                kind: 'mjpeg_stream',
              };
            }
            continue;
          }

          let hlsPath: string | undefined;
          try {
            const stream = await this.getCameraStream(nativeEntityId, 'hls');
            hlsPath = stream.url;
          } catch {
            const streamPaths = await this.getCameraStreamPaths(nativeEntityId);
            hlsPath = streamPaths.hls;
            if (!hlsPath) {
              throw new Error('No HLS stream path available');
            }
          }

          const resolvedStream = await this.resolver.resolve({
            kind: 'camera_stream',
            entityId: input.entityId,
            stream: 'hls',
            rawPath: hlsPath,
          });
          liveTransports.push('hls');
          if (!selectedStreamResource) {
            selectedStreamResource = {
              ...resolvedStream,
              kind: 'hls_stream',
            };
          }
        } catch {
          if (selectedTransport === null) {
            selectedStreamResource = null;
          }
        }
      }

      if (liveTransports.length > 0) {
        selectedTransport = liveTransports[0] ?? null;
        fallbackTransports.push(...liveTransports.slice(1));
      }
    }

    if (selectedTransport === 'web_rtc' && selectedStreamResource?.kind !== 'webrtc_stream') {
      selectedStreamResource = null;
    } else if (
      selectedTransport !== 'web_rtc' &&
      selectedTransport !== 'hls' &&
      selectedTransport !== 'mjpeg'
    ) {
      selectedStreamResource = null;
    }

    const isSnapshotFallback =
      input.preferredMode !== 'snapshot' &&
      canPlayLive &&
      selectedTransport === null &&
      supportsSnapshot;
    const shouldStartWithSnapshot =
      input.preferredMode === 'snapshot' || (selectedTransport === null && supportsSnapshot);

    return {
      cameraState: input.cameraState,
      snapshotResource,
      supportsSnapshot,
      liveTransports,
      fallbackTransports,
      selectedTransport,
      selectedStreamResource,
      supportsStreaming: liveTransports.length > 0,
      isSnapshotFallback,
      shouldStartWithSnapshot,
      motionDetectionEnabled: input.motionDetectionEnabled,
      refreshPolicy: {
        snapshotRefreshMs:
          selectedTransport === null && supportsSnapshot
            ? input.preferredMode === 'snapshot'
              ? CAMERA_SNAPSHOT_REFRESH_MS
              : CAMERA_FALLBACK_REFRESH_MS
            : undefined,
        retryDelaysMs: CAMERA_RETRY_DELAYS_MS,
      },
    };
  }

  private async readOrderedStreamTypes(
    entityId: string,
    isStreamCapable: boolean
  ): Promise<PlatformCameraTransport[]> {
    try {
      const capabilities = await Promise.race([
        this.getCameraCapabilities(entityId),
        new Promise<PlatformCameraCapabilities>((resolve) => {
          window.setTimeout(() => resolve({ streamTypes: [] }), CAMERA_CAPABILITIES_TIMEOUT_MS);
        }),
      ]);
      const orderedTypes = capabilities.streamTypes.filter(
        (type): type is PlatformCameraTransport =>
          type === 'web_rtc' || type === 'hls' || type === 'mjpeg'
      );
      if (orderedTypes.length > 0) {
        const prioritizedTypes = this.prioritizeHomeAssistantCameraTransports(orderedTypes);
        this.cachedStreamTypes.set(entityId, prioritizedTypes);
        return prioritizedTypes;
      }
    } catch {
      // Capability lookup is advisory; fall through to explicit adapter defaults.
    }

    const cachedTypes = this.cachedStreamTypes.get(entityId);
    if (cachedTypes && cachedTypes.length > 0) {
      return cachedTypes;
    }

    return isStreamCapable ? ['web_rtc', 'hls', 'mjpeg'] : [];
  }

  private prioritizeHomeAssistantCameraTransports(
    streamTypes: readonly PlatformCameraTransport[]
  ): PlatformCameraTransport[] {
    const prioritized: PlatformCameraTransport[] = [];
    if (streamTypes.includes('web_rtc')) {
      prioritized.push('web_rtc');
    }
    if (streamTypes.includes('hls')) {
      prioritized.push('hls');
      if (!streamTypes.includes('mjpeg')) {
        prioritized.push('mjpeg');
      }
    }
    if (streamTypes.includes('mjpeg')) {
      prioritized.push('mjpeg');
    }
    return prioritized;
  }

  private applyPreferredTransport(
    streamTypes: readonly PlatformCameraTransport[],
    preferredTransport: 'auto' | PlatformCameraTransport
  ): PlatformCameraTransport[] {
    if (preferredTransport === 'auto') {
      return [...streamTypes];
    }

    const preferredIndex = streamTypes.indexOf(preferredTransport);
    if (preferredIndex === -1) {
      return [];
    }

    return streamTypes.slice(preferredIndex);
  }
}
