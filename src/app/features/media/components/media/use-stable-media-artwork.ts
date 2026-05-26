import { useEffect, useState } from 'react';

const ARTWORK_CLEAR_DELAY_MS = 700;

export function useStableMediaArtwork(artwork: string | null | undefined) {
  const [stableArtwork, setStableArtwork] = useState<string | null>(artwork ?? null);

  useEffect(() => {
    if (!artwork) {
      const timeoutId = window.setTimeout(() => {
        setStableArtwork(null);
      }, ARTWORK_CLEAR_DELAY_MS);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    if (artwork === stableArtwork) {
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (!cancelled) {
        setStableArtwork(artwork);
      }
    };
    image.onerror = () => undefined;
    image.src = artwork;

    return () => {
      cancelled = true;
    };
  }, [artwork, stableArtwork]);

  return stableArtwork;
}
