import {
  getCurrentHomeAssistantPanelHass,
  getHomeAssistantCameraPlaybackPlan,
  resolveHomeAssistantCameraStreamResource,
} from '@navet/provider-homeassistant/homeassistant-camera-runtime';
import type {
  CameraPlaybackPlan,
  PlatformCameraStreamType,
} from '@/app/platform/provider-feature-models';
import type { ResolvedPlatformResource } from '@/app/platform/resources';
import type { CameraFeedMode } from '@/app/stores/settings-store';

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

export async function getCameraPlaybackPlan(
  request: CameraPlaybackPlanRequest
): Promise<CameraPlaybackPlan> {
  return await getHomeAssistantCameraPlaybackPlan(request);
}

export async function resolveCameraStreamResource(
  entityId: string,
  stream: 'hls' | 'web_rtc' | 'mjpeg',
  rawPath?: string
): Promise<ResolvedPlatformResource> {
  return await resolveHomeAssistantCameraStreamResource(entityId, stream, rawPath);
}

export function getCurrentCameraPanelHass() {
  return getCurrentHomeAssistantPanelHass();
}
