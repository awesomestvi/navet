import { useEffect, useState } from 'react';
import { integrationMediaFeatureService } from '@/app/services/integration-media-feature.service';
import { normalizeResourceUrl } from '@/app/services/integration-resource.service';
import { sanitizeImageUrl } from '@/app/utils/url-security';
import { type PhotoFrameSourceMode, resolvePhotoFrameSourceMode } from './photo-frame-types';

const MAX_MEDIA_SOURCE_DEPTH = 2;
const MAX_MEDIA_SOURCE_IMAGES = 48;

interface UsePhotoFrameSourcesOptions {
  sourceMode?: PhotoFrameSourceMode;
  photoUrls?: string[];
  mediaSourceId?: string;
}

function isImageMediaClass(mediaClass: string | undefined) {
  return mediaClass === 'image';
}

function canExpandMediaClass(mediaClass: string | undefined) {
  return mediaClass === 'directory' || mediaClass === 'album' || mediaClass === 'app';
}

async function resolveMediaSourceImageUrl(mediaContentId: string) {
  const resolved = await integrationMediaFeatureService.resolveMediaSource(mediaContentId);

  if (!resolved.url) {
    return null;
  }

  return normalizeResourceUrl(resolved.url, 'home_assistant') ?? resolved.url;
}

async function collectMediaSourceImageUrls(mediaSourceId: string) {
  const collectedUrls: string[] = [];
  const queue = [{ mediaContentId: mediaSourceId, depth: 0 }];
  const seen = new Set<string>();

  while (queue.length > 0 && collectedUrls.length < MAX_MEDIA_SOURCE_IMAGES) {
    const next = queue.shift();
    if (!next || seen.has(next.mediaContentId)) {
      continue;
    }

    seen.add(next.mediaContentId);

    const media = await integrationMediaFeatureService.browseMediaSource(next.mediaContentId);
    const mediaChildren = media.children ?? [];

    if (isImageMediaClass(media.mediaClass)) {
      const imageUrl = await resolveMediaSourceImageUrl(media.mediaContentId ?? '');
      if (imageUrl) {
        collectedUrls.push(imageUrl);
      }
      continue;
    }

    for (const child of mediaChildren) {
      if (collectedUrls.length >= MAX_MEDIA_SOURCE_IMAGES) {
        break;
      }

      if (isImageMediaClass(child.mediaClass)) {
        const imageUrl = await resolveMediaSourceImageUrl(child.mediaContentId ?? '');
        if (imageUrl) {
          collectedUrls.push(imageUrl);
        }
        continue;
      }

      if (next.depth < MAX_MEDIA_SOURCE_DEPTH && canExpandMediaClass(child.mediaClass)) {
        queue.push({
          mediaContentId: child.mediaContentId ?? '',
          depth: next.depth + 1,
        });
      }
    }
  }

  return collectedUrls;
}

export function usePhotoFrameSources({
  sourceMode,
  photoUrls,
  mediaSourceId,
}: UsePhotoFrameSourcesOptions) {
  const resolvedSourceMode = resolvePhotoFrameSourceMode(sourceMode, mediaSourceId);
  const manualPhotoUrls = (photoUrls ?? [])
    .map((url) => sanitizeImageUrl(url, undefined, { allowDataImage: true }))
    .filter((url): url is string => url !== null);
  const [homeAssistantPhotoUrls, setHomeAssistantPhotoUrls] = useState<string[]>([]);

  useEffect(() => {
    if (resolvedSourceMode !== 'home-assistant') {
      setHomeAssistantPhotoUrls([]);
      return;
    }

    const trimmedMediaSourceId = mediaSourceId?.trim();
    if (!trimmedMediaSourceId) {
      setHomeAssistantPhotoUrls([]);
      return;
    }

    let cancelled = false;

    void collectMediaSourceImageUrls(trimmedMediaSourceId)
      .then((urls) => {
        if (!cancelled) {
          setHomeAssistantPhotoUrls(urls);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHomeAssistantPhotoUrls([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mediaSourceId, resolvedSourceMode]);

  const activePhotoUrls =
    resolvedSourceMode === 'home-assistant' ? homeAssistantPhotoUrls : manualPhotoUrls;

  return {
    activePhotoUrls,
    hasCustomPhotos: activePhotoUrls.length > 0,
    sourceMode: resolvedSourceMode,
  };
}
