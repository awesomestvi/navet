import { useEffect, useMemo, useState } from 'react';
import type { ResolvedPlatformResource } from '@/app/platform/resources';
import { resolvePlatformArtwork } from '@/app/services/integration-resource.service';
import type { IntegrationProviderId } from '@/app/types/provider';

interface UseMediaArtworkOptions {
  entityId: string;
  attrs: Record<string, unknown> | undefined;
  fallbackPicture?: string;
  artworkKey?: string;
  providerId?: IntegrationProviderId;
}

export function useMediaArtwork({
  entityId,
  attrs,
  fallbackPicture,
  artworkKey,
  providerId,
}: UseMediaArtworkOptions) {
  const [resource, setResource] = useState<ResolvedPlatformResource | null>(null);
  const mediaImageUrl = typeof attrs?.media_image_url === 'string' ? attrs.media_image_url : '';
  const entityPicture = typeof attrs?.entity_picture === 'string' ? attrs.entity_picture : '';
  const entityPictureLocal =
    typeof attrs?.entity_picture_local === 'string' ? attrs.entity_picture_local : '';
  const mediaContentId = typeof attrs?.media_content_id === 'string' ? attrs.media_content_id : '';
  const mediaTitle = typeof attrs?.media_title === 'string' ? attrs.media_title : '';
  const mediaArtist = typeof attrs?.media_artist === 'string' ? attrs.media_artist : '';
  const mediaAlbumName = typeof attrs?.media_album_name === 'string' ? attrs.media_album_name : '';
  const artworkAttrs = useMemo(
    () => ({
      media_image_url: mediaImageUrl || undefined,
      entity_picture: entityPicture || undefined,
      entity_picture_local: entityPictureLocal || undefined,
      media_content_id: mediaContentId || undefined,
      media_title: mediaTitle || undefined,
      media_artist: mediaArtist || undefined,
      media_album_name: mediaAlbumName || undefined,
    }),
    [
      mediaImageUrl,
      entityPicture,
      entityPictureLocal,
      mediaContentId,
      mediaTitle,
      mediaArtist,
      mediaAlbumName,
    ]
  );

  useEffect(() => {
    let cancelled = false;
    void artworkKey;

    void resolvePlatformArtwork({
      entityId,
      attrs: artworkAttrs,
      fallbackPicture,
      providerId,
    })
      .then((nextResource) => {
        if (!cancelled) {
          setResource(nextResource);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResource(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [artworkKey, entityId, fallbackPicture, artworkAttrs, providerId]);

  return resource;
}
