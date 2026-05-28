import type {
  PlatformCameraStream,
  PlatformCameraStreamType,
} from '@/app/platform/provider-feature-models';
import type { CameraFeedMode } from '@/app/stores/settings-store';
import type { HomeAssistantResourceResolver } from '../resources/resource-resolver';
import type { ResolvedMediaResource } from '../resources/resource-types';

export interface CameraPlaybackPlan {
  primary: ResolvedMediaResource;
  fallbacks: ResolvedMediaResource[];
  refreshPolicy: {
    snapshotRefreshMs?: number;
    retryDelaysMs: number[];
  };
}

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
  'go2rtc',
  'web_rtc',
  'hls',
  'mjpeg',
];

function getFeedOrder(preferredTransport: CameraPlaybackPlanInput['preferredTransport']) {
  if (preferredTransport === 'auto') {
    return AUTO_LIVE_FEED_ORDER;
  }

  return [
    preferredTransport,
    ...AUTO_LIVE_FEED_ORDER.filter((kind) => kind !== preferredTransport),
  ];
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
      ? await this.resolver.resolve(
          {
            kind: 'camera_snapshot',
            entityId: input.entityId,
            rawPath: input.snapshotUrl,
          },
          { cacheBustKey: input.snapshotUrl }
        )
      : ({
          id: `${input.entityId}:snapshot`,
          kind: 'unavailable',
          cacheKey: `${input.entityId}:snapshot`,
          authStrategy: 'none',
        } satisfies ResolvedMediaResource);

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

    const resources: ResolvedMediaResource[] = [];

    for (const feedKind of getFeedOrder(input.preferredTransport)) {
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
        if (!input.frontendStreamTypes.includes('hls')) {
          continue;
        }

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
