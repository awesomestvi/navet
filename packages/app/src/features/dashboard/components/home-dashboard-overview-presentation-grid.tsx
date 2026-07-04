import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { memo } from 'react';
import { useHomeGridRuntime } from '../hooks/use-home-grid-runtime';
import type { CustomCard } from '../stores/custom-cards-store';
import { DashboardCardItem } from './dashboard-card-item';
import { areCardIdsStable, isCustomCard } from './home-dashboard-overview.shared';

interface PresentationCardGridProps {
  cardIds: string[];
  gridCols?: number;
  allCards: Map<string, DeviceWithType | CustomCard>;
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  onUpdateCard?: (cardId: string, data: Record<string, unknown>) => void;
  showHero: boolean;
  densePerformanceMode?: boolean;
}

export const PresentationCardGrid = memo(function PresentationCardGrid({
  cardIds,
  gridCols,
  allCards,
  cardSizes,
  updateCardSize,
  onUpdateCard,
  showHero,
  densePerformanceMode = false,
}: PresentationCardGridProps) {
  const {
    gridStyle,
    innerContainerStyle,
    innerRef,
    isAutoScaled,
    outerContainerStyle,
    outerRef,
    visibleCardIds,
  } = useHomeGridRuntime({
    allCards,
    cardIds,
    cardSizes,
    densePerformanceMode,
    gridCols,
    isEditMode: false,
  });

  return (
    <div ref={outerRef} className="relative w-full" style={outerContainerStyle}>
      <div
        ref={innerRef}
        className={`w-full${isAutoScaled ? ' absolute left-0 top-0 origin-top-left' : ''}`}
        style={innerContainerStyle}
      >
        <div className="grid w-full gap-3 lg:gap-4" style={gridStyle}>
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
                densePerformanceMode={densePerformanceMode}
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
                densePerformanceMode={densePerformanceMode}
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
    previous.densePerformanceMode === next.densePerformanceMode &&
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
