import { type CSSProperties, memo, useMemo } from 'react';
import {
  type CardSize,
  getCardGridAutoRowsStyle,
} from '@/app/components/shared/card-size-selector';
import { useBreakpointCols } from '@/app/hooks/use-breakpoint-cols';
import type { DeviceWithType } from '@/app/types/device.types';
import { useAutoScaledGridMeasurements } from '../hooks/use-auto-scaled-grid-measurements';
import { useProgressiveBatching } from '../hooks/use-progressive-batching';
import type { CustomCard } from '../stores/custom-cards-store';
import { DashboardCardItem } from './dashboard-card-item';
import {
  areCardIdsStable,
  getCardGridGapPx,
  getCardGridTargetWidth,
  isCustomCard,
} from './home-dashboard-overview.shared';

interface PresentationCardGridProps {
  cardIds: string[];
  gridCols?: number;
  allCards: Map<string, DeviceWithType | CustomCard>;
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  onUpdateCard?: (cardId: string, data: Record<string, unknown>) => void;
  showHero: boolean;
}

export const PresentationCardGrid = memo(function PresentationCardGrid({
  cardIds,
  gridCols,
  allCards,
  cardSizes,
  updateCardSize,
  onUpdateCard,
  showHero,
}: PresentationCardGridProps) {
  const breakpointCols = useBreakpointCols();
  const logicalGridCols = Math.max(1, Math.min(gridCols ?? breakpointCols, breakpointCols));
  const gridGapPx = getCardGridGapPx(breakpointCols);
  const resolvedCardSizes = useMemo(
    () =>
      cardIds.map((cardId) => {
        const entry = allCards.get(cardId);
        return cardSizes[cardId] ?? entry?.size ?? 'small';
      }),
    [allCards, cardIds, cardSizes]
  );
  const hasOnlyTinyCards = useMemo(
    () => resolvedCardSizes.length > 0 && resolvedCardSizes.every((size) => size === 'tiny'),
    [resolvedCardSizes]
  );
  const preferredRenderedGridCols = logicalGridCols * 2;
  const renderedGridCols = hasOnlyTinyCards ? 1 : preferredRenderedGridCols;

  const { microCardMinWidth, targetGridWidth } = useMemo(
    () => getCardGridTargetWidth(renderedGridCols, gridGapPx),
    [gridGapPx, renderedGridCols]
  );
  const { outerRef, innerRef, outerWidth, contentHeight } =
    useAutoScaledGridMeasurements(targetGridWidth);

  const autoScale =
    renderedGridCols > 1 && outerWidth > 0 ? Math.min(1, outerWidth / targetGridWidth) : 1;
  const isAutoScaled = autoScale < 0.999;
  const outerContainerStyle = useMemo(
    () => (isAutoScaled && contentHeight > 0 ? { height: contentHeight * autoScale } : undefined),
    [autoScale, contentHeight, isAutoScaled]
  );
  const innerContainerStyle = useMemo(
    () =>
      ({
        ...(isAutoScaled
          ? {
              transform: `scale(${autoScale})`,
              width: `${targetGridWidth}px`,
            }
          : {}),
      }) as CSSProperties,
    [autoScale, isAutoScaled, targetGridWidth]
  );
  const gridStyle = useMemo(
    () =>
      ({
        '--home-card-cols': renderedGridCols,
        '--home-card-min': `${microCardMinWidth}px`,
        ...getCardGridAutoRowsStyle(breakpointCols),
        gridTemplateColumns: 'repeat(var(--home-card-cols), minmax(var(--home-card-min), 1fr))',
      }) as CSSProperties,
    [breakpointCols, microCardMinWidth, renderedGridCols]
  );

  const visibleCount = useProgressiveBatching(cardIds.length, false);
  const visibleCardIds = useMemo(() => {
    if (!Number.isFinite(visibleCount)) {
      return cardIds;
    }

    return cardIds.slice(0, visibleCount);
  }, [cardIds, visibleCount]);

  return (
    <div ref={outerRef} className="relative w-full" style={outerContainerStyle}>
      <div
        ref={innerRef}
        className={`w-full${isAutoScaled ? ' absolute left-0 top-0 origin-top-left' : ''}`}
        style={innerContainerStyle}
      >
        <div className="grid w-full gap-3.5 md:gap-3 lg:gap-4" style={gridStyle}>
          {visibleCardIds.map((cardId) => {
            const entry = allCards.get(cardId);
            if (!entry) {
              return null;
            }

            const size = cardSizes[cardId] ?? entry.size;

            return !isCustomCard(entry) ? (
              <DashboardCardItem
                key={cardId}
                id={cardId}
                device={entry}
                size={size}
                isEditMode={false}
                handleSizeChange={updateCardSize}
                allowExtraLargeSizes={showHero}
              />
            ) : (
              <DashboardCardItem
                key={cardId}
                id={cardId}
                card={entry}
                size={size}
                isEditMode={false}
                handleSizeChange={updateCardSize}
                onUpdateCard={onUpdateCard}
                allowExtraLargeSizes={showHero}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}, arePresentationCardGridPropsEqual);

function arePresentationCardGridPropsEqual(
  previous: PresentationCardGridProps,
  next: PresentationCardGridProps
) {
  return (
    previous.gridCols === next.gridCols &&
    previous.updateCardSize === next.updateCardSize &&
    previous.onUpdateCard === next.onUpdateCard &&
    previous.showHero === next.showHero &&
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
