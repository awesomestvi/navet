import * as Popover from '@radix-ui/react-popover';
import { Maximize2 } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import { useTheme } from '@/app/hooks';
import { CardEditActionButton } from './card-edit-action-button';
import type { CardSize } from './card-size';
import { getThemeColorValue } from './theme/theme-colors';
import { getThemeSurfaceTokens } from './theme/theme-surface-tokens';

export type { CardSize } from './card-size';
export { CARD_GRID_ROW_CLASS, getStandardCardPadding } from './card-size';

interface CardSizeSelectorProps {
  currentSize: CardSize;
  onSizeChange: (size: CardSize) => void;
  allowedSizes?: CardSize[];
  triggerSize?: CardSize;
  options?: {
    value: CardSize;
    label: string;
    description: string;
    dimensions: string;
    cols: number;
    rows: number;
  }[];
}

// Widget size labels reflect the actual responsive dashboard grid sizing
const sizes: {
  value: CardSize;
  label: string;
  description: string;
  dimensions: string;
  cols: number;
  rows: number;
}[] = [
  {
    value: 'tiny',
    label: 'Tiny',
    description: '0.5 × 0.5',
    dimensions: 'Micro tile',
    cols: 0.5,
    rows: 0.5,
  },
  {
    value: 'extra-small',
    label: 'Extra-Small',
    description: '1 × 0.5',
    dimensions: 'Compact tile',
    cols: 1,
    rows: 0.5,
  },
  {
    value: 'small',
    label: 'Small',
    description: '1 × 1',
    dimensions: 'Single tile',
    cols: 1,
    rows: 1,
  },
  {
    value: 'medium',
    label: 'Medium',
    description: '2 × 1',
    dimensions: 'Wide tile',
    cols: 2,
    rows: 1,
  },
  {
    value: 'medium-vertical',
    label: 'Medium Vertical',
    description: '1 × 2',
    dimensions: 'Tall tile',
    cols: 1,
    rows: 2,
  },
  {
    value: 'large',
    label: 'Large',
    description: '2 × 2',
    dimensions: 'Large tile',
    cols: 2,
    rows: 2,
  },
  {
    value: 'extra-large',
    label: 'Extra-Large',
    description: '3 × 2',
    dimensions: 'Extra-large tile',
    cols: 3,
    rows: 2,
  },
];

