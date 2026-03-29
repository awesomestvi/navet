import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import type { MediaDialogProps } from './media-dialog.types';
import { formatMediaTime } from './media-time';
import { useMediaArtworkColors, withAlpha } from './use-media-artwork-colors';

type MediaDialogControllerInput = Pick<
  MediaDialogProps,
  | 'artwork'
  | 'artist'
  | 'durationSeconds'
  | 'elapsedSeconds'
  | 'entityId'
  | 'repeatMode'
  | 'shuffleEnabled'
  | 'title'
>;

export function useMediaDialogController({
  artwork,
  artist,
  durationSeconds,
  elapsedSeconds,
  entityId,
  repeatMode,
  shuffleEnabled,
  title,
}: MediaDialogControllerInput) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const isGlass = theme === 'glass';
  const palette = useMediaArtworkColors(artwork, theme, `${entityId}::${title}::${artist}`);
  const displayRemaining = formatMediaTime(Math.max(0, durationSeconds - elapsedSeconds));
  const displayDuration = durationSeconds > 0 ? formatMediaTime(durationSeconds) : '--:--';
  const dialogSurfaceStyle = {
    background:
      theme === 'light'
        ? `linear-gradient(165deg, ${withAlpha(palette.highlight, 0.95)} 0%, ${withAlpha(
            palette.dominant,
            0.92
          )} 42%, ${withAlpha(palette.gradientEnd, 0.9)} 100%)`
        : `radial-gradient(circle at top left, ${withAlpha(palette.highlight, 0.18)} 0%, transparent 28%), radial-gradient(circle at 78% 22%, ${withAlpha(
            palette.vibrant,
            0.18
          )} 0%, transparent 26%), linear-gradient(165deg, ${withAlpha(
            palette.dominant,
            0.94
          )} 0%, ${withAlpha(palette.darkMuted, 0.95)} 58%, ${withAlpha(
            palette.gradientEnd,
            0.98
          )} 100%)`,
    borderColor:
      theme === 'light' ? withAlpha(palette.vibrant, 0.18) : withAlpha(palette.highlight, 0.16),
    boxShadow:
      theme === 'light'
        ? `0 28px 60px -34px ${withAlpha(palette.darkMuted, 0.34)}`
        : `0 30px 72px -36px ${withAlpha(palette.gradientEnd, 0.72)}`,
  } as const;
  const subtleControlStyle = {
    background: `linear-gradient(180deg, ${withAlpha(
      shuffleEnabled || repeatMode !== 'off' ? palette.highlight : palette.highlight,
      theme === 'light' ? 0.22 : 0.14
    )} 0%, ${withAlpha(palette.darkMuted, theme === 'light' ? 0.2 : 0.18)} 100%)`,
    borderColor: withAlpha(palette.highlight, theme === 'light' ? 0.12 : 0.18),
    boxShadow: `0 14px 30px -22px ${withAlpha(palette.darkMuted, theme === 'light' ? 0.22 : 0.46)}`,
  } as const;
  const activeTransportStyle = {
    background: `linear-gradient(180deg, ${withAlpha(palette.highlight, 0.42)} 0%, ${withAlpha(
      palette.vibrant,
      0.82
    )} 100%)`,
    borderColor: withAlpha(palette.highlight, 0.24),
    boxShadow: `0 18px 42px -18px ${withAlpha(palette.vibrant, 0.54)}`,
  } as const;
  const accentControlStyle = {
    background: `linear-gradient(180deg, ${withAlpha(palette.highlight, 0.3)} 0%, ${withAlpha(
      palette.vibrant,
      0.72
    )} 100%)`,
    borderColor: withAlpha(palette.highlight, 0.24),
    boxShadow: `0 16px 36px -20px ${withAlpha(palette.vibrant, 0.46)}`,
  } as const;
  const activeMiniControlStyle = {
    background: `linear-gradient(180deg, ${withAlpha(palette.highlight, 0.26)} 0%, ${withAlpha(
      palette.vibrant,
      0.52
    )} 100%)`,
    borderColor: withAlpha(palette.highlight, 0.22),
    boxShadow: `0 12px 28px -18px ${withAlpha(palette.vibrant, 0.42)}`,
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
    subtleControlStyle,
    surface,
    theme,
  };
}

export type MediaDialogController = ReturnType<typeof useMediaDialogController>;
