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

  it('tracks layout undo and redo without persisting history', () => {
    const store = useHomeDashboardLayoutStore.getState();

    store.updateLayout({
      ...DEFAULT_HOME_DASHBOARD_LAYOUT,
      cardIds: ['light.kitchen'],
    });

    expect(useHomeDashboardLayoutStore.getState()).toMatchObject({
      canRedo: false,
      canUndo: true,
      cardIds: ['home_assistant:light.kitchen'],
    });

    useHomeDashboardLayoutStore.getState().undoLayout();

    expect(useHomeDashboardLayoutStore.getState()).toMatchObject({
      canRedo: true,
      canUndo: false,
      cardIds: [],
    });

    useHomeDashboardLayoutStore.getState().redoLayout();

    expect(useHomeDashboardLayoutStore.getState()).toMatchObject({
      canRedo: false,
      canUndo: true,
      cardIds: ['home_assistant:light.kitchen'],
    });

    const persisted = localStorage.getItem(STORAGE_KEYS.homeDashboardLayout);
    expect(persisted).toContain('"cardIds"');
    expect(persisted).not.toContain('"past"');
    expect(persisted).not.toContain('"future"');
    expect(persisted).not.toContain('"canUndo"');
    expect(persisted).not.toContain('"canRedo"');
  });

  it('clears redo history after a new layout mutation', () => {
    useHomeDashboardLayoutStore.getState().updateLayout({
      ...DEFAULT_HOME_DASHBOARD_LAYOUT,
      cardIds: ['light.kitchen'],
    });
    useHomeDashboardLayoutStore.getState().updateLayout({
      ...DEFAULT_HOME_DASHBOARD_LAYOUT,
      cardIds: ['light.kitchen', 'switch.desk'],
    });

    useHomeDashboardLayoutStore.getState().undoLayout();

    expect(useHomeDashboardLayoutStore.getState()).toMatchObject({
      canRedo: true,
      cardIds: ['home_assistant:light.kitchen'],
    });

    useHomeDashboardLayoutStore.getState().updateLayout((layout) => ({
      ...layout,
      cardIds: [...layout.cardIds, 'sensor.office'],
    }));

    expect(useHomeDashboardLayoutStore.getState()).toMatchObject({
      canRedo: false,
      canUndo: true,
      cardIds: ['home_assistant:light.kitchen', 'home_assistant:sensor.office'],
    });

    useHomeDashboardLayoutStore.getState().redoLayout();

    expect(useHomeDashboardLayoutStore.getState().cardIds).toEqual([
      'home_assistant:light.kitchen',
      'home_assistant:sensor.office',
    ]);
  });

  it('bounds layout history to the latest fifty snapshots', () => {
    for (let index = 0; index < 55; index += 1) {
      useHomeDashboardLayoutStore.getState().updateLayout({
        ...DEFAULT_HOME_DASHBOARD_LAYOUT,
        cardIds: [`sensor.${index}`],
      });
    }

    for (let index = 0; index < 50; index += 1) {
      useHomeDashboardLayoutStore.getState().undoLayout();
    }

    expect(useHomeDashboardLayoutStore.getState()).toMatchObject({
      canUndo: false,
      cardIds: ['home_assistant:sensor.4'],
    });
  });
});
