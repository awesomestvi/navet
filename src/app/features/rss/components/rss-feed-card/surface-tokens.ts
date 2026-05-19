import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import {
  getCustomCardTintSurface,
  normalizeCustomCardTint,
  withTintAlpha,
} from '@/app/components/shared/theme/custom-card-tint-surface';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import type { ThemeType } from '@/app/hooks';

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
  const readableBaseColor = resolvedTintColor ?? accentColor.base;
  const textTokens = getCardReadableTextTokens({
    theme,
    tone: 'orange',
    baseColor: readableBaseColor,
  });

  return {
    surface,
    accentColor,
    resolvedTintColor,
    cardStyle: tintSurface.panelStyle,
    glowStyle: tintSurface.glowStyle,
    textPrimaryColor: textTokens.titleColor,
    textSecondaryColor: textTokens.subtitleColor,
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
        ? withTintAlpha(accentColor.strong, 0.8)
        : withTintAlpha(textTokens.subtitleColor, resolvedTintColor ? 0.78 : 0.82),
    metadataTimeColor:
      theme === 'light'
        ? withTintAlpha(textTokens.subtitleColor, 0.72)
        : withTintAlpha(textTokens.subtitleColor, resolvedTintColor ? 0.62 : 0.7),
    excerptClassName: '',
    excerptColor:
      theme === 'light'
        ? withTintAlpha(textTokens.subtitleColor, 0.82)
        : withTintAlpha(textTokens.subtitleColor, resolvedTintColor ? 0.72 : 0.78),
    readMoreClassName: '',
    readMoreColor: textTokens.subtitleColor,
    iconWrapClassName: '',
    iconBackgroundColor:
      resolvedTintColor && theme !== 'light'
        ? withTintAlpha(resolvedTintColor, 0.22)
        : theme === 'light'
          ? accentColor.soft
          : `${accentColor.base}33`,
    iconColor: theme === 'light' ? readableBaseColor : '#ffffff',
    sourceColor:
      resolvedTintColor && theme !== 'light'
        ? withTintAlpha(resolvedTintColor, 0.88)
        : theme === 'light'
          ? accentColor.strong
          : accentColor.soft,
    thumbnailClassName:
      theme === 'light' ? 'bg-gray-100' : theme === 'glass' ? 'bg-white/8' : 'bg-zinc-800',
  };
}
