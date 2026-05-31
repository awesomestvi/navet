import type { ThemeType } from '@navet/app/hooks/use-theme';
import type { CSSProperties } from 'react';
import { withTintAlpha } from './custom-card-tint-surface';

export interface RSSControlPillStyleParams {
  accentColor: string;
  isActive: boolean;
  theme: ThemeType;
  textPrimaryColor: string;
  textSecondaryColor: string;
}

export function getRSSControlPillStyle({
  accentColor,
  isActive,
  theme,
  textPrimaryColor,
  textSecondaryColor,
}: RSSControlPillStyleParams): CSSProperties {
  const alpha = {
    activeBgTop: theme === 'light' ? 0.14 : 0.26,
    activeBgBottom: theme === 'light' ? 0.08 : 0.14,
    activeBorder: theme === 'light' ? 0.28 : 0.24,
    inactiveBg: theme === 'light' ? 0.05 : 0.08,
    inactiveBorder: theme === 'light' ? 0.18 : 0.14,
    activeShadow: theme === 'light' ? 0.2 : 0.34,
    activeShadowInner: theme === 'light' ? 0.16 : 0.22,
  };

  return {
    color: isActive ? textPrimaryColor : textSecondaryColor,
    borderColor: isActive
      ? withTintAlpha(accentColor, alpha.activeBorder)
      : withTintAlpha(accentColor, alpha.inactiveBorder),
    background: isActive
      ? `linear-gradient(180deg, ${withTintAlpha(accentColor, alpha.activeBgTop)} 0%, ${withTintAlpha(accentColor, alpha.activeBgBottom)} 100%)`
      : withTintAlpha(accentColor, alpha.inactiveBg),
    boxShadow: isActive
      ? `inset 0 1px 0 ${withTintAlpha(accentColor, alpha.activeShadowInner)}, 0 8px 20px -16px ${withTintAlpha(accentColor, alpha.activeShadow)}`
      : 'none',
  };
}

export interface RSSSkeletonStyleParams {
  theme: ThemeType;
  accentColor: string;
}

export function getRSSSkeletonStyles({
  theme,
  accentColor,
}: RSSSkeletonStyleParams): Record<string, CSSProperties> {
  const alpha = {
    pillBg: theme === 'light' ? 0.1 : 0.18,
    pillBorder: theme === 'light' ? 0.16 : 0.24,
    blockBg: theme === 'light' ? 0.12 : 0.18,
    lineBg: theme === 'light' ? 0.16 : 0.24,
    dividerBg: theme === 'light' ? 0.12 : 0.16,
  };

  return {
    pill: {
      backgroundColor: withTintAlpha(accentColor, alpha.pillBg),
      borderColor: withTintAlpha(accentColor, alpha.pillBorder),
    },
    block: {
      backgroundColor: withTintAlpha(accentColor, alpha.blockBg),
    },
    line: {
      backgroundColor: withTintAlpha(accentColor, alpha.lineBg),
    },
    divider: {
      backgroundColor: withTintAlpha(accentColor, alpha.dividerBg),
    },
  };
}
