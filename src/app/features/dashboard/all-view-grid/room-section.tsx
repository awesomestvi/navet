import { rectSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import { memo, startTransition, useEffect, useRef, useState } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { useI18n } from '@/app/hooks';
import type { DeviceWithType } from '@/app/types/device.types';
import { DashboardCardItem } from '../components/dashboard-card-item';
import { DashboardEditActions } from '../components/dashboard-edit-actions';
import type { CustomCard } from '../stores/custom-cards-store';

type IdleCallbackHandle = number;

type IdleDeadlineLike = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (
    callback: (deadline: IdleDeadlineLike) => void,
    options?: { timeout: number }
  ) => IdleCallbackHandle;
  cancelIdleCallback?: (handle: IdleCallbackHandle) => void;
};

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(isEditMode);
  const [visibleCount, setVisibleCount] = useState(isEditMode ? orderedIds.length : 0);

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

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    if (isEditMode) {
      setVisibleCount(orderedIds.length);
      return;
    }

    const INITIAL_BATCH = 8;
    const BATCH_SIZE = 8;
    const idleWindow = window as WindowWithIdleCallback;

    setVisibleCount((current) =>
      current > 0
        ? Math.min(current, orderedIds.length)
        : Math.min(INITIAL_BATCH, orderedIds.length)
    );

    if (orderedIds.length <= INITIAL_BATCH) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | null = null;
    let idleId: IdleCallbackHandle | null = null;

    const scheduleNextBatch = () => {
      const runBatch = () => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setVisibleCount((current) => {
            if (current >= orderedIds.length) {
              return current;
            }

            const next = Math.min(current + BATCH_SIZE, orderedIds.length);
            if (next < orderedIds.length) {
              scheduleNextBatch();
            }
            return next;
          });
        });
      };

      if (typeof idleWindow.requestIdleCallback === 'function') {
        idleId = idleWindow.requestIdleCallback(
          (deadline) => {
            if (deadline.didTimeout || deadline.timeRemaining() > 4) {
              runBatch();
              return;
            }

            scheduleNextBatch();
          },
          { timeout: 160 }
        );
        return;
      }

      timeoutId = window.setTimeout(runBatch, 96);
    };

    scheduleNextBatch();

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      if (idleId !== null && typeof idleWindow.cancelIdleCallback === 'function') {
        idleWindow.cancelIdleCallback(idleId);
      }
    };
  }, [isEditMode, isVisible, orderedIds.length]);

  const estimatedRows = Math.max(1, Math.ceil(totalItems / 4));
  const placeholderHeight = estimatedRows * 120;
  const visibleOrderedIds = isEditMode ? orderedIds : orderedIds.slice(0, visibleCount);
  const gridContent = (
    <div className="grid w-full grid-flow-row-dense grid-cols-2 gap-2 auto-rows-[87px] md:grid-cols-4 md:gap-3 xl:grid-cols-6 lg:gap-4 2xl:grid-cols-8">
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
    <div ref={containerRef}>
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
          {isEditMode ? (
            <SortableContext items={visibleOrderedIds} strategy={rectSortingStrategy}>
              {gridContent}
            </SortableContext>
          ) : (
            gridContent
          )}
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
