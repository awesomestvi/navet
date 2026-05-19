import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomNav } from '@/app/components/layout/room-nav';
import { renderWithProviders } from '@/test/render';
import { resetAppStores } from '@/test/store-reset';

describe('RoomNav', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  function renderRoomNav(onRoomChange = vi.fn()) {
    const view = renderWithProviders(
      <RoomNav
        rooms={['All', 'Living Room', 'Kitchen', 'Bedroom', 'Office', 'Garage']}
        activeRoom="All"
        onRoomChange={onRoomChange}
        isEditMode={false}
        onToggleEditMode={() => undefined}
      />
    );

    const roomScroller = view.container.querySelector<HTMLElement>('.scrollbar-hide');

    if (!roomScroller) {
      throw new Error('Room scroller not found');
    }

    Object.defineProperty(roomScroller, 'scrollLeft', {
      value: 24,
      writable: true,
      configurable: true,
    });
    roomScroller.setPointerCapture = vi.fn();
    roomScroller.releasePointerCapture = vi.fn();
    roomScroller.hasPointerCapture = vi.fn(() => true);

    return { ...view, roomScroller };
  }

  it('changes room on a normal click', () => {
    const onRoomChange = vi.fn();

    renderRoomNav(onRoomChange);

    fireEvent.click(screen.getByRole('button', { name: 'Kitchen' }));

    expect(onRoomChange).toHaveBeenCalledWith('Kitchen');
  });

  it('suppresses room selection after dragging the room scroller', () => {
    const onRoomChange = vi.fn();
    const { roomScroller } = renderRoomNav(onRoomChange);
    const kitchenButton = screen.getByRole('button', { name: 'Kitchen' });

    fireEvent.pointerDown(roomScroller, {
      button: 0,
      clientX: 120,
      pointerId: 1,
      pointerType: 'mouse',
    });
    fireEvent.pointerMove(roomScroller, {
      clientX: 72,
      pointerId: 1,
      pointerType: 'mouse',
    });
    fireEvent.pointerUp(roomScroller, {
      clientX: 72,
      pointerId: 1,
      pointerType: 'mouse',
    });
    fireEvent.click(kitchenButton);

    expect(roomScroller.scrollLeft).toBe(72);
    expect(onRoomChange).not.toHaveBeenCalled();

    fireEvent.click(kitchenButton);

    expect(onRoomChange).toHaveBeenCalledWith('Kitchen');
  });
});
