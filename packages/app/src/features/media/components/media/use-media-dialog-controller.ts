import { getCardReadableTextTokens } from '@navet/app/components/shared/theme/card-readable-text-tokens';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@navet/app/hooks';
import type { MediaDialogProps } from './media-dialog.types';
import { getMediaReadableForeground } from './media-readable-foreground';
import { formatMediaTime } from './media-time';
import {
  getMediaArtworkPaletteSource,
  useMediaArtworkColors,
  withAlpha,
} from './use-media-artwork-colors';

type MediaDialogControllerInput = Pick<
  MediaDialogProps,
  | 'artwork'
  | 'artworkResource'
  | 'artist'
  | 'durationSeconds'
  | 'elapsedSeconds'
  | 'entityId'
  | 'title'
>;

export function useMediaDialogController({
  artwork,
  artworkResource,
  artist,
  durationSeconds,
  elapsedSeconds,
  entityId,
  title,
}: MediaDialogControllerInput) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const isGlass = theme === 'glass';
  const paletteArtwork = getMediaArtworkPaletteSource(artwork, artworkResource);
  const palette = useMediaArtworkColors(paletteArtwork, theme, entityId, `${title}::${artist}`);
  const textTokens = getCardReadableTextTokens({
    theme,
    baseColor: palette.highlight,
    backgroundColor: palette.gradientEnd,
  });
  const subduedFallback = !artwork;
  const fallbackTitleColor =
    theme === 'light' && subduedFallback ? '#0f172a' : textTokens.titleColor;
  const fallbackSubtitleColor =
    theme === 'light' && subduedFallback ? '#475569' : textTokens.subtitleColor;
  const readableForeground = getMediaReadableForeground({
    theme,
    palette,
    titleColor: fallbackTitleColor,
    subtitleColor: fallbackSubtitleColor,
    hasArtwork: Boolean(artwork),
  });
  const resolvedTitleColor = readableForeground.titleColor;
  const resolvedSubtitleColor = readableForeground.subtitleColor;
  const displayRemaining = formatMediaTime(Math.max(0, durationSeconds - elapsedSeconds));
  const displayDuration = durationSeconds > 0 ? formatMediaTime(durationSeconds) : '--:--';
  const dialogBackground =
    theme === 'light'
      ? `linear-gradient(180deg, rgba(255,255,255,0.985) 0%, rgba(255,255,255,0.965) 100%)`
      : subduedFallback
        ? theme === 'glass'
          ? `linear-gradient(180deg, rgba(0,0,0,0.24) 0%, rgba(0,0,0,0.1) 42%, rgba(0,0,0,0.16) 68%, rgba(0,0,0,0.28) 100%), linear-gradient(160deg, ${withAlpha(
              palette.dominant,
              0.12
            )} 0%, ${withAlpha(palette.dominant, 0.14)} 48%, ${withAlpha(
              palette.darkMuted,
              0.18
            )} 100%), linear-gradient(165deg, ${withAlpha(palette.dominant, 0.18)} 0%, ${withAlpha(
              palette.dominant,
              0.14
            )} 42%, ${withAlpha(palette.gradientEnd, 0.2)} 100%)`
          : theme === 'black'
            ? `linear-gradient(180deg, rgba(0,0,0,0.985) 0%, rgba(0,0,0,0.985) 100%), linear-gradient(160deg, ${withAlpha(
                palette.dominant,
                0.04
              )} 0%, ${withAlpha(palette.darkMuted, 0.06)} 100%)`
            : `linear-gradient(180deg, rgba(24,24,27,0.985) 0%, rgba(24,24,27,0.975) 100%), linear-gradient(160deg, ${withAlpha(
                palette.dominant,
                0.05
              )} 0%, ${withAlpha(palette.darkMuted, 0.08)} 100%)`
        : `linear-gradient(180deg, rgba(0,0,0,0.035) 0%, rgba(0,0,0,0.01) 42%, rgba(0,0,0,0.03) 68%, rgba(0,0,0,0.07) 100%), linear-gradient(160deg, ${withAlpha(
            palette.dominant,
            0.12
          )} 0%, ${withAlpha(palette.dominant, 0.06)} 48%, ${withAlpha(
            palette.darkMuted,
            0.08
          )} 100%), linear-gradient(165deg, ${withAlpha(
            palette.dominant,
            0.72
          )} 0%, ${withAlpha(palette.dominant, 0.62)} 42%, ${withAlpha(
            palette.gradientEnd,
            0.68
          )} 100%)`;
  const dialogSurfaceStyle = {
    background: dialogBackground,
    borderColor:
      theme === 'light' ? 'rgba(15, 23, 42, 0.08)' : withAlpha(resolvedSubtitleColor, 0.18),
    boxShadow:
      theme === 'light'
        ? `0 28px 60px -34px rgba(15, 23, 42, 0.18)`
        : `0 30px 72px -36px ${withAlpha(palette.gradientEnd, 0.72)}`,
  } as const;
  const subtleControlStyle = {
    backgroundColor: withAlpha(palette.darkMuted, 0.18),
    borderColor: withAlpha(resolvedSubtitleColor, 0.18),
    boxShadow: `inset 0 1px 0 ${withAlpha(resolvedTitleColor, 0.12)}`,
  } as const;
  const activeTransportStyle = {
    background: `linear-gradient(180deg, ${withAlpha(palette.highlight, 0.26)} 0%, ${withAlpha(
      palette.vibrant,
      0.44
    )} 100%)`,
    borderColor: withAlpha(resolvedSubtitleColor, 0.22),
    boxShadow: `0 10px 28px -18px ${withAlpha(palette.vibrant, 0.55)}, inset 0 1px 0 ${withAlpha(
      resolvedTitleColor,
      0.18
    )}`,
  } as const;
  const accentControlStyle = {
    background: `linear-gradient(180deg, ${withAlpha(palette.highlight, 0.26)} 0%, ${withAlpha(
      palette.vibrant,
      0.44
    )} 100%)`,
    borderColor: withAlpha(resolvedSubtitleColor, 0.22),
    boxShadow: `0 10px 28px -18px ${withAlpha(palette.vibrant, 0.55)}, inset 0 1px 0 ${withAlpha(
      resolvedTitleColor,
      0.18
    )}`,
  } as const;
  const activeMiniControlStyle = {
    background: `linear-gradient(180deg, ${withAlpha(palette.highlight, 0.26)} 0%, ${withAlpha(
      palette.vibrant,
      0.44
    )} 100%)`,
    borderColor: withAlpha(resolvedSubtitleColor, 0.22),
    boxShadow: `0 10px 28px -18px ${withAlpha(palette.vibrant, 0.55)}, inset 0 1px 0 ${withAlpha(
      resolvedTitleColor,
      0.18
    )}`,
  } as const;

  return {
    accentControlStyle,
    activeMiniControlStyle,
    activeTransportStyle,
    dialogSurfaceStyle,
    displayDuration,
    displayRemaining,
    isGlass,
    palette,
    readableForeground,
    subtleControlStyle,
    surface,
    theme,
  };
}

export type MediaDialogController = ReturnType<typeof useMediaDialogController>;
