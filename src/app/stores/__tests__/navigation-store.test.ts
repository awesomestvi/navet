import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetAppStores } from '@/test/store-reset';
import { startNavigationStoreSync, useNavigationStore } from '../navigation-store';

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

  it('tracks non-home sections in recent MRU order', () => {
    const store = useNavigationStore.getState();

    store.setActiveSection('media');
    store.setActiveSection('tasks');
    store.setActiveSection('lights');

    expect(useNavigationStore.getState().recentSections).toEqual(['lights', 'tasks', 'media']);
    expect(useNavigationStore.getState().lastNonHomeSection).toBe('lights');
  });

  it('moves revisited sections to the front without duplicates', () => {
    const store = useNavigationStore.getState();

    store.setActiveSection('media');
    store.setActiveSection('tasks');
    store.setActiveSection('media');

    expect(useNavigationStore.getState().recentSections).toEqual(['media', 'tasks']);
    expect(useNavigationStore.getState().lastNonHomeSection).toBe('media');
  });

  it('does not add home to recent sections', () => {
    const store = useNavigationStore.getState();

    store.setActiveSection('media');
    store.setActiveSection('home');

    expect(useNavigationStore.getState().recentSections).toEqual(['media']);
    expect(useNavigationStore.getState().lastNonHomeSection).toBe('media');
  });

  it('caps recent sections to three entries', () => {
    const store = useNavigationStore.getState();

    store.setActiveSection('media');
    store.setActiveSection('tasks');
    store.setActiveSection('lights');
    store.setActiveSection('security');

    expect(useNavigationStore.getState().recentSections).toEqual(['security', 'lights', 'tasks']);
  });

  it('rehydrates the current room and mobile recents from persisted state', async () => {
    localStorage.setItem(
      'ha-dashboard-navigation',
      JSON.stringify({
        state: {
          currentRoom: 'Kitchen',
          activeSection: 'lights',
          recentSections: ['tasks', 'lights', 'invalid'],
          lastNonHomeSection: 'tasks',
        },
        version: 0,
      })
    );

    await useNavigationStore.persist.rehydrate();

    expect(useNavigationStore.getState().currentRoom).toBe('Kitchen');
    expect(useNavigationStore.getState().activeSection).toBe('home');
    expect(useNavigationStore.getState().recentSections).toEqual(['tasks', 'lights']);
    expect(useNavigationStore.getState().lastNonHomeSection).toBe('tasks');
  });

  it('drops invalid persisted section history entries', async () => {
    localStorage.setItem(
      'ha-dashboard-navigation',
      JSON.stringify({
        state: {
          currentRoom: 'Office',
          recentSections: ['home', 'media', 'media', 'invalid', 'security', 'tasks'],
          lastNonHomeSection: 'home',
        },
        version: 0,
      })
    );

    await useNavigationStore.persist.rehydrate();

    expect(useNavigationStore.getState().recentSections).toEqual(['media', 'security', 'tasks']);
    expect(useNavigationStore.getState().lastNonHomeSection).toBeNull();
  });

  it('syncs activeSection from browser navigation events', () => {
    const stopSync = startNavigationStoreSync();
    history.pushState({}, '', '/settings');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(useNavigationStore.getState().activeSection).toBe('settings');
    stopSync();
  });
});
