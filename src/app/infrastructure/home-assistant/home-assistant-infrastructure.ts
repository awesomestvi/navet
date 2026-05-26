import { authSessionManager } from './auth/auth-session-manager';
import { CameraMediaService } from './media/camera-media-service';
import { MediaArtworkService } from './media/media-artwork-service';
import { HomeAssistantResourceResolver } from './resources/resource-resolver';
import { HomeAssistantHttpGateway } from './transport/http-gateway';

export const homeAssistantResourceResolver = new HomeAssistantResourceResolver(() =>
  authSessionManager.getSession()
);

export const homeAssistantHttpGateway = new HomeAssistantHttpGateway(() =>
  authSessionManager.getSession()
);

export const mediaArtworkService = new MediaArtworkService(
  homeAssistantResourceResolver,
  homeAssistantHttpGateway
);

export const cameraMediaService = new CameraMediaService(homeAssistantResourceResolver);
