import type { CSSProperties } from 'react';
import {
  type CardSize,
  isCompactCardSize,
  isExtraSmallCardSize,
} from '@/app/components/shared/card-size-selector';
import { resolvePrimaryColorToken } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import type { PrimaryColor, ThemeType } from '@/app/hooks/use-theme';

type EntityIconPillStyles = {
  badgeClassName: string;
  badgeStyle?: CSSProperties;
  iconClassName: string;
  iconStyle?: CSSProperties;
};

const accentColorMap = {
  orange: { bg: 'rgba(249, 115, 22, 0.24)', text: '#c2410c' },
  blue: { bg: 'rgba(59, 130, 246, 0.24)', text: '#1d4ed8' },
  green: { bg: 'rgba(34, 197, 94, 0.24)', text: '#15803d' },
  purple: { bg: 'rgba(168, 85, 247, 0.24)', text: '#7e22ce' },
  pink: { bg: 'rgba(236, 72, 153, 0.24)', text: '#be185d' },
  red: { bg: 'rgba(239, 68, 68, 0.24)', text: '#b91c1c' },
  yellow: { bg: 'rgba(234, 179, 8, 0.24)', text: '#a16207' },
  teal: { bg: 'rgba(20, 184, 166, 0.24)', text: '#0f766e' },
} as const;

function getBadgeSizeClass(size: CardSize) {
  if (isExtraSmallCardSize(size)) {
    return 'h-7 w-7';
  }

  if (isCompactCardSize(size) || size === 'medium') {
    return 'h-8 w-8';
  }

  return 'h-8 w-8';
}

function getIconSizeClass(size: CardSize) {
  if (isExtraSmallCardSize(size)) {
    return 'h-3.5 w-3.5';
  }

  if (isCompactCardSize(size) || size === 'medium') {
    return 'h-4 w-4';
  }

  return 'h-4 w-4';
}

export function getEntityIconPillStyles({
  isActive,
  isInteractive,
  primaryColor,
  size,
  theme,
}: {
  isActive: boolean;
  isInteractive: boolean;
  primaryColor: PrimaryColor;
  size: CardSize;
  theme: ThemeType;
}): EntityIconPillStyles {
  const surface = getThemeSurfaceTokens(theme);
  const accent = accentColorMap[resolvePrimaryColorToken(primaryColor)];
  const badgeSizeClass = getBadgeSizeClass(size);
  const iconSizeClass = getIconSizeClass(size);
  const interactiveClass = isInteractive
    ? 'cursor-pointer hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
    : '';
  const focusRingClass =
    theme === 'light'
      ? 'focus-visible:ring-gray-900/25 focus-visible:ring-offset-white'
      : 'focus-visible:ring-white/35 focus-visible:ring-offset-gray-950';

  const inactiveBadgeClass = (() => {
    if (theme === 'light') {
      return 'bg-gray-200 border border-gray-300/80';
    }

    if (theme === 'glass') {
      return 'bg-white/12 border border-white/16';
    }

    return 'bg-white/10 border border-white/14';
  })();

  const badgeStyle = isActive
    ? {
        backgroundColor:
          theme === 'light'
            ? '#ffffff'
            : theme === 'glass'
              ? accent.bg.replace('0.24', '0.16')
              : theme === 'contrast'
                ? 'rgba(0,0,0,1)'
                : accent.bg.replace('0.24', '0.28'),
        borderColor:
          theme === 'light'
            ? `${accent.text}55`
            : theme === 'glass'
              ? 'rgba(255,255,255,0.18)'
              : theme === 'contrast'
                ? 'rgba(255,255,255,0.28)'
                : `${accent.text}66`,
        boxShadow:
          theme === 'light'
            ? `0 0 0 2px ${accent.text}22, 0 10px 28px ${accent.text}40`
            : theme === 'glass'
              ? `inset 0 1px 0 rgba(255,255,255,0.18), 0 12px 30px -20px ${accent.text}66`
              : theme === 'contrast'
                ? 'inset 0 1px 0 rgba(255,255,255,0.12)'
                : `0 0 0 1px ${accent.text}18, 0 12px 30px ${accent.text}22`,
      }
    : undefined;

  const iconStyle = isActive
    ? {
        color: theme === 'glass' || theme === 'contrast' ? '#ffffff' : accent.text,
        filter: theme === 'light' ? undefined : 'drop-shadow(0 1px 4px rgba(0, 0, 0, 0.18))',
      }
    : undefined;

  return {
    badgeClassName: `${badgeSizeClass} rounded-full flex shrink-0 items-center justify-center transition-all duration-500 ${interactiveClass} ${focusRingClass} ${
      isActive ? 'border' : inactiveBadgeClass
    }`,
    badgeStyle,
    iconClassName: `${iconSizeClass} transition-colors duration-500 ${
      !isActive && theme === 'light' ? 'text-gray-700' : !isActive ? surface.textSecondary : ''
    }`,
    iconStyle,
  };
}
