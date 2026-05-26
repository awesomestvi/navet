import { fetchMediaThumbnailDataUrl } from '@/app/features/media/utils/media-thumbnail';
import type { HomeAssistantResourceResolver } from '../resources/resource-resolver';
import type { ResolvedMediaResource } from '../resources/resource-types';
import type { HomeAssistantHttpGateway } from '../transport/http-gateway';

const OBJECT_URL_TTL_MS = 5 * 60_000;
const NEGATIVE_CACHE_TTL_MS = 45_000;

interface ObjectUrlEntry {
  expiresAt: number;
  url: string;
}

async function isRenderableImageBlob(blob: Blob): Promise<boolean> {
  if (!blob.type.startsWith('image/')) {
    return false;
  }

  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      bitmap.close();
      return true;
    } catch {
      return false;
    }
  }

  if (typeof Image === 'undefined') {
    return true;
  }

  const previewUrl = URL.createObjectURL(blob);

  try {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('image decode failed'));
      image.src = previewUrl;
    });
    return true;
  } catch {
    return false;
  } finally {
    URL.revokeObjectURL(previewUrl);
  }
}

export class MediaArtworkService {
  private objectUrlCache = new Map<string, ObjectUrlEntry>();
  private negativeCache = new Map<string, number>();

  constructor(
    private resolver: HomeAssistantResourceResolver,
    private httpGateway: HomeAssistantHttpGateway
  ) {}

  private evictExpiredEntries() {
    const now = Date.now();

    for (const [key, entry] of this.objectUrlCache.entries()) {
      if (entry.expiresAt >= now) {
        continue;
      }

      URL.revokeObjectURL(entry.url);
      this.objectUrlCache.delete(key);
    }

    for (const [key, expiresAt] of this.negativeCache.entries()) {
      if (expiresAt < now) {
        this.negativeCache.delete(key);
      }
    }
  }

  async resolveArtwork(
    entityId: string,
    attrs: Record<string, unknown>,
    fallbackPicture?: string
  ): Promise<ResolvedMediaResource> {
    this.evictExpiredEntries();

    const picture =
      (typeof attrs.media_image_url === 'string' && attrs.media_image_url) ||
      (typeof attrs.entity_picture === 'string' && attrs.entity_picture) ||
      (typeof attrs.entity_picture_local === 'string' && attrs.entity_picture_local) ||
      fallbackPicture;
    const fingerprint = [
      entityId,
      picture,
      typeof attrs.media_content_id === 'string' ? attrs.media_content_id : '',
      typeof attrs.media_title === 'string' ? attrs.media_title : '',
      typeof attrs.media_artist === 'string' ? attrs.media_artist : '',
      typeof attrs.media_album_name === 'string' ? attrs.media_album_name : '',
    ].join('::');

    const cachedObjectUrl = this.objectUrlCache.get(fingerprint);
    if (cachedObjectUrl && cachedObjectUrl.expiresAt > Date.now()) {
      return {
        id: fingerprint,
        kind: 'image',
        url: cachedObjectUrl.url,
        cacheKey: fingerprint,
        authStrategy: 'none',
        metadata: { source: 'artwork_object_url_cache' },
      };
    }

    const thumbnailDataUrl = await fetchMediaThumbnailDataUrl(entityId).catch(() => null);
    if (thumbnailDataUrl) {
      return {
        id: `${entityId}:thumbnail`,
        kind: 'image',
        url: thumbnailDataUrl,
        cacheKey: fingerprint,
        authStrategy: 'none',
        metadata: { source: 'media_player_thumbnail' },
      };
    }

    if (!picture) {
      return {
        id: entityId,
        kind: 'unavailable',
        cacheKey: fingerprint,
        authStrategy: 'none',
      };
    }

    const negativeCacheExpiry = this.negativeCache.get(fingerprint);
    if (negativeCacheExpiry && negativeCacheExpiry > Date.now()) {
      return {
        id: entityId,
        kind: 'unavailable',
        cacheKey: fingerprint,
        authStrategy: 'none',
      };
    }

    const resolved = await this.resolver.resolve({
      kind: 'media_artwork',
      entityId,
      rawPath: picture,
    });

    if (!resolved.url) {
      this.negativeCache.set(fingerprint, Date.now() + NEGATIVE_CACHE_TTL_MS);
      return resolved;
    }

    if (
      resolved.authStrategy === 'none' ||
      resolved.url.startsWith('blob:') ||
      resolved.url.startsWith('data:')
    ) {
      return {
        ...resolved,
        cacheKey: fingerprint,
      };
    }

    try {
      const blob = await this.httpGateway.getBlob({
        url: resolved.url,
        authStrategy: resolved.authStrategy,
        cache: 'force-cache',
      });

      if (!(await isRenderableImageBlob(blob))) {
        this.negativeCache.set(fingerprint, Date.now() + NEGATIVE_CACHE_TTL_MS);
        return {
          ...resolved,
          kind: 'unavailable',
          url: undefined,
        };
      }

      const objectUrl = URL.createObjectURL(blob);
      this.objectUrlCache.set(fingerprint, {
        url: objectUrl,
        expiresAt: Date.now() + OBJECT_URL_TTL_MS,
      });

      return {
        ...resolved,
        url: objectUrl,
        authStrategy: 'none',
        cacheKey: fingerprint,
        metadata: {
          ...resolved.metadata,
          mimeType: blob.type,
          source: 'artwork_object_url',
        },
      };
    } catch {
      this.negativeCache.set(fingerprint, Date.now() + NEGATIVE_CACHE_TTL_MS);
      return {
        ...resolved,
        kind: 'unavailable',
        url: undefined,
      };
    }
  }
}
