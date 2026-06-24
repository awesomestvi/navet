import { RoomNav } from '@navet/app/components/layout/room-nav';
import { renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

describe('RoomNav', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockRoomLayout({
    containerWidth = 280,
    overflowWidth = 64,
    roomWidths = {},
  }: {
    containerWidth?: number;
    overflowWidth?: number;
    roomWidths?: Record<string, number>;
  }) {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      const element = this as HTMLElement;

      if (element === document.body) {
        return originalGetBoundingClientRect.call(element);
      }

      if (element.getAttribute('aria-hidden') === 'true') {
        return {
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          width: 0,
          height: 0,
          toJSON: () => ({}),
        };
      }

      if (element.classList.contains('min-w-0') && element.classList.contains('flex-1')) {
        return {
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          bottom: 40,
          right: containerWidth,
          width: containerWidth,
          height: 40,
          toJSON: () => ({}),
        };
      }

      const label = element.textContent?.trim() ?? '';

      if (label === '+99 rooms') {
        return {
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          bottom: 32,
          right: overflowWidth,
          width: overflowWidth,
          height: 32,
          toJSON: () => ({}),
        };
      }

      if (label.length > 0 && roomWidths[label] !== undefined) {
        const width = roomWidths[label];
        return {
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          bottom: 32,
          right: width,
          width,
          height: 32,
          toJSON: () => ({}),
        };
      }

      return originalGetBoundingClientRect.call(element);
    });
  }

  it('renders a direct add entity action in edit mode', () => {
    const onAddEntity = vi.fn();

    renderWithProviders(
      <RoomNav
        rooms={['All', 'Living Room', 'Kitchen']}
        activeRoom="All"
        onRoomChange={() => undefined}
        isEditMode
        onToggleEditMode={() => undefined}
        onAddEntity={onAddEntity}
        addEntityLabel="Add Entity"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Add Entity/i }));

    expect(onAddEntity).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('keeps all rooms inline when there is enough width', async () => {
    mockRoomLayout({
      containerWidth: 600,
      roomWidths: {
        Home: 72,
        'Living Room': 104,
        Kitchen: 88,
        Bedroom: 92,
      },
    });

    renderWithProviders(
      <RoomNav
        rooms={['Living Room', 'Kitchen', 'Bedroom']}
        activeRoom="All"
        onRoomChange={() => undefined}
        isEditMode={false}
        onToggleEditMode={() => undefined}
      />
    );

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Kitchen' })).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: 'Kitchen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bedroom' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rooms' })).not.toBeInTheDocument();
  });

  it('collapses overflow rooms into a dropdown when width runs out', async () => {
    mockRoomLayout({
      containerWidth: 260,
      roomWidths: {
        Home: 72,
        'Living Room': 104,
        Kitchen: 88,
        Bedroom: 92,
      },
    });

    renderWithProviders(
      <RoomNav
        rooms={['Living Room', 'Kitchen', 'Bedroom']}
        activeRoom="All"
        onRoomChange={() => undefined}
        isEditMode={false}
        onToggleEditMode={() => undefined}
      />
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Rooms' })).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Kitchen' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bedroom' })).not.toBeInTheDocument();
    expect(screen.getByText('+2 rooms')).toBeInTheDocument();
  });

  it('keeps the active room visible when it would otherwise overflow', async () => {
    mockRoomLayout({
      containerWidth: 260,
      roomWidths: {
        Home: 72,
        'Living Room': 104,
        Kitchen: 88,
        Bedroom: 92,
      },
    });

    renderWithProviders(
      <RoomNav
        rooms={['Living Room', 'Kitchen', 'Bedroom']}
        activeRoom="Bedroom"
        onRoomChange={() => undefined}
        isEditMode={false}
        onToggleEditMode={() => undefined}
      />
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Rooms' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Bedroom' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Kitchen' })).not.toBeInTheDocument();
    expect(screen.getByText('+2 rooms')).toBeInTheDocument();
  });

  it('selects an overflow room from the dropdown', async () => {
    const onRoomChange = vi.fn();

    mockRoomLayout({
      containerWidth: 260,
      roomWidths: {
        Home: 72,
        'Living Room': 104,
        Kitchen: 88,
        Bedroom: 92,
      },
    });

    renderWithProviders(
      <RoomNav
        rooms={['Living Room', 'Kitchen', 'Bedroom']}
        activeRoom="All"
        onRoomChange={onRoomChange}
        isEditMode={false}
        onToggleEditMode={() => undefined}
      />
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Rooms' })).toBeInTheDocument());
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Rooms' }));
    await waitFor(() => expect(screen.getByRole('menu')).toBeInTheDocument());
    fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Kitchen' }));

    expect(onRoomChange).toHaveBeenCalledWith('Kitchen');
  });

  it('keeps hidden rooms out of the strip and overflow menu', async () => {
    mockRoomLayout({
      containerWidth: 220,
      roomWidths: {
        Home: 72,
        'Living Room': 104,
        Bedroom: 92,
      },
    });

    renderWithProviders(
      <RoomNav
        rooms={['Living Room', 'Kitchen', 'Bedroom']}
        hiddenRoomNames={['Kitchen']}
        activeRoom="All"
        onRoomChange={() => undefined}
        isEditMode={false}
        onToggleEditMode={() => undefined}
      />
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Rooms' })).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Kitchen' })).not.toBeInTheDocument();

    expect(screen.getByText('+2 rooms')).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Rooms' }));
    await waitFor(() => expect(screen.getByRole('menu')).toBeInTheDocument());
    expect(
      within(screen.getByRole('menu')).queryByRole('menuitem', { name: 'Kitchen' })
    ).not.toBeInTheDocument();
  });
});
