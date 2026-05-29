import type { ProviderCameraFeatureService } from '@/app/platform/provider-feature-services';
import { homeAssistantService } from '@/app/services/home-assistant.service';

export const homeAssistantCameraFeatureService: ProviderCameraFeatureService = {
  getCameraCapabilities: async (entityId) => {
    const capabilities = await homeAssistantService.getCameraCapabilities(entityId);
    return {
      streamTypes: capabilities.frontend_stream_types ?? [],
    };
  },
  getCameraStreamUrl: async (entityId, format) => {
    const stream = await homeAssistantService.getCameraStreamUrl(entityId, format);
    return { url: stream.url };
  },
  getWebRtcClientConfiguration: (entityId) =>
    homeAssistantService.getWebRtcClientConfiguration(entityId),
  subscribeCameraWebRtcOffer: (entityId, offer, callback) =>
    homeAssistantService.subscribeCameraWebRtcOffer(entityId, offer, callback),
  addCameraWebRtcCandidate: (entityId, sessionId, candidate) =>
    homeAssistantService.addCameraWebRtcCandidate(entityId, sessionId, candidate),
  toggleCameraAccessory: (entityId, state) =>
    homeAssistantService.callService(
      'switch',
      state === 'on' ? 'turn_on' : 'turn_off',
      {},
      {
        entity_id: entityId,
      }
    ),
  selectCameraAccessoryOption: (entityId, option) =>
    homeAssistantService.callService(
      'select',
      'select_option',
      { option },
      { entity_id: entityId }
    ),
  setCameraAccessoryValue: (entityId, value) =>
    homeAssistantService.callService('number', 'set_value', { value }, { entity_id: entityId }),
  enableCameraMotionDetection: (entityId) =>
    homeAssistantService.enableCameraMotionDetection(entityId),
  disableCameraMotionDetection: (entityId) =>
    homeAssistantService.disableCameraMotionDetection(entityId),
};
