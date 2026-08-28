import {
  type CardSize,
  getCardSpanClass,
  getResponsiveCardSize,
} from '@navet/app/components/shared/card-size-selector';
import { cn } from '@navet/app/components/ui/utils';
import { useSearch } from '@navet/app/hooks';
import { useBreakpointCols } from '@navet/app/hooks/use-breakpoint-cols';
import { type CSSProperties, memo, useCallback, useDeferredValue, useMemo } from 'react';
import { DashboardCardItem } from '../components/dashboard-card-item';
import { DashboardEditActions } from '../components/dashboard-edit-actions';
import { useFitDashboardGrid } from '../hooks/use-fit-dashboard-grid';
import { packDashboardGridItems } from './device-grid-layout';
import type { DeviceGridProps } from './types';

/**
 * Device Grid Component
 * Renders the grid of device cards and custom widget cards with drag-and-drop support
 * Optimized with memo to prevent unnecessary re-renders
 */
export const DeviceGrid = memo(function DeviceGrid({
  orderedCardIds,
  deviceMap,
  isEditMode,
  cardSizes,
  updateCardSize,
  customCards = [],
  onDeleteCard,
  onUpdateCard,
  onRemoveEntity,
  allowEntityRemoval = false,
  usesHideAction = false,
  densePerformanceMode = false,
  optimizeOffscreenPaint = false,
  getDeviceHeaderSubtitle,
  supplementalCards = [],
}: DeviceGridProps) {
  const { isSearchActive, filteredDeviceIds } = useSearch();
  const breakpointCols = useBreakpointCols();
  const {
    outerRef,
    innerRef,
    outerContainerStyle,
    innerContainerStyle,
    isAutoScaled,
    gridStyle,
    renderedGridCols,
  } = useFitDashboardGrid(breakpointCols);
  const deferredFilteredDeviceIds = useDeferredValue(filteredDeviceIds);
  const shouldOptimizeOffscreenPaint = optimizeOffscreenPaint && !isEditMode;

  const handleSizeChange = useCallback(
    (id: string, size: CardSize) => {
      updateCardSize(id, size);
    },
    [updateCardSize]
  );

  const filteredDeviceIdSet = useMemo(
    () => new Set(deferredFilteredDeviceIds),
    [deferredFilteredDeviceIds]
  );

  const displayedCardIds = useMemo(
    () =>
      isSearchActive ? orderedCardIds.filter((id) => filteredDeviceIdSet.has(id)) : orderedCardIds,
    [filteredDeviceIdSet, isSearchActive, orderedCardIds]
  );
  const customCardMap = useMemo(
    () => new Map(customCards.map((card) => [card.id, card])),
    [customCards]
  );
  // Combine device cards and custom widget cards using the shared ordering model.
  const allCards = useMemo(
    () =>
      displayedCardIds
        .map((id) => {
          const device = deviceMap.get(id);
          if (device) {
            return { type: 'device' as const, id };
          }

          const card = customCardMap.get(id);
          if (card) {
            return { type: 'widget' as const, card };
          }

          return null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [customCardMap, deviceMap, displayedCardIds]
  );
  const gridLayoutItems = useMemo(
    () => [
      ...(!isSearchActive
        ? supplementalCards.map((card) => ({
            id: `supplemental-${card.id}`,
            size: getResponsiveCardSize(card.size, breakpointCols),
          }))
        : []),
      ...allCards.map((item) => {
        if (item.type === 'device') {
          const device = deviceMap.get(item.id);
          const size = cardSizes[item.id] || (device?.size as CardSize) || 'small';
          return {
            id: `device-${item.id}`,
            size: getResponsiveCardSize(size, breakpointCols),
          };
        }

        const size = cardSizes[item.card.id] || item.card.size;
        return {
          id: `card-${item.card.id}`,
          size: getResponsiveCardSize(size, breakpointCols),
        };
      }),
    ],
    [allCards, breakpointCols, cardSizes, deviceMap, isSearchActive, supplementalCards]
  );
  const gridPlacements = useMemo(
    () => packDashboardGridItems(gridLayoutItems, renderedGridCols),
    [gridLayoutItems, renderedGridCols]
  );

  const gridContent = (
    <div
      ref={(node) => {
        outerRef.current = node;
      }}
      className="relative w-full"
      style={outerContainerStyle}
    >
      <div
        ref={innerRef}
        className={`w-full${isAutoScaled ? ' absolute left-0 top-0 origin-top-left' : ''}`}
        style={innerContainerStyle}
      >
        <div className="grid w-full gap-3 md:gap-3 lg:gap-4" style={gridStyle as CSSProperties}>
          {!isSearchActive
            ? supplementalCards.map((card) => (
                <div
                  key={`supplemental-${card.id}`}
                  className={cn(
                    getCardSpanClass(getResponsiveCardSize(card.size, breakpointCols)),
                    '[&>*]:h-full'
                  )}
                  style={{
                    gridColumnStart: gridPlacements.get(`supplemental-${card.id}`)?.column,
                    gridRowStart: gridPlacements.get(`supplemental-${card.id}`)?.row,
                  }}
                >
                  {card.content}
                </div>
              ))
            : null}
          {allCards.map((item) => {
            if (item.type === 'device') {
              const device = deviceMap.get(item.id);
              if (!device?.id) return null;

              const size = cardSizes[device.id] || (device.size as CardSize);
              const resolvedGridSize = getResponsiveCardSize(size, breakpointCols);
              const gridItemId = `device-${device.id}`;

              return (
                <div
                  key={gridItemId}
                  id={`dashboard-entity-${encodeURIComponent(device.id)}`}
                  data-dashboard-entity-id={device.id}
                  className={cn(getCardSpanClass(resolvedGridSize), '[&>*]:h-full')}
                  style={{
                    gridColumnStart: gridPlacements.get(gridItemId)?.column,
                    gridRowStart: gridPlacements.get(gridItemId)?.row,
                  }}
                >
                  <DashboardCardItem
                    id={device.id}
                    device={device}
                    size={size}
                    isEditMode={isEditMode}
                    handleSizeChange={handleSizeChange}
                    onRemoveEntity={onRemoveEntity}
                    allowEntityRemoval={allowEntityRemoval}
                    usesHideAction={usesHideAction}
                    densePerformanceMode={densePerformanceMode}
                    optimizeOffscreenPaint={shouldOptimizeOffscreenPaint}
                    headerSubtitleOverride={getDeviceHeaderSubtitle?.(device)}
                  />
                </div>
              );
            }

            const { card } = item;
            if (!card?.id) return null;

            const size = cardSizes[card.id] || card.size;
            const resolvedGridSize = getResponsiveCardSize(size, breakpointCols);
            const gridItemId = `card-${card.id}`;

            return (
              <div
                key={gridItemId}
                className={cn(getCardSpanClass(resolvedGridSize), '[&>*]:h-full')}
                style={{
                  gridColumnStart: gridPlacements.get(gridItemId)?.column,
                  gridRowStart: gridPlacements.get(gridItemId)?.row,
                }}
              >
                <DashboardCardItem
                  id={card.id}
                  card={card}
                  size={size}
                  isEditMode={isEditMode}
                  handleSizeChange={handleSizeChange}
                  onDeleteCard={onDeleteCard}
                  onUpdateCard={onUpdateCard}
                  onRemoveEntity={onRemoveEntity}
                  allowEntityRemoval={allowEntityRemoval}
                  usesHideAction={usesHideAction}
                  densePerformanceMode={densePerformanceMode}
                  optimizeOffscreenPaint={shouldOptimizeOffscreenPaint}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
  return (
    <DashboardEditActions
      isEditMode={isEditMode}
      onDeleteCard={onDeleteCard}
      onRemoveEntity={onRemoveEntity}
    >
      {gridContent}
    </DashboardEditActions>
  );
});

export type { DeviceGridProps } from './types';
