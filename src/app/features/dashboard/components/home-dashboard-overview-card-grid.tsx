import { useDroppable } from '@dnd-kit/core';
import { rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { type CSSProperties, memo, type ReactNode, useEffect, useRef, useState } from 'react';
import { type CardSize, getCardSpanClass } from '@/app/components/shared/card-size-selector';
import { getDndTransformStyle } from '@/app/components/shared/dnd-transform-style';
import type { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n } from '@/app/hooks';
import { useBreakpointCols } from '@/app/hooks/use-breakpoint-cols';
import type { DeviceWithType } from '@/app/types/device.types';
import type { DragMeta, DropMeta } from '../hooks/use-home-dashboard-editor';
import type { CustomCard } from '../stores/custom-cards-store';
import { DashboardCardItem } from './dashboard-card-item';
import {
  areCardIdsStable,
  type CardGridProps,
  getCardGridGapPx,
  getCardGridTargetWidth,
  isCustomCard,
} from './home-dashboard-overview.shared';

export function FlowCanvas({
  cardIds,
  gridCols,
  allCards,
  cardSizes,
  updateCardSize,
  isEditMode,
  onUpdateCard,
  onRemoveFromLayout,
  showHero,
  surface,
  onOpenAddCardDialog,
}: {
  cardIds: string[];
  gridCols: number;
  allCards: Map<string, DeviceWithType | CustomCard>;
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  isEditMode: boolean;
  onUpdateCard?: (cardId: string, data: Record<string, unknown>) => void;
  onRemoveFromLayout: (cardId: string) => void;
  showHero: boolean;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  onOpenAddCardDialog?: (targetSectionId?: string) => void;
}) {
  const { t } = useI18n();

  return (
    <SortableContext
      items={cardIds.map((cardId) => `home-card-${cardId}`)}
      strategy={rectSortingStrategy}
    >
      <HomeContainerDropZone cardIds={cardIds}>
        {cardIds.length > 0 ? (
          <CardGrid
            cardIds={cardIds}
            gridCols={gridCols}
            allCards={allCards}
            cardSizes={cardSizes}
            updateCardSize={updateCardSize}
            isEditMode={isEditMode}
            onUpdateCard={onUpdateCard}
            onRemoveFromLayout={onRemoveFromLayout}
            showHero={showHero}
            onOpenAddCardDialog={onOpenAddCardDialog}
          />
        ) : (
          <EmptyCanvas
            label={t('dashboard.overview.emptyCanvas.title')}
            description={t('dashboard.overview.emptyCanvas.description')}
            surface={surface}
            onClick={onOpenAddCardDialog}
          />
        )}
      </HomeContainerDropZone>
    </SortableContext>
  );
}

export function EmptyCanvas({
  label,
  description: _description,
  surface,
  compact = false,
  onClick,
}: {
  label: string;
  description: string;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  compact?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-[20px] border-2 border-dashed text-center ${
        compact ? 'min-h-45 px-5 py-6' : 'min-h-55 px-5 py-8'
      } ${surface.panelMuted}`}
      style={{
        borderColor: 'rgba(255,255,255,0.12)',
        background:
          'radial-gradient(circle at top left, rgba(159,176,255,0.12), transparent 32%), radial-gradient(circle at bottom right, rgba(159,176,255,0.06), transparent 28%)',
      }}
    >
      <div className="space-y-2">
        <div className={`text-sm font-semibold ${surface.textPrimary}`}>{label}</div>
      </div>
    </div>
  );

  if (!onClick) {
    return content;
  }

  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      {content}
    </button>
  );
}

export const CardGrid = memo(function CardGrid({
  cardIds,
  sectionId,
  gridCols,
  allCards,
  cardSizes,
  updateCardSize,
  isEditMode,
  onUpdateCard,
  onRemoveFromLayout,
  showHero,
  onOpenAddCardDialog,
  sortable = true,
}: CardGridProps) {
  const { t } = useI18n();
  const breakpointCols = useBreakpointCols();
  const logicalGridCols = Math.max(1, Math.min(gridCols ?? breakpointCols, breakpointCols));
  const gridGapPx = getCardGridGapPx(breakpointCols);
  const hasTrailingAddCardSlot = isEditMode && Boolean(onOpenAddCardDialog);
  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [outerWidth, setOuterWidth] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const resolvedCardSizes = cardIds.map((cardId) => {
    const entry = allCards.get(cardId);
    return cardSizes[cardId] ?? entry?.size ?? 'small';
  });
  const hasOnlyTinyCards =
    resolvedCardSizes.length > 0 && resolvedCardSizes.every((size) => size === 'tiny');
  const preferredRenderedGridCols = logicalGridCols * 2;
  const renderedGridCols = isEditMode && hasOnlyTinyCards ? 1 : preferredRenderedGridCols;

  const { microCardMinWidth, targetGridWidth } = getCardGridTargetWidth(
    renderedGridCols,
    gridGapPx
  );
  const addCardSlotCols = Math.min(renderedGridCols, 2);
  const hasInlineAddCardSlot = hasTrailingAddCardSlot;

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || typeof ResizeObserver === 'undefined') {
      return;
    }

    const outerObserver = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width ?? outer.clientWidth;
      setOuterWidth((previous) => (previous === nextWidth ? previous : nextWidth));
    });
    const innerObserver = new ResizeObserver((entries) => {
      const nextHeight = entries[0]?.contentRect.height ?? inner.offsetHeight;
      setContentHeight((previous) => (previous === nextHeight ? previous : nextHeight));
    });

    outerObserver.observe(outer);
    innerObserver.observe(inner);

    setOuterWidth(outer.clientWidth);
    setContentHeight(inner.offsetHeight);

    return () => {
      outerObserver.disconnect();
      innerObserver.disconnect();
    };
  }, []);

  const autoScale =
    renderedGridCols > 1 && outerWidth > 0 ? Math.min(1, outerWidth / targetGridWidth) : 1;
  const isAutoScaled = autoScale < 0.999;

  return (
    <div
      ref={outerRef}
      className="relative w-full"
      style={isAutoScaled && contentHeight > 0 ? { height: contentHeight * autoScale } : undefined}
    >
      <div
        ref={innerRef}
        className={`w-full${isAutoScaled ? ' absolute left-0 top-0 origin-top-left' : ''}`}
        style={
          {
            ...(isAutoScaled
              ? {
                  transform: `scale(${autoScale})`,
                  width: `${targetGridWidth}px`,
                }
              : {}),
          } as CSSProperties
        }
      >
        <div
          className={`grid w-full auto-rows-[87px] gap-2 md:gap-3 lg:gap-4 ${
            hasInlineAddCardSlot ? 'grid-flow-row' : 'grid-flow-row-dense'
          }`}
          style={
            {
              '--home-card-cols': renderedGridCols,
              '--home-card-min': `${microCardMinWidth}px`,
              gridTemplateColumns:
                'repeat(var(--home-card-cols), minmax(var(--home-card-min), 1fr))',
            } as CSSProperties
          }
        >
          {cardIds.map((cardId) => {
            const entry = allCards.get(cardId);
            if (!entry) {
              return null;
            }

            const size = cardSizes[cardId] ?? entry.size;
            const spanClass = getCardSpanClass(size);

            return (
              <HomeCardSlot
                key={cardId}
                sortable={sortable}
                cardId={cardId}
                sectionId={sectionId}
                className={spanClass}
                content={
                  !isCustomCard(entry) ? (
                    <DashboardCardItem
                      id={cardId}
                      device={entry}
                      size={size}
                      isEditMode={isEditMode}
                      handleSizeChange={updateCardSize}
                      onRemoveFromLayout={onRemoveFromLayout}
                      allowExtraLargeSizes={showHero}
                    />
                  ) : (
                    <DashboardCardItem
                      id={cardId}
                      card={entry}
                      size={size}
                      isEditMode={isEditMode}
                      handleSizeChange={updateCardSize}
                      onUpdateCard={onUpdateCard}
                      onRemoveFromLayout={onRemoveFromLayout}
                      allowExtraLargeSizes={showHero}
                    />
                  )
                }
              />
            );
          })}
          {hasInlineAddCardSlot ? (
            <button
              type="button"
              onClick={() => {
                onOpenAddCardDialog?.();
              }}
              className="flex min-h-21.75 min-w-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-[20px] border-2 border-dashed px-4 text-center"
              style={{
                gridColumn: `span ${addCardSlotCols} / span ${addCardSlotCols}`,
                borderColor: 'rgba(255,255,255,0.16)',
                background:
                  'radial-gradient(circle at top left, rgba(159,176,255,0.1), transparent 34%), radial-gradient(circle at bottom right, rgba(159,176,255,0.06), transparent 28%)',
              }}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <Plus className="h-4 w-4 text-white/80" />
              </span>
              <span className="text-sm font-semibold text-white/90">
                {t('dashboard.addCard.title')}
              </span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}, areCardGridPropsEqual);

function HomeContainerDropZone({
  children,
  sectionId,
  cardIds,
}: {
  children: ReactNode;
  sectionId?: string;
  cardIds: string[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: sectionId ? `home-container-${sectionId}` : 'home-container-flow',
    data: { type: 'container', sectionId } satisfies DropMeta,
  });

  return (
    <div
      ref={setNodeRef}
      className={isOver && cardIds.length === 0 ? 'rounded-3xl ring-1 ring-white/20' : undefined}
    >
      {children}
    </div>
  );
}

function SortableHomeCard({
  cardId,
  sectionId,
  className,
  children,
}: {
  cardId: string;
  sectionId?: string;
  className: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `home-card-${cardId}`,
    data: { source: 'home', cardId, sectionId, type: 'card' } as DragMeta & DropMeta,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={getDndTransformStyle(transform, transition)}
      className={`${className} relative h-full cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-40' : ''}`}
      data-card-id={cardId}
    >
      {children}
    </div>
  );
}

function HomeCardSlot({
  sortable,
  cardId,
  sectionId,
  className,
  content,
}: {
  sortable: boolean;
  cardId: string;
  sectionId?: string;
  className: string;
  content: ReactNode;
}) {
  if (!sortable) {
    return content;
  }

  return (
    <SortableHomeCard cardId={cardId} sectionId={sectionId} className={className}>
      {content}
    </SortableHomeCard>
  );
}

function areCardGridPropsEqual(previous: CardGridProps, next: CardGridProps) {
  return (
    previous.sectionId === next.sectionId &&
    previous.gridCols === next.gridCols &&
    previous.updateCardSize === next.updateCardSize &&
    previous.isEditMode === next.isEditMode &&
    previous.onUpdateCard === next.onUpdateCard &&
    previous.onRemoveFromLayout === next.onRemoveFromLayout &&
    previous.showHero === next.showHero &&
    previous.onOpenAddCardDialog === next.onOpenAddCardDialog &&
    previous.sortable === next.sortable &&
    areCardIdsStable(
      previous.cardIds,
      next.cardIds,
      previous.allCards,
      next.allCards,
      previous.cardSizes,
      next.cardSizes
    )
  );
}
