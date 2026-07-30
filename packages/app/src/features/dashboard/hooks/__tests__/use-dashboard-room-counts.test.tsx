import type { PlatformRoom } from '@navet/app/platform/types';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDashboardRoomCounts } from '../use-dashboard-room-counts';

describe('useDashboardRoomCounts', () => {
  it('counts visible and hidden items from canonical room membership', () => {
    const allRooms: PlatformRoom[] = [
      {
        id: 'kitchen',
        key: 'kitchen',
        name: 'Kitchen',
        providerIds: ['home_assistant', 'homey'],
        canonicalMemberIds: ['home_assistant:light.kitchen', 'homey:switch_1', 'homey:sensor_1'],
      },
      {
        id: 'office',
        key: 'office',
        name: 'Office',
        providerIds: ['home_assistant'],
        canonicalMemberIds: ['home_assistant:fan.office'],
      },
    ];
    const visibleRooms: PlatformRoom[] = [
      {
        id: 'kitchen',
        key: 'kitchen',
        name: 'Kitchen',
        providerIds: ['home_assistant', 'homey'],
        canonicalMemberIds: ['home_assistant:light.kitchen'],
      },
      {
        id: 'office',
        key: 'office',
        name: 'Office',
        providerIds: ['home_assistant'],
        canonicalMemberIds: ['home_assistant:fan.office'],
      },
    ];

    const { result } = renderHook(() => useDashboardRoomCounts(allRooms, visibleRooms));

    expect(result.current.roomItemCounts).toEqual(
      new Map([
        ['Kitchen', 3],
        ['Office', 1],
      ])
    );
    expect(result.current.roomHiddenItemCounts).toEqual(new Map([['Kitchen', 2]]));
  });

  it('retains count maps when rebuilt room models have unchanged membership counts', () => {
    const createRooms = (): PlatformRoom[] => [
      {
        id: 'kitchen',
        key: 'kitchen',
        name: 'Kitchen',
        providerIds: ['home_assistant'],
        canonicalMemberIds: ['home_assistant:light.kitchen'],
      },
    ];
    const { result, rerender } = renderHook(
      ({ allRooms, visibleRooms }: { allRooms: PlatformRoom[]; visibleRooms: PlatformRoom[] }) =>
        useDashboardRoomCounts(allRooms, visibleRooms),
      {
        initialProps: {
          allRooms: createRooms(),
          visibleRooms: createRooms(),
        },
      }
    );
    const firstRoomItemCounts = result.current.roomItemCounts;
    const firstVisibleRoomItemCounts = result.current.visibleRoomItemCounts;
    const firstHiddenRoomItemCounts = result.current.roomHiddenItemCounts;

    rerender({
      allRooms: createRooms(),
      visibleRooms: createRooms(),
    });

    expect(result.current.roomItemCounts).toBe(firstRoomItemCounts);
    expect(result.current.visibleRoomItemCounts).toBe(firstVisibleRoomItemCounts);
    expect(result.current.roomHiddenItemCounts).toBe(firstHiddenRoomItemCounts);
  });
});
