import type { CardSize } from '@/app/components/shared/card-size';
import {
  navetAccessibilityTokens,
  navetRadiusTokens,
  navetSizeTokens,
  navetTypographyTokens,
} from './foundations';

export type NavetDensity = 'compact' | 'comfortable' | 'touch';
export type NavetButtonSize = 'compact' | 'small' | 'default';
export type NavetInputSize = 'small' | 'default';
export type NavetDialogMaxWidth = 'sm' | 'md' | 'lg';
export type NavetDialogHeight = 'tall' | 'capped' | undefined;

/**
 * Density policy:
 * - comfortable: default for general product use and mixed-input devices
 * - touch: coarse-pointer / touch-first surfaces such as wall panels and kiosks
 * - compact: desktop or keyboard/mouse-heavy surfaces where denser UI helps
 */
export const navetDensityTokens = {
  compact: {
    controlHeightPx: 36,
    iconButtonSizePx: 36,
    cardPaddingPx: 12,
    gridGapPx: 12,
    fontScale: 0.94,
    description:
      'Desktop or keyboard/mouse-heavy screens. Do not use as the default on touch-first panels.',
  },
  comfortable: {
    controlHeightPx: 44,
    iconButtonSizePx: 44,
    cardPaddingPx: 16,
    gridGapPx: 16,
    fontScale: 1,
    description: 'Default mode for tablets, laptops, and mixed input devices.',
  },
  touch: {
    controlHeightPx: 48,
    iconButtonSizePx: navetAccessibilityTokens.preferredTouchTargetPx,
    cardPaddingPx: 20,
    gridGapPx: 20,
    fontScale: 1.06,
    description: 'Touch-first mode for wall panels, phones, tablets, and kiosk-style use.',
  },
} as const;

export const navetControlTokens = {
  button: {
    radiusClassName: navetRadiusTokens.action,
    apiSizes: {
      compact: {
        density: 'compact' as const,
        heightClassName: 'h-8',
        heightPx: 32,
        iconOnlyClassName: 'h-8 w-8',
        paddingXClassName: 'px-3',
        textClassName: navetTypographyTokens.dense,
      },
      small: {
        density: 'compact' as const,
        heightClassName: 'h-9',
        heightPx: navetDensityTokens.compact.controlHeightPx,
        iconOnlyClassName: navetSizeTokens.iconButton.sm,
        paddingXClassName: 'px-3.5',
        textClassName: navetTypographyTokens.control,
      },
      default: {
        density: 'comfortable' as const,
        heightClassName: 'h-10',
        heightPx: 40,
        iconOnlyClassName: navetSizeTokens.iconButton.md,
        paddingXClassName: 'px-4',
        textClassName: navetTypographyTokens.control,
      },
    },
    densitySizes: {
      compact: {
        heightClassName: 'h-9',
        heightPx: navetDensityTokens.compact.controlHeightPx,
        iconOnlyClassName: navetSizeTokens.iconButton.sm,
        paddingXClassName: 'px-3.5',
      },
      comfortable: {
        heightClassName: 'h-11',
        heightPx: navetDensityTokens.comfortable.controlHeightPx,
        iconOnlyClassName: 'h-11 w-11',
        paddingXClassName: 'px-4',
      },
      touch: {
        heightClassName: 'h-12',
        heightPx: navetDensityTokens.touch.controlHeightPx,
        iconOnlyClassName: 'h-12 w-12',
        paddingXClassName: 'px-5',
      },
    },
  },
  iconButton: {
    radiusClassName: navetRadiusTokens.pill,
    sizes: {
      compact: {
        className: navetSizeTokens.iconButton.sm,
        sizePx: navetDensityTokens.compact.iconButtonSizePx,
      },
      comfortable: {
        className: 'h-11 w-11',
        sizePx: navetDensityTokens.comfortable.iconButtonSizePx,
      },
      touch: {
        className: 'h-12 w-12',
        sizePx: navetDensityTokens.touch.iconButtonSizePx,
      },
    },
  },
  input: {
    radiusClassName: navetRadiusTokens.field,
    apiSizes: {
      small: {
        density: 'compact' as const,
        heightPx: navetDensityTokens.compact.controlHeightPx,
        insetClassName: 'px-3 py-2',
        leadingPaddingClassName: 'pl-10',
        trailingPaddingClassName: 'pr-10',
        idlePaddingClassName: 'px-3',
        idlePaddingLeftClassName: 'pl-3',
        idlePaddingRightClassName: 'pr-3',
      },
      default: {
        density: 'comfortable' as const,
        heightPx: navetDensityTokens.comfortable.controlHeightPx,
        insetClassName: navetSizeTokens.fieldInset,
        leadingPaddingClassName: 'pl-10',
        trailingPaddingClassName: 'pr-10',
        idlePaddingClassName: 'px-4',
        idlePaddingLeftClassName: 'pl-4',
        idlePaddingRightClassName: 'pr-4',
      },
    },
    densitySizes: {
      compact: {
        heightPx: navetDensityTokens.compact.controlHeightPx,
        insetClassName: 'px-3 py-2',
      },
      comfortable: {
        heightPx: navetDensityTokens.comfortable.controlHeightPx,
        insetClassName: navetSizeTokens.fieldInset,
      },
      touch: {
        heightPx: 52,
        insetClassName: 'px-4 py-3.5',
      },
    },
  },
  dialog: {
    radiusClassName: navetRadiusTokens.panel,
    bodyPaddingClassName: 'p-6',
    bodyPaddingPx: 24,
    headerRadiusTopPx: 28,
    maxWidthClassNames: {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
    },
    maxHeightClassNames: {
      tall: 'h-[85vh]',
      capped: 'max-h-[85vh]',
    },
  },
  card: {
    minHeightPx: 96,
    borderWidthPx: 1,
    densityPaddingClassNames: {
      compact: 'p-3',
      comfortable: 'p-4',
      touch: 'p-5',
    },
  },
} as const;

export function getButtonSizeTokens(size: NavetButtonSize) {
  return navetControlTokens.button.apiSizes[size];
}

export function getInputSizeTokens(size: NavetInputSize) {
  return navetControlTokens.input.apiSizes[size];
}

export function getDialogMaxWidthClassName(maxWidth: NavetDialogMaxWidth = 'md') {
  return navetControlTokens.dialog.maxWidthClassNames[maxWidth];
}

export function getDialogHeightClassName(height: NavetDialogHeight) {
  if (!height) {
    return '';
  }

  return navetControlTokens.dialog.maxHeightClassNames[height];
}

export function getBaseCardRadiusClassName(size: CardSize) {
  if (size === 'tiny') {
    return 'rounded-[26px]';
  }

  if (size === 'large' || size === 'extra-large') {
    return 'rounded-[32px]';
  }

  return 'rounded-3xl';
}

export function getBaseCardGapClassName(size: CardSize) {
  if (size === 'tiny') {
    return 'gap-2';
  }

  if (size === 'extra-small' || size === 'small') {
    return 'gap-2.5';
  }

  return 'gap-3';
}
