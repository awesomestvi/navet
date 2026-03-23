import { type CSSProperties, memo, startTransition, useEffect, useRef, useState } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { useI18n } from '@/app/hooks';
import { useBreakpointCols } from '@/app/hooks/use-breakpoint-cols';
import { settingsSelectors } from '@/app/stores/selectors';
import { useSettingsStore } from '@/app/stores/settings-store';
import type { DeviceWithType } from '@/app/types/device.types';
import { DashboardCardItem } from '../components/dashboard-card-item';
import { DashboardEditActions } from '../components/dashboard-edit-actions';
import { useProgressiveBatching } from '../hooks/use-progressive-batching';
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
}: RoomSectionProps) {
  const { t } = useI18n();
  const breakpointCols = useBreakpointCols();
  const effectsQuality = useSettingsStore(settingsSelectors.effectsQuality);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(isEditMode);

  useEffect(() => {
    if (isEditMode) {
      setIsVisible(true);
      return;
    }

    const node = containerRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          startTransition(() => {
            setIsVisible(true);
          });
          observer.disconnect();
        }
      },
      { rootMargin: '400px 0px' }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [isEditMode]);

  const visibleCount = useProgressiveBatching(orderedIds.length, isEditMode, isVisible);
  const estimatedRows = Math.max(1, Math.ceil(totalItems / 4));
  const placeholderHeight = estimatedRows * 120;
  const visibleOrderedIds = orderedIds.slice(0, visibleCount);
  const gridContent = (
    <div
      className="grid w-full grid-flow-row-dense gap-2 auto-rows-[87px] md:gap-3 lg:gap-4"
      style={
        {
          gridTemplateColumns: `repeat(${breakpointCols}, minmax(0, 1fr))`,
        } as CSSProperties
      }
    >
      {visibleOrderedIds.map((id) => {
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
          />
        );
      })}
    </div>
  );

  return (
    <div
      ref={containerRef}
      style={
        effectsQuality !== 'high'
          ? ({
              contentVisibility: 'auto',
              containIntrinsicBlockSize: `${placeholderHeight}px`,
            } as CSSProperties)
          : undefined
      }
    >
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

      {isVisible ? (
        <DashboardEditActions
          isEditMode={isEditMode}
          onDeleteCard={onDeleteCard}
          onRemoveEntity={onRemoveEntity}
          onSizeChange={handleSizeChange}
        >
          {gridContent}
        </DashboardEditActions>
      ) : (
        <div className="w-full" style={{ minHeight: `${placeholderHeight}px` }} />
      )}
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
    prev.usesHideAction !== next.usesHideAction
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
