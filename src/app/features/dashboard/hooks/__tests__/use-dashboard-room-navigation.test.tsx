import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ALL_ROOMS_ID } from '@/app/constants/rooms';
import { useDashboardRoomNavigation } from '../use-dashboard-room-navigation';

interface HookProps {
  activeRoom: string;
  rooms: string[];
  hassEntitiesHydrated: boolean;
  devicesLoaded: boolean;
  registriesHydrated: boolean;
}

const defaultProps: HookProps = {
  activeRoom: 'Kitchen',
  rooms: ['Kitchen', 'Living Room'],
  hassEntitiesHydrated: true,
  devicesLoaded: true,
  registriesHydrated: true,
};

function renderRoomNavigation(props: Partial<HookProps> = {}) {
  const changeRoom = vi.fn();
  const view = renderHook(
    ({ activeRoom, rooms, hassEntitiesHydrated, devicesLoaded, registriesHydrated }: HookProps) =>
      useDashboardRoomNavigation(
        activeRoom,
        rooms,
        changeRoom,
        hassEntitiesHydrated,
        devicesLoaded,
        registriesHydrated
      ),
    { initialProps: { ...defaultProps, ...props } }
  );

  return { ...view, changeRoom };
}

describe('useDashboardRoomNavigation', () => {
  it('keeps the selected room while registries are not hydrated', () => {
    const { changeRoom, rerender } = renderRoomNavigation();

    rerender({
      ...defaultProps,
      rooms: ['Unassigned'],
      registriesHydrated: false,
    });

    expect(changeRoom).not.toHaveBeenCalled();
  });

  it('falls back once registries are hydrated and the selected room is still missing', () => {
    const { changeRoom, rerender } = renderRoomNavigation();

    rerender({
      ...defaultProps,
      rooms: ['Unassigned'],
      registriesHydrated: true,
    });

    expect(changeRoom).toHaveBeenCalledWith('Unassigned');
  });

  it('keeps all rooms stable regardless of room list changes', () => {
    const { changeRoom, rerender } = renderRoomNavigation({
      activeRoom: ALL_ROOMS_ID,
      rooms: ['Kitchen'],
    });

    rerender({
      ...defaultProps,
      activeRoom: ALL_ROOMS_ID,
      rooms: [],
      hassEntitiesHydrated: true,
      devicesLoaded: true,
      registriesHydrated: true,
    });

    expect(changeRoom).not.toHaveBeenCalled();
  });

  it('does not fall back for empty rooms before hydration completes', () => {
    const { changeRoom, rerender } = renderRoomNavigation();

    rerender({
      ...defaultProps,
      rooms: [],
      hassEntitiesHydrated: true,
      devicesLoaded: true,
      registriesHydrated: false,
    });

    expect(changeRoom).not.toHaveBeenCalled();
  });

  it('falls back to all rooms when hydrated rooms are empty', () => {
    const { changeRoom, rerender } = renderRoomNavigation();

    rerender({
      ...defaultProps,
      rooms: [],
      hassEntitiesHydrated: true,
      devicesLoaded: true,
      registriesHydrated: true,
    });

    expect(changeRoom).toHaveBeenCalledWith(ALL_ROOMS_ID);
  });
});
