import type { ProviderCameraFeatureService } from '@/app/platform/provider-feature-services';
import {
  getNativeIntegrationEntityId,
  resolveIntegrationProviderId,
} from './integration-provider-context.service';
import { getIntegrationProviderCameraFeatureService } from './integration-registry.service';

function resolveCameraProviderId(entityId: string) {
  return resolveIntegrationProviderId(entityId);
}

export const integrationCameraFeatureService: ProviderCameraFeatureService = {
  getCameraCapabilities: async (entityId) =>
    await getIntegrationProviderCameraFeatureService(
      resolveCameraProviderId(entityId)
    ).getCameraCapabilities(getNativeIntegrationEntityId(entityId)),
  getCameraStreamUrl: async (entityId, format) =>
    await getIntegrationProviderCameraFeatureService(
      resolveCameraProviderId(entityId)
    ).getCameraStreamUrl(getNativeIntegrationEntityId(entityId), format),
  getWebRtcClientConfiguration: async (entityId) =>
    await getIntegrationProviderCameraFeatureService(
      resolveCameraProviderId(entityId)
    ).getWebRtcClientConfiguration(getNativeIntegrationEntityId(entityId)),
  subscribeCameraWebRtcOffer: async (entityId, offer, callback) =>
    await getIntegrationProviderCameraFeatureService(
      resolveCameraProviderId(entityId)
    ).subscribeCameraWebRtcOffer(getNativeIntegrationEntityId(entityId), offer, callback),
  addCameraWebRtcCandidate: async (entityId, sessionId, candidate) =>
    await getIntegrationProviderCameraFeatureService(
      resolveCameraProviderId(entityId)
    ).addCameraWebRtcCandidate(getNativeIntegrationEntityId(entityId), sessionId, candidate),
  toggleCameraAccessory: async (entityId, state) =>
    await getIntegrationProviderCameraFeatureService(
      resolveCameraProviderId(entityId)
    ).toggleCameraAccessory(getNativeIntegrationEntityId(entityId), state),
  selectCameraAccessoryOption: async (entityId, option) =>
    await getIntegrationProviderCameraFeatureService(
      resolveCameraProviderId(entityId)
    ).selectCameraAccessoryOption(getNativeIntegrationEntityId(entityId), option),
  setCameraAccessoryValue: async (entityId, value) =>
    await getIntegrationProviderCameraFeatureService(
      resolveCameraProviderId(entityId)
    ).setCameraAccessoryValue(getNativeIntegrationEntityId(entityId), value),
  enableCameraMotionDetection: async (entityId) =>
    await getIntegrationProviderCameraFeatureService(
      resolveCameraProviderId(entityId)
    ).enableCameraMotionDetection(getNativeIntegrationEntityId(entityId)),
  disableCameraMotionDetection: async (entityId) =>
    await getIntegrationProviderCameraFeatureService(
      resolveCameraProviderId(entityId)
    ).disableCameraMotionDetection(getNativeIntegrationEntityId(entityId)),
};
