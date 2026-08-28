import {
  type CardSize,
  getCardGridAutoRowsStyle,
  getResponsiveCardSize,
} from '@navet/app/components/shared/card-size-selector';
import { useBreakpointCols } from '@navet/app/hooks/use-breakpoint-cols';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { detectDeviceTier } from '@navet/app/utils/detect-device-tier';
import { type CSSProperties, useMemo } from 'react';
import {
  getCardGridGapPx,
  getCardGridTargetWidth,
} from '../components/home-dashboard-overview.shared';
import { packDashboardGridItems } from '../device-grid/device-grid-layout';
import type { CustomCard } from '../stores/custom-cards-store';
import { useAutoScaledGridMeasurements } from './use-auto-scaled-grid-measurements';
import { resolveDashboardPerformanceProfile } from './use-dashboard-performance-mode';
import { useProgressiveBatching } from './use-progressive-batching';

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
  densePerformanceMode = false,
  gridCols,
  isEditMode,
}: UseHomeGridRuntimeOptions) {
  const disableAnimations = useSettingsStore(settingsSelectors.disableAnimations);
  const effectsQuality = useSettingsStore(settingsSelectors.effectsQuality);
  const lowPowerMode = useSettingsStore(settingsSelectors.lowPowerMode);
  const breakpointCols = useBreakpointCols();
  const visibleDevices = useMemo(
    () =>
      cardIds.flatMap((cardId) => {
        const entry = allCards.get(cardId);
        return entry && !('createdAt' in entry) ? [entry] : [];
      }),
    [allCards, cardIds]
  );
  const performanceProfile = useMemo(
    () =>
      resolveDashboardPerformanceProfile({
        activeSection: 'home',
        deviceTier: detectDeviceTier(),
        effectsQuality,
        isEditMode,
        lowPowerMode,
        reducedEffectsEnabled: disableAnimations || lowPowerMode,
        visibleCardCount: cardIds.length,
        visibleDevices,
      }),
    [cardIds.length, disableAnimations, effectsQuality, isEditMode, lowPowerMode, visibleDevices]
  );
  const shouldBatchCards =
    !isEditMode && (densePerformanceMode || performanceProfile.batchHeavyCards);
  const batchedVisibleCount = useProgressiveBatching(cardIds.length, isEditMode, {
    enabled: shouldBatchCards,
    initialBatch: performanceProfile.progressiveBatchInitialCount,
    batchSize: performanceProfile.progressiveBatchSize,
  });
  const visibleCardIds = useMemo(
    () => (shouldBatchCards ? cardIds.slice(0, batchedVisibleCount) : cardIds),
    [batchedVisibleCount, cardIds, shouldBatchCards]
  );
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
  const gridPlacements = useMemo(
    () =>
      packDashboardGridItems(
        cardIds.flatMap((cardId) => {
          const entry = allCards.get(cardId);
          if (!entry) return [];

          return [
            {
              id: cardId,
              size: getResponsiveCardSize(cardSizes[cardId] ?? entry.size, breakpointCols),
            },
          ];
        }),
        renderedGridCols
      ),
    [allCards, breakpointCols, cardIds, cardSizes, renderedGridCols]
  );
  return {
    breakpointCols,
    gridPlacements,
    gridStyle,
    innerContainerStyle,
    innerRef,
    isAutoScaled,
    microCardMinWidth,
    optimizeOffscreenPaint:
      !isEditMode && (densePerformanceMode || performanceProfile.optimizeOffscreenPaint),
    outerContainerStyle,
    outerRef,
    renderedGridCols,
    targetGridWidth,
    visibleCardIds,
  };
}
