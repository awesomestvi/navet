import type { CardSize } from '@navet/app/components/shared/card-size';
import {
  navetAccessibilityTokens,
  navetRadiusTokens,
  navetSizeTokens,
  navetTypographyTokens,
} from './foundations';

export type NavetDensity = 'compact' | 'comfortable' | 'touch';
export type NavetButtonSize = 'compact' | 'small' | 'default' | 'touch';
export type NavetInputSize = 'small' | 'default' | 'touch';
export type NavetDialogMaxWidth = 'sm' | 'md' | 'lg';
export type NavetDialogHeight = 'tall' | 'capped' | undefined;

/**
 * Density policy:
 * - comfortable: default for general product use and mixed-input devices
 * - touch: the exceptional 42 px tier for controls that need extra separation or emphasis
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
    controlHeightPx: 40,
    iconButtonSizePx: 40,
    cardPaddingPx: 16,
    gridGapPx: 16,
    fontScale: 1,
    description: 'Default mode for tablets, laptops, and mixed input devices.',
  },
  touch: {
    controlHeightPx: navetAccessibilityTokens.exceptionalControlSizePx,
    iconButtonSizePx: navetAccessibilityTokens.exceptionalControlSizePx,
    cardPaddingPx: 20,
    gridGapPx: 20,
    fontScale: 1.06,
    description:
      'Exceptional touch-forward mode for controls that need more separation or emphasis.',
  },
} as const;

export const navetControlTokens = {
  button: {
    radiusClassName: navetRadiusTokens.action,
    apiSizes: {
      compact: {
        density: 'compact' as const,
        heightClassName: 'h-9',
        heightPx: navetDensityTokens.compact.controlHeightPx,
        iconOnlyClassName: navetSizeTokens.iconButton.sm,
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
      touch: {
        density: 'touch' as const,
        heightClassName: navetSizeTokens.controlHeight.lg,
        heightPx: navetDensityTokens.touch.controlHeightPx,
        iconOnlyClassName: navetSizeTokens.iconButton.lg,
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
        heightClassName: 'h-10',
        heightPx: navetDensityTokens.comfortable.controlHeightPx,
        iconOnlyClassName: navetSizeTokens.iconButton.md,
        paddingXClassName: 'px-4',
      },
      touch: {
        heightClassName: 'h-[42px]',
        heightPx: navetDensityTokens.touch.controlHeightPx,
        iconOnlyClassName: navetSizeTokens.iconButton.lg,
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
        className: navetSizeTokens.iconButton.md,
        sizePx: navetDensityTokens.comfortable.iconButtonSizePx,
      },
      touch: {
        className: navetSizeTokens.iconButton.lg,
        sizePx: navetDensityTokens.touch.iconButtonSizePx,
      },
    },
  },
  input: {
    radiusClassName: navetRadiusTokens.field,
    apiSizes: {
      small: {
        density: 'compact' as const,
        heightClassName: navetSizeTokens.controlHeight.sm,
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
        heightClassName: navetSizeTokens.controlHeight.md,
        heightPx: navetDensityTokens.comfortable.controlHeightPx,
        insetClassName: navetSizeTokens.fieldInset,
        leadingPaddingClassName: 'pl-10',
        trailingPaddingClassName: 'pr-10',
        idlePaddingClassName: 'px-4',
        idlePaddingLeftClassName: 'pl-4',
        idlePaddingRightClassName: 'pr-4',
      },
      touch: {
        density: 'touch' as const,
        heightClassName: navetSizeTokens.controlHeight.lg,
        heightPx: navetDensityTokens.touch.controlHeightPx,
        insetClassName: 'px-4 py-2.5',
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
        heightPx: navetDensityTokens.touch.controlHeightPx,
        insetClassName: 'px-4 py-2.5',
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

export function getBaseCardRadiusClassName(_size: CardSize) {
  return navetRadiusTokens.panelInset;
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
