import { getCardReadableTextTokens } from '@navet/app/components/shared/theme/card-readable-text-tokens';
import {
  getCustomCardTintSurface,
  normalizeCustomCardTint,
  withTintAlpha,
} from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import type { ThemeType } from '@navet/app/hooks';

export type RSSFeedCardSurfaceTokens = ReturnType<typeof getRSSFeedCardSurfaceTokens>;

export function getRSSFeedCardSurfaceTokens(
  theme: ThemeType,
  accentColorValue: string,
  tintColor?: string
) {
  const surface = getThemeSurfaceTokens(theme);
  const accentColor = {
    strong: accentColorValue,
    base: accentColorValue,
    soft: withTintAlpha(accentColorValue, theme === 'light' ? 0.22 : 0.3),
  };
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const resolvedTintColor = normalizeCustomCardTint(tintColor);
  const textTokens = getCardReadableTextTokens({
    theme,
    tone: 'neutral',
    backgroundColor: tintSurface.backgroundColor,
  });
  const textPrimaryColor = tintSurface.textPrimaryColor ?? textTokens.titleColor;
  const textSecondaryColor = tintSurface.textSecondaryColor ?? textTokens.subtitleColor;

  return {
    surface,
    accentColor,
    resolvedTintColor,
    cardStyle: tintSurface.panelStyle,
    glowStyle: tintSurface.glowStyle,
    textPrimaryColor,
    textSecondaryColor,
    containerShadowClassName: '',
    overlayClassName:
      tintSurface.overlayClassName ??
      (theme === 'light' ? '' : theme === 'glass' ? 'bg-white/[0.03] backdrop-blur-sm' : ''),
    textSecondaryClassName: '',
    dividerClassName:
      theme === 'light' ? 'bg-gray-200/90' : theme === 'glass' ? 'bg-white/12' : 'bg-white/8',
    hoverClassName: '',
    dotClassName: theme === 'light' ? 'text-gray-400' : 'text-white/65',
    metadataSourceColor:
      theme === 'light'
        ? withTintAlpha(textSecondaryColor, 0.82)
        : withTintAlpha(textSecondaryColor, resolvedTintColor ? 0.78 : 0.82),
    metadataTimeColor:
      theme === 'light'
        ? withTintAlpha(textSecondaryColor, 0.72)
        : withTintAlpha(textSecondaryColor, resolvedTintColor ? 0.62 : 0.7),
    excerptClassName: '',
    excerptColor:
      theme === 'light'
        ? withTintAlpha(textSecondaryColor, 0.82)
        : withTintAlpha(textSecondaryColor, resolvedTintColor ? 0.72 : 0.78),
    readMoreClassName: '',
    readMoreColor: textSecondaryColor,
    iconWrapClassName: '',
    iconBackgroundColor:
      resolvedTintColor && theme !== 'light'
        ? withTintAlpha(resolvedTintColor, 0.22)
        : theme === 'light'
          ? accentColor.soft
          : `${accentColor.base}33`,
    iconColor: theme === 'light' ? textPrimaryColor : '#ffffff',
    sourceColor:
      resolvedTintColor && theme !== 'light'
        ? withTintAlpha(textSecondaryColor, 0.82)
        : theme === 'light'
          ? withTintAlpha(textSecondaryColor, 0.82)
          : withTintAlpha(textSecondaryColor, 0.78),
    thumbnailClassName:
      theme === 'light' ? 'bg-gray-100' : theme === 'glass' ? 'bg-white/8' : 'bg-zinc-800',
  };
}
