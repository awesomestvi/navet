import { useSortable } from '@dnd-kit/sortable';
import type { ReactNode } from 'react';
import { getDndTransformStyle } from '@/app/components/shared/dnd-transform-style';
import type { DragMeta, DropMeta } from '../hooks/use-home-dashboard-editor';

function SortableHomeCard({
  cardId,
  sectionId,
  isPreviewHidden,
  className,
  children,
}: {
  cardId: string;
  sectionId?: string;
  isPreviewHidden: boolean;
  className: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `home-card-${cardId}`,
    data: { source: 'home', cardId, sectionId, type: 'card' } as DragMeta & DropMeta,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={isDragging ? undefined : getDndTransformStyle(transform, transition)}
      className={`${className} relative h-full cursor-grab active:cursor-grabbing ${
        isPreviewHidden ? 'opacity-0' : isDragging ? 'opacity-40' : ''
      }`}
      data-card-id={cardId}
    >
      {children}
    </div>
  );
}

export function HomeCardSlot({
  sortable,
  cardId,
  sectionId,
  isPreviewHidden,
  className,
  content,
}: {
  sortable: boolean;
  cardId: string;
  sectionId?: string;
  isPreviewHidden: boolean;
  className: string;
  content: ReactNode;
}) {
  if (!sortable) {
    return content;
  }

  return (
    <SortableHomeCard
      cardId={cardId}
      sectionId={sectionId}
      isPreviewHidden={isPreviewHidden}
      className={className}
    >
      {content}
    </SortableHomeCard>
  );
}
