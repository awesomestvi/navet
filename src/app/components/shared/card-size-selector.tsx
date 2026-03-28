import * as Popover from '@radix-ui/react-popover';
import { Maximize2 } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import { useTheme } from '@/app/hooks';
import { CardEditActionButton } from './card-edit-action-button';
import type { CardSize } from './card-size';
import { getThemeColorValue } from './theme/theme-colors';
import { getThemeSurfaceTokens } from './theme/theme-surface-tokens';

export type { CardSize } from './card-size';

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
    preview: string;
  }[];
}

// Widget size labels reflect the actual responsive dashboard grid sizing
const sizes: {
  value: CardSize;
  label: string;
  description: string;
  dimensions: string;
  preview: string;
}[] = [
  {
    value: 'tiny',
    label: 'Tiny',
    description: '0.5 × 0.5',
    dimensions: 'Micro tile',
    preview: 'w-3.5 h-3.5',
  },
  {
    value: 'extra-small',
    label: 'Extra-Small',
    description: '1 × 0.5',
    dimensions: 'Compact tile',
    preview: 'w-7 h-3.5',
  },
  {
    value: 'small',
    label: 'Small',
    description: '1 × 1',
    dimensions: 'Single tile',
    preview: 'w-7 h-7',
  },
  {
    value: 'medium',
    label: 'Medium',
    description: '2 × 1',
    dimensions: 'Wide tile',
    preview: 'w-14 h-7',
  },
  {
    value: 'medium-vertical',
    label: 'Medium Vertical',
    description: '1 × 2',
    dimensions: 'Tall tile',
    preview: 'w-7 h-14',
  },
  {
    value: 'large',
    label: 'Large',
    description: '2 × 2',
    dimensions: 'Large tile',
    preview: 'w-14 h-14',
  },
  {
    value: 'hero',
    label: 'Hero',
    description: '6 × 3',
    dimensions: 'Full-width feature',
    preview: 'w-full h-10',
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

  const sourceSizes = options ?? sizes;
  const availableSizes = allowedSizes
    ? sourceSizes.filter((size) => allowedSizes.includes(size.value))
    : sourceSizes;

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
          className={`z-50 min-w-[260px] rounded-2xl border p-3 shadow-2xl backdrop-blur-xl ${surface.panel} ${surface.border}`}
          sideOffset={8}
        >
          <div className="space-y-1.5">
            <h3
              className={`mb-2 px-1 text-xs font-semibold uppercase tracking-wider ${surface.textSecondary}`}
            >
              Widget Size
            </h3>
            {availableSizes.map((size) => (
              <button
                type="button"
                key={size.value}
                onClick={(e) => {
                  e.stopPropagation();
                  onSizeChange(size.value);
                  setOpen(false); // Close popover after selection
                }}
                className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 ${
                  currentSize === size.value
                    ? ''
                    : `${surface.subtleBg} ${surface.hoverBg} ${surface.border}`
                }`}
                style={
                  currentSize === size.value
                    ? {
                        backgroundColor:
                          theme === 'light' ? `${accentColor}12` : `${accentColor}18`,
                        borderColor: `${accentColor}55`,
                      }
                    : undefined
                }
              >
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-lg border ${
                    theme === 'light' ? 'bg-black/[0.03]' : 'bg-black/20'
                  }`}
                  style={{
                    borderColor:
                      theme === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255,255,255,0.06)',
                  }}
                >
                  <div
                    className={`rounded-md shadow-lg ${size.preview}`}
                    style={{
                      background:
                        currentSize === size.value
                          ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`
                          : theme === 'light'
                            ? 'linear-gradient(135deg, rgba(148,163,184,0.9), rgba(100,116,139,0.92))'
                            : 'linear-gradient(135deg, rgba(255,255,255,0.28), rgba(255,255,255,0.12))',
                    }}
                  />
                </div>
                <div className="flex-1 text-left">
                  <div
                    className={`mb-0.5 text-sm font-semibold ${
                      currentSize === size.value ? surface.textPrimary : surface.textPrimary
                    }`}
                  >
                    {size.label}
                  </div>
                  <div className={`text-xs ${surface.textSecondary}`}>{size.dimensions}</div>
                  <div className={`text-[10px] ${surface.textSecondary}`}>{size.description}</div>
                </div>
                {currentSize === size.value && (
                  <div
                    className="h-1.5 w-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: accentColor }}
                  />
                )}
              </button>
            ))}
          </div>
          <Popover.Arrow className={theme === 'light' ? 'fill-white' : 'fill-[#1c1c1e]'} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
});

// Helper function to get grid span classes based on iOS widget size
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
    case 'hero':
      return 'col-span-full row-span-3'; // full zone width × 3 rows
    default:
      return 'col-span-2 row-span-2';
  }
}

export function getDashboardGridColumnCount(logicalColumns: number): number {
  return logicalColumns * 2;
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
