import { STORE_STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { resetAppStores } from '@navet/app/test/store-reset';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('updates the active custom sidebar action and pushes browser history', () => {
    const pushStateSpy = vi.spyOn(history, 'pushState');

    useNavigationStore.getState().setActiveCustomSidebarAction('movie-status');

    expect(pushStateSpy).toHaveBeenCalled();
    expect(useNavigationStore.getState().activeCustomSidebarActionId).toBe('movie-status');
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
    localStorage.removeItem(STORE_STORAGE_KEYS.navigation);
    localStorage.setItem(
      'ha-dashboard-navigation',
      JSON.stringify({
        state: {
          currentRoom: 'Kitchen',
          lastExplicitRoom: 'Office',
          activeSection: 'lights',
          recentSections: ['tasks', 'lights', 'invalid'],
          lastNonHomeSection: 'tasks',
        },
        version: 0,
      })
    );

    await useNavigationStore.persist.rehydrate();

    expect(useNavigationStore.getState().currentRoom).toBe('Kitchen');
    expect(useNavigationStore.getState().lastExplicitRoom).toBe('Office');
    expect(useNavigationStore.getState().activeSection).toBe('home');
    expect(useNavigationStore.getState().recentSections).toEqual(['tasks', 'lights']);
    expect(useNavigationStore.getState().lastNonHomeSection).toBe('tasks');
    expect(localStorage.getItem(STORE_STORAGE_KEYS.navigation)).toContain(
      '"currentRoom":"Kitchen"'
    );
    expect(localStorage.getItem('ha-dashboard-navigation')).toBeNull();
  });

  it('falls back to the current room when persisted explicit room is missing', async () => {
    localStorage.removeItem(STORE_STORAGE_KEYS.navigation);
    localStorage.setItem(
      'ha-dashboard-navigation',
      JSON.stringify({
        state: {
          currentRoom: 'Kitchen',
          recentSections: ['tasks'],
        },
        version: 0,
      })
    );

    await useNavigationStore.persist.rehydrate();

    expect(useNavigationStore.getState().lastExplicitRoom).toBe('Kitchen');
  });

  it('drops invalid persisted section history entries', async () => {
    localStorage.removeItem(STORE_STORAGE_KEYS.navigation);
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

  it('prefers the navet navigation key when both navet and legacy data exist', async () => {
    localStorage.setItem(
      STORE_STORAGE_KEYS.navigation,
      JSON.stringify({
        state: {
          currentRoom: 'Living Room',
          lastExplicitRoom: 'Living Room',
          recentSections: ['security'],
          lastNonHomeSection: 'security',
        },
        version: 0,
      })
    );
    localStorage.setItem(
      'ha-dashboard-navigation',
      JSON.stringify({
        state: {
          currentRoom: 'Kitchen',
          lastExplicitRoom: 'Kitchen',
          recentSections: ['tasks'],
          lastNonHomeSection: 'tasks',
        },
        version: 0,
      })
    );

    await useNavigationStore.persist.rehydrate();

    expect(useNavigationStore.getState().currentRoom).toBe('Living Room');
    expect(useNavigationStore.getState().recentSections).toEqual(['security']);
    expect(localStorage.getItem('ha-dashboard-navigation')).toBeNull();
  });

  it('syncs activeSection from browser navigation events', () => {
    const pushStateSpy = vi.spyOn(history, 'pushState');
    const store = useNavigationStore.getState();

    store.setActiveSection('media');
    store.setActiveSection('tasks');
    const previousRecentSections = useNavigationStore.getState().recentSections;
    const previousLastNonHomeSection = useNavigationStore.getState().lastNonHomeSection;
    pushStateSpy.mockClear();

    const stopSync = startNavigationStoreSync();
    history.replaceState({}, '', '/settings');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(useNavigationStore.getState().activeSection).toBe('settings');
    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(useNavigationStore.getState().recentSections).toBe(previousRecentSections);
    expect(useNavigationStore.getState().lastNonHomeSection).toBe(previousLastNonHomeSection);
    stopSync();
  });

  it('syncs embedded custom sidebar destinations from browser navigation events', () => {
    const stopSync = startNavigationStoreSync();

    history.replaceState({}, '', '/embedded/movie-status');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(useNavigationStore.getState().activeSection).toBe('home');
    expect(useNavigationStore.getState().activeCustomSidebarActionId).toBe('movie-status');
    stopSync();
  });

  it('keeps the last explicit room when fallback room changes internally', () => {
    const store = useNavigationStore.getState();

    store.setCurrentRoom('Kitchen');
    store.setCurrentRoom('Living Room', { explicit: false });

    expect(useNavigationStore.getState().currentRoom).toBe('Living Room');
    expect(useNavigationStore.getState().lastExplicitRoom).toBe('Kitchen');
  });

  it('does not emit updates when the requested room state is unchanged', () => {
    const store = useNavigationStore.getState();
    const listener = vi.fn();
    const unsubscribe = useNavigationStore.subscribe(listener);

    store.setCurrentRoom('Kitchen');
    listener.mockClear();

    store.setCurrentRoom('Kitchen');
    store.setCurrentRoom('Kitchen', { explicit: false });

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('does not rewrite MRU state when popstate navigates to home', () => {
    const store = useNavigationStore.getState();

    store.setActiveSection('media');
    store.setActiveSection('tasks');
    const previousRecentSections = useNavigationStore.getState().recentSections;
    const previousLastNonHomeSection = useNavigationStore.getState().lastNonHomeSection;

    const stopSync = startNavigationStoreSync();
    history.replaceState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(useNavigationStore.getState().activeSection).toBe('home');
    expect(useNavigationStore.getState().recentSections).toBe(previousRecentSections);
    expect(useNavigationStore.getState().lastNonHomeSection).toBe(previousLastNonHomeSection);
    stopSync();
  });
});
