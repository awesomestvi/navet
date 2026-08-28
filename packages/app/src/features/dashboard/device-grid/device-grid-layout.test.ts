import { describe, expect, it } from 'vitest';
import { packDashboardGridItems } from './device-grid-layout';

describe('packDashboardGridItems', () => {
  it('keeps mixed room-card footprints stable without avoidable interior gaps', () => {
    const placements = packDashboardGridItems(
      [
        { id: 'stop-music', size: 'tiny' },
        { id: 'feed-mowgli', size: 'extra-small' },
        { id: 'island-lights', size: 'extra-small' },
        { id: 'plant-light', size: 'small' },
        { id: 'water-pump', size: 'tiny' },
        { id: 'window-lamp', size: 'small' },
        { id: 'dining-lamp', size: 'small' },
        { id: 'cabinet-lights', size: 'small' },
      ],
      8
    );

    expect(placements.get('plant-light')).toEqual({ column: 7, row: 1 });
    expect(placements.get('water-pump')).toEqual({ column: 6, row: 1 });
    expect(placements.get('window-lamp')).toEqual({ column: 1, row: 2 });
    expect(placements.get('dining-lamp')).toEqual({ column: 3, row: 2 });
    expect(placements.get('cabinet-lights')).toEqual({ column: 5, row: 2 });
  });

  it('returns the same placement for the same input', () => {
    const items = [
      { id: 'climate', size: 'large' as const },
      { id: 'light', size: 'small' as const },
      { id: 'script', size: 'tiny' as const },
    ];

    expect([...packDashboardGridItems(items, 8)]).toEqual([...packDashboardGridItems(items, 8)]);
  });

  it('forms a complete small-card block from two tiny cards and one extra-small card', () => {
    const placements = packDashboardGridItems(
      [
        { id: 'water-pump', size: 'tiny' },
        { id: 'feed-mowgli', size: 'extra-small' },
        { id: 'stop-music', size: 'tiny' },
        { id: 'island-lights', size: 'extra-small' },
      ],
      8
    );

    expect(placements.get('water-pump')).toEqual({ column: 1, row: 1 });
    expect(placements.get('stop-music')).toEqual({ column: 2, row: 1 });
    expect(placements.get('feed-mowgli')).toEqual({ column: 1, row: 2 });
    expect(placements.get('island-lights')).toEqual({ column: 3, row: 1 });
  });
});
