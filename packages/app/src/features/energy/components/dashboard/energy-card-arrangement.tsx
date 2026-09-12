import { closestCenter, DndContext, pointerWithin } from '@dnd-kit/core';
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { type CardSize, getCardSpanClass } from '@navet/app/components/shared/card-size-selector';
import { getDndTransformStyle } from '@navet/app/components/shared/dnd-transform-style';
import { getThemeFocusRingClassName } from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useDashboardDragSensors } from '@navet/app/features/dashboard/hooks/use-dashboard-drag-state';
import { useI18n, useTheme } from '@navet/app/hooks';
import { type CSSProperties, type ReactNode, useState } from 'react';

export interface EnergyArrangementCard {
  id: string;
  name: string;
  size: CardSize;
  content: ReactNode;
  style?: CSSProperties;
  editActions?: ReactNode;
}

export function EnergyCardArrangement({
  cards,
  order,
  isEditMode,
  onOrderChange,
}: {
  cards: EnergyArrangementCard[];
  order: string[];
  isEditMode: boolean;
  onOrderChange: (ids: string[]) => void;
}) {
  const sensors = useDashboardDragSensors();
  const [overId, setOverId] = useState<string | null>(null);
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const ids = [
    ...new Set([...order.filter((id) => cardsById.has(id)), ...cards.map((card) => card.id)]),
  ];
  const content = ids.map((id) => {
    const card = cardsById.get(id);
    if (!card) return null;
    return isEditMode ? (
      <ArrangingCard key={id} card={card} isDropTarget={overId === id} />
    ) : (
      <div
        key={id}
        data-energy-card-id={id}
        className={cn('relative h-full min-w-0', getCardSpanClass(card.size))}
        style={card.style}
      >
        {card.content}
      </div>
    );
  });
  if (!isEditMode) return content;
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={(args) =>
        args.pointerCoordinates ? pointerWithin(args) : closestCenter(args)
      }
      onDragOver={({ over }) => setOverId(over ? String(over.id) : null)}
      onDragCancel={() => setOverId(null)}
      onDragEnd={({ active, over }) => {
        setOverId(null);
        if (!over || active.id === over.id) return;
        const from = ids.indexOf(String(active.id));
        const to = ids.indexOf(String(over.id));
        if (from >= 0 && to >= 0) onOrderChange(arrayMove(ids, from, to));
      }}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        {content}
      </SortableContext>
    </DndContext>
  );
}

function ArrangingCard({
  card,
  isDropTarget,
}: {
  card: EnergyArrangementCard;
  isDropTarget: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });
  const { t } = useI18n();
  const { theme } = useTheme();
  return (
    <fieldset
      ref={setNodeRef}
      aria-label={card.name}
      data-card-drag-surface="true"
      data-energy-card-id={card.id}
      data-energy-drop-target={isDropTarget ? 'true' : undefined}
      className={cn(
        'relative m-0 h-full min-w-0 border-0 p-0 cursor-grab active:cursor-grabbing',
        getCardSpanClass(card.size),
        isDragging && 'z-40 opacity-60',
        isDropTarget && !isDragging && 'rounded-[20px] ring-2 ring-current'
      )}
      style={{ ...card.style, ...getDndTransformStyle(transform), transition }}
    >
      <div inert className="h-full pointer-events-none">
        {card.content}
      </div>
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        type="button"
        data-dashboard-drag-handle="true"
        aria-label={t('energy.edit.arrangeCard', { name: card.name })}
        className={cn(
          'absolute inset-0 z-30 h-full w-full rounded-[20px] border-0 bg-transparent cursor-grab active:cursor-grabbing',
          getThemeFocusRingClassName(theme)
        )}
      />
      {card.editActions ? (
        <div
          data-card-edit-dock="true"
          className="absolute inset-x-0 bottom-3 z-40 flex justify-center pointer-events-none"
        >
          <div className="pointer-events-auto rounded-full border border-white/10 bg-[#161619] px-3 py-2">
            {card.editActions}
          </div>
        </div>
      ) : null}
    </fieldset>
  );
}
