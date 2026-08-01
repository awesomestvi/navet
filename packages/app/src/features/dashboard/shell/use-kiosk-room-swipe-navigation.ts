import type { MobileRoomNavigation } from '@navet/app/components/layout/mobile-room-dropdown';
import {
  filterHiddenRooms,
  getVisibleRoomNavRooms,
} from '@navet/app/components/layout/room-nav.utils';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useRef } from 'react';

const EDGE_GUARD_PX = 28;
const MIN_SWIPE_DISTANCE_PX = 56;
const AXIS_LOCK_RATIO = 1.25;
const MAX_SWIPE_DURATION_MS = 900;

interface SwipeOrigin {
  pointerId: number;
  startedAt: number;
  x: number;
  y: number;
}

interface KioskRoomSwipeOptions {
  enabled: boolean;
  navigation?: MobileRoomNavigation;
}

const INTERACTIVE_SWIPE_EXCLUSION = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  '[contenteditable="true"]',
  '[data-kiosk-swipe-ignore]',
  '[role="dialog"]',
  '[role="menu"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="switch"]',
  '[role="tab"]',
].join(',');

export function shouldIgnoreKioskRoomSwipeTarget(target: EventTarget | null) {
  return target instanceof Element && target.closest(INTERACTIVE_SWIPE_EXCLUSION) !== null;
}

export function getAdjacentKioskRoom({
  activeRoom,
  direction,
  hiddenRoomNames = [],
  rooms,
}: {
  activeRoom: string;
  direction: 'next' | 'previous';
  hiddenRoomNames?: string[];
  rooms: string[];
}) {
  const visibleRooms = getVisibleRoomNavRooms(filterHiddenRooms(rooms, hiddenRoomNames));
  const activeIndex = visibleRooms.indexOf(activeRoom);
  if (activeIndex < 0) {
    return null;
  }

  const nextIndex = direction === 'next' ? activeIndex + 1 : activeIndex - 1;
  return visibleRooms[nextIndex] ?? null;
}

export function resolveKioskRoomSwipe({
  deltaX,
  deltaY,
  durationMs,
  viewportWidth,
}: {
  deltaX: number;
  deltaY: number;
  durationMs: number;
  viewportWidth: number;
}): 'next' | 'previous' | null {
  const horizontalDistance = Math.abs(deltaX);
  const verticalDistance = Math.abs(deltaY);
  const threshold = Math.min(96, Math.max(MIN_SWIPE_DISTANCE_PX, viewportWidth * 0.08));

  if (
    durationMs > MAX_SWIPE_DURATION_MS ||
    horizontalDistance < threshold ||
    horizontalDistance < verticalDistance * AXIS_LOCK_RATIO
  ) {
    return null;
  }

  return deltaX < 0 ? 'next' : 'previous';
}

export function useKioskRoomSwipeNavigation({ enabled, navigation }: KioskRoomSwipeOptions) {
  const originRef = useRef<SwipeOrigin | null>(null);

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    originRef.current = null;
    if (
      !enabled ||
      !navigation ||
      !event.isPrimary ||
      event.pointerType !== 'touch' ||
      shouldIgnoreKioskRoomSwipeTarget(event.target) ||
      event.clientX <= EDGE_GUARD_PX ||
      event.clientX >= window.innerWidth - EDGE_GUARD_PX
    ) {
      return;
    }

    originRef.current = {
      pointerId: event.pointerId,
      startedAt: performance.now(),
      x: event.clientX,
      y: event.clientY,
    };
  };

  const onPointerCancel = () => {
    originRef.current = null;
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const origin = originRef.current;
    originRef.current = null;
    if (!origin || origin.pointerId !== event.pointerId || !navigation) {
      return;
    }

    const direction = resolveKioskRoomSwipe({
      deltaX: event.clientX - origin.x,
      deltaY: event.clientY - origin.y,
      durationMs: performance.now() - origin.startedAt,
      viewportWidth: window.innerWidth,
    });
    if (!direction) {
      return;
    }

    const room = getAdjacentKioskRoom({
      activeRoom: navigation.activeRoom,
      direction,
      hiddenRoomNames: navigation.hiddenRoomNames,
      rooms: navigation.rooms,
    });
    if (room) {
      navigation.onRoomChange(room);
    }
  };

  return {
    onPointerCancel,
    onPointerDown,
    onPointerUp,
  };
}
