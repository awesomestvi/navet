import { useCallback, useEffect, useState } from 'react';
import {
  resolveHomeAssistantAbsoluteUrl,
  resolveHomeAssistantProxyUrl,
} from '@/app/utils/home-assistant-url';

interface UseMediaArtworkResolutionParams {
  entityId: string;
  artworkKey?: string;
  liveEntityPicture?: string;
  liveArtworkKey?: string;
  homeAssistantUrl?: string;
}

export function useMediaArtworkResolution({
  entityId,
  artworkKey,
  liveEntityPicture,
  liveArtworkKey,
  homeAssistantUrl,
}: UseMediaArtworkResolutionParams) {
  const [failedArtworkUrl, setFailedArtworkUrl] = useState<string | null>(null);

  const artworkRequestKey = [entityId, liveArtworkKey ?? artworkKey].filter(Boolean).join('::');
  const fallbackArtwork = liveEntityPicture
    ? import.meta.env.DEV
      ? resolveHomeAssistantProxyUrl(liveEntityPicture, homeAssistantUrl)
      : resolveHomeAssistantAbsoluteUrl(liveEntityPicture, homeAssistantUrl)
    : null;

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
