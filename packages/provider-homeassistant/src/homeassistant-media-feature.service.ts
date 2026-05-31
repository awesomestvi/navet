import type {
  PlatformMediaBrowseResult,
  PlatformMediaItem,
  PlatformMessageClient,
} from '@navet/core/provider-feature-models';
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

interface MediaBrowseNode {
  title?: string;
  media_class?: string;
  media_content_id?: string;
  media_content_type?: string;
  children?: MediaBrowseNode[];
  can_expand?: boolean;
  can_play?: boolean;
  thumbnail?: string | null;
}

let mediaThumbnailCommandSupported: boolean | null = null;

function mapMediaItem(item: MediaBrowseNode): PlatformMediaItem {
  return {
    title: item.title ?? '',
    mediaClass: item.media_class,
    mediaContentId: item.media_content_id,
    mediaContentType: item.media_content_type,
    children: item.children?.map(mapMediaItem),
    canExpand: item.can_expand,
    canPlay: item.can_play,
    thumbnail: item.thumbnail ?? null,
  };
}

function mapMediaBrowseResult(result: MediaBrowseNode): PlatformMediaBrowseResult {
  return mapMediaItem(result);
}

export const homeAssistantMediaFeatureService: ProviderMediaFeatureService = {
  playMedia: (entityId, media) => playHomeAssistantMedia(entityId, media),
  browseMediaPlayer: async (entityId, media) =>
    mapMediaBrowseResult(await browseHomeAssistantMediaPlayer(entityId, media)),
  searchMediaPlayer: (entityId, query, media) =>
    searchHomeAssistantMediaPlayer(entityId, query, media).then((result) =>
      mapMediaBrowseResult(result)
    ),
  selectMediaPlayerSource: (entityId, source) =>
    selectHomeAssistantMediaPlayerSource(entityId, source),
  selectMediaPlayerSoundMode: (entityId, soundMode) =>
    selectHomeAssistantMediaPlayerSoundMode(entityId, soundMode),
  seekMediaPlayer: (entityId, seekPosition) => seekHomeAssistantMediaPlayer(entityId, seekPosition),
  clearMediaPlayerPlaylist: (entityId) => clearHomeAssistantMediaPlayerPlaylist(entityId),
  updateMediaPlayerPower: (entityId, state) => updateHomeAssistantMediaPlayerPower(entityId, state),
  sendRemoteCommand: (entityId, command) => sendHomeAssistantRemoteCommand(entityId, command),
  browseMediaSource: async (mediaContentId) =>
    mapMediaBrowseResult(await browseHomeAssistantMediaSource(mediaContentId)),
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
