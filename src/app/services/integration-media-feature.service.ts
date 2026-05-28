import { authSessionManager } from '@/app/infrastructure/home-assistant/auth/auth-session-manager';
import type { ProviderMediaFeatureService } from '@/app/platform/provider-feature-services';
import { parseProviderScopedId } from '@/app/utils/provider-ids';
import { getIntegrationProviderMediaFeatureService } from './integration-registry.service';

function resolveMediaProviderId(entityId: string) {
  return parseProviderScopedId(entityId)?.providerId ?? authSessionManager.getSnapshot().providerId;
}

function getNativeEntityId(entityId: string) {
  return parseProviderScopedId(entityId)?.nativeId ?? entityId;
}

export const integrationMediaFeatureService: ProviderMediaFeatureService = {
  playMedia: async (entityId, media) =>
    await getIntegrationProviderMediaFeatureService(resolveMediaProviderId(entityId)).playMedia(
      getNativeEntityId(entityId),
      media
    ),
  browseMediaPlayer: async (entityId, media) =>
    await getIntegrationProviderMediaFeatureService(
      resolveMediaProviderId(entityId)
    ).browseMediaPlayer(getNativeEntityId(entityId), media),
  searchMediaPlayer: async (entityId, query, media) =>
    await getIntegrationProviderMediaFeatureService(
      resolveMediaProviderId(entityId)
    ).searchMediaPlayer(getNativeEntityId(entityId), query, media),
  selectMediaPlayerSource: async (entityId, source) =>
    await getIntegrationProviderMediaFeatureService(
      resolveMediaProviderId(entityId)
    ).selectMediaPlayerSource(getNativeEntityId(entityId), source),
  selectMediaPlayerSoundMode: async (entityId, soundMode) =>
    await getIntegrationProviderMediaFeatureService(
      resolveMediaProviderId(entityId)
    ).selectMediaPlayerSoundMode(getNativeEntityId(entityId), soundMode),
  seekMediaPlayer: async (entityId, seekPosition) =>
    await getIntegrationProviderMediaFeatureService(
      resolveMediaProviderId(entityId)
    ).seekMediaPlayer(getNativeEntityId(entityId), seekPosition),
  clearMediaPlayerPlaylist: async (entityId) =>
    await getIntegrationProviderMediaFeatureService(
      resolveMediaProviderId(entityId)
    ).clearMediaPlayerPlaylist(getNativeEntityId(entityId)),
  updateMediaPlayerPower: async (entityId, state) =>
    await getIntegrationProviderMediaFeatureService(
      resolveMediaProviderId(entityId)
    ).updateMediaPlayerPower(getNativeEntityId(entityId), state),
  sendRemoteCommand: async (entityId, command) =>
    await getIntegrationProviderMediaFeatureService(
      resolveMediaProviderId(entityId)
    ).sendRemoteCommand(getNativeEntityId(entityId), command),
  browseMediaSource: async (mediaContentId) =>
    await getIntegrationProviderMediaFeatureService(
      authSessionManager.getSnapshot().providerId
    ).browseMediaSource(mediaContentId),
  resolveMediaSource: async (mediaContentId) =>
    await getIntegrationProviderMediaFeatureService(
      authSessionManager.getSnapshot().providerId
    ).resolveMediaSource(mediaContentId),
  fetchMediaThumbnailDataUrl: async (entityId, messageClient) =>
    await getIntegrationProviderMediaFeatureService(
      resolveMediaProviderId(entityId)
    ).fetchMediaThumbnailDataUrl(getNativeEntityId(entityId), messageClient),
};
