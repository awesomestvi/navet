import { useSortable } from '@dnd-kit/sortable';
import { getDndTransformStyle } from '@navet/app/components/shared/dnd-transform-style';
import type { ReactNode } from 'react';
import type { DragMeta, DropMeta } from '../hooks/use-home-dashboard-editor';

function SortableHomeCard({
  cardId,
  cardLabel,
  sectionId,
  isPreviewHidden,
  className,
  optimizeOffscreenPaint,
  children,
}: {
  cardId: string;
  cardLabel?: string;
  sectionId?: string;
  isPreviewHidden: boolean;
  className: string;
  /** When true, skip layout/paint for off-screen cards (not used at `effectsQuality: high`). */
  optimizeOffscreenPaint: boolean;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `home-card-${cardId}`,
    data: { source: 'home', cardId, sectionId, type: 'card' } as DragMeta & DropMeta,
  });

  return (
    <div
      ref={setNodeRef}
      {...{ ...attributes, 'aria-label': cardLabel ?? cardId }}
      {...listeners}
      style={isDragging ? undefined : getDndTransformStyle(transform, transition)}
      className={`${className} relative h-full cursor-grab active:cursor-grabbing ${
        isPreviewHidden ? 'opacity-0' : isDragging ? 'opacity-40' : ''
      }`}
      data-card-id={cardId}
      data-card-drag-surface="true"
    >
      <div
        inert
        className={
          optimizeOffscreenPaint
            ? 'pointer-events-none h-full min-h-40 [content-visibility:auto] [contain-intrinsic-block-size:10rem]'
            : 'pointer-events-none h-full min-h-0'
        }
      >
        {children}
      </div>
    </div>
  );
}

export function HomeCardSlot({
  sortable,
  cardId,
  cardLabel,
  sectionId,
  isPreviewHidden,
  className,
  content,
  optimizeOffscreenPaint = false,
}: {
  sortable: boolean;
  cardId: string;
  cardLabel?: string;
  sectionId?: string;
  isPreviewHidden: boolean;
  className: string;
  content: ReactNode;
  optimizeOffscreenPaint?: boolean;
}) {
  if (!sortable) {
    if (optimizeOffscreenPaint) {
      return (
        <div
          className={`${className} h-full min-h-40 [content-visibility:auto] [contain-intrinsic-block-size:10rem]`}
        >
          {content}
        </div>
      );
    }

    return content;
  }

  return (
    <SortableHomeCard
      cardId={cardId}
      cardLabel={cardLabel}
      sectionId={sectionId}
      isPreviewHidden={isPreviewHidden}
      className={className}
      optimizeOffscreenPaint={optimizeOffscreenPaint}
    >
      {content}
    </SortableHomeCard>
  );
}
