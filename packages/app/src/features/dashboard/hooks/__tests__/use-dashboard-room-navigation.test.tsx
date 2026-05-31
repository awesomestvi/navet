import { ALL_ROOMS_ID } from '@navet/app/constants/rooms';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDashboardRoomNavigation } from '../use-dashboard-room-navigation';

interface HookProps {
  activeRoom: string;
  preferredRoom: string;
  rooms: string[];
  entitiesHydrated: boolean;
  devicesLoaded: boolean;
  registriesHydrated: boolean;
  connected: boolean;
  connecting: boolean;
  standaloneMode: boolean;
}

const defaultProps: HookProps = {
  activeRoom: 'Kitchen',
  preferredRoom: 'Kitchen',
  rooms: ['Kitchen', 'Living Room'],
  entitiesHydrated: true,
  devicesLoaded: true,
  registriesHydrated: true,
  connected: true,
  connecting: false,
  standaloneMode: false,
};

function renderRoomNavigation(props: Partial<HookProps> = {}) {
  const changeRoom = vi.fn();
  const fallbackRoom = vi.fn();
  const view = renderHook(
    ({
      activeRoom,
      preferredRoom,
      rooms,
      entitiesHydrated,
      devicesLoaded,
      registriesHydrated,
      connected,
      connecting,
      standaloneMode,
    }: HookProps) =>
      useDashboardRoomNavigation(
        activeRoom,
        preferredRoom,
        rooms,
        changeRoom,
        fallbackRoom,
        entitiesHydrated,
        devicesLoaded,
        registriesHydrated,
        connected,
        connecting,
        standaloneMode
      ),
    { initialProps: { ...defaultProps, ...props } }
  );

  return { ...view, changeRoom, fallbackRoom };
}

describe('useDashboardRoomNavigation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the selected room while registries are not hydrated', () => {
    const { fallbackRoom, rerender } = renderRoomNavigation();

    rerender({
      ...defaultProps,
      rooms: ['Unassigned'],
      registriesHydrated: false,
    });

    expect(fallbackRoom).not.toHaveBeenCalled();
  });

  it('falls back once registries are hydrated and the selected room is still missing', () => {
    const { fallbackRoom, rerender } = renderRoomNavigation();

    rerender({
      ...defaultProps,
      rooms: ['Unassigned'],
      registriesHydrated: true,
    });

    expect(fallbackRoom).toHaveBeenCalledWith(ALL_ROOMS_ID);
  });

  it('keeps in-session room removal on a neighboring valid room', () => {
    const { fallbackRoom, rerender } = renderRoomNavigation();

    rerender({
      ...defaultProps,
      activeRoom: 'Living Room',
      preferredRoom: 'Living Room',
      rooms: ['Kitchen', 'Living Room'],
      entitiesHydrated: true,
      devicesLoaded: true,
      registriesHydrated: true,
    });

    rerender({
      ...defaultProps,
      activeRoom: 'Living Room',
      rooms: ['Kitchen'],
      entitiesHydrated: true,
      devicesLoaded: true,
      registriesHydrated: true,
    });

    expect(fallbackRoom).toHaveBeenCalledWith('Kitchen');
  });

  it('keeps all rooms stable regardless of room list changes', () => {
    const { fallbackRoom, rerender } = renderRoomNavigation({
      activeRoom: ALL_ROOMS_ID,
      preferredRoom: ALL_ROOMS_ID,
      rooms: ['Kitchen'],
    });

    rerender({
      ...defaultProps,
      activeRoom: ALL_ROOMS_ID,
      preferredRoom: ALL_ROOMS_ID,
      rooms: [],
      entitiesHydrated: true,
      devicesLoaded: true,
      registriesHydrated: true,
    });

    expect(fallbackRoom).not.toHaveBeenCalled();
  });

  it('does not fall back for empty rooms before hydration completes', () => {
    const { fallbackRoom, rerender } = renderRoomNavigation();

    rerender({
      ...defaultProps,
      rooms: [],
      entitiesHydrated: true,
      devicesLoaded: true,
      registriesHydrated: false,
    });

    expect(fallbackRoom).not.toHaveBeenCalled();
  });

  it('falls back to all rooms when hydrated rooms are empty', () => {
    const { fallbackRoom, rerender } = renderRoomNavigation();

    rerender({
      ...defaultProps,
      rooms: [],
      entitiesHydrated: true,
      devicesLoaded: true,
      registriesHydrated: true,
    });

    expect(fallbackRoom).toHaveBeenCalledWith(ALL_ROOMS_ID);
  });

  it('keeps the preferred standalone room through a reconnect grace period', () => {
    const { fallbackRoom, rerender } = renderRoomNavigation({
      standaloneMode: true,
      connected: false,
      connecting: true,
    });

    rerender({
      ...defaultProps,
      standaloneMode: true,
      connected: true,
      connecting: false,
      rooms: ['Living Room'],
    });

    expect(fallbackRoom).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(fallbackRoom).toHaveBeenCalledWith('Living Room');
  });

  it('restores the preferred standalone room when it returns after reconnect', () => {
    const { changeRoom, fallbackRoom, rerender } = renderRoomNavigation({
      standaloneMode: true,
      connected: false,
      connecting: true,
      activeRoom: 'Living Room',
      preferredRoom: 'Kitchen',
      rooms: ['Living Room'],
    });

    rerender({
      ...defaultProps,
      standaloneMode: true,
      connected: true,
      connecting: false,
      activeRoom: 'Living Room',
      preferredRoom: 'Kitchen',
      rooms: ['Kitchen', 'Living Room'],
    });

    expect(changeRoom).toHaveBeenCalledWith('Kitchen');
    expect(fallbackRoom).not.toHaveBeenCalled();
  });

  it('keeps the preferred standalone room across visibility restore churn', () => {
    const { fallbackRoom, rerender } = renderRoomNavigation({
      standaloneMode: true,
    });

    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    rerender({
      ...defaultProps,
      standaloneMode: true,
      rooms: ['Living Room'],
    });

    expect(fallbackRoom).not.toHaveBeenCalled();
  });
});
