import { describe, expect, it } from 'vitest';
import {
  getAdjacentKioskRoom,
  resolveKioskRoomSwipe,
  shouldIgnoreKioskRoomSwipeTarget,
} from './use-kiosk-room-swipe-navigation';

describe('kiosk room swipe navigation', () => {
  it('moves through visible rooms without wrapping', () => {
    const rooms = ['All', 'Kitchen', 'Hidden room', 'Living Room'];

    expect(
      getAdjacentKioskRoom({
        activeRoom: 'Kitchen',
        direction: 'next',
        hiddenRoomNames: ['Hidden room'],
        rooms,
      })
    ).toBe('Living Room');
    expect(
      getAdjacentKioskRoom({
        activeRoom: 'All',
        direction: 'previous',
        rooms,
      })
    ).toBeNull();
  });

  it('accepts deliberate horizontal swipes in either direction', () => {
    expect(
      resolveKioskRoomSwipe({
        deltaX: -120,
        deltaY: 18,
        durationMs: 320,
        viewportWidth: 1024,
      })
    ).toBe('next');
    expect(
      resolveKioskRoomSwipe({
        deltaX: 120,
        deltaY: 18,
        durationMs: 320,
        viewportWidth: 1024,
      })
    ).toBe('previous');
  });

  it('rejects vertical, short, and slow gestures', () => {
    expect(
      resolveKioskRoomSwipe({
        deltaX: 40,
        deltaY: 2,
        durationMs: 200,
        viewportWidth: 390,
      })
    ).toBeNull();
    expect(
      resolveKioskRoomSwipe({
        deltaX: 100,
        deltaY: 96,
        durationMs: 200,
        viewportWidth: 390,
      })
    ).toBeNull();
    expect(
      resolveKioskRoomSwipe({
        deltaX: 100,
        deltaY: 5,
        durationMs: 1200,
        viewportWidth: 390,
      })
    ).toBeNull();
  });

  it('excludes interactive controls and their descendants', () => {
    const button = document.createElement('button');
    const icon = document.createElement('span');
    button.append(icon);
    const canvas = document.createElement('div');

    expect(shouldIgnoreKioskRoomSwipeTarget(icon)).toBe(true);
    expect(shouldIgnoreKioskRoomSwipeTarget(canvas)).toBe(false);
  });
});
