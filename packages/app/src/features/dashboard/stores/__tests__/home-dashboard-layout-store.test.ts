import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_HOME_DASHBOARD_LAYOUT,
  useHomeDashboardLayoutStore,
} from '../home-dashboard-layout-store';

describe('useHomeDashboardLayoutStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useHomeDashboardLayoutStore.setState(useHomeDashboardLayoutStore.getInitialState(), true);
  });

  it('migrates the legacy home layout key to the navet namespace', async () => {
    localStorage.removeItem(STORAGE_KEYS.homeDashboardLayout);
    localStorage.setItem(
      LEGACY_STORAGE_KEYS.homeDashboardLayout,
      JSON.stringify({
        state: {
          mode: 'sectioned',
          showHero: false,
          cardIds: ['light.kitchen'],
          sections: [
            {
              i: 'section-1',
              x: 0,
              y: 0,
              w: 2,
              h: 1,
            },
          ],
          cardSectionAssignments: {
            'light.kitchen': 'section-1',
          },
        },
        version: 0,
      })
    );

    await useHomeDashboardLayoutStore.persist.rehydrate();

    expect(useHomeDashboardLayoutStore.getState()).toMatchObject({
      ...DEFAULT_HOME_DASHBOARD_LAYOUT,
      mode: 'sectioned',
      showHero: false,
      cardIds: ['home_assistant:light.kitchen'],
      cardSectionAssignments: {
        'home_assistant:light.kitchen': 'section-1',
      },
    });
    expect(localStorage.getItem(STORAGE_KEYS.homeDashboardLayout)).toContain('"sectioned"');
    expect(localStorage.getItem(LEGACY_STORAGE_KEYS.homeDashboardLayout)).toBeNull();
  });
});
