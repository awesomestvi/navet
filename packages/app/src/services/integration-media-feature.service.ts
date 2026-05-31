import type { ProviderMediaFeatureService } from '@navet/app/platform/provider-feature-services';
import { getProviderRuntimeRegistration } from '@navet/app/provider-runtime-registry';
import {
  getCurrentIntegrationProviderIdFromStore,
  getNativeIntegrationEntityId,
  resolveIntegrationProviderId,
} from './integration-provider-context.service';

function resolveMediaProviderId(entityId: string) {
  return resolveIntegrationProviderId(entityId);
}

function getMediaFeatureService(providerId: ReturnType<typeof resolveMediaProviderId>) {
  const service = getProviderRuntimeRegistration(providerId).mediaFeatureService;
  if (!service) {
    throw new Error('Media controls are not implemented yet for the current integration');
  }
  return service;
}

export const integrationMediaFeatureService: ProviderMediaFeatureService = {
  playMedia: async (entityId, media) =>
    await getMediaFeatureService(resolveMediaProviderId(entityId)).playMedia(
      getNativeIntegrationEntityId(entityId),
      media
    ),
  browseMediaPlayer: async (entityId, media) =>
    await getMediaFeatureService(resolveMediaProviderId(entityId)).browseMediaPlayer(
      getNativeIntegrationEntityId(entityId),
      media
    ),
  searchMediaPlayer: async (entityId, query, media) =>
    await getMediaFeatureService(resolveMediaProviderId(entityId)).searchMediaPlayer(
      getNativeIntegrationEntityId(entityId),
      query,
      media
    ),
  selectMediaPlayerSource: async (entityId, source) =>
    await getMediaFeatureService(resolveMediaProviderId(entityId)).selectMediaPlayerSource(
      getNativeIntegrationEntityId(entityId),
      source
    ),
  selectMediaPlayerSoundMode: async (entityId, soundMode) =>
    await getMediaFeatureService(resolveMediaProviderId(entityId)).selectMediaPlayerSoundMode(
      getNativeIntegrationEntityId(entityId),
      soundMode
    ),
  seekMediaPlayer: async (entityId, seekPosition) =>
    await getMediaFeatureService(resolveMediaProviderId(entityId)).seekMediaPlayer(
      getNativeIntegrationEntityId(entityId),
      seekPosition
    ),
  clearMediaPlayerPlaylist: async (entityId) =>
    await getMediaFeatureService(resolveMediaProviderId(entityId)).clearMediaPlayerPlaylist(
      getNativeIntegrationEntityId(entityId)
    ),
  updateMediaPlayerPower: async (entityId, state) =>
    await getMediaFeatureService(resolveMediaProviderId(entityId)).updateMediaPlayerPower(
      getNativeIntegrationEntityId(entityId),
      state
    ),
  sendRemoteCommand: async (entityId, command) =>
    await getMediaFeatureService(resolveMediaProviderId(entityId)).sendRemoteCommand(
      getNativeIntegrationEntityId(entityId),
      command
    ),
  browseMediaSource: async (mediaContentId) =>
    await getMediaFeatureService(getCurrentIntegrationProviderIdFromStore()).browseMediaSource(
      mediaContentId
    ),
  resolveMediaSource: async (mediaContentId) =>
    await getMediaFeatureService(getCurrentIntegrationProviderIdFromStore()).resolveMediaSource(
      mediaContentId
    ),
  fetchMediaThumbnailDataUrl: async (entityId, messageClient) =>
    await getMediaFeatureService(resolveMediaProviderId(entityId)).fetchMediaThumbnailDataUrl(
      getNativeIntegrationEntityId(entityId),
      messageClient
    ),
};
