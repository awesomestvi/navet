import type {
  PlatformConversationEvent,
  PlatformConversationPipelineCollection,
  PlatformConversationRunHandle,
  PlatformConversationTextRequest,
  PlatformConversationVoiceRequest,
} from '@navet/app/platform/provider-feature-models';
import { getProviderRuntimeRegistration } from '@navet/app/provider-runtime-registry';
import type { IntegrationProviderId } from '../types/provider';

function getConversationFeatureService(providerId: IntegrationProviderId) {
  const service = getProviderRuntimeRegistration(providerId).conversationFeatureService;
  if (!service) {
    throw new Error('Assist is not available for this integration');
  }
  return service;
}

export function getIntegrationConversationPipelines(
  providerId: IntegrationProviderId
): Promise<PlatformConversationPipelineCollection> {
  return getConversationFeatureService(providerId).getPipelines();
}

export function startIntegrationTextConversation(
  providerId: IntegrationProviderId,
  request: PlatformConversationTextRequest,
  listener: (event: PlatformConversationEvent) => void
): Promise<PlatformConversationRunHandle> {
  return getConversationFeatureService(providerId).startTextConversation(request, listener);
}

export function startIntegrationVoiceConversation(
  providerId: IntegrationProviderId,
  request: PlatformConversationVoiceRequest,
  listener: (event: PlatformConversationEvent) => void
): Promise<PlatformConversationRunHandle> {
  return getConversationFeatureService(providerId).startVoiceConversation(request, listener);
}
