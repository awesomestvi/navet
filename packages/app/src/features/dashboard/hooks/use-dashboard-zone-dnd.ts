import {
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useCallback, useState } from 'react';
import type { ZoneName } from '../zones/zone-types';

interface UseDashboardZoneDndParams {
  updateCardZone: (id: string, zone: ZoneName) => void;
}

/**
 * Manages drag-and-drop state for cross-zone card movement on the Home view.
 *
 * Cards use `useDraggable` with `data.zone` set to their current zone.
 * Zone bands and placeholder slots use `useDroppable` with `data.zone`.
 * When a drag ends over a different zone, `updateCardZone` is called.
 */
export function useDashboardZoneDnd({ updateCardZone }: UseDashboardZoneDndParams) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require 8px movement before drag activates — prevents accidental
      // drags when tapping edit-mode action buttons.
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;

      const activeZone = active.data.current?.zone as ZoneName | undefined;
      const overZone = over.data.current?.zone as ZoneName | undefined;

      // Only act on cross-zone drops
      if (!activeZone || !overZone || activeZone === overZone) return;

      updateCardZone(active.id as string, overZone);
    },
    [updateCardZone]
  );

  return { sensors, activeId, handleDragStart, handleDragEnd };
}
