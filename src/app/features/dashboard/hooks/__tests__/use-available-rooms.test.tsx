import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAvailableRooms } from '../use-available-rooms';

describe('useAvailableRooms', () => {
  it('includes Home Assistant area rooms with no currently mapped devices', () => {
    const { result } = renderHook(() =>
      useAvailableRooms(
        [
          { area_id: 'kitchen', name: 'Kitchen' },
          { area_id: 'office', name: 'Office' },
        ],
        ['Kitchen']
      )
    );

    expect(result.current.availableRooms).toEqual(['Kitchen', 'Office']);
  });

  it('de-duplicates rooms that are both discovered and area-backed', () => {
    const { result } = renderHook(() =>
      useAvailableRooms(
        [
          { area_id: 'kitchen', name: 'Kitchen' },
          { area_id: 'living-room', name: 'Living Room' },
        ],
        ['Living Room', 'Kitchen']
      )
    );

    expect(result.current.availableRooms).toEqual(['Kitchen', 'Living Room']);
  });

  it('keeps discovered-only rooms available', () => {
    const { result } = renderHook(() =>
      useAvailableRooms([{ area_id: 'kitchen', name: 'Kitchen' }], ['Kitchen', 'Unassigned'])
    );

    expect(result.current.availableRooms).toEqual(['Kitchen', 'Unassigned']);
  });
});
