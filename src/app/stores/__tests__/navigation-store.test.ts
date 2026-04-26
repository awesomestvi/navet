import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetAppStores } from '@/test/store-reset';
import { useNavigationStore } from '../navigation-store';

describe('useNavigationStore', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  it('updates the active section and pushes browser history', () => {
    const pushStateSpy = vi.spyOn(history, 'pushState');

    useNavigationStore.getState().setActiveSection('media');

    expect(pushStateSpy).toHaveBeenCalled();
    expect(useNavigationStore.getState().activeSection).toBe('media');
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('rehydrates only the current room from persisted state', async () => {
    localStorage.setItem(
      'ha-dashboard-navigation',
      JSON.stringify({
        state: {
          currentRoom: 'Kitchen',
          activeSection: 'lights',
        },
        version: 0,
      })
    );

    await useNavigationStore.persist.rehydrate();

    expect(useNavigationStore.getState().currentRoom).toBe('Kitchen');
    expect(useNavigationStore.getState().activeSection).toBe('home');
  });

  it('syncs activeSection from browser navigation events', () => {
    history.pushState({}, '', '/settings');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(useNavigationStore.getState().activeSection).toBe('settings');
  });
});
