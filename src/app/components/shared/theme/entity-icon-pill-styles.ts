import type { CSSProperties } from 'react';
import {
  type CardSize,
  isCompactCardSize,
  isExtraSmallCardSize,
} from '@/app/components/shared/card-size-selector';
import {
  type CardTextTone,
  getCardReadableTextTokens,
  resolveCardToneBaseColor,
} from '@/app/components/shared/theme/card-readable-text-tokens';
import { resolvePrimaryColorToken } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import type { PrimaryColor, ThemeType } from '@/app/hooks/use-theme';

type EntityIconPillStyles = {
  badgeClassName: string;
  badgeStyle?: CSSProperties;
  iconClassName: string;
  iconStyle?: CSSProperties;
};

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
  accentColor,
  size,
  theme,
  tone,
}: {
  isActive: boolean;
  isInteractive: boolean;
  primaryColor: PrimaryColor;
  accentColor?: string | null;
  size: CardSize;
  theme: ThemeType;
  tone?: CardTextTone;
}): EntityIconPillStyles {
  const surface = getThemeSurfaceTokens(theme);
  const resolvedTone =
    tone ??
    (isActive
      ? primaryColor === 'custom'
        ? 'primary'
        : resolvePrimaryColorToken(primaryColor)
      : 'neutral');
  const baseColor = resolveCardToneBaseColor({ tone: resolvedTone, accentColor });
  const textTokens = getCardReadableTextTokens({
    theme,
    tone: resolvedTone,
    accentColor,
    backgroundColor:
      theme === 'light'
        ? '#ffffff'
        : theme === 'glass'
          ? '#0f172a'
          : theme === 'contrast'
            ? '#000000'
            : '#09090b',
  });
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
            ? `${baseColor}1f`
            : theme === 'glass'
              ? `${baseColor}24`
              : theme === 'contrast'
                ? `${baseColor}26`
                : `${baseColor}2e`,
        borderColor:
          theme === 'light'
            ? `${baseColor}4f`
            : theme === 'glass'
              ? `${baseColor}54`
              : theme === 'contrast'
                ? `${baseColor}66`
                : `${baseColor}66`,
        boxShadow:
          theme === 'light'
            ? `0 0 0 2px ${baseColor}18, 0 10px 28px ${baseColor}2e`
            : theme === 'glass'
              ? `inset 0 1px 0 rgba(255,255,255,0.18), 0 12px 30px -20px ${baseColor}52`
              : theme === 'contrast'
                ? 'inset 0 1px 0 rgba(255,255,255,0.12)'
                : `0 0 0 1px ${baseColor}18, 0 12px 30px ${baseColor}22`,
      }
    : undefined;

  const iconStyle = isActive
    ? {
        color: textTokens.titleColor,
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
