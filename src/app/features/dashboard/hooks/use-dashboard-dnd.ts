import {
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useCallback, useRef, useState } from 'react';

interface UseDashboardDndParams {
  cardOrders: Record<string, string[]>;
  getCardRoom: (cardId: string) => string | null;
  moveCard: (room: string, oldIndex: number, newIndex: number) => void;
}

export function useDashboardDnd({ cardOrders, getCardRoom, moveCard }: UseDashboardDndParams) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Local drag-phase state — updated on every dragOver without touching the global store.
  // Only the final position is committed to the store on dragEnd (one write per drop).
  const dragOrdersRef = useRef<Record<string, string[]> | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const activeRoomRef = useRef<string | null>(null);
  const [dragOrders, setDragOrders] = useState<Record<string, string[]> | null>(null);

  // During an active drag, render from the local copy; otherwise from the store.
  const activeCardOrders = dragOrders ?? cardOrders;

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const activeId = event.active.id as string;
      const room = getCardRoom(activeId);
      const snapshot = { ...cardOrders };
      activeIdRef.current = activeId;
      activeRoomRef.current = room;
      dragOrdersRef.current = snapshot;
      setDragOrders(snapshot);
    },
    [cardOrders, getCardRoom]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      const activeId = active.id as string;
      const overId = over.id as string;
      const room = getCardRoom(activeId);

      if (!room || room !== getCardRoom(overId)) {
        return;
      }

      const current = dragOrdersRef.current ?? cardOrders;
      const roomCardIds = [...(current[room] || [])];
      const oldIndex = roomCardIds.indexOf(activeId);
      const newIndex = roomCardIds.indexOf(overId);

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
        return;
      }

      roomCardIds.splice(oldIndex, 1);
      roomCardIds.splice(newIndex, 0, activeId);
      const updated = { ...current, [room]: roomCardIds };
      dragOrdersRef.current = updated;
      setDragOrders(updated);
    },
    [cardOrders, getCardRoom]
  );

  const handleDragEnd = useCallback(
    (_event: DragEndEvent) => {
      const activeId = activeIdRef.current;
      const room = activeRoomRef.current;

      if (activeId && room && dragOrdersRef.current) {
        const originalIndex = cardOrders[room]?.indexOf(activeId) ?? -1;
        const finalIndex = dragOrdersRef.current[room]?.indexOf(activeId) ?? -1;

        if (originalIndex !== -1 && finalIndex !== -1 && originalIndex !== finalIndex) {
          moveCard(room, originalIndex, finalIndex);
        }
      }

      activeIdRef.current = null;
      activeRoomRef.current = null;
      dragOrdersRef.current = null;
      setDragOrders(null);
    },
    [cardOrders, moveCard]
  );

  return {
    activeCardOrders,
    handleDragEnd,
    handleDragOver,
    handleDragStart,
    sensors,
  };
}
