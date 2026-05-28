import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '@/app/constants/storage-keys';
import { useCardZonesStore } from '../card-zones-store';

describe('useCardZonesStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useCardZonesStore.setState(useCardZonesStore.getInitialState(), true);
  });

  it('updates and persists card zone assignments', () => {
    useCardZonesStore.getState().updateCardZone('light.kitchen', 'actions');

    expect(useCardZonesStore.getState().cardZones).toEqual({
      'home_assistant:light.kitchen': 'actions',
    });
    expect(localStorage.getItem(STORAGE_KEYS.cardZones)).toContain('home_assistant:light.kitchen');
  });

  it('hydrates legacy raw records and drops invalid zones', async () => {
    localStorage.setItem(
      STORAGE_KEYS.cardZones,
      JSON.stringify({
        'weather.home': 'hero',
        'sensor.power': 'analytics',
        'button.bad': 'invalid',
        nested: { zone: 'status' },
      })
    );

    await useCardZonesStore.persist.rehydrate();

    expect(useCardZonesStore.getState().cardZones).toEqual({
      'home_assistant:weather.home': 'hero',
      'home_assistant:sensor.power': 'analytics',
    });
  });

  it('hydrates persisted Zustand records and drops non-string ids', async () => {
    localStorage.setItem(
      STORAGE_KEYS.cardZones,
      JSON.stringify({
        state: {
          cardZones: {
            'vacuum.downstairs': 'status',
            'media.living_room': 'hero',
            'light.invalid': 'left',
          },
        },
        version: 0,
      })
    );

    await useCardZonesStore.persist.rehydrate();

    expect(useCardZonesStore.getState().cardZones).toEqual({
      'home_assistant:vacuum.downstairs': 'status',
      'home_assistant:media.living_room': 'hero',
    });
  });
});
