import { useDraggable } from '@dnd-kit/core';
import { getDndTransformStyle } from '@navet/app/components/shared/dnd-transform-style';
import type { EffectsQuality } from '@navet/app/stores/settings-store';
import type { ReactNode } from 'react';
import type { ZoneName } from '../zones/zone-types';

interface DashboardCardItemDraggableProps {
  id: string;
  zone: ZoneName;
  spanClass: string;
  ambientLightBleed: boolean;
  effectsQuality: EffectsQuality;
  children: ReactNode;
}

export function DashboardCardItemDraggable({
  id,
  zone,
  spanClass,
  ambientLightBleed,
  effectsQuality,
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
      data-navet-effects-quality={effectsQuality}
    >
      {children}
    </div>
  );
}
