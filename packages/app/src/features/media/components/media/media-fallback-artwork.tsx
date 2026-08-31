import { DiscIcon } from '@radix-ui/react-icons';
import type { CSSProperties } from 'react';
import type { MediaArtworkPalette } from './use-media-artwork-colors';
import { withAlpha } from './use-media-artwork-colors';

interface MediaFallbackArtworkProps {
  palette: MediaArtworkPalette;
  className?: string;
  style?: CSSProperties;
  compact?: boolean;
  icon?: 'disc' | 'spotify';
  transparentSurface?: boolean;
}

export function MediaFallbackArtwork({
  palette,
  className = '',
  style,
  compact = false,
  icon = 'disc',
  transparentSurface = false,
}: MediaFallbackArtworkProps) {
  const iconClassName = `absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${
    compact ? 'h-[42%] w-[42%]' : 'h-[44%] w-[44%]'
  }`;
  const iconStyle = { color: withAlpha(palette.highlight, 0.92) };

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none overflow-hidden ${className}`}
      style={{
        background: transparentSurface
          ? 'transparent'
          : `radial-gradient(circle at 26% 18%, ${withAlpha(
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
          background: transparentSurface
            ? 'none'
            : `radial-gradient(circle at 50% 52%, ${withAlpha(
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
        {icon === 'spotify' ? (
          <svg
            aria-hidden="true"
            className={iconClassName}
            style={iconStyle}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 1.75A10.25 10.25 0 1 0 12 22.25 10.25 10.25 0 0 0 12 1.75Zm4.7 14.78a.8.8 0 0 1-1.1.27c-3.02-1.85-6.82-2.27-11.3-1.24a.8.8 0 1 1-.36-1.56c4.9-1.12 9.1-.63 12.49 1.44.38.23.5.72.27 1.09Zm1.25-2.77a1 1 0 0 1-1.37.33c-3.45-2.12-8.7-2.74-12.78-1.5a1 1 0 0 1-.58-1.91c4.65-1.41 10.44-.72 14.4 1.72.47.29.62.9.33 1.36Zm.1-2.9C13.92 8.4 7.1 8.17 3.15 9.37a1.2 1.2 0 1 1-.7-2.3c4.54-1.38 12.07-1.1 16.83 1.72a1.2 1.2 0 0 1-1.23 2.07Z" />
          </svg>
        ) : (
          <DiscIcon className={iconClassName} style={iconStyle} />
        )}
      </div>
    </div>
  );
}
