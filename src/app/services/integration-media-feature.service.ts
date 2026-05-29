import type { ProviderMediaFeatureService } from '@/app/platform/provider-feature-services';
import {
  getCurrentIntegrationProviderIdFromStore,
  getNativeIntegrationEntityId,
  resolveIntegrationProviderId,
} from './integration-provider-context.service';
import { getIntegrationProviderMediaFeatureService } from './integration-registry.service';

function resolveMediaProviderId(entityId: string) {
  return resolveIntegrationProviderId(entityId);
}

export const integrationMediaFeatureService: ProviderMediaFeatureService = {
  playMedia: async (entityId, media) =>
    await getIntegrationProviderMediaFeatureService(resolveMediaProviderId(entityId)).playMedia(
      getNativeIntegrationEntityId(entityId),
      media
    ),
  browseMediaPlayer: async (entityId, media) =>
    await getIntegrationProviderMediaFeatureService(
      resolveMediaProviderId(entityId)
    ).browseMediaPlayer(getNativeIntegrationEntityId(entityId), media),
  searchMediaPlayer: async (entityId, query, media) =>
    await getIntegrationProviderMediaFeatureService(
      resolveMediaProviderId(entityId)
    ).searchMediaPlayer(getNativeIntegrationEntityId(entityId), query, media),
  selectMediaPlayerSource: async (entityId, source) =>
    await getIntegrationProviderMediaFeatureService(
      resolveMediaProviderId(entityId)
    ).selectMediaPlayerSource(getNativeIntegrationEntityId(entityId), source),
  selectMediaPlayerSoundMode: async (entityId, soundMode) =>
    await getIntegrationProviderMediaFeatureService(
      resolveMediaProviderId(entityId)
    ).selectMediaPlayerSoundMode(getNativeIntegrationEntityId(entityId), soundMode),
  seekMediaPlayer: async (entityId, seekPosition) =>
    await getIntegrationProviderMediaFeatureService(
      resolveMediaProviderId(entityId)
    ).seekMediaPlayer(getNativeIntegrationEntityId(entityId), seekPosition),
  clearMediaPlayerPlaylist: async (entityId) =>
    await getIntegrationProviderMediaFeatureService(
      resolveMediaProviderId(entityId)
    ).clearMediaPlayerPlaylist(getNativeIntegrationEntityId(entityId)),
  updateMediaPlayerPower: async (entityId, state) =>
    await getIntegrationProviderMediaFeatureService(
      resolveMediaProviderId(entityId)
    ).updateMediaPlayerPower(getNativeIntegrationEntityId(entityId), state),
  sendRemoteCommand: async (entityId, command) =>
    await getIntegrationProviderMediaFeatureService(
      resolveMediaProviderId(entityId)
    ).sendRemoteCommand(getNativeIntegrationEntityId(entityId), command),
  browseMediaSource: async (mediaContentId) =>
    await getIntegrationProviderMediaFeatureService(
      getCurrentIntegrationProviderIdFromStore()
    ).browseMediaSource(mediaContentId),
  resolveMediaSource: async (mediaContentId) =>
    await getIntegrationProviderMediaFeatureService(
      getCurrentIntegrationProviderIdFromStore()
    ).resolveMediaSource(mediaContentId),
  fetchMediaThumbnailDataUrl: async (entityId, messageClient) =>
    await getIntegrationProviderMediaFeatureService(
      resolveMediaProviderId(entityId)
    ).fetchMediaThumbnailDataUrl(getNativeIntegrationEntityId(entityId), messageClient),
};
