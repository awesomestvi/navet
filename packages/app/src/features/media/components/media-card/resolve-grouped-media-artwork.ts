import type { PlatformEntitySnapshotMap } from '@navet/app/platform/provider-feature-models';
import { getProviderNativeId } from '@navet/app/utils/provider-ids';

interface ResolveGroupedMediaArtworkParams {
  entityId: string;
  currentPicture?: string;
  groupMembers: string[];
  mediaPlayerEntities: PlatformEntitySnapshotMap | null;
}

function readArtworkPath(attrs: Record<string, unknown> | undefined) {
  const entityPicture =
    typeof attrs?.entity_picture === 'string' && attrs.entity_picture.trim().length > 0
      ? attrs.entity_picture
      : undefined;
  const entityPictureLocal =
    typeof attrs?.entity_picture_local === 'string' && attrs.entity_picture_local.trim().length > 0
      ? attrs.entity_picture_local
      : undefined;
  const mediaImageUrl =
    typeof attrs?.media_image_url === 'string' && attrs.media_image_url.trim().length > 0
      ? attrs.media_image_url
      : undefined;

  return entityPicture ?? entityPictureLocal ?? mediaImageUrl;
}

function isPreferredPlaybackState(state: string) {
  return state === 'playing' || state === 'paused' || state === 'buffering';
}

export function resolveGroupedMediaArtwork({
  entityId,
  currentPicture,
  groupMembers,
  mediaPlayerEntities,
}: ResolveGroupedMediaArtworkParams) {
  if (currentPicture) {
    return currentPicture;
  }

  if (!mediaPlayerEntities || groupMembers.length === 0) {
    return currentPicture;
  }

  const nativeEntityId = getProviderNativeId(entityId);
  const candidateIds = [...new Set(groupMembers)].filter(
    (memberId) => memberId.trim().length > 0 && memberId !== nativeEntityId
  );

  for (const memberId of candidateIds) {
    const member = mediaPlayerEntities[memberId];
    const artworkPath = readArtworkPath(member?.attributes);
    if (member && artworkPath && isPreferredPlaybackState(member.state)) {
      return artworkPath;
    }
  }

  for (const memberId of candidateIds) {
    const artworkPath = readArtworkPath(mediaPlayerEntities[memberId]?.attributes);
    if (artworkPath) {
      return artworkPath;
    }
  }

  return currentPicture;
}
