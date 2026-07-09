import type { PlatformMessageClient } from '@navet/core/provider-feature-models';
import type { ProviderMediaFeatureService } from '@navet/core/provider-feature-services';
import {
  browseHomeAssistantMediaPlayer,
  browseHomeAssistantMediaSource,
  clearHomeAssistantMediaPlayerPlaylist,
  getHomeAssistantConnection,
  playHomeAssistantMedia,
  resolveHomeAssistantMediaSource,
  searchHomeAssistantMediaPlayer,
  seekHomeAssistantMediaPlayer,
  selectHomeAssistantMediaPlayerSoundMode,
  selectHomeAssistantMediaPlayerSource,
  sendHomeAssistantRemoteCommand,
  updateHomeAssistantMediaPlayerPower,
} from './homeassistant-service-bridge';

interface MediaThumbnailResponse {
  content_type: string;
  content: string;
}

interface MediaThumbnailEnvelope {
  result?: MediaThumbnailResponse;
  content_type?: string;
  content?: string;
}

let mediaThumbnailCommandSupported: boolean | null = null;

export const homeAssistantMediaFeatureService: ProviderMediaFeatureService = {
  playMedia: (entityId, media) => playHomeAssistantMedia(entityId, media),
  browseMediaPlayer: (entityId, media) => browseHomeAssistantMediaPlayer(entityId, media),
  searchMediaPlayer: (entityId, query, media) =>
    searchHomeAssistantMediaPlayer(entityId, query, media),
  selectMediaPlayerSource: (entityId, source) =>
    selectHomeAssistantMediaPlayerSource(entityId, source),
  selectMediaPlayerSoundMode: (entityId, soundMode) =>
    selectHomeAssistantMediaPlayerSoundMode(entityId, soundMode),
  seekMediaPlayer: (entityId, seekPosition) => seekHomeAssistantMediaPlayer(entityId, seekPosition),
  clearMediaPlayerPlaylist: (entityId) => clearHomeAssistantMediaPlayerPlaylist(entityId),
  updateMediaPlayerPower: (entityId, state) => updateHomeAssistantMediaPlayerPower(entityId, state),
  sendRemoteCommand: (entityId, command) => sendHomeAssistantRemoteCommand(entityId, command),
  browseMediaSource: (mediaContentId) => browseHomeAssistantMediaSource(mediaContentId),
  resolveMediaSource: async (mediaContentId) => {
    const resolved = await resolveHomeAssistantMediaSource(mediaContentId);
    return {
      url: resolved.url,
      mimeType: resolved.mime_type,
    };
  },
  fetchMediaThumbnailDataUrl: async (entityId, messageClient) => {
    if (mediaThumbnailCommandSupported === false) {
      return null;
    }

    const activeMessageClient: PlatformMessageClient | null =
      messageClient ?? getHomeAssistantConnection();
    if (!activeMessageClient) {
      return null;
    }

    let response: MediaThumbnailEnvelope;

    try {
      response = (await activeMessageClient.sendMessagePromise({
        type: 'media_player/thumbnail',
        entity_id: entityId,
      })) as MediaThumbnailEnvelope;
      mediaThumbnailCommandSupported = true;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'unknown_command'
      ) {
        mediaThumbnailCommandSupported = false;
        return null;
      }

      throw error;
    }

    const payload =
      response && 'result' in response && response.result ? response.result : response;

    if (!payload?.content || !payload?.content_type) {
      return null;
    }

    return `data:${payload.content_type};base64,${payload.content}`;
  },
};
