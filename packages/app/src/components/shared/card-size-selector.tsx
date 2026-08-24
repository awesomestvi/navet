import { SheetSurface, SheetSurfaceHeader } from '@navet/app/components/primitives/sheet-surface';
import { useI18n, useMediaQuery, useTheme } from '@navet/app/hooks';
import type { TranslationKey } from '@navet/app/i18n';
import * as Popover from '@radix-ui/react-popover';
import { Maximize2 } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import { CardEditActionButton } from './card-edit-action-button';
import type { CardSize } from './card-size';
import { getThemeColorValue } from './theme/theme-colors';
import { getThemeSurfaceTokens } from './theme/theme-surface-tokens';

export type { CardSize } from './card-size';
export {
  getCardGridAutoRowsStyle,
  getCardSizeOverlayStyle,
  getDashboardCardFootprint,
  getDashboardCardGridGapPx,
  getDashboardCardGridMetrics,
  getDashboardCardGridSpan,
  getStandardCardPadding,
  PHONE_SMALL_CARD_TARGET_HEIGHT_PX,
  PHONE_SMALL_CARD_TARGET_WIDTH_PX,
} from './card-size';

interface CardSizeSelectorProps {
  currentSize: CardSize;
  onSizeChange: (size: CardSize) => void;
  allowedSizes?: CardSize[];
  triggerSize?: CardSize;
  triggerInline?: boolean;
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
  labelKey: TranslationKey;
  description: string;
  dimensionsKey: TranslationKey;
  cols: number;
  rows: number;
}[] = [
  {
    value: 'tiny',
    labelKey: 'cardSize.tiny.label',
    description: '0.5 × 0.5',
    dimensionsKey: 'cardSize.tiny.description',
    cols: 0.5,
    rows: 0.5,
  },
  {
    value: 'extra-small',
    labelKey: 'cardSize.extraSmall.label',
    description: '1 × 0.5',
    dimensionsKey: 'cardSize.extraSmall.description',
    cols: 1,
    rows: 0.5,
  },
  {
    value: 'small',
    labelKey: 'cardSize.small.label',
    description: '1 × 1',
    dimensionsKey: 'cardSize.small.description',
    cols: 1,
    rows: 1,
  },
  {
    value: 'medium',
    labelKey: 'cardSize.medium.label',
    description: '2 × 1',
    dimensionsKey: 'cardSize.medium.description',
    cols: 2,
    rows: 1,
  },
  {
    value: 'medium-vertical',
    labelKey: 'cardSize.mediumVertical.label',
    description: '1 × 2',
    dimensionsKey: 'cardSize.mediumVertical.description',
    cols: 1,
    rows: 2,
  },
  {
    value: 'large',
    labelKey: 'cardSize.large.label',
    description: '2 × 2',
    dimensionsKey: 'cardSize.large.description',
    cols: 2,
    rows: 2,
  },
  {
    value: 'extra-large',
    labelKey: 'cardSize.extraLarge.label',
    description: '3 × 2',
    dimensionsKey: 'cardSize.extraLarge.description',
    cols: 3,
    rows: 2,
  },
  {
    value: 'extra-wide',
    labelKey: 'cardSize.extraWide.label',
    description: '6 × 2',
    dimensionsKey: 'cardSize.extraWide.description',
    cols: 6,
    rows: 2,
  },
];

