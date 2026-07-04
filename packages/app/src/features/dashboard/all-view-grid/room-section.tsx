import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { useI18n } from '@navet/app/hooks';
import { useBreakpointCols } from '@navet/app/hooks/use-breakpoint-cols';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { type CSSProperties, memo } from 'react';
import { DashboardCardItem } from '../components/dashboard-card-item';
import { DashboardEditActions } from '../components/dashboard-edit-actions';
import { useFitDashboardGrid } from '../hooks/use-fit-dashboard-grid';
import type { CustomCard } from '../stores/custom-cards-store';

interface RoomSectionProps {
  title: string;
  orderedIds: string[];
  totalItems: number;
  textColor: string;
  textSecondary: string;
  mutedTitle?: boolean;
  showHeader?: boolean;
  isEditMode: boolean;
  cardSizes: Record<string, CardSize>;
  deviceMap: Map<string, DeviceWithType>;
  customCardMap: Map<string, CustomCard>;
  handleSizeChange: (id: string, size: CardSize) => void;
  onDeleteCard?: (cardId: string) => void;
  onUpdateCard?: (cardId: string, data: Record<string, unknown>) => void;
  onRemoveEntity?: (entityId: string) => void;
  allowEntityRemoval?: boolean;
  usesHideAction?: boolean;
  densePerformanceMode?: boolean;
}

export const RoomSection = memo(function RoomSection({
  title,
  orderedIds,
  totalItems,
  textColor,
  textSecondary,
  mutedTitle = false,
  showHeader = true,
  isEditMode,
  cardSizes,
  deviceMap,
  customCardMap,
  handleSizeChange,
  onDeleteCard,
  onUpdateCard,
  onRemoveEntity,
  allowEntityRemoval = false,
  usesHideAction = false,
  densePerformanceMode = false,
}: RoomSectionProps) {
  const { t } = useI18n();
  const breakpointCols = useBreakpointCols();
  const { outerRef, innerRef, outerContainerStyle, innerContainerStyle, isAutoScaled, gridStyle } =
    useFitDashboardGrid(breakpointCols);
  const gridContent = (
    <div ref={outerRef} className="relative w-full" style={outerContainerStyle}>
      <div
        ref={innerRef}
        className={`w-full${isAutoScaled ? ' absolute left-0 top-0 origin-top-left' : ''}`}
        style={innerContainerStyle}
      >
        <div
          className="grid w-full grid-flow-row-dense gap-3 md:gap-3 lg:gap-4"
          style={gridStyle as CSSProperties}
        >
          {orderedIds.map((id) => {
            const device = deviceMap.get(id);
            if (device) {
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
                  densePerformanceMode={densePerformanceMode}
                />
              );
            }

            const card = customCardMap.get(id);
            if (!card) {
              return null;
            }

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
                densePerformanceMode={densePerformanceMode}
              />
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className={showHeader ? 'mb-4 flex items-center gap-3' : ''}>
        {showHeader ? (
          <>
            <h2
              className={`text-lg md:text-xl font-semibold ${mutedTitle ? textSecondary : textColor}`}
            >
              {title}
            </h2>
            <span className={`text-xs md:text-sm ${textSecondary}`}>
              {totalItems === 1
                ? t('dashboard.sections.itemCount.one', { count: totalItems })
                : t('dashboard.sections.itemCount.other', { count: totalItems })}
            </span>
          </>
        ) : null}
      </div>

      <DashboardEditActions
        isEditMode={isEditMode}
        onDeleteCard={onDeleteCard}
        onRemoveEntity={onRemoveEntity}
      >
        {gridContent}
      </DashboardEditActions>
    </div>
  );
}, areRoomSectionPropsEqual);

function areRoomSectionPropsEqual(prev: RoomSectionProps, next: RoomSectionProps): boolean {
  if (
    prev.title !== next.title ||
    prev.totalItems !== next.totalItems ||
    prev.mutedTitle !== next.mutedTitle ||
    prev.showHeader !== next.showHeader ||
    prev.textColor !== next.textColor ||
    prev.textSecondary !== next.textSecondary ||
    prev.isEditMode !== next.isEditMode ||
    prev.cardSizes !== next.cardSizes ||
    prev.handleSizeChange !== next.handleSizeChange ||
    prev.onDeleteCard !== next.onDeleteCard ||
    prev.onUpdateCard !== next.onUpdateCard ||
    prev.onRemoveEntity !== next.onRemoveEntity ||
    prev.allowEntityRemoval !== next.allowEntityRemoval ||
    prev.usesHideAction !== next.usesHideAction ||
    prev.densePerformanceMode !== next.densePerformanceMode
  ) {
    return false;
  }

  // Compare orderedIds by content — reference changes on every useAllViewGrid run even when
  // IDs are identical (the arrays are freshly filtered from cardOrders).
  const prevIds = prev.orderedIds;
  const nextIds = next.orderedIds;
  if (prevIds !== nextIds) {
    if (prevIds.length !== nextIds.length) return false;
    for (let i = 0; i < prevIds.length; i++) {
      if (prevIds[i] !== nextIds[i]) return false;
    }
  }

  // Check customCardMap only for IDs present in this section.
  if (prev.customCardMap !== next.customCardMap) {
    for (const id of prevIds) {
      if (prev.customCardMap.get(id) !== next.customCardMap.get(id)) return false;
    }
  }

  // Check deviceMap only for IDs present in this section — avoids re-rendering sections
  // whose devices haven't changed when a device in a different section updates.
  if (prev.deviceMap !== next.deviceMap) {
    for (const id of prevIds) {
      if (prev.deviceMap.get(id) !== next.deviceMap.get(id)) return false;
    }
  }

  return true;
}
