import type { ProviderCameraFeatureService } from '@/app/platform/provider-feature-services';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { dispatchEntityAction } from '@/app/services/integration-action.service';
import { parseProviderScopedId } from '@/app/utils/provider-ids';

function requireHomeAssistantCameraProvider(entityId: string) {
  const providerId = parseProviderScopedId(entityId)?.providerId ?? 'home_assistant';
  if (providerId !== 'home_assistant') {
    throw new Error(`Camera features are not implemented yet for provider ${providerId}`);
  }
}

export const integrationCameraFeatureService: ProviderCameraFeatureService = {
  getCameraCapabilities: async (entityId) => {
    requireHomeAssistantCameraProvider(entityId);
    const capabilities = await homeAssistantService.getCameraCapabilities(entityId);
    return {
      streamTypes: capabilities.frontend_stream_types ?? [],
    };
  },
  getCameraStreamUrl: async (entityId, format) => {
    requireHomeAssistantCameraProvider(entityId);
    const stream = await homeAssistantService.getCameraStreamUrl(entityId, format);
    return { url: stream.url };
  },
  getWebRtcClientConfiguration: (entityId) => {
    requireHomeAssistantCameraProvider(entityId);
    return homeAssistantService.getWebRtcClientConfiguration(entityId);
  },
  subscribeCameraWebRtcOffer: (entityId, offer, callback) => {
    requireHomeAssistantCameraProvider(entityId);
    return homeAssistantService.subscribeCameraWebRtcOffer(entityId, offer, callback);
  },
  addCameraWebRtcCandidate: (entityId, sessionId, candidate) => {
    requireHomeAssistantCameraProvider(entityId);
    return homeAssistantService.addCameraWebRtcCandidate(entityId, sessionId, candidate);
  },
  toggleCameraAccessory: (entityId, state) =>
    dispatchEntityAction({
      entityId,
      domain: 'switch',
      service: state === 'on' ? 'turn_on' : 'turn_off',
    }),
  selectCameraAccessoryOption: (entityId, option) =>
    dispatchEntityAction({
      entityId,
      domain: 'select',
      service: 'select_option',
      serviceData: { option },
    }),
  setCameraAccessoryValue: (entityId, value) =>
    dispatchEntityAction({
      entityId,
      domain: 'number',
      service: 'set_value',
      serviceData: { value },
    }),
  enableCameraMotionDetection: (entityId) => {
    requireHomeAssistantCameraProvider(entityId);
    return homeAssistantService.enableCameraMotionDetection(entityId);
  },
  disableCameraMotionDetection: (entityId) => {
    requireHomeAssistantCameraProvider(entityId);
    return homeAssistantService.disableCameraMotionDetection(entityId);
  },
};