export const CardSizeSelector = memo(function CardSizeSelector({
  currentSize,
  onSizeChange,
  allowedSizes,
  triggerSize,
  triggerInline = false,
  options,
}: CardSizeSelectorProps) {
  const { t } = useI18n();
  const { theme, primaryColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [open, setOpen] = useState(false);
  const isPhone = useMediaQuery('(max-width: 639px)');
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const accentColor = getThemeColorValue(primaryColor);

  const inactiveButtonBorderColor =
    theme === 'light' ? 'rgba(15,23,42,0.05)' : 'rgba(255,255,255,0.06)';
  const activeAccentBgAlpha = theme === 'light' ? '00' : '22';
  const arrowFillClass = theme === 'light' ? 'fill-white' : 'fill-[#1c1c1e]';

  const sourceSizes =
    options ??
    sizes.map(({ labelKey, dimensionsKey, ...size }) => ({
      ...size,
      label: t(labelKey),
      dimensions: t(dimensionsKey),
    }));
  const availableSizes = allowedSizes
    ? sourceSizes.filter((size) => allowedSizes.includes(size.value))
    : sourceSizes;
  const selectedSize =
    availableSizes.find((size) => size.value === currentSize) ?? availableSizes[0];

  const selectorContent = (
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
              className="flex h-16 w-16 items-center justify-center rounded-[20px] border transition-[color,background-color,border-color,box-shadow,opacity,transform,filter] duration-200"
              style={{
                borderColor: isActive ? `${accentColor}80` : inactiveButtonBorderColor,
                backgroundColor: isActive
                  ? theme === 'light'
                    ? '#ffffff'
                    : `${accentColor}${activeAccentBgAlpha}`
                  : 'transparent',
                boxShadow:
                  isActive && theme === 'light'
                    ? '0 1px 2px rgba(15,23,42,0.04)'
                    : isActive
                      ? `inset 0 0 0 1px ${accentColor}28`
                      : 'none',
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
          <div className={`text-sm font-semibold ${surface.textPrimary}`}>{selectedSize.label}</div>
          <div className={`mt-1 text-xs ${surface.textSecondary}`}>
            {selectedSize.description} • {selectedSize.dimensions}
          </div>
        </div>
      ) : null}
    </div>
  );
  const trigger = (
    <CardEditActionButton
      ref={triggerRef}
      cardSize={triggerSize ?? currentSize}
      Icon={Maximize2}
      theme={theme}
      placement="top-right"
      variant="accent"
      inline={triggerInline}
      aria-label={t('dashboard.edit.resizeCard')}
      aria-expanded={open}
      aria-haspopup="dialog"
      className="z-500 group cursor-pointer"
      onClick={(event) => {
        event.stopPropagation();
        if (isPhone) setOpen(true);
      }}
    />
  );

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
    <>
      {isPhone ? (
        trigger
      ) : (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>{trigger}</Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className={`z-[920] rounded-[30px] border p-3 shadow-2xl backdrop-blur-xl ${surface.panel} ${surface.border}`}
              sideOffset={8}
            >
              {selectorContent}
              <Popover.Arrow className={arrowFillClass} />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
      {isPhone ? (
        <SheetSurface
          isOpen={open}
          onOpenChange={setOpen}
          title={t('dashboard.edit.resizeCard')}
          description={t('dashboard.edit.resizeCard')}
          accentColor={accentColor}
          bodyClassName="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <div className="space-y-4">
            <SheetSurfaceHeader
              title={t('dashboard.edit.resizeCard')}
              closeLabel={t('common.closeDialog')}
              onClose={() => setOpen(false)}
            />
            {selectorContent}
          </div>
        </SheetSurface>
      ) : null}
    </>
  );
});

function getSizeGlyphTokens(
  theme: 'glass' | 'dark' | 'light' | 'black',
  active: boolean,
  accentColor: string
) {
  const strokeColor = active
    ? theme === 'light'
      ? '#0f172a'
      : 'rgba(255,255,255,0.96)'
    : theme === 'light'
      ? 'rgba(17,24,39,0.78)'
      : 'rgba(255,255,255,0.88)';
  const fillColor = active
    ? theme === 'light'
      ? 'rgba(255,255,255,0.96)'
      : `${accentColor}20`
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
    size.value === 'extra-large' || size.value === 'extra-wide'
      ? 5
      : size.value === 'large' || size.value === 'medium'
        ? 5
        : 4;

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
      return 'col-span-4 row-span-4 md:col-span-6'; // Large on mobile, 3 logical columns × 2 rows otherwise
    case 'extra-wide':
      return 'col-span-12 row-span-4'; // 6 logical columns × 2 rows
    default:
      return 'col-span-2 row-span-2';
  }
}

export function getResponsiveCardSize(size: CardSize, logicalColumns: number): CardSize {
  if (size === 'extra-wide') {
    if (logicalColumns <= 2) return 'large';
    if (logicalColumns <= 4) return 'extra-large';
  }

  return size === 'extra-large' && logicalColumns <= 2 ? 'large' : size;
}

export function getDashboardGridColumnCount(logicalColumns: number): number {
  return logicalColumns * 2;
}

export function getCardSizeRatio(size: CardSize): { cols: number; rows: number } {
  return sizes.find((s) => s.value === size) ?? { cols: 1, rows: 1 };
}

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
