import { useCallback, useEffect, useState } from 'react';
import { getRuntimeConfig } from '@/app/config/runtime-config';
import { fetchMediaThumbnailDataUrl } from '@/app/features/media/utils/media-thumbnail';
import { isHomeAssistantPanelMode } from '@/app/runtime/app-mode';
import { useAuth } from '@/app/stores/auth-store';
import { authSelectors } from '@/app/stores/selectors';
import {
  isMediaPlayerProxyUrl,
  resolveHomeAssistantAbsoluteUrl,
  resolveHomeAssistantProxyUrl,
} from '@/app/utils/home-assistant-url';

interface UseMediaArtworkResolutionParams {
  entityId: string;
  artworkKey?: string;
  artworkVersionKey?: string;
  liveEntityPicture?: string;
  liveArtworkKey?: string;
  homeAssistantUrl?: string;
}

function resolveArtworkFetchUrl(artworkUrl: string, cacheKey: string) {
  try {
    const url = new URL(artworkUrl, window.location.origin);
    url.searchParams.set('navet_artwork_key', cacheKey);
    if (url.origin !== window.location.origin) {
      return url.toString();
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return artworkUrl;
  }
}

function isSameOriginArtworkUrl(artworkUrl: string) {
  try {
    return new URL(artworkUrl, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function useMediaArtworkResolution({
  entityId,
  artworkKey,
  artworkVersionKey,
  liveEntityPicture,
  liveArtworkKey,
  homeAssistantUrl,
}: UseMediaArtworkResolutionParams) {
  const authToken = useAuth(authSelectors.config)?.token;
  const [failedArtworkUrl, setFailedArtworkUrl] = useState<string | null>(null);
  const [thumbnailArtworkUrl, setThumbnailArtworkUrl] = useState<string | null>(null);

  const artworkRequestKey = [entityId, liveArtworkKey ?? artworkKey, artworkVersionKey]
    .filter(Boolean)
    .join('::');
  const isPanelMode = isHomeAssistantPanelMode();
  const runtimeConfig = getRuntimeConfig();
  const shouldUseDirectDevArtwork =
    import.meta.env.DEV && !isPanelMode && !runtimeConfig.proxyBaseUrl;
  const resolvedArtwork = liveEntityPicture
    ? shouldUseDirectDevArtwork
      ? resolveHomeAssistantAbsoluteUrl(liveEntityPicture, homeAssistantUrl)
      : resolveHomeAssistantProxyUrl(liveEntityPicture, homeAssistantUrl)
    : null;
  const needsAuthenticatedThumbnail = Boolean(
    resolvedArtwork && isMediaPlayerProxyUrl(resolvedArtwork)
  );
  const isSameOriginArtwork = Boolean(resolvedArtwork && isSameOriginArtworkUrl(resolvedArtwork));
  const canFetchResolvedArtwork = Boolean(
    resolvedArtwork && (authToken || isPanelMode || isSameOriginArtwork)
  );
  const canUseResolvedArtworkFallback =
    !needsAuthenticatedThumbnail || isPanelMode || isSameOriginArtwork;
  const fallbackArtwork =
    thumbnailArtworkUrl ?? (canUseResolvedArtworkFallback ? resolvedArtwork : null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setThumbnailArtworkUrl(null);

    if (!resolvedArtwork || !needsAuthenticatedThumbnail) {
      return;
    }

    const loadAuthenticatedArtwork = async () => {
      const thumbnailDataUrl = await fetchMediaThumbnailDataUrl(entityId).catch(() => null);
      if (thumbnailDataUrl) {
        return thumbnailDataUrl;
      }

      if (!canFetchResolvedArtwork) {
        return null;
      }

      const response = await fetch(resolveArtworkFetchUrl(resolvedArtwork, artworkRequestKey), {
        credentials: 'same-origin',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      });
      if (!response.ok) {
        return null;
      }

      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) {
        return null;
      }

      objectUrl = URL.createObjectURL(blob);
      return objectUrl;
    };

    void loadAuthenticatedArtwork()
      .then((artworkUrl) => {
        if (!cancelled) {
          setThumbnailArtworkUrl(artworkUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setThumbnailArtworkUrl(null);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [
    artworkRequestKey,
    authToken,
    canFetchResolvedArtwork,
    entityId,
    needsAuthenticatedThumbnail,
    resolvedArtwork,
  ]);

  // Clear the failed URL only when the track/content actually changes — never on error state changes.
  // Previously this effect also depended on failedArtworkUrl, which caused a reset loop:
  // error → failedArtworkUrl set → effect re-ran → failedArtworkUrl cleared → artwork re-shown → error again.
  useEffect(() => {
    void artworkRequestKey;
    setFailedArtworkUrl(null);
  }, [artworkRequestKey]);

  // Derived: hide artwork only if the current URL is the one that just failed.
  const albumArt =
    failedArtworkUrl !== null && failedArtworkUrl === fallbackArtwork ? null : fallbackArtwork;

  const handleArtworkError = useCallback((imageUrl?: string | null) => {
    if (!imageUrl) return;
    setFailedArtworkUrl(imageUrl);
  }, []);

  return { albumArt, handleArtworkError };
}
