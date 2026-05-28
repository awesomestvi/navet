import {
  getCurrentIntegrationCameraStreamUrl,
  getCurrentIntegrationSession,
  getCurrentIntegrationSignedPath,
} from '@/app/services/integration-runtime.service';
import { CameraMediaService } from './media/camera-media-service';
import { MediaArtworkService } from './media/media-artwork-service';
import { HomeAssistantResourceResolver } from './resources/resource-resolver';
import { HomeAssistantHttpGateway } from './transport/http-gateway';

export const homeAssistantResourceResolver = new HomeAssistantResourceResolver(
  () => getCurrentIntegrationSession(),
  (path, expiresSeconds) => getCurrentIntegrationSignedPath(path, expiresSeconds)
);

export const homeAssistantHttpGateway = new HomeAssistantHttpGateway(() =>
  getCurrentIntegrationSession()
);

export const mediaArtworkService = new MediaArtworkService(
  homeAssistantResourceResolver,
  homeAssistantHttpGateway
);

export const cameraMediaService = new CameraMediaService(
  homeAssistantResourceResolver,
  getCurrentIntegrationCameraStreamUrl
);
