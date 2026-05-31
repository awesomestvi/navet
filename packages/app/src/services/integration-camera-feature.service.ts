import type { ProviderCameraFeatureService } from '@navet/app/platform/provider-feature-services';
import { getProviderRuntimeRegistration } from '@navet/app/provider-runtime-registry';
import {
  getNativeIntegrationEntityId,
  resolveIntegrationProviderId,
} from './integration-provider-context.service';

function resolveCameraProviderId(entityId: string) {
  return resolveIntegrationProviderId(entityId);
}

function getCameraFeatureService(entityId: string) {
  const providerId = resolveCameraProviderId(entityId);
  const service = getProviderRuntimeRegistration(providerId).cameraFeatureService;
  if (!service) {
    throw new Error('Camera streams are not implemented yet for the current integration');
  }
  return service;
}

export const integrationCameraFeatureService: ProviderCameraFeatureService = {
  getCameraCapabilities: async (entityId) =>
    await getCameraFeatureService(entityId).getCameraCapabilities(
      getNativeIntegrationEntityId(entityId)
    ),
  getCameraStreamUrl: async (entityId, format) =>
    await getCameraFeatureService(entityId).getCameraStreamUrl(
      getNativeIntegrationEntityId(entityId),
      format
    ),
  getWebRtcClientConfiguration: async (entityId) =>
    await getCameraFeatureService(entityId).getWebRtcClientConfiguration(
      getNativeIntegrationEntityId(entityId)
    ),
  subscribeCameraWebRtcOffer: async (entityId, offer, callback) =>
    await getCameraFeatureService(entityId).subscribeCameraWebRtcOffer(
      getNativeIntegrationEntityId(entityId),
      offer,
      callback
    ),
  addCameraWebRtcCandidate: async (entityId, sessionId, candidate) =>
    await getCameraFeatureService(entityId).addCameraWebRtcCandidate(
      getNativeIntegrationEntityId(entityId),
      sessionId,
      candidate
    ),
  toggleCameraAccessory: async (entityId, state) =>
    await getCameraFeatureService(entityId).toggleCameraAccessory(
      getNativeIntegrationEntityId(entityId),
      state
    ),
  selectCameraAccessoryOption: async (entityId, option) =>
    await getCameraFeatureService(entityId).selectCameraAccessoryOption(
      getNativeIntegrationEntityId(entityId),
      option
    ),
  setCameraAccessoryValue: async (entityId, value) =>
    await getCameraFeatureService(entityId).setCameraAccessoryValue(
      getNativeIntegrationEntityId(entityId),
      value
    ),
  enableCameraMotionDetection: async (entityId) =>
    await getCameraFeatureService(entityId).enableCameraMotionDetection(
      getNativeIntegrationEntityId(entityId)
    ),
  disableCameraMotionDetection: async (entityId) =>
    await getCameraFeatureService(entityId).disableCameraMotionDetection(
      getNativeIntegrationEntityId(entityId)
    ),
};