export const CardSizeSelector = memo(function CardSizeSelector({
  currentSize,
  onSizeChange,
  allowedSizes,
  triggerSize,
  options,
}: CardSizeSelectorProps) {
  const { theme, primaryColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const accentColor = getThemeColorValue(primaryColor);

  const inactiveButtonBorderColor =
    theme === 'light' ? 'rgba(15,23,42,0.05)' : 'rgba(255,255,255,0.06)';
  const activeAccentBgAlpha = theme === 'light' ? '18' : '22';
  const arrowFillClass = theme === 'light' ? 'fill-white' : 'fill-[#1c1c1e]';

  const sourceSizes = options ?? sizes;
  const availableSizes = allowedSizes
    ? sourceSizes.filter((size) => allowedSizes.includes(size.value))
    : sourceSizes;
  const selectedSize =
    availableSizes.find((size) => size.value === currentSize) ?? availableSizes[0];

  useEffect(() => {
    const draggableCard = triggerRef.current?.closest('[data-draggable-card="true"]');
    if (!draggableCard) {
      return;
    }

    if (open) {
      draggableCard.setAttribute('data-size-selector-open', 'true');
    } else {
      draggableCard.removeAttribute('data-size-selector-open');
    }

    return () => {
      draggableCard.removeAttribute('data-size-selector-open');
    };
  }, [open]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <CardEditActionButton
          ref={triggerRef}
          cardSize={triggerSize ?? currentSize}
          Icon={Maximize2}
          placement="top-right"
          className="z-50 group cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={`z-50 rounded-[30px] border p-3 shadow-2xl backdrop-blur-xl ${surface.panel} ${surface.border}`}
          sideOffset={8}
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {availableSizes.map((size) => {
                const isActive = currentSize === size.value;

                return (
                  <button
                    type="button"
                    key={size.value}
                    aria-label={`${size.label} (${size.description})`}
                    title={size.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSizeChange(size.value);
                      setOpen(false);
                    }}
                    className="flex h-16 w-16 items-center justify-center rounded-[20px] border transition-all duration-200"
                    style={{
                      borderColor: isActive ? `${accentColor}30` : inactiveButtonBorderColor,
                      backgroundColor: isActive
                        ? `${accentColor}${activeAccentBgAlpha}`
                        : 'transparent',
                      boxShadow: isActive ? `inset 0 0 0 1px ${accentColor}28` : 'none',
                    }}
                  >
                    <SizePreviewGlyph
                      size={size}
                      active={isActive}
                      accentColor={accentColor}
                      theme={theme}
                    />
                  </button>
                );
              })}
            </div>

            {selectedSize ? (
              <div className="px-1 text-center">
                <div className={`text-sm font-semibold ${surface.textPrimary}`}>
                  {selectedSize.label}
                </div>
                <div className={`mt-0.5 text-[11px] ${surface.textSecondary}`}>
                  {selectedSize.description} • {selectedSize.dimensions}
                </div>
              </div>
            ) : null}
          </div>
          <Popover.Arrow className={arrowFillClass} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
});

function getSizeGlyphTokens(
  theme: 'glass' | 'dark' | 'light' | 'black',
  active: boolean,
  accentColor: string
) {
  const strokeColor = active
    ? theme === 'light'
      ? '#ffffff'
      : 'rgba(255,255,255,0.96)'
    : theme === 'light'
      ? 'rgba(17,24,39,0.78)'
      : 'rgba(255,255,255,0.88)';
  const fillColor = active
    ? `${accentColor}20`
    : theme === 'light'
      ? 'rgba(17,24,39,0.08)'
      : 'rgba(255,255,255,0.08)';
  return { strokeColor, fillColor };
}

const GLYPH_UNIT = 18;

function getPreviewGlyphRadius(size: CardSize) {
  switch (size) {
    case 'tiny':
      return 'rounded-[3px]';
    case 'extra-small':
      return 'rounded-[4px]';
    case 'small':
    case 'medium':
      return 'rounded-[5px]';
    default:
      return 'rounded-[8px]';
  }
}

function getPreviewGlyphUnit(size: CardSize) {
  switch (size) {
    case 'tiny':
    case 'extra-small':
    case 'small':
    case 'medium':
      return 20;
    default:
      return GLYPH_UNIT;
  }
}

function SizePreviewGlyph({
  size,
  active,
  accentColor,
  theme,
}: {
  size: { value: CardSize; cols: number; rows: number };
  active: boolean;
  accentColor: string;
  theme: 'glass' | 'dark' | 'light' | 'black';
}) {
  const { strokeColor, fillColor } = getSizeGlyphTokens(theme, active, accentColor);
  const glyphUnit = getPreviewGlyphUnit(size.value);
  const w = size.cols * glyphUnit;
  const h = size.rows * glyphUnit;
  const chipSize =
    size.value === 'extra-large' ? 5 : size.value === 'large' || size.value === 'medium' ? 5 : 4;

  if (size.value === 'extra-small') {
    return (
      <div
        className={`relative border ${getPreviewGlyphRadius(size.value)}`}
        style={{ width: w, height: h, borderColor: strokeColor }}
      >
        <div
          className="absolute left-[4px] top-1/2 rounded-[3px] -translate-y-1/2"
          style={{ width: '4px', height: '4px', backgroundColor: strokeColor }}
        />
      </div>
    );
  }

  const cornerInset =
    size.value === 'tiny' ? '3px' : size.value === 'medium-vertical' ? '4px' : '5px';

  return (
    <div
      className={`relative border ${getPreviewGlyphRadius(size.value)}`}
      style={{
        width: w,
        height: h,
        borderColor: strokeColor,
        backgroundColor: size.value === 'tiny' ? fillColor : 'transparent',
      }}
    >
      {size.value === 'tiny' ? null : (
        <div
          className="absolute rounded-[3px]"
          style={{
            top: cornerInset,
            left: cornerInset,
            width: `${chipSize}px`,
            height: `${chipSize}px`,
            backgroundColor: strokeColor,
          }}
        />
      )}
    </div>
  );
}

export function getCardSpanClass(size: CardSize): string {
  switch (size) {
    case 'tiny':
      return 'col-span-1 row-span-1';
    case 'extra-small':
      return 'col-span-2 row-span-1';
    case 'small':
      return 'col-span-2 row-span-2'; // 1 logical column × 1 row
    case 'medium':
      return 'col-span-4 row-span-2'; // 2 logical columns × 1 row
    case 'medium-vertical':
      return 'col-span-2 row-span-4'; // 1 logical column × 2 rows
    case 'large':
      return 'col-span-4 row-span-4'; // 2 logical columns × 2 rows
    case 'extra-large':
      return 'col-span-6 row-span-4'; // 3 logical columns × 2 rows
    default:
      return 'col-span-2 row-span-2';
  }
}

export function getDashboardGridColumnCount(logicalColumns: number): number {
  return logicalColumns * 2;
}

export function getCardSizeRatio(size: CardSize): { cols: number; rows: number } {
  return sizes.find((s) => s.value === size) ?? { cols: 1, rows: 1 };
}

export const cardSizeOverlayClass: Record<CardSize, string> = {
  tiny: 'w-[87px] h-[87px]',
  'extra-small': 'w-[190px] h-[87px]',
  small: 'w-[190px] h-[190px]',
  medium: 'w-[396px] h-[190px]',
  'medium-vertical': 'w-[190px] h-[396px]',
  large: 'w-[396px] h-[396px]',
  'extra-large': 'w-[602px] h-[396px]',
};

export function getCompactCardSize(size: CardSize): Exclude<CardSize, 'tiny' | 'extra-small'> {
  if (size === 'tiny' || size === 'extra-small') {
    return 'small';
  }

  return size as Exclude<CardSize, 'tiny' | 'extra-small'>;
}

export function isTinyCardSize(size: CardSize): boolean {
  return size === 'tiny';
}

export function isExtraSmallCardSize(size: CardSize): boolean {
  return size === 'extra-small';
}

export function isCompactCardSize(size: CardSize): boolean {
  return size === 'tiny' || size === 'extra-small' || size === 'small';
}
