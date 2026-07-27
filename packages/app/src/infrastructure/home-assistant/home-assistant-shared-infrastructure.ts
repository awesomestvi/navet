import {
  homeAssistantHttpGateway,
  homeAssistantResourceResolver,
} from './home-assistant-resource-infrastructure';
import { MediaArtworkService } from './media/media-artwork-service';

export const mediaArtworkService = new MediaArtworkService(
  homeAssistantResourceResolver,
  homeAssistantHttpGateway
);

export { homeAssistantHttpGateway, homeAssistantResourceResolver };
