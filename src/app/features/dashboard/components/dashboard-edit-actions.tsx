import { Maximize2 } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { CardEditActionButton } from '@/app/components/shared/card-edit-action-button';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';

type ResizeMenuState = {
  cardId: string;
  cardType?: string;
  currentSize: CardSize;
  allowedSizes: CardSize[];
  top: number;
  left: number;
};

interface DashboardEditActionsProps {
  children: ReactNode;
  isEditMode: boolean;
  onDeleteCard?: (cardId: string) => void;
  onRemoveFromLayout?: (cardId: string) => void;
  onRemoveEntity?: (entityId: string) => void;
  onSizeChange: (id: string, size: CardSize) => void;
}

type SizeOption = {
  value: CardSize;
  label: string;
  description: string;
  dimensions: string;
  preview: string;
};

export function DashboardEditActions({
  children,
  isEditMode,
  onDeleteCard,
  onRemoveFromLayout,
  onRemoveEntity,
  onSizeChange,
}: DashboardEditActionsProps) {
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const accentColor = getThemeColorValue(primaryColor);
  const [resizeMenu, setResizeMenu] = useState<ResizeMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!resizeMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('[data-dashboard-edit-action="resize"]')) {
        return;
      }

      setResizeMenu(null);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [resizeMenu]);

  const sizeOptions = useMemo(() => {
    if (!resizeMenu) {
      return [];
    }

    const sourceOptions =
      resizeMenu.cardType === 'media' ? getMediaSizeOptions(t) : getDefaultSizeOptions();

    return sourceOptions.filter((option) => resizeMenu.allowedSizes.includes(option.value));
  }, [resizeMenu, t]);

  if (!isEditMode) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        onPointerDownCapture={(event) => {
          const actionTarget =
            event.target instanceof Element
              ? event.target.closest<HTMLElement>('[data-dashboard-edit-action]')
              : null;

          if (!actionTarget) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
        }}
        onClickCapture={(event) => {
          const actionTarget =
            event.target instanceof Element
              ? event.target.closest<HTMLElement>('[data-dashboard-edit-action]')
              : null;

          if (!actionTarget) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();

          const action = actionTarget.dataset.dashboardEditAction;
          const cardId = actionTarget.dataset.cardId;
          if (!action || !cardId) {
            return;
          }

          if (action === 'remove-entity' && onRemoveEntity) {
            onRemoveEntity(cardId);
            return;
          }

          if (action === 'remove-layout' && onRemoveFromLayout) {
            onRemoveFromLayout(cardId);
            return;
          }

          if (action === 'delete-card' && onDeleteCard) {
            if (window.confirm(t('widgets.deleteConfirm'))) {
              onDeleteCard(cardId);
            }
            return;
          }

          if (action === 'resize') {
            const currentSize = (actionTarget.dataset.cardSize as CardSize | undefined) ?? 'small';
            const cardType = actionTarget.dataset.cardType;
            const allowedSizes = (actionTarget.dataset.allowedSizes?.split(',').filter(Boolean) as
              | CardSize[]
              | undefined) ?? ['small', 'medium', 'large'];
            const rect = actionTarget.getBoundingClientRect();

            setResizeMenu({
              cardId,
              cardType,
              currentSize,
              allowedSizes,
              top: rect.bottom + 8,
              left: rect.right - 260,
            });
          }
        }}
      >
        {children}
      </div>

      {resizeMenu ? (
        <div
          ref={menuRef}
          className={`fixed z-[70] min-w-[260px] rounded-2xl border p-3 shadow-2xl backdrop-blur-xl ${surface.panel} ${surface.border}`}
          style={{
            top: `${Math.max(16, resizeMenu.top)}px`,
            left: `${Math.max(16, resizeMenu.left)}px`,
          }}
        >
          <div className="space-y-1.5">
            <h3
              className={`mb-2 px-1 text-xs font-semibold uppercase tracking-wider ${surface.textSecondary}`}
            >
              Widget Size
            </h3>
            {sizeOptions.map((size) => (
              <button
                type="button"
                key={size.value}
                onClick={() => {
                  onSizeChange(resizeMenu.cardId, size.value);
                  setResizeMenu(null);
                }}
                className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all duration-200 ${
                  resizeMenu.currentSize === size.value
                    ? ''
                    : `${surface.subtleBg} ${surface.hoverBg} ${surface.border}`
                }`}
                style={
                  resizeMenu.currentSize === size.value
                    ? {
                        backgroundColor:
                          theme === 'light' ? `${accentColor}12` : `${accentColor}18`,
                        borderColor: `${accentColor}55`,
                      }
                    : undefined
                }
              >
                <div
                  className={`mr-3 flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border ${
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
                        resizeMenu.currentSize === size.value
                          ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`
                          : theme === 'light'
                            ? 'linear-gradient(135deg, rgba(148,163,184,0.9), rgba(100,116,139,0.92))'
                            : 'linear-gradient(135deg, rgba(255,255,255,0.28), rgba(255,255,255,0.12))',
                    }}
                  />
                </div>
                <div className="flex-1 text-left">
                  <div className={`mb-0.5 text-sm font-semibold ${surface.textPrimary}`}>
                    {size.label}
                  </div>
                  <div className={`text-xs ${surface.textSecondary}`}>{size.dimensions}</div>
                  <div className={`text-[10px] ${surface.textSecondary}`}>{size.description}</div>
                </div>
                {resizeMenu.currentSize === size.value ? (
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: accentColor }}
                  />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

interface DashboardResizeTriggerProps {
  cardId: string;
  cardSize: CardSize;
  triggerSize?: CardSize;
  allowedSizes: CardSize[];
  cardType?: string;
}

export function DashboardResizeTrigger({
  cardId,
  cardSize,
  triggerSize,
  allowedSizes,
  cardType,
}: DashboardResizeTriggerProps) {
  if (allowedSizes.length <= 1) {
    return null;
  }

  return (
    <CardEditActionButton
      cardSize={triggerSize ?? cardSize}
      Icon={Maximize2}
      placement="top-right"
      className="z-50 group cursor-pointer"
      data-dashboard-edit-action="resize"
      data-card-id={cardId}
      data-card-size={cardSize}
      data-card-type={cardType}
      data-allowed-sizes={allowedSizes.join(',')}
      aria-label="Resize card"
    />
  );
}

function getDefaultSizeOptions(): SizeOption[] {
  return [
    {
      value: 'extra-small',
      label: 'Extra-Small',
      description: 'Compact tile',
      dimensions: '1 x 0.5',
      preview: 'h-3.5 w-7',
    },
    {
      value: 'small',
      label: 'Small',
      description: 'Single tile',
      dimensions: '1 x 1',
      preview: 'h-7 w-7',
    },
    {
      value: 'medium',
      label: 'Medium',
      description: 'Wide tile',
      dimensions: '2 x 1',
      preview: 'h-7 w-14',
    },
    {
      value: 'large',
      label: 'Large',
      description: 'Large tile',
      dimensions: '2 x 2',
      preview: 'h-14 w-14',
    },
    {
      value: 'hero',
      label: 'Hero',
      description: 'Full-width feature',
      dimensions: '6 x 3',
      preview: 'h-10 w-full',
    },
  ];
}

function getMediaSizeOptions(
  t: ReturnType<typeof useI18n>['t']
): Exclude<SizeOption, { value: 'extra-small' }>[] {
  return [
    {
      value: 'small',
      label: t('media.size.small'),
      description: t('media.size.squareTile'),
      dimensions: '1 x 1',
      preview: 'h-7 w-7',
    },
    {
      value: 'medium',
      label: t('media.size.medium'),
      description: t('media.size.wideTile'),
      dimensions: '2 x 1',
      preview: 'h-7 w-14',
    },
    {
      value: 'medium-vertical',
      label: t('media.size.mediumVertical'),
      description: t('media.size.verticalTile'),
      dimensions: '1 x 2',
      preview: 'h-14 w-7',
    },
    {
      value: 'large',
      label: t('media.size.large'),
      description: t('media.size.largeTile'),
      dimensions: '2 x 2',
      preview: 'h-14 w-14',
    },
  ];
}
