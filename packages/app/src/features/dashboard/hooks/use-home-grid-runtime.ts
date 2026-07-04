import {
  type CardSize,
  getCardGridAutoRowsStyle,
} from '@navet/app/components/shared/card-size-selector';
import { useBreakpointCols } from '@navet/app/hooks/use-breakpoint-cols';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { type CSSProperties, useMemo } from 'react';
import {
  getCardGridGapPx,
  getCardGridTargetWidth,
} from '../components/home-dashboard-overview.shared';
import type { CustomCard } from '../stores/custom-cards-store';
import { useAutoScaledGridMeasurements } from './use-auto-scaled-grid-measurements';

interface UseHomeGridRuntimeOptions {
  allCards: Map<string, DeviceWithType | CustomCard>;
  cardIds: string[];
  cardSizes: Record<string, CardSize>;
  densePerformanceMode?: boolean;
  gridCols?: number;
  isEditMode: boolean;
  sortable?: boolean;
}

export function useHomeGridRuntime({
  allCards,
  cardIds,
  cardSizes,
  gridCols,
}: UseHomeGridRuntimeOptions) {
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
    renderedGridCols <= 1 || outerWidth <= 0 ? 1 : Math.min(1, outerWidth / targetGridWidth);
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
  return {
    breakpointCols,
    gridStyle,
    innerContainerStyle,
    innerRef,
    isAutoScaled,
    microCardMinWidth,
    optimizeOffscreenPaint: false,
    outerContainerStyle,
    outerRef,
    renderedGridCols,
    targetGridWidth,
    visibleCardIds: cardIds,
  };
}
