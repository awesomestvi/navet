import type { PlatformMessageClient } from '@navet/app/platform/provider-feature-models';
import { integrationMediaFeatureService } from '@navet/app/services/integration-media-feature.service';

export async function fetchMediaThumbnailDataUrl(
  entityId: string,
  messageClient?: PlatformMessageClient | null
) {
  return await integrationMediaFeatureService.fetchMediaThumbnailDataUrl(entityId, messageClient);
}
