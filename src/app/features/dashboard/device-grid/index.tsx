import { type CSSProperties, memo, useCallback, useDeferredValue, useMemo } from 'react';
import {
  CARD_GRID_ROW_CLASS,
  type CardSize,
  getDashboardGridColumnCount,
} from '@/app/components/shared/card-size-selector';
import { useSearch } from '@/app/hooks';
import { useBreakpointCols } from '@/app/hooks/use-breakpoint-cols';
import { DashboardCardItem } from '../components/dashboard-card-item';
import { DashboardEditActions } from '../components/dashboard-edit-actions';
import { useProgressiveBatching } from '../hooks/use-progressive-batching';
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
}: DeviceGridProps) {
  const { isSearchActive, filteredDeviceIds } = useSearch();
  const breakpointCols = useBreakpointCols();
  const deferredFilteredDeviceIds = useDeferredValue(filteredDeviceIds);

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

  const visibleCount = useProgressiveBatching(displayedCardIds.length, isEditMode);

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

  const visibleCards = allCards.slice(0, visibleCount);

  const gridContent = (
    <div
      className={`grid w-full grid-flow-row-dense gap-2 ${CARD_GRID_ROW_CLASS} md:gap-3 lg:gap-4`}
      style={
        {
          gridTemplateColumns: `repeat(${getDashboardGridColumnCount(breakpointCols)}, minmax(0, 1fr))`,
        } as CSSProperties
      }
    >
      {visibleCards.map((item) => {
        if (item.type === 'device') {
          const device = deviceMap.get(item.id);
          if (!device) return null;

          const size = cardSizes[device.id] || (device.size as CardSize);

          return (
            <DashboardCardItem
              key={device.id}
              id={device.id}
              device={device}
              size={size}
              isEditMode={isEditMode}
              handleSizeChange={handleSizeChange}
              onRemoveEntity={onRemoveEntity}
              allowEntityRemoval={allowEntityRemoval}
              usesHideAction={usesHideAction}
            />
          );
        }

        const { card } = item;
        const size = cardSizes[card.id] || card.size;

        return (
          <DashboardCardItem
            key={card.id}
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
          />
        );
      })}
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
