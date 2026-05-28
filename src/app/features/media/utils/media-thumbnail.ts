import type { PlatformMessageClient } from '@/app/platform/provider-feature-models';
import { integrationMediaFeatureService } from '@/app/services/integration-media-feature.service';

export async function fetchMediaThumbnailDataUrl(
  entityId: string,
  messageClient?: PlatformMessageClient | null
) {
  return await integrationMediaFeatureService.fetchMediaThumbnailDataUrl(entityId, messageClient);
}
