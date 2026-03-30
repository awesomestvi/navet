import { useDraggable } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import { getDndTransformStyle } from '@/app/components/shared/dnd-transform-style';
import type { ZoneName } from '../zones/zone-types';

interface DashboardCardItemDraggableProps {
  id: string;
  zone: ZoneName;
  spanClass: string;
  ambientLightBleed: boolean;
  children: ReactNode;
}

export function DashboardCardItemDraggable({
  id,
  zone,
  spanClass,
  ambientLightBleed,
  children,
}: DashboardCardItemDraggableProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { zone },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`relative h-full ${
        ambientLightBleed ? '[contain:layout_style]' : '[contain:layout_style_paint]'
      } ${spanClass} touch-none cursor-grab active:cursor-grabbing [&>*]:cursor-inherit ${
        isDragging ? 'opacity-40' : ''
      }`}
      style={getDndTransformStyle(transform)}
      data-draggable-card="true"
      data-card-drag-surface="true"
    >
      {children}
    </div>
  );
}
