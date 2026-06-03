import { fromProviderSessionInput } from '@navet/app/auth/types';
import { integrationCameraFeatureService } from '@navet/app/services/integration-camera-feature.service';
import {
  getCurrentIntegrationSession,
  getCurrentIntegrationSignedPath,
} from '@navet/app/services/integration-runtime.service';
import { CameraMediaService } from './media/camera-media-service';
import { MediaArtworkService } from './media/media-artwork-service';
import { HomeAssistantResourceResolver } from './resources/resource-resolver';
import { HomeAssistantHttpGateway } from './transport/http-gateway';

export const homeAssistantResourceResolver = new HomeAssistantResourceResolver(
  () => fromProviderSessionInput(getCurrentIntegrationSession()),
  (path, expiresSeconds) => getCurrentIntegrationSignedPath(path, expiresSeconds)
);

export const homeAssistantHttpGateway = new HomeAssistantHttpGateway(() =>
  fromProviderSessionInput(getCurrentIntegrationSession())
);

export const mediaArtworkService = new MediaArtworkService(
  homeAssistantResourceResolver,
  homeAssistantHttpGateway
);

export const cameraMediaService = new CameraMediaService(
  homeAssistantResourceResolver,
  (entityId) => integrationCameraFeatureService.getCameraCapabilities(entityId),
  (entityId, format) => integrationCameraFeatureService.getCameraStreamUrl(entityId, format),
  (entityId) =>
    integrationCameraFeatureService.getCameraStreamPaths?.(entityId) ?? Promise.resolve({})
);
