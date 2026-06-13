import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { useSearch } from '@navet/app/hooks';
import { useBreakpointCols } from '@navet/app/hooks/use-breakpoint-cols';
import { useDeferredVisibility } from '@navet/app/hooks/use-deferred-visibility';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { detectDeviceTier } from '@navet/app/utils/detect-device-tier';
import { type CSSProperties, memo, useCallback, useDeferredValue, useMemo } from 'react';
import { DashboardCardItem } from '../components/dashboard-card-item';
import { DashboardEditActions } from '../components/dashboard-edit-actions';
import { resolveDashboardPerformanceProfile } from '../hooks/use-dashboard-performance-mode';
import { useFitDashboardGrid } from '../hooks/use-fit-dashboard-grid';
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
  densePerformanceMode = false,
  getDeviceHeaderSubtitle,
}: DeviceGridProps) {
  const { isSearchActive, filteredDeviceIds } = useSearch();
  const breakpointCols = useBreakpointCols();
  const effectsQuality = useSettingsStore(settingsSelectors.effectsQuality);
  const lowPowerMode = useSettingsStore(settingsSelectors.lowPowerMode);
  const { ref: visibilityRef, isVisible } = useDeferredVisibility<HTMLDivElement>({
    initiallyVisible: isEditMode,
  });
  const { outerRef, innerRef, outerContainerStyle, innerContainerStyle, isAutoScaled, gridStyle } =
    useFitDashboardGrid(breakpointCols);
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
  const performanceProfile = useMemo(
    () =>
      resolveDashboardPerformanceProfile({
        activeSection: 'home',
        deviceTier: detectDeviceTier(),
        effectsQuality,
        isEditMode,
        lowPowerMode,
        visibleCardCount: displayedCardIds.length,
        visibleDevices: deviceMap.values(),
      }),
    [deviceMap, displayedCardIds.length, effectsQuality, isEditMode, lowPowerMode]
  );
  const visibleCount = useProgressiveBatching(displayedCardIds.length, isEditMode, {
    enabled: isVisible,
    initialBatch: performanceProfile.progressiveBatchInitialCount,
    batchSize: performanceProfile.progressiveBatchSize,
  });

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
  const estimatedRows = Math.max(
    1,
    Math.ceil(displayedCardIds.length / Math.max(1, breakpointCols))
  );
  const placeholderHeight = estimatedRows * 120;

  const gridContent = (
    <div
      ref={(node) => {
        visibilityRef.current = node;
        outerRef.current = node;
      }}
      className="relative w-full"
      style={{
        ...outerContainerStyle,
        ...(performanceProfile.optimizeOffscreenPaint || densePerformanceMode
          ? ({
              contentVisibility: 'auto',
              containIntrinsicBlockSize: `${placeholderHeight}px`,
            } as CSSProperties)
          : undefined),
      }}
    >
      <div
        ref={innerRef}
        className={`w-full${isAutoScaled ? ' absolute left-0 top-0 origin-top-left' : ''}`}
        style={innerContainerStyle}
      >
        <div
          className="grid w-full grid-flow-row-dense gap-3 md:gap-3 lg:gap-4"
          style={gridStyle as CSSProperties}
        >
          {visibleCards.map((item) => {
            if (item.type === 'device') {
              const device = deviceMap.get(item.id);
              if (!device?.id) return null;

              const size = cardSizes[device.id] || (device.size as CardSize);

              return (
                <DashboardCardItem
                  key={`device-${device.id}`}
                  id={device.id}
                  device={device}
                  size={size}
                  isEditMode={isEditMode}
                  handleSizeChange={handleSizeChange}
                  onRemoveEntity={onRemoveEntity}
                  allowEntityRemoval={allowEntityRemoval}
                  usesHideAction={usesHideAction}
                  densePerformanceMode={densePerformanceMode}
                  headerSubtitleOverride={getDeviceHeaderSubtitle?.(device)}
                />
              );
            }

            const { card } = item;
            if (!card?.id) return null;

            const size = cardSizes[card.id] || card.size;

            return (
              <DashboardCardItem
                key={`card-${card.id}`}
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
              />
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
