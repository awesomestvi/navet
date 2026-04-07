import type { CSSProperties } from 'react';
import { cn } from '@/app/components/ui/utils';
import type { ThemeType } from '@/app/hooks';

/**
 * Navet foundation tokens
 *
 * These are the first shared layout/interaction decisions that primitives should
 * align to before introducing more component variants. They intentionally stay
 * small and class-oriented so they fit the existing Tailwind-first codebase.
 */

export const navetSpacingTokens = {
  inline: {
    xs: 'gap-1.5',
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
  },
  stack: {
    xs: 'space-y-1.5',
    sm: 'space-y-2',
    md: 'space-y-3',
    lg: 'space-y-4',
    xl: 'space-y-5',
  },
  inset: {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
    xl: 'p-6',
  },
} as const;

export const navetSizeTokens = {
  controlHeight: {
    sm: 'min-h-9',
    md: 'min-h-10',
    lg: 'min-h-12',
  },
  fieldInset: 'px-4 py-3',
  buttonInset: 'px-4 py-2',
  iconButton: {
    sm: 'h-9 w-9',
    md: 'h-10 w-10',
  },
  textareaMinHeight: 'min-h-28',
} as const;

export const navetTypographyTokens = {
  body: 'text-sm leading-6',
  helper: 'text-xs',
  label: 'text-sm font-medium',
  control: 'text-sm font-medium',
  caption: 'text-[11px]',
  dense: 'text-[11px] leading-5',
  eyebrow: 'text-[11px] font-semibold uppercase tracking-[0.18em]',
  titleSm: 'text-xs font-semibold',
  titleMd: 'text-base font-semibold',
  sectionHeading: 'text-lg font-semibold',
  featureHeading: 'text-xl font-semibold tracking-tight',
  pageHeading: 'text-2xl font-semibold tracking-tight',
  // Primary metric displayed on a card (temperature, percentage, count, etc.)
  cardMetricSm: 'text-3xl font-bold leading-none', // small + medium cards
  cardMetricLg: 'text-4xl font-bold leading-none', // large cards
  cardMetricXl: 'text-5xl font-semibold leading-none', // hero panels inside large cards
} as const;

export const navetRadiusTokens = {
  field: 'rounded-[22px]',
  action: 'rounded-[20px]',
  panelInset: 'rounded-[24px]',
  panel: 'rounded-[28px]',
  pill: 'rounded-full',
} as const;

export const navetIconSizeTokens = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
} as const;

export const navetSemanticColorTokens = {
  info: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  error: 'border-red-500/30 bg-red-500/10 text-red-200',
} as const;

export const navetFocusTokens = {
  base: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
  light: 'focus-visible:ring-gray-400 focus-visible:ring-offset-white',
  dark: 'focus-visible:ring-white/30 focus-visible:ring-offset-transparent',
} as const;

export function getThemeFocusRingClassName(theme: ThemeType) {
  return cn(
    navetFocusTokens.base,
    theme === 'light' ? navetFocusTokens.light : navetFocusTokens.dark
  );
}

export function getControlFocusStyles({
  isFocused,
  accentColor,
  invalidBorderColor,
  includeCaret = true,
}: {
  isFocused: boolean;
  accentColor: string;
  invalidBorderColor?: string;
  includeCaret?: boolean;
}): CSSProperties {
  return {
    borderColor: isFocused ? accentColor : invalidBorderColor,
    boxShadow: isFocused ? `0 0 0 2px ${accentColor}22` : undefined,
    ...(includeCaret ? { caretColor: accentColor } : {}),
  };
}
