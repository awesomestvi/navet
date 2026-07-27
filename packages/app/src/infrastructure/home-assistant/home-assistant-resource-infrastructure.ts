import { integrationSessionRuntime } from '@navet/app/auth/integration-session-runtime';
import { fromProviderSessionInput } from '@navet/app/auth/types';
import { homeAssistantService } from '@navet/app/services/home-assistant.service';
import { HomeAssistantResourceResolver } from './resources/resource-resolver';
import { HomeAssistantHttpGateway } from './transport/http-gateway';

function getHomeAssistantSession() {
  return fromProviderSessionInput(integrationSessionRuntime.getSnapshot().sessions.home_assistant);
}

export const homeAssistantResourceResolver = new HomeAssistantResourceResolver(
  getHomeAssistantSession,
  async (path, expiresSeconds) => (await homeAssistantService.signPath(path, expiresSeconds)).path
);

export const homeAssistantHttpGateway = new HomeAssistantHttpGateway(getHomeAssistantSession);
