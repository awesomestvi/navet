import type { ResolvedPlatformResource } from '@navet/core/provider-contract';
import type {
  PlatformCameraPlaybackModel,
  PlatformCameraTransport,
} from '@navet/core/provider-feature-models';
import {
  getHomeAssistantCameraPlaybackPlan as getConfiguredHomeAssistantCameraPlaybackPlan,
  getHomeAssistantPanelHass,
  resolveHomeAssistantCameraStreamResource as resolveConfiguredHomeAssistantCameraStreamResource,
} from './homeassistant-service-bridge';

interface CameraPlaybackPlanRequest {
  entityId: string;
  webRtcStreamSource?: 'provider' | 'direct';
  directStreamUrl?: string;
  cameraState: 'unavailable' | 'off' | 'idle' | 'streaming' | 'recording';
  preferredMode: 'auto' | 'live' | 'snapshot';
  preferredTransport: 'auto' | PlatformCameraTransport;
  snapshotUrl?: string;
  isStreamCapable: boolean;
  motionDetectionEnabled: boolean | null;
  failedTransports?: ReadonlySet<PlatformCameraTransport>;
}

export async function getHomeAssistantCameraPlaybackPlan(
  request: CameraPlaybackPlanRequest
): Promise<PlatformCameraPlaybackModel> {
  return (await getConfiguredHomeAssistantCameraPlaybackPlan(
    request
  )) as PlatformCameraPlaybackModel;
}

export async function resolveHomeAssistantCameraStreamResource(
  entityId: string,
  stream: 'hls' | 'web_rtc',
  rawPath?: string
): Promise<ResolvedPlatformResource> {
  return await resolveConfiguredHomeAssistantCameraStreamResource(entityId, stream, rawPath);
}

export function getCurrentHomeAssistantPanelHass() {
  return getHomeAssistantPanelHass();
}
