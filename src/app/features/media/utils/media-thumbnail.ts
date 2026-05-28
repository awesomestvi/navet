import type { Connection } from 'home-assistant-js-websocket';
import { integrationMediaFeatureService } from '@/app/services/integration-media-feature.service';

export async function fetchMediaThumbnailDataUrl(entityId: string, connection?: Connection | null) {
  return await integrationMediaFeatureService.fetchMediaThumbnailDataUrl(entityId, connection);
}
