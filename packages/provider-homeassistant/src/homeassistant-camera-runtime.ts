import type { ResolvedPlatformResource } from '@navet/core/provider-contract';
import type {
  CameraPlaybackPlan,
  PlatformCameraStreamType,
} from '@navet/core/provider-feature-models';
import {
  getHomeAssistantCameraPlaybackPlan as getConfiguredHomeAssistantCameraPlaybackPlan,
  getHomeAssistantPanelHass,
  resolveHomeAssistantCameraStreamResource as resolveConfiguredHomeAssistantCameraStreamResource,
} from './homeassistant-service-bridge';

type CameraFeedMode = 'auto' | 'go2rtc' | 'web_rtc' | 'hls' | 'mjpeg';

interface CameraPlaybackPlanRequest {
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

export async function getHomeAssistantCameraPlaybackPlan(
  request: CameraPlaybackPlanRequest
): Promise<CameraPlaybackPlan> {
  return (await getConfiguredHomeAssistantCameraPlaybackPlan(request)) as CameraPlaybackPlan;
}

export async function resolveHomeAssistantCameraStreamResource(
  entityId: string,
  stream: 'hls' | 'web_rtc' | 'mjpeg',
  rawPath?: string
): Promise<ResolvedPlatformResource> {
  return await resolveConfiguredHomeAssistantCameraStreamResource(entityId, stream, rawPath);
}

export function getCurrentHomeAssistantPanelHass() {
  return getHomeAssistantPanelHass();
}
