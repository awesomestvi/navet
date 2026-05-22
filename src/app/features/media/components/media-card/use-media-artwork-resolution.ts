import { useCallback, useEffect, useRef, useState } from 'react';
import { getRuntimeConfig } from '@/app/config/runtime-config';
import { fetchMediaThumbnailDataUrl } from '@/app/features/media/utils/media-thumbnail';
import { isHomeAssistantAddonMode, isHomeAssistantPanelMode } from '@/app/runtime/app-mode';
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

const ARTWORK_CLEAR_DELAY_MS = 700;

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
  const latestObjectUrlRef = useRef<string | null>(null);

  const artworkRequestKey = [entityId, liveArtworkKey ?? artworkKey, artworkVersionKey]
    .filter(Boolean)
    .join('::');
  const isPanelMode = isHomeAssistantPanelMode();
  const isAddonMode = isHomeAssistantAddonMode();
  const runtimeConfig = getRuntimeConfig();
  const hasRuntimeHomeAssistantProxy = Boolean(runtimeConfig.hassUrl && runtimeConfig.proxyBaseUrl);
  const shouldUseDirectDevArtwork =
    import.meta.env.DEV && !isPanelMode && !isAddonMode && !hasRuntimeHomeAssistantProxy;
  const shouldUseDirectAuthenticatedArtwork =
    !isPanelMode && !hasRuntimeHomeAssistantProxy && !shouldUseDirectDevArtwork;
  const resolvedArtwork = liveEntityPicture
    ? shouldUseDirectDevArtwork || shouldUseDirectAuthenticatedArtwork
      ? resolveHomeAssistantAbsoluteUrl(liveEntityPicture, homeAssistantUrl)
      : resolveHomeAssistantProxyUrl(liveEntityPicture, homeAssistantUrl, {
          proxyAvailable: hasRuntimeHomeAssistantProxy,
        })
    : null;
  const needsAuthenticatedThumbnail = Boolean(
    resolvedArtwork && isMediaPlayerProxyUrl(resolvedArtwork)
  );
  const isSameOriginArtwork = Boolean(resolvedArtwork && isSameOriginArtworkUrl(resolvedArtwork));
  const isProxiedArtwork = Boolean(resolvedArtwork?.includes('/__navet_ha_proxy__/'));
  const canFetchResolvedArtwork = Boolean(
    resolvedArtwork &&
      (isProxiedArtwork ||
        isPanelMode ||
        isSameOriginArtwork ||
        (shouldUseDirectAuthenticatedArtwork && authToken))
  );
  const canUseResolvedArtworkFallback =
    !needsAuthenticatedThumbnail || shouldUseDirectDevArtwork || isPanelMode || isSameOriginArtwork;
  const fallbackArtwork =
    thumbnailArtworkUrl ?? (canUseResolvedArtworkFallback ? resolvedArtwork : null);

  useEffect(() => {
    let cancelled = false;

    if (!resolvedArtwork) {
      const timeoutId = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        setThumbnailArtworkUrl((previousArtworkUrl) => {
          if (previousArtworkUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(previousArtworkUrl);
          }
          latestObjectUrlRef.current = null;
          return null;
        });
      }, ARTWORK_CLEAR_DELAY_MS);

      return () => {
        cancelled = true;
        window.clearTimeout(timeoutId);
      };
    }

    if (!needsAuthenticatedThumbnail) {
      setThumbnailArtworkUrl((previousArtworkUrl) => {
        if (previousArtworkUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(previousArtworkUrl);
        }
        latestObjectUrlRef.current = null;
        return null;
      });
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

      const objectUrl = URL.createObjectURL(blob);
      return objectUrl;
    };

    void loadAuthenticatedArtwork()
      .then((artworkUrl) => {
        if (cancelled) {
          if (artworkUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(artworkUrl);
          }
          return;
        }

        setThumbnailArtworkUrl((previousArtworkUrl) => {
          if (
            previousArtworkUrl?.startsWith('blob:') &&
            previousArtworkUrl !== artworkUrl &&
            previousArtworkUrl === latestObjectUrlRef.current
          ) {
            URL.revokeObjectURL(previousArtworkUrl);
          }

          latestObjectUrlRef.current = artworkUrl?.startsWith('blob:') ? artworkUrl : null;
          return artworkUrl;
        });
      })
      .catch(() => {
        if (!cancelled) {
          setThumbnailArtworkUrl((previousArtworkUrl) => {
            if (
              previousArtworkUrl?.startsWith('blob:') &&
              previousArtworkUrl === latestObjectUrlRef.current
            ) {
              URL.revokeObjectURL(previousArtworkUrl);
            }
            latestObjectUrlRef.current = null;
            return null;
          });
        }
      });

    return () => {
      cancelled = true;
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
