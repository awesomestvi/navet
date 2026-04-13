import { useEffect, useState } from 'react';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { resolveHomeAssistantProxyUrl } from '@/app/utils/home-assistant-url';
import { type PhotoFrameSourceMode, resolvePhotoFrameSourceMode } from './photo-frame-types';

const MAX_MEDIA_SOURCE_DEPTH = 2;
const MAX_MEDIA_SOURCE_IMAGES = 48;

interface UsePhotoFrameSourcesOptions {
  sourceMode?: PhotoFrameSourceMode;
  photoUrls?: string[];
  mediaSourceId?: string;
  hassUrl?: string;
}

function isImageMediaClass(mediaClass: string | undefined) {
  return mediaClass === 'image';
}

function canExpandMediaClass(mediaClass: string | undefined) {
  return mediaClass === 'directory' || mediaClass === 'album' || mediaClass === 'app';
}

async function resolveMediaSourceImageUrl(mediaContentId: string, hassUrl?: string) {
  const resolved = await homeAssistantService.resolveMediaSource(mediaContentId);

  if (!resolved.url) {
    return null;
  }

  return resolveHomeAssistantProxyUrl(resolved.url, hassUrl) ?? resolved.url;
}

async function collectMediaSourceImageUrls(mediaSourceId: string, hassUrl?: string) {
  const collectedUrls: string[] = [];
  const queue = [{ mediaContentId: mediaSourceId, depth: 0 }];
  const seen = new Set<string>();

  while (queue.length > 0 && collectedUrls.length < MAX_MEDIA_SOURCE_IMAGES) {
    const next = queue.shift();
    if (!next || seen.has(next.mediaContentId)) {
      continue;
    }

    seen.add(next.mediaContentId);

    const media = await homeAssistantService.browseMediaSource(next.mediaContentId);
    const mediaChildren = media.children ?? [];

    if (isImageMediaClass(media.media_class)) {
      const imageUrl = await resolveMediaSourceImageUrl(media.media_content_id, hassUrl);
      if (imageUrl) {
        collectedUrls.push(imageUrl);
      }
      continue;
    }

    for (const child of mediaChildren) {
      if (collectedUrls.length >= MAX_MEDIA_SOURCE_IMAGES) {
        break;
      }

      if (isImageMediaClass(child.media_class)) {
        const imageUrl = await resolveMediaSourceImageUrl(child.media_content_id, hassUrl);
        if (imageUrl) {
          collectedUrls.push(imageUrl);
        }
        continue;
      }

      if (next.depth < MAX_MEDIA_SOURCE_DEPTH && canExpandMediaClass(child.media_class)) {
        queue.push({
          mediaContentId: child.media_content_id,
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
  hassUrl,
}: UsePhotoFrameSourcesOptions) {
  const resolvedSourceMode = resolvePhotoFrameSourceMode(sourceMode, mediaSourceId);
  const manualPhotoUrls = photoUrls ?? [];
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

    void collectMediaSourceImageUrls(trimmedMediaSourceId, hassUrl)
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
  }, [hassUrl, mediaSourceId, resolvedSourceMode]);

  const activePhotoUrls =
    resolvedSourceMode === 'home-assistant' ? homeAssistantPhotoUrls : manualPhotoUrls;

  return {
    activePhotoUrls,
    hasCustomPhotos: activePhotoUrls.length > 0,
    sourceMode: resolvedSourceMode,
  };
}
