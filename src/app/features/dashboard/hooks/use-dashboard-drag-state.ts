import {
  type DragEndEvent,
  type DragOverEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useMemo, useRef, useState } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import type { DeviceWithType } from '@/app/types/device.types';
import type { CustomCard } from '../stores/custom-cards-store';
import type { DragMeta, DropMeta } from './use-home-dashboard-editor';

const NO_DRAG_SELECTOR = [
  'button',
  'input',
  'textarea',
  'select',
  'a',
  '[role="slider"]',
  '[role="switch"]',
  '[data-card-interactive]',
  '[data-dashboard-edit-action]',
  '[data-card-nodrag="true"]:not([data-draggable-card="true"])',
].join(', ');

function canStartDashboardDrag(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target.closest('[data-dashboard-drag-handle="true"]')) {
    return true;
  }

  if (target.closest(NO_DRAG_SELECTOR)) {
    return false;
  }

  return true;
}

class DashboardMouseSensor extends MouseSensor {
  static activators = [
    {
      eventName: 'onMouseDown' as const,
      handler: ({ nativeEvent }: { nativeEvent: MouseEvent }) => {
        return nativeEvent.button === 0 && canStartDashboardDrag(nativeEvent.target);
      },
    },
  ];
}

class DashboardTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: 'onTouchStart' as const,
      handler: ({ nativeEvent }: { nativeEvent: TouchEvent }) => {
        return canStartDashboardDrag(nativeEvent.target);
      },
    },
  ];
}

function resolveDropMeta(
  rawMeta: DropMeta | undefined,
  rawId: string | number | undefined
): DropMeta | undefined {
  if (rawMeta) {
    return rawMeta;
  }

  if (typeof rawId !== 'string') {
    return undefined;
  }

  if (rawId.startsWith('home-card-')) {
    return { type: 'card', cardId: rawId.slice('home-card-'.length) };
  }

  if (rawId.startsWith('home-section-insert-')) {
    return { type: 'section-insert', sectionId: rawId.slice('home-section-insert-'.length) };
  }

  if (rawId === 'home-container-flow') {
    return { type: 'container' };
  }

  if (rawId.startsWith('home-container-')) {
    return { type: 'container', sectionId: rawId.slice('home-container-'.length) };
  }

  return undefined;
}

interface UseDashboardDragStateParams {
  allCards: Map<string, DeviceWithType | CustomCard>;
  cardSizes: Record<string, CardSize>;
  moveHomeCard: (activeId: string, overId: string | null, sectionId?: string) => void;
  moveHomeSection: (sourceId: string, targetId: string) => void;
}

export function useDashboardDragState({
  allCards,
  cardSizes,
  moveHomeCard,
  moveHomeSection,
}: UseDashboardDragStateParams) {
  const [activeDragCard, setActiveDragCard] = useState<string | null>(null);
  const [activeDragSection, setActiveDragSection] = useState<string | null>(null);
  const lastResolvedOverRef = useRef<DropMeta | null>(null);

  const sensors = useSensors(
    useSensor(DashboardMouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(DashboardTouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 10,
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeDragSize = useMemo<CardSize | null>(() => {
    if (!activeDragCard) return null;
    const entry = allCards.get(activeDragCard);
    const resolvedSize = cardSizes[activeDragCard];
    if (resolvedSize) return resolvedSize;
    if (entry && 'size' in entry) return entry.size as CardSize;
    return 'small';
  }, [activeDragCard, allCards, cardSizes]);

  const handleDragOver = (event: DragOverEvent) => {
    const activeMeta = event.active.data.current as DragMeta | undefined;
    const overMeta = resolveDropMeta(
      event.over?.data.current as DropMeta | undefined,
      event.over?.id
    );

    if (!activeMeta || !overMeta) {
      return;
    }

    if (activeMeta.source === 'section') {
      if (overMeta.type === 'section-insert' && overMeta.sectionId !== activeMeta.sectionId) {
        lastResolvedOverRef.current = overMeta;
      }
      return;
    }

    if (
      overMeta.type === 'card' &&
      activeMeta.source === 'home' &&
      overMeta.cardId === activeMeta.cardId
    ) {
      return;
    }

    lastResolvedOverRef.current = overMeta;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeMeta = event.active.data.current as DragMeta | undefined;
    const overMeta =
      resolveDropMeta(event.over?.data.current as DropMeta | undefined, event.over?.id) ??
      lastResolvedOverRef.current;

    setActiveDragCard(null);
    setActiveDragSection(null);
    lastResolvedOverRef.current = null;

    if (!activeMeta || !overMeta) return;

    if (activeMeta.source === 'section') {
      if (overMeta.type !== 'section-insert' || activeMeta.sectionId === overMeta.sectionId) {
        return;
      }

      moveHomeSection(activeMeta.sectionId, overMeta.sectionId);
      return;
    }

    const targetSectionId = overMeta.sectionId;
    const overCardId = overMeta.type === 'card' ? overMeta.cardId : null;

    if (activeMeta.cardId === overCardId) return;

    moveHomeCard(activeMeta.cardId, overCardId, targetSectionId);
  };

  return {
    activeDragCard,
    setActiveDragCard,
    activeDragSection,
    setActiveDragSection,
    activeDragSize,
    sensors,
    handleDragOver,
    handleDragEnd,
  };
}
