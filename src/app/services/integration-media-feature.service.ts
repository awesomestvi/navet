import type {
  PlatformMediaBrowseResult,
  PlatformMediaItem,
} from '@/app/platform/provider-feature-models';
import type { ProviderMediaFeatureService } from '@/app/platform/provider-feature-services';
import { homeAssistantService } from '@/app/services/home-assistant.service';

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

export const integrationMediaFeatureService: ProviderMediaFeatureService = {
  playMedia: (entityId, media) => homeAssistantService.playMedia(entityId, media),
  browseMediaPlayer: async (entityId, media) =>
    mapMediaBrowseResult(await homeAssistantService.browseMediaPlayer(entityId, media)),
  searchMediaPlayer: (entityId, query, media) =>
    homeAssistantService
      .searchMediaPlayer(entityId, query, media)
      .then((result) => mapMediaBrowseResult(result)),
  selectMediaPlayerSource: (entityId, source) =>
    homeAssistantService.selectMediaPlayerSource(entityId, source),
  selectMediaPlayerSoundMode: (entityId, soundMode) =>
    homeAssistantService.selectMediaPlayerSoundMode(entityId, soundMode),
  seekMediaPlayer: (entityId, seekPosition) =>
    homeAssistantService.seekMediaPlayer(entityId, seekPosition),
  clearMediaPlayerPlaylist: (entityId) => homeAssistantService.clearMediaPlayerPlaylist(entityId),
  browseMediaSource: async (mediaContentId) =>
    mapMediaBrowseResult(await homeAssistantService.browseMediaSource(mediaContentId)),
  resolveMediaSource: async (mediaContentId) => {
    const resolved = await homeAssistantService.resolveMediaSource(mediaContentId);
    return {
      url: resolved.url,
      mimeType: resolved.mime_type,
    };
  },
  fetchMediaThumbnailDataUrl: async (entityId, connection) => {
    if (mediaThumbnailCommandSupported === false) {
      return null;
    }

    const activeConnection = connection ?? homeAssistantService.getConnection();
    if (!activeConnection) {
      return null;
    }

    let response: MediaThumbnailEnvelope;

    try {
      response = (await activeConnection.sendMessagePromise({
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
