import type { ProviderCameraFeatureService } from '@/app/platform/provider-feature-services';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { dispatchEntityAction } from '@/app/services/integration-action.service';

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
  enableCameraMotionDetection: (entityId) =>
    homeAssistantService.enableCameraMotionDetection(entityId),
  disableCameraMotionDetection: (entityId) =>
    homeAssistantService.disableCameraMotionDetection(entityId),
};
