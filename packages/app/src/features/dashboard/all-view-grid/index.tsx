import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@navet/app/hooks';
import { memo } from 'react';
import { RoomSection } from './room-section';
import type { AllViewGridProps } from './types';
import { useAllViewGrid } from './use-all-view-grid';

export const AllViewGrid = memo(function AllViewGrid({
  deviceMap,
  rooms,
  cardOrders,
  isEditMode,
  cardSizes,
  updateCardSize,
  grouping,
  customCards = [],
  onDeleteCard,
  onUpdateCard,
  onRemoveEntity,
  allowEntityRemoval = false,
  usesHideAction = false,
  densePerformanceMode = false,
}: AllViewGridProps) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const { customCardMap, handleSizeChange, roomSections } = useAllViewGrid({
    cardOrders,
    customCards,
    deviceMap,
    grouping,
    rooms,
    updateCardSize,
  });

  const textColor = surface.textPrimary;
  const textSecondary = surface.textSecondary;

  return (
    <div className="space-y-8">
      {roomSections.map((section) => (
        <RoomSection
          key={section.key}
          title={section.title}
          orderedIds={section.orderedIds}
          totalItems={section.totalItems}
          mutedTitle={section.mutedTitle}
          showHeader={section.showHeader}
          textColor={textColor}
          textSecondary={textSecondary}
          isEditMode={isEditMode}
          cardSizes={cardSizes}
          deviceMap={deviceMap}
          customCardMap={customCardMap}
          handleSizeChange={handleSizeChange}
          onDeleteCard={onDeleteCard}
          onUpdateCard={onUpdateCard}
          onRemoveEntity={onRemoveEntity}
          allowEntityRemoval={allowEntityRemoval}
          usesHideAction={usesHideAction}
          densePerformanceMode={densePerformanceMode}
        />
      ))}
    </div>
  );
});

export type { AllViewGridProps, AllViewGrouping, AllViewSectionData } from './types';
