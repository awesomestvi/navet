import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useHomeLayoutHydrated } from '../use-home-layout-hydrated';

describe('useHomeLayoutHydrated', () => {
  it('does not block dashboard loading for stale imported card ids', () => {
    const { result } = renderHook(() =>
      useHomeLayoutHydrated({
        cardIds: ['custom-imported', 'weather.old_entity'],
        availableDeviceMap: new Map(),
        allCustomCards: [
          {
            id: 'custom-imported',
            type: 'note',
            size: 'medium',
            room: '__home__',
            createdAt: 1,
          },
        ],
      })
    );

    expect(result.current).toBe(true);
  });

  it('keeps empty and not-yet-populated layouts ready', () => {
    const { result } = renderHook(() =>
      useHomeLayoutHydrated({
        cardIds: ['weather.pending'],
        availableDeviceMap: new Map(),
        allCustomCards: [],
      })
    );

    expect(result.current).toBe(true);
  });

  it('does not block when imported card ids do not match the current device map', () => {
    const { result } = renderHook(() =>
      useHomeLayoutHydrated({
        cardIds: ['water_heater.demo_water_heater', 'weather.old_entity'],
        availableDeviceMap: new Map([['light.kitchen', {}]]),
        allCustomCards: [],
      })
    );

    expect(result.current).toBe(true);
  });
});
