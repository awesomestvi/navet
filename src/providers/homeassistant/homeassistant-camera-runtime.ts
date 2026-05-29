import {
  cameraMediaService,
  homeAssistantResourceResolver,
} from '@/app/infrastructure/home-assistant/home-assistant-infrastructure';
import type {
  CameraPlaybackPlan,
  PlatformCameraStreamType,
} from '@/app/platform/provider-feature-models';
import type { ResolvedPlatformResource } from '@/app/platform/resources';
import type { CameraFeedMode } from '@/app/stores/settings-store';
import { getHomeAssistantPanelHass } from './homeassistant-service-bridge';

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
  return await cameraMediaService.getPlaybackPlan(request);
}

export async function resolveHomeAssistantCameraStreamResource(
  entityId: string,
  stream: 'hls' | 'web_rtc' | 'mjpeg',
  rawPath?: string
): Promise<ResolvedPlatformResource> {
  return await homeAssistantResourceResolver.resolve({
    kind: 'camera_stream',
    entityId,
    stream,
    rawPath,
  });
}

export function getCurrentHomeAssistantPanelHass() {
  return getHomeAssistantPanelHass();
}
