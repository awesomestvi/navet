import { DiscIcon } from '@radix-ui/react-icons';
import type { CSSProperties } from 'react';
import type { MediaArtworkPalette } from './use-media-artwork-colors';
import { withAlpha } from './use-media-artwork-colors';

interface MediaFallbackArtworkProps {
  palette: MediaArtworkPalette;
  className?: string;
  style?: CSSProperties;
  compact?: boolean;
}

export function MediaFallbackArtwork({
  palette,
  className = '',
  style,
  compact = false,
}: MediaFallbackArtworkProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(circle at 26% 18%, ${withAlpha(
          palette.highlight,
          0.22
        )} 0%, transparent 24%), linear-gradient(160deg, ${withAlpha(
          palette.dominant,
          0.88
        )} 0%, ${withAlpha(palette.darkMuted, 0.94)} 100%)`,
        ...style,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 52%, ${withAlpha(
            palette.highlight,
            compact ? 0.14 : 0.1
          )} 0%, transparent 22%), radial-gradient(circle at 50% 52%, ${withAlpha(
            palette.vibrant,
            compact ? 0.14 : 0.12
          )} 0%, transparent 42%)`,
        }}
      />

      <div
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border ${
          compact ? 'w-[34%] aspect-square' : 'w-[38%] aspect-square'
        }`}
        style={{
          borderColor: withAlpha(palette.highlight, 0.24),
          backgroundColor: withAlpha(palette.highlight, 0.08),
          boxShadow: `inset 0 1px 0 ${withAlpha(palette.highlight, 0.12)}`,
        }}
      >
        <DiscIcon
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${
            compact ? 'h-[42%] w-[42%]' : 'h-[44%] w-[44%]'
          }`}
          style={{ color: withAlpha(palette.highlight, 0.92) }}
        />
      </div>
    </div>
  );
}
