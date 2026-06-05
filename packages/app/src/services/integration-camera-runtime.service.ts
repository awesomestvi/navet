import type {
  PlatformCameraPlaybackModel,
  PlatformCameraTransport,
} from '@navet/app/platform/provider-feature-models';
import type { ResolvedPlatformResource } from '@navet/app/platform/resources';
import {
  getCurrentHomeAssistantPanelHass,
  getHomeAssistantCameraPlaybackPlan,
  resolveHomeAssistantCameraStreamResource,
} from '@navet/provider-homeassistant/homeassistant-camera-runtime';

interface CameraPlaybackPlanRequest {
  entityId: string;
  cameraState: 'unavailable' | 'off' | 'idle' | 'streaming' | 'recording';
  preferredMode: 'auto' | 'live' | 'snapshot';
  preferredTransport: 'auto' | PlatformCameraTransport;
  snapshotUrl?: string;
  isStreamCapable: boolean;
  motionDetectionEnabled: boolean | null;
  failedTransports?: ReadonlySet<PlatformCameraTransport>;
}

export async function getCameraPlaybackPlan(
  request: CameraPlaybackPlanRequest
): Promise<PlatformCameraPlaybackModel> {
  return await getHomeAssistantCameraPlaybackPlan(request);
}

export async function resolveCameraStreamResource(
  entityId: string,
  stream: 'hls' | 'web_rtc',
  rawPath?: string
): Promise<ResolvedPlatformResource> {
  return await resolveHomeAssistantCameraStreamResource(entityId, stream, rawPath);
}

export function getCurrentCameraPanelHass() {
  return getCurrentHomeAssistantPanelHass();
}
