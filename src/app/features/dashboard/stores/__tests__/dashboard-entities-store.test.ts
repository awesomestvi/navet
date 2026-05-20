import { beforeEach, describe, expect, it } from 'vitest';
import { useDashboardEntitiesStore } from '../dashboard-entities-store';

describe('useDashboardEntitiesStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useDashboardEntitiesStore.setState(useDashboardEntitiesStore.getInitialState(), true);
  });

  it('locks, unlocks, and toggles cards without duplicating ids', () => {
    useDashboardEntitiesStore.getState().lockCard('light.kitchen');
    useDashboardEntitiesStore.getState().lockCard('light.kitchen');

    expect(useDashboardEntitiesStore.getState().lockedCardIds).toEqual(['light.kitchen']);

    useDashboardEntitiesStore.getState().toggleCardLock('light.kitchen');
    expect(useDashboardEntitiesStore.getState().lockedCardIds).toEqual([]);

    useDashboardEntitiesStore.getState().toggleCardLock('custom-note');
    expect(useDashboardEntitiesStore.getState().lockedCardIds).toEqual(['custom-note']);

    useDashboardEntitiesStore.getState().unlockCard('custom-note');
    expect(useDashboardEntitiesStore.getState().lockedCardIds).toEqual([]);
  });

  it('hydrates persisted locked card ids and drops invalid entries', async () => {
    localStorage.setItem(
      'navet-dashboard-entities',
      JSON.stringify({
        state: {
          hiddenEntityIds: ['light.hidden'],
          lockedCardIds: ['light.kitchen', 42, 'custom-note', 'light.kitchen'],
          onboardingCompleted: true,
        },
        version: 0,
      })
    );

    await useDashboardEntitiesStore.persist.rehydrate();

    expect(useDashboardEntitiesStore.getState().lockedCardIds).toEqual([
      'light.kitchen',
      'custom-note',
    ]);
  });
});
