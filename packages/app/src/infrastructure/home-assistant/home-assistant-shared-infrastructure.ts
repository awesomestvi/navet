import { fromProviderSessionInput } from '@navet/app/auth/types';
import {
  getCurrentIntegrationSession,
  getCurrentIntegrationSignedPath,
} from '@navet/app/services/integration-runtime.service';
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
