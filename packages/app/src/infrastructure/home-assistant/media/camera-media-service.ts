import type {
  CameraPlaybackPlan,
  PlatformCameraStream,
  PlatformCameraStreamType,
} from '@navet/app/platform/provider-feature-models';
import type { ResolvedPlatformResource } from '@navet/app/platform/resources';
import type { CameraFeedMode } from '@navet/app/stores/settings-store';
import type { HomeAssistantResourceResolver } from '../resources/resource-resolver';

interface CameraPlaybackPlanInput {
  entityId: string;
  preferredMode: 'auto' | 'live' | 'snapshot';
  preferredTransport: CameraFeedMode | 'go2rtc';
  snapshotUrl?: string;
  mjpegStreamUrl?: string;
  frontendStreamTypes: readonly PlatformCameraStreamType[];
  hasGo2RtcFeed: boolean;
  isUnavailable: boolean;
  isRunning: boolean;
  failedTransports?: ReadonlySet<'hls' | 'web_rtc' | 'mjpeg' | 'go2rtc' | 'snapshot'>;
}

const AUTO_LIVE_FEED_ORDER: Array<'go2rtc' | 'web_rtc' | 'hls' | 'mjpeg'> = [
  'web_rtc',
  'hls',
  'go2rtc',
  'mjpeg',
];

function getFeedOrder({
  preferredTransport,
  hasFrontendStreamTypes,
}: {
  preferredTransport: CameraPlaybackPlanInput['preferredTransport'];
  hasFrontendStreamTypes: boolean;
}) {
  const autoLiveFeedOrder =
    hasFrontendStreamTypes && preferredTransport === 'auto'
      ? AUTO_LIVE_FEED_ORDER.filter((kind) => kind !== 'go2rtc')
      : AUTO_LIVE_FEED_ORDER;
  if (preferredTransport === 'auto') {
    return autoLiveFeedOrder;
  }

  return [preferredTransport, ...autoLiveFeedOrder.filter((kind) => kind !== preferredTransport)];
}

export class CameraMediaService {
  constructor(
    private resolver: HomeAssistantResourceResolver,
    private getCameraStream: (
      entityId: string,
      format: PlatformCameraStreamType
    ) => Promise<PlatformCameraStream>
  ) {}

  async getPlaybackPlan(input: CameraPlaybackPlanInput): Promise<CameraPlaybackPlan> {
    const failedTransports = input.failedTransports ?? new Set();

    const snapshotResource = input.snapshotUrl
      ? await this.resolver.resolve({
          kind: 'camera_snapshot',
          entityId: input.entityId,
          rawPath: input.snapshotUrl,
        })
      : ({
          id: `${input.entityId}:snapshot`,
          kind: 'unavailable',
          cacheKey: `${input.entityId}:snapshot`,
          authStrategy: 'none',
        } satisfies ResolvedPlatformResource);

    if (input.isUnavailable || !input.isRunning || input.preferredMode === 'snapshot') {
      return {
        primary: snapshotResource,
        fallbacks: [],
        refreshPolicy: {
          snapshotRefreshMs: input.preferredMode === 'snapshot' ? 10_000 : 30_000,
          retryDelaysMs: [1_000, 3_000, 7_000],
        },
      };
    }

    const resources: ResolvedPlatformResource[] = [];

    for (const feedKind of getFeedOrder({
      preferredTransport: input.preferredTransport,
      hasFrontendStreamTypes: input.frontendStreamTypes.length > 0,
    })) {
      if (failedTransports.has(feedKind)) {
        continue;
      }

      if (feedKind === 'go2rtc') {
        if (!input.hasGo2RtcFeed) {
          continue;
        }

        resources.push({
          id: `${input.entityId}:go2rtc`,
          kind: 'webrtc_stream',
          cacheKey: `${input.entityId}:go2rtc`,
          authStrategy: 'none',
          metadata: { source: 'go2rtc' },
        });
        continue;
      }

      if (feedKind === 'web_rtc') {
        if (!input.frontendStreamTypes.includes('web_rtc')) {
          continue;
        }

        resources.push({
          id: `${input.entityId}:webrtc`,
          kind: 'webrtc_stream',
          cacheKey: `${input.entityId}:webrtc`,
          authStrategy: 'none',
          metadata: { source: 'ha_webrtc' },
        });
        continue;
      }

      if (feedKind === 'hls') {
        const shouldProbeHls =
          input.frontendStreamTypes.includes('hls') || input.frontendStreamTypes.length === 0;
        if (!shouldProbeHls) {
          continue;
        }

        try {
          const stream = await this.getCameraStream(input.entityId, 'hls');
          const resolvedStream = await this.resolver.resolve({
            kind: 'camera_stream',
            entityId: input.entityId,
            stream: 'hls',
            rawPath: stream.url,
          });
          resources.push({
            ...resolvedStream,
            kind: 'hls_stream',
          });
        } catch {
          continue;
        }
        continue;
      }

      if (feedKind === 'mjpeg' && input.mjpegStreamUrl) {
        const resolvedStream = await this.resolver.resolve({
          kind: 'camera_stream',
          entityId: input.entityId,
          stream: 'mjpeg',
          rawPath: input.mjpegStreamUrl,
        });
        resources.push({
          ...resolvedStream,
          kind: 'mjpeg_stream',
        });
      }
    }

    const [primary, ...fallbacks] = resources;

    return {
      primary: primary ?? snapshotResource,
      fallbacks: primary ? [...fallbacks, snapshotResource] : [],
      refreshPolicy: {
        snapshotRefreshMs: primary?.kind === 'mjpeg_stream' || !primary ? 30_000 : undefined,
        retryDelaysMs: [1_000, 3_000, 7_000],
      },
    };
  }
}
