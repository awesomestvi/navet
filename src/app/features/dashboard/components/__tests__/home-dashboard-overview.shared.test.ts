import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  getDashboardCardFootprint,
  PHONE_SMALL_CARD_TARGET_WIDTH_PX,
} from '@/app/components/shared/card-size-selector';
import { useDashboardDevices } from '@/app/hooks/use-dashboard-devices';
import type { DeviceCollection, DeviceWithType } from '@/app/types/device.types';
import type { HomeDashboardLayoutState } from '../../hooks/use-home-dashboard-layout';
import {
  buildHomeOverviewCollections,
  getCardGridGapPx,
  getCardGridTargetWidth,
} from '../home-dashboard-overview.shared';

const baseDevices: DeviceCollection = {
  lights: [],
  hvac: [],
  climate: [],
  media: [],
  weather: [],
  switches: [],
  helpers: [],
  covers: [],
  locks: [],
  scenes: [],
  persons: [],
  sensors: [],
  vacuums: [],
  calendars: [
    {
      id: 'calendar.kitchen',
      name: 'Kitchen calendar',
      room: 'Kitchen',
      size: 'medium',
      events: [],
    },
  ],
  cameras: [],
  'grouped-sensors': [],
};

const homeLayout: HomeDashboardLayoutState = {
  mode: 'sectioned',
  showHero: true,
  cardIds: ['calendar.kitchen', 'missing.entity'],
  sections: [
    {
      id: 'section-1',
      title: 'Pinned',
      x: 0,
      y: 0,
      w: 6,
      h: 1,
      span: 6,
    },
  ],
  cardSectionAssignments: {
    'calendar.kitchen': 'section-1',
    'missing.entity': 'section-1',
  },
};

const kitchenCalendar: DeviceWithType = {
  id: 'calendar.kitchen',
  name: 'Kitchen calendar',
  room: 'Kitchen',
  size: 'medium',
  type: 'calendars',
};

describe('home dashboard overview collections', () => {
  it('keeps hidden room entities out of room grids', () => {
    const { result } = renderHook(() => useDashboardDevices(baseDevices, ['calendar.kitchen']));

    expect(result.current.calendars).toEqual([]);
  });

  it('still resolves hidden room entities on home from the unfiltered map', () => {
    const collections = buildHomeOverviewCollections({
      deviceMap: new Map([['calendar.kitchen', kitchenCalendar]]),
      allCustomCards: [],
      homeLayout,
    });

    expect(collections.allCards.get('calendar.kitchen')).toBe(kitchenCalendar);
    expect(collections.sectionCards).toEqual([
      expect.objectContaining({
        id: 'section-1',
        cardIds: ['calendar.kitchen'],
      }),
    ]);
  });

  it('ignores missing home layout ids while preserving valid cards', () => {
    const collections = buildHomeOverviewCollections({
      deviceMap: new Map([['calendar.kitchen', kitchenCalendar]]),
      allCustomCards: [],
      homeLayout,
    });

    expect(collections.allCards.has('missing.entity')).toBe(false);
    expect(collections.flowCards).toEqual([]);
    expect(collections.sectionCards[0]?.cardIds).toEqual(['calendar.kitchen']);
  });

  it('keeps the phone small tile aligned to the 168 logical px target footprint', () => {
    expect(getDashboardCardFootprint('small', 2)).toEqual({
      widthPx: PHONE_SMALL_CARD_TARGET_WIDTH_PX,
      heightPx: PHONE_SMALL_CARD_TARGET_WIDTH_PX,
    });
  });

  it('derives phone grid target widths from the shared footprint metrics', () => {
    const gridGapPx = getCardGridGapPx(2);

    expect(getCardGridTargetWidth(4, gridGapPx)).toEqual({
      microCardMinWidth: 80,
      targetGridWidth: 344,
    });
  });
});
