import { getProviderNativeId } from '@navet/core/ids';
import type { PlatformCameraStreamType } from '@navet/core/provider-feature-models';
import type { ProviderCameraFeatureService } from '@navet/core/provider-feature-services';
import {
  addHomeAssistantCameraWebRtcCandidate,
  callHomeAssistantService,
  disableHomeAssistantCameraMotionDetection,
  enableHomeAssistantCameraMotionDetection,
  getHomeAssistantCameraCapabilities,
  getHomeAssistantCameraStreamPaths,
  getHomeAssistantCameraStreamUrl,
  getHomeAssistantWebRtcClientConfiguration,
  subscribeHomeAssistantCameraWebRtcOffer,
} from './homeassistant-service-bridge';

function toHomeAssistantCameraEntityId(entityId: string) {
  return getProviderNativeId(entityId);
}

function isDirectStreamFormat(
  format: PlatformCameraStreamType | undefined
): format is Extract<PlatformCameraStreamType, 'hls' | 'web_rtc'> {
  return format === 'hls' || format === 'web_rtc' || format === undefined;
}

export const homeAssistantCameraFeatureService: ProviderCameraFeatureService = {
  getCameraCapabilities: async (entityId) => {
    const nativeEntityId = toHomeAssistantCameraEntityId(entityId);
    const capabilities = await getHomeAssistantCameraCapabilities(nativeEntityId);
    const streamPaths: Partial<Record<PlatformCameraStreamType, string>> =
      await getHomeAssistantCameraStreamPaths(nativeEntityId).catch(
        () => ({}) as Partial<Record<PlatformCameraStreamType, string>>
      );
    const streamTypes = [
      ...((capabilities.frontend_stream_types ?? []) as Array<'hls' | 'web_rtc'>),
      ...(streamPaths.mjpeg ? (['mjpeg'] as const) : []),
    ];
    return {
      streamTypes,
    };
  },
  refreshCameraSnapshot: async (entityId) => {
    await callHomeAssistantService(
      'homeassistant',
      'update_entity',
      {},
      {
        entityId: toHomeAssistantCameraEntityId(entityId),
      }
    );
  },
  getCameraStreamUrl: async (entityId, format) => {
    if (!isDirectStreamFormat(format)) {
      throw new Error(`Home Assistant does not expose a direct ${format} stream URL`);
    }

    const stream = await getHomeAssistantCameraStreamUrl(
      toHomeAssistantCameraEntityId(entityId),
      format ?? 'hls'
    );
    return { url: stream.url };
  },
  getCameraStreamPaths: async (entityId) => {
    const nativeEntityId = toHomeAssistantCameraEntityId(entityId);
    const paths: Partial<Record<PlatformCameraStreamType, string>> =
      await getHomeAssistantCameraStreamPaths(nativeEntityId).catch(
        () => ({}) as Partial<Record<PlatformCameraStreamType, string>>
      );
    return {
      ...(paths.hls ? { hls: paths.hls } : {}),
      mjpeg: paths.mjpeg ?? `/api/camera_proxy_stream/${nativeEntityId}`,
    };
  },
  getWebRtcClientConfiguration: (entityId) =>
    getHomeAssistantWebRtcClientConfiguration(toHomeAssistantCameraEntityId(entityId)) as Promise<{
      configuration: RTCConfiguration;
      dataChannel?: string;
    }>,
  subscribeCameraWebRtcOffer: (entityId, offer, callback) =>
    subscribeHomeAssistantCameraWebRtcOffer(
      toHomeAssistantCameraEntityId(entityId),
      offer,
      (event) => {
        if ('answer' in event && typeof event.answer === 'string') {
          callback({ type: 'answer', answer: event.answer });
        } else if ('session_id' in event && typeof event.session_id === 'string') {
          callback({ type: 'session', session_id: event.session_id });
        } else if ('candidate' in event && typeof event.candidate === 'object' && event.candidate) {
          callback({ type: 'candidate', candidate: event.candidate });
        } else if (
          'code' in event &&
          typeof event.code === 'string' &&
          'message' in event &&
          typeof event.message === 'string'
        ) {
          callback({ type: 'error', code: event.code, message: event.message });
        }
      }
    ),
  addCameraWebRtcCandidate: (entityId, sessionId, candidate) =>
    addHomeAssistantCameraWebRtcCandidate(
      toHomeAssistantCameraEntityId(entityId),
      sessionId,
      candidate
    ),
  toggleCameraAccessory: (entityId, state) =>
    callHomeAssistantService(
      'switch',
      state === 'on' ? 'turn_on' : 'turn_off',
      {},
      {
        entityId: toHomeAssistantCameraEntityId(entityId),
      }
    ),
  selectCameraAccessoryOption: (entityId, option) =>
    callHomeAssistantService(
      'select',
      'select_option',
      { option },
      {
        entityId: toHomeAssistantCameraEntityId(entityId),
      }
    ),
  setCameraAccessoryValue: (entityId, value) =>
    callHomeAssistantService(
      'number',
      'set_value',
      { value },
      {
        entityId: toHomeAssistantCameraEntityId(entityId),
      }
    ),
  enableCameraMotionDetection: (entityId) =>
    enableHomeAssistantCameraMotionDetection(toHomeAssistantCameraEntityId(entityId)),
  disableCameraMotionDetection: (entityId) =>
    disableHomeAssistantCameraMotionDetection(toHomeAssistantCameraEntityId(entityId)),
};
