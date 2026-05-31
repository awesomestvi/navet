import type { ProviderCameraFeatureService } from '@navet/core/provider-feature-services';
import {
  addHomeAssistantCameraWebRtcCandidate,
  callHomeAssistantService,
  disableHomeAssistantCameraMotionDetection,
  enableHomeAssistantCameraMotionDetection,
  getHomeAssistantCameraCapabilities,
  getHomeAssistantCameraStreamUrl,
  getHomeAssistantWebRtcClientConfiguration,
  subscribeHomeAssistantCameraWebRtcOffer,
} from './homeassistant-service-bridge';

export const homeAssistantCameraFeatureService: ProviderCameraFeatureService = {
  getCameraCapabilities: async (entityId) => {
    const capabilities = await getHomeAssistantCameraCapabilities(entityId);
    return {
      streamTypes: (capabilities.frontend_stream_types ?? []) as Array<'hls' | 'web_rtc'>,
    };
  },
  getCameraStreamUrl: async (entityId, format) => {
    const stream = await getHomeAssistantCameraStreamUrl(entityId, format ?? 'hls');
    return { url: stream.url };
  },
  getWebRtcClientConfiguration: (entityId) =>
    getHomeAssistantWebRtcClientConfiguration(entityId) as Promise<{
      configuration: RTCConfiguration;
      dataChannel?: string;
    }>,
  subscribeCameraWebRtcOffer: (entityId, offer, callback) =>
    subscribeHomeAssistantCameraWebRtcOffer(entityId, offer, (event) => {
      if ('answer' in event && typeof event.answer === 'string') {
        callback({ type: 'answer', answer: event.answer });
      } else if ('session_id' in event && typeof event.session_id === 'string') {
        callback({ type: 'session', session_id: event.session_id });
      }
    }),
  addCameraWebRtcCandidate: (entityId, sessionId, candidate) =>
    addHomeAssistantCameraWebRtcCandidate(entityId, sessionId, candidate),
  toggleCameraAccessory: (entityId, state) =>
    callHomeAssistantService(
      'switch',
      state === 'on' ? 'turn_on' : 'turn_off',
      {},
      {
        entity_id: entityId,
      }
    ),
  selectCameraAccessoryOption: (entityId, option) =>
    callHomeAssistantService('select', 'select_option', { option }, { entity_id: entityId }),
  setCameraAccessoryValue: (entityId, value) =>
    callHomeAssistantService('number', 'set_value', { value }, { entity_id: entityId }),
  enableCameraMotionDetection: (entityId) => enableHomeAssistantCameraMotionDetection(entityId),
  disableCameraMotionDetection: (entityId) => disableHomeAssistantCameraMotionDetection(entityId),
};
