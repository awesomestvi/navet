import { authSessionManager } from '@/app/infrastructure/home-assistant/auth/auth-session-manager';
import type { ProviderCameraFeatureService } from '@/app/platform/provider-feature-services';
import { parseProviderScopedId } from '@/app/utils/provider-ids';
import { getIntegrationProviderCameraFeatureService } from './integration-registry.service';

function resolveCameraProviderId(entityId: string) {
  return parseProviderScopedId(entityId)?.providerId ?? authSessionManager.getSnapshot().providerId;
}

function getNativeEntityId(entityId: string) {
  return parseProviderScopedId(entityId)?.nativeId ?? entityId;
}

export const integrationCameraFeatureService: ProviderCameraFeatureService = {
  getCameraCapabilities: async (entityId) =>
    await getIntegrationProviderCameraFeatureService(
      resolveCameraProviderId(entityId)
    ).getCameraCapabilities(getNativeEntityId(entityId)),
  getCameraStreamUrl: async (entityId, format) =>
    await getIntegrationProviderCameraFeatureService(
      resolveCameraProviderId(entityId)
    ).getCameraStreamUrl(getNativeEntityId(entityId), format),
  getWebRtcClientConfiguration: async (entityId) =>
    await getIntegrationProviderCameraFeatureService(
      resolveCameraProviderId(entityId)
    ).getWebRtcClientConfiguration(getNativeEntityId(entityId)),
  subscribeCameraWebRtcOffer: async (entityId, offer, callback) =>
    await getIntegrationProviderCameraFeatureService(
      resolveCameraProviderId(entityId)
    ).subscribeCameraWebRtcOffer(getNativeEntityId(entityId), offer, callback),
  addCameraWebRtcCandidate: async (entityId, sessionId, candidate) =>
    await getIntegrationProviderCameraFeatureService(
      resolveCameraProviderId(entityId)
    ).addCameraWebRtcCandidate(getNativeEntityId(entityId), sessionId, candidate),
  toggleCameraAccessory: async (entityId, state) =>
    await getIntegrationProviderCameraFeatureService(
      resolveCameraProviderId(entityId)
    ).toggleCameraAccessory(getNativeEntityId(entityId), state),
  selectCameraAccessoryOption: async (entityId, option) =>
    await getIntegrationProviderCameraFeatureService(
      resolveCameraProviderId(entityId)
    ).selectCameraAccessoryOption(getNativeEntityId(entityId), option),
  setCameraAccessoryValue: async (entityId, value) =>
    await getIntegrationProviderCameraFeatureService(
      resolveCameraProviderId(entityId)
    ).setCameraAccessoryValue(getNativeEntityId(entityId), value),
  enableCameraMotionDetection: async (entityId) =>
    await getIntegrationProviderCameraFeatureService(
      resolveCameraProviderId(entityId)
    ).enableCameraMotionDetection(getNativeEntityId(entityId)),
  disableCameraMotionDetection: async (entityId) =>
    await getIntegrationProviderCameraFeatureService(
      resolveCameraProviderId(entityId)
    ).disableCameraMotionDetection(getNativeEntityId(entityId)),
};
