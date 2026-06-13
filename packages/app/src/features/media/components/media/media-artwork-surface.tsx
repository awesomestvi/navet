import { MediaFallbackArtwork } from './media-fallback-artwork';
import { useArtworkEdgeBlur } from './use-artwork-edge-blur';
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
  const useSubduedFallback = subduedFallback && !artwork;
  const useSoftGlassFallback = theme === 'glass' && useSubduedFallback;
  const fallbackSplitSurfaceColor = getSplitSurfaceColor(palette);
  const layoutSurfaceMatchColor =
    layout === 'split'
      ? fallbackSplitSurfaceColor
      : layout === 'stacked'
        ? palette.darkMuted
        : null;
  const layoutBlendEdge =
    layout === 'split' ? 'right' : layout === 'stacked' ? 'bottom' : undefined;
  const artworkEdgeAnalysis = useArtworkEdgeBlur(artwork, {
    matchColor: layoutSurfaceMatchColor,
    preferEdge: layoutBlendEdge,
  });
  const splitSurfaceColor =
    layout === 'split' && artworkEdgeAnalysis.preferredEdgeColor
      ? artworkEdgeAnalysis.preferredEdgeColor
      : fallbackSplitSurfaceColor;
  const stackedSurfaceColor =
    layout === 'stacked' && artworkEdgeAnalysis.preferredEdgeColor
      ? artworkEdgeAnalysis.preferredEdgeColor
      : palette.darkMuted;
  const edgeFadeMask =
    layout === 'split'
      ? 'linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 82%, rgba(0,0,0,0.96) 89%, rgba(0,0,0,0.68) 95%, rgba(0,0,0,0.22) 99%, rgba(0,0,0,0) 100%)'
      : layout === 'stacked'
        ? 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 82%, rgba(0,0,0,0.96) 89%, rgba(0,0,0,0.68) 95%, rgba(0,0,0,0.22) 99%, rgba(0,0,0,0) 100%)'
        : 'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 16%, rgba(0,0,0,1) 84%, rgba(0,0,0,0) 100%)';

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
                    ? `${splitSurfaceColor}`
                    : layout === 'stacked'
                      ? `linear-gradient(180deg, ${withAlpha(palette.dominant, 0.96)} 0%, ${withAlpha(palette.dominant, 0.94)} 34%, ${withAlpha(stackedSurfaceColor, 0.96)} 68%, ${withAlpha(palette.gradientEnd, 0.98)} 100%)`
                      : `linear-gradient(135deg, ${palette.dominant} 0%, ${palette.gradientEnd} 100%)`,
          }}
        />
      ) : null}
      {!artwork ? (
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
          <div
            className="relative h-full w-full"
            style={{
              backgroundColor:
                layout === 'split'
                  ? splitSurfaceColor
                  : layout === 'stacked'
                    ? stackedSurfaceColor
                    : undefined,
            }}
          >
            <img
              src={artwork}
              alt=""
              aria-hidden="true"
              onError={() => onArtworkError?.(artwork)}
              className={`h-full w-full object-contain object-left ${imageClassName}`}
              decoding="async"
              style={
                artworkEdgeAnalysis.shouldFadeEdge
                  ? {
                      WebkitMaskImage: edgeFadeMask,
                      maskImage: edgeFadeMask,
                    }
                  : undefined
              }
            />
            {layout === 'full' && (
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
              ? 'none'
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
                      ? 'none'
                      : layout === 'stacked'
                        ? 'none'
                        : `linear-gradient(180deg, rgba(0,0,0,0) 0%, ${withAlpha(palette.darkMuted, 0.12)} 64%, ${withAlpha(palette.darkMuted, 0.28)} 100%)`,
        }}
      />
    </div>
  );
}
