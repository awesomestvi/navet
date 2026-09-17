import type { PlatformMediaItem } from '@navet/app/platform/provider-feature-models';
import { useEffect, useMemo, useState } from 'react';
import {
  EMPTY_OPEN_MEDIA_ARTWORK_RESULT,
  EMPTY_SPOTIFY_TRACK_METADATA,
  type MediaCatalogItemProjection,
  mediaCatalog,
} from './media-catalog';

const EMPTY_MEDIA_CATALOG_ITEM: MediaCatalogItemProjection = {
  openArtwork: EMPTY_OPEN_MEDIA_ARTWORK_RESULT,
  spotifyMetadata: EMPTY_SPOTIFY_TRACK_METADATA,
};

export function useMediaCatalogItem(item: PlatformMediaItem) {
  const itemKey = useMemo(
    () =>
      [
        item.mediaClass,
        item.mediaContentId,
        item.mediaContentType,
        item.thumbnail,
        item.title,
      ].join('\u0000'),
    [item.mediaClass, item.mediaContentId, item.mediaContentType, item.thumbnail, item.title]
  );
  const [projection, setProjection] = useState(EMPTY_MEDIA_CATALOG_ITEM);

  useEffect(() => {
    const abortController = new AbortController();
    setProjection(EMPTY_MEDIA_CATALOG_ITEM);
    void mediaCatalog
      .resolveItem(item, { signal: abortController.signal })
      .then(setProjection)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setProjection(EMPTY_MEDIA_CATALOG_ITEM);
        }
      });
    return () => abortController.abort();
  }, [item, itemKey]);

  return projection;
}
