import type { Connection } from 'home-assistant-js-websocket';
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

let mediaThumbnailCommandSupported: boolean | null = null;

export async function fetchMediaThumbnailDataUrl(entityId: string, connection?: Connection | null) {
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

  const payload = response && 'result' in response && response.result ? response.result : response;

  if (!payload?.content || !payload?.content_type) {
    return null;
  }

  return `data:${payload.content_type};base64,${payload.content}`;
}
