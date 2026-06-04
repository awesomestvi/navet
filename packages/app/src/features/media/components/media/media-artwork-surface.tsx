import { isMediaPlayerProxyUrl } from '@navet/app/utils/home-assistant-url';
import { useEffect, useState } from 'react';
import { MediaFallbackArtwork } from './media-fallback-artwork';
import type { MediaArtworkPalette } from './use-media-artwork-colors';
import { withAlpha } from './use-media-artwork-colors';

interface MediaArtworkSurfaceProps {
  artwork?: string | null;
  onArtworkError?: (imageUrl?: string | null) => void;
  palette: MediaArtworkPalette;
  theme?: 'light' | 'dark' | 'black' | 'glass';
  layout?: 'full' | 'split' | 'stacked';
  imagePaddingClassName?: string;
  imageClassName?: string;
  artRegionClassName?: string;
  subduedFallback?: boolean;
}

function getColorLuminance(color: string): number {
  const channels = color.match(/\d+(\.\d+)?/g);
  if (!channels || channels.length < 3) {
    return 0.5;
  }

  const [red, green, blue] = channels.map((channel) => Number.parseFloat(channel) / 255);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function getSplitSurfaceColor(palette: MediaArtworkPalette): string {
  const dominantLuminance = getColorLuminance(palette.dominant);

  if (dominantLuminance >= 0.72) {
    return palette.highlight;
  }

  if (dominantLuminance <= 0.42) {
    return palette.darkMuted;
  }

  return palette.dominant;
}

export function MediaArtworkSurface({
  artwork,
  onArtworkError,
  palette,
  theme,
  layout = 'full',
  imagePaddingClassName = 'p-6',
  imageClassName = '',
  artRegionClassName = 'w-[44%]',
  subduedFallback = false,
}: MediaArtworkSurfaceProps) {
  const [showDeferredBackdrop, setShowDeferredBackdrop] = useState(false);

  useEffect(() => {
    setShowDeferredBackdrop(false);

    if (!artwork) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowDeferredBackdrop(true);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [artwork]);

  const useSubduedFallback = subduedFallback && !artwork;
  const useSoftGlassFallback = theme === 'glass' && useSubduedFallback;
  const shouldRenderDecorativeArtworkLayers =
    artwork !== null &&
    artwork !== undefined &&
    (import.meta.env.DEV || !isMediaPlayerProxyUrl(artwork));
  const splitSurfaceColor = getSplitSurfaceColor(palette);
  const edgeFadeMask =
    layout === 'split'
      ? 'linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 55%, rgba(0,0,0,0.9) 68%, rgba(0,0,0,0.54) 84%, rgba(0,0,0,0.14) 95%, rgba(0,0,0,0) 100%)'
      : layout === 'stacked'
        ? 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 56%, rgba(0,0,0,0.9) 70%, rgba(0,0,0,0.54) 84%, rgba(0,0,0,0.14) 95%, rgba(0,0,0,0) 100%)'
        : 'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 16%, rgba(0,0,0,1) 84%, rgba(0,0,0,0) 100%)';
  const deferredBackdropMask =
    layout === 'split'
      ? 'linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 44%, rgba(0,0,0,0.45) 58%, rgba(0,0,0,0) 72%)'
      : layout === 'stacked'
        ? 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 48%, rgba(0,0,0,0.45) 62%, rgba(0,0,0,0) 76%)'
        : undefined;

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ ['--navet-media-bg' as string]: palette.dominant }}
    >
      {theme !== 'glass' || artwork ? (
        <div
          className="absolute inset-0"
          style={{
            background:
              useSubduedFallback && layout === 'split'
                ? `linear-gradient(90deg, ${withAlpha(palette.dominant, 0.14)} 0%, ${withAlpha(
                    palette.dominant,
                    0.12
                  )} 28%, ${withAlpha(palette.darkMuted, 0.14)} 62%, ${withAlpha(
                    palette.gradientEnd,
                    0.18
                  )} 100%)`
                : useSubduedFallback && layout === 'stacked'
                  ? `linear-gradient(180deg, ${withAlpha(palette.dominant, 0.14)} 0%, ${withAlpha(
                      palette.dominant,
                      0.12
                    )} 34%, ${withAlpha(palette.darkMuted, 0.14)} 68%, ${withAlpha(
                      palette.gradientEnd,
                      0.18
                    )} 100%)`
                  : layout === 'split'
                    ? `radial-gradient(circle at 76% 24%, ${withAlpha(splitSurfaceColor, 0.16)} 0%, transparent 30%), radial-gradient(circle at 68% 66%, ${withAlpha(palette.vibrant, 0.08)} 0%, transparent 34%), linear-gradient(90deg, ${withAlpha(palette.dominant, 0.96)} 0%, ${withAlpha(palette.dominant, 0.94)} 38%, ${withAlpha(splitSurfaceColor, 0.96)} 76%, ${withAlpha(splitSurfaceColor, 0.98)} 100%)`
                    : layout === 'stacked'
                      ? `radial-gradient(circle at 22% 20%, ${withAlpha(palette.highlight, 0.18)} 0%, transparent 24%), radial-gradient(circle at 68% 54%, ${withAlpha(palette.vibrant, 0.22)} 0%, transparent 32%), linear-gradient(180deg, ${withAlpha(palette.dominant, 0.96)} 0%, ${withAlpha(palette.dominant, 0.94)} 34%, ${withAlpha(palette.darkMuted, 0.94)} 68%, ${withAlpha(palette.gradientEnd, 0.98)} 100%)`
                      : `linear-gradient(135deg, ${palette.dominant} 0%, ${palette.gradientEnd} 100%)`,
          }}
        />
      ) : null}
      {artwork && showDeferredBackdrop && shouldRenderDecorativeArtworkLayers ? (
        <img
          src={artwork}
          alt=""
          aria-hidden="true"
          onError={() => onArtworkError?.(artwork)}
          className="absolute inset-0 h-full w-full scale-[1.22] object-cover opacity-38 blur-[84px] saturate-[1.24]"
          decoding="async"
          style={
            deferredBackdropMask
              ? {
                  WebkitMaskImage: deferredBackdropMask,
                  maskImage: deferredBackdropMask,
                }
              : undefined
          }
        />
      ) : !artwork ? (
        <MediaFallbackArtwork
          palette={palette}
          className={`absolute inset-0 scale-[1.08] blur-[42px] ${
            useSubduedFallback ? 'opacity-24' : 'opacity-55'
          }`}
        />
      ) : null}

      {artwork ? (
        <div
          className={`absolute overflow-hidden ${
            layout === 'split'
              ? `inset-y-0 left-0 flex items-center justify-center ${artRegionClassName}`
              : layout === 'stacked'
                ? `inset-x-0 top-0 flex items-start justify-center ${artRegionClassName || 'h-[52%]'}`
                : 'inset-y-0 left-0 flex items-center justify-center w-full'
          } ${imagePaddingClassName}`}
        >
          <div className="relative h-full w-full">
            <img
              src={artwork}
              alt=""
              aria-hidden="true"
              onError={() => onArtworkError?.(artwork)}
              className={`h-full w-full object-contain object-left ${imageClassName}`}
              decoding="async"
              style={{
                WebkitMaskImage: edgeFadeMask,
                maskImage: edgeFadeMask,
              }}
            />
            {layout === 'split' ? (
              <div
                className="absolute inset-y-0 right-0 w-[48%]"
                style={{
                  background: `linear-gradient(90deg, ${withAlpha(palette.dominant, 0)} 0%, ${withAlpha(palette.dominant, 0.012)} 42%, ${withAlpha(splitSurfaceColor, 0.035)} 100%)`,
                }}
              />
            ) : layout === 'stacked' ? (
              <div
                className="absolute inset-x-0 bottom-0 h-[48%]"
                style={{
                  background: `linear-gradient(180deg, ${withAlpha(palette.dominant, 0)} 0%, ${withAlpha(palette.dominant, 0.015)} 38%, ${withAlpha(palette.vibrant, 0.04)} 68%, ${withAlpha(palette.darkMuted, 0.08)} 100%)`,
                }}
              />
            ) : (
              <>
                <div
                  className="absolute inset-y-0 left-0 w-[20%]"
                  style={{
                    background: `linear-gradient(90deg, ${palette.dominant} 0%, rgba(0,0,0,0) 100%)`,
                  }}
                />
                <div
                  className="absolute inset-y-0 right-0 w-[20%]"
                  style={{
                    background: `linear-gradient(270deg, ${palette.dominant} 0%, rgba(0,0,0,0) 100%)`,
                  }}
                />
              </>
            )}
          </div>
        </div>
      ) : (
        <div
          className={`absolute overflow-hidden ${
            layout === 'split'
              ? `inset-y-0 left-0 flex items-center justify-center ${artRegionClassName}`
              : layout === 'stacked'
                ? `inset-x-0 top-0 flex items-start justify-center ${artRegionClassName || 'h-[52%]'}`
                : 'inset-y-0 left-0 flex items-center justify-center w-full'
          } ${imagePaddingClassName}`}
        >
          <MediaFallbackArtwork
            palette={palette}
            compact={layout !== 'split'}
            className={`relative h-full w-full ${useSubduedFallback ? 'opacity-42' : ''}`}
          />
        </div>
      )}

      <div
        className="absolute inset-0"
        style={{
          background:
            layout === 'split'
              ? `linear-gradient(180deg, ${withAlpha(splitSurfaceColor, useSoftGlassFallback ? 0.012 : useSubduedFallback ? 0.01 : 0.02)} 0%, rgba(0,0,0,0) 58%, ${withAlpha(useSoftGlassFallback ? palette.highlight : splitSurfaceColor, useSoftGlassFallback ? 0.018 : useSubduedFallback ? 0.015 : 0.025)} 100%)`
              : `linear-gradient(180deg, ${withAlpha(palette.highlight, useSoftGlassFallback ? 0.02 : useSubduedFallback ? 0.015 : 0.03)} 0%, ${withAlpha(useSoftGlassFallback ? palette.dominant : palette.darkMuted, useSoftGlassFallback ? 0.028 : useSubduedFallback ? 0.04 : 0.08)} 52%, ${withAlpha(useSoftGlassFallback ? palette.gradientEnd : palette.darkMuted, useSoftGlassFallback ? 0.04 : useSubduedFallback ? 0.08 : 0.18)} 100%)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            useSoftGlassFallback && layout === 'split'
              ? `linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 78%, ${withAlpha(
                  palette.dominant,
                  0.012
                )} 90%, ${withAlpha(palette.gradientEnd, 0.025)} 100%)`
              : useSubduedFallback && layout === 'split'
                ? `linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 72%, ${withAlpha(
                    palette.darkMuted,
                    0.02
                  )} 86%, ${withAlpha(palette.darkMuted, 0.05)} 100%)`
                : useSoftGlassFallback && layout === 'stacked'
                  ? `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 68%, ${withAlpha(
                      palette.dominant,
                      0.014
                    )} 84%, ${withAlpha(palette.gradientEnd, 0.03)} 100%)`
                  : useSubduedFallback && layout === 'stacked'
                    ? `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 64%, ${withAlpha(
                        palette.darkMuted,
                        0.02
                      )} 82%, ${withAlpha(palette.darkMuted, 0.05)} 100%)`
                    : layout === 'split'
                      ? `linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 72%, ${withAlpha(splitSurfaceColor, 0.018)} 100%)`
                      : layout === 'stacked'
                        ? `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 56%, ${withAlpha(palette.darkMuted, 0.04)} 78%, ${withAlpha(palette.darkMuted, 0.1)} 100%)`
                        : `linear-gradient(180deg, rgba(0,0,0,0) 0%, ${withAlpha(palette.darkMuted, 0.12)} 64%, ${withAlpha(palette.darkMuted, 0.28)} 100%)`,
        }}
      />
    </div>
  );
}
