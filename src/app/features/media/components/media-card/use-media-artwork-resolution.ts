import { useCallback, useEffect, useState } from 'react';
import {
  resolveHomeAssistantAbsoluteUrl,
  resolveHomeAssistantProxyUrl,
} from '@/app/utils/home-assistant-url';

const MAX_ARTWORK_ERROR_COUNT = 12;

function isFailedArtworkCandidate(
  candidate: string | null | undefined,
  failedArtworkUrl: string | null
) {
  return Boolean(candidate) && candidate === failedArtworkUrl;
}

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
  const [artworkErrorCount, setArtworkErrorCount] = useState(0);
  const [resolvedAlbumArt, setResolvedAlbumArt] = useState<string | null>(null);

  const artworkRequestKey = [entityId, liveArtworkKey ?? artworkKey].filter(Boolean).join('::');
  const fallbackArtwork = liveEntityPicture
    ? import.meta.env.DEV
      ? resolveHomeAssistantProxyUrl(liveEntityPicture, homeAssistantUrl)
      : resolveHomeAssistantAbsoluteUrl(liveEntityPicture, homeAssistantUrl)
    : null;

  useEffect(() => {
    if (artworkRequestKey) {
      setFailedArtworkUrl(null);
      setArtworkErrorCount(0);
    }
    setResolvedAlbumArt(
      isFailedArtworkCandidate(fallbackArtwork, failedArtworkUrl) ? null : fallbackArtwork
    );
  }, [artworkRequestKey, fallbackArtwork, failedArtworkUrl]);

  const handleArtworkError = useCallback(
    (imageUrl?: string | null) => {
      if (!imageUrl) {
        return;
      }

      setArtworkErrorCount((currentCount) => {
        if (currentCount >= MAX_ARTWORK_ERROR_COUNT) {
          return currentCount;
        }

        return currentCount + 1;
      });

      setResolvedAlbumArt((current) => (current === imageUrl ? null : current));
      setFailedArtworkUrl((current) =>
        current === null && artworkErrorCount < MAX_ARTWORK_ERROR_COUNT ? imageUrl : current
      );
    },
    [artworkErrorCount]
  );

  return {
    albumArt: resolvedAlbumArt,
    handleArtworkError,
  };
}
