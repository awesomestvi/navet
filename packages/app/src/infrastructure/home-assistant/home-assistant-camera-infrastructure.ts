import { integrationCameraFeatureService } from '@navet/app/services/integration-camera-feature.service';
import { homeAssistantResourceResolver } from './home-assistant-shared-infrastructure';
import { CameraMediaService } from './media/camera-media-service';

export const cameraMediaService = new CameraMediaService(
  homeAssistantResourceResolver,
  (entityId) => integrationCameraFeatureService.getCameraCapabilities(entityId),
  (entityId, format) => integrationCameraFeatureService.getCameraStreamUrl(entityId, format),
  (entityId) =>
    integrationCameraFeatureService.getCameraStreamPaths?.(entityId) ?? Promise.resolve({})
);
