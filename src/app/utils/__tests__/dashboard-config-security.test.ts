import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '@/app/constants/storage-keys';
import {
  useCardZonesStore,
  useCustomCardsStore,
  useDashboardEntitiesStore,
  useHomeDashboardLayoutStore,
} from '@/app/features/dashboard';
import { useNavigationStore } from '@/app/stores/navigation-store';
import { useSettingsStore } from '@/app/stores/settings-store';
import {
  exportDashboardConfig,
  importDashboardConfig,
  importDashboardConfigFromUrl,
} from '@/app/utils/dashboard-config';

const baseConfig = {
  version: 3,
  app: 'navet',
  theme: {
    theme: 'dark',
    primaryColor: 'orange',
  },
  settings: {},
  navigation: {
    currentRoom: 'all',
    activeSection: 'home',
  },
};

describe('dashboard-config import hardening', () => {
  beforeEach(() => {
    localStorage.clear();
    useCustomCardsStore.setState(useCustomCardsStore.getInitialState(), true);
    useDashboardEntitiesStore.setState(useDashboardEntitiesStore.getInitialState(), true);
    useCardZonesStore.setState(useCardZonesStore.getInitialState(), true);
    useHomeDashboardLayoutStore.setState(useHomeDashboardLayoutStore.getInitialState(), true);
    useNavigationStore.setState(useNavigationStore.getInitialState(), true);
    useSettingsStore.setState(useSettingsStore.getInitialState(), true);
  });

  it('drops unsafe custom card URLs and service calls', () => {
    importDashboardConfig({
      ...baseConfig,
      customCards: [
        {
          id: 'rss-card',
          type: 'rss',
          size: 'medium',
          room: 'all',
          data: {
            customProviders: [
              {
                id: 'bad',
                name: 'Bad',
                type: 'url',
                feedUrl: 'http://localhost/feed.xml',
              },
              {
                id: 'good',
                name: 'Good',
                type: 'url',
                feedUrl: 'https://example.com/feed.xml',
              },
            ],
          },
        },
        {
          id: 'button-card',
          type: 'button',
          size: 'medium',
          room: 'all',
          data: {
            service: 'javascript:alert(1)',
            entityId: '../light.kitchen',
          },
        },
      ],
    });

    const cards = useCustomCardsStore.getState().cards;
    expect(cards[0]?.data?.customProviders).toEqual([
      {
        id: 'good',
        name: 'Good',
        type: 'url',
        feedUrl: 'https://example.com/feed.xml',
      },
    ]);
    expect(cards[1]?.data?.service).toBeUndefined();
    expect(cards[1]?.data?.entityId).toBeUndefined();
  });

  it('sanitizes imported storage records before persistence', () => {
    importDashboardConfig({
      ...baseConfig,
      dashboardEntities: {
        hiddenEntityIds: ['light.hidden'],
        lockedCardIds: ['light.kitchen', 123, 'custom-note'],
        onboardingCompleted: true,
      },
      cardSizes: {
        'light.kitchen': 'large',
        bad: { nested: true },
      },
      cardOrders: {
        all: ['light.kitchen', 123, 'switch.kettle'],
      },
      homeDashboardLayout: ['not-an-object'],
    });

    expect(localStorage.getItem(STORAGE_KEYS.cardSizes)).toContain('light.kitchen');
    expect(localStorage.getItem(STORAGE_KEYS.cardSizes)).not.toContain('nested');
    expect(localStorage.getItem(STORAGE_KEYS.cardOrders)).toContain('switch.kettle');
    expect(useHomeDashboardLayoutStore.getState().cardIds).toEqual([]);
    expect(useDashboardEntitiesStore.getState().lockedCardIds).toEqual([
      'light.kitchen',
      'custom-note',
    ]);
  });

  it('applies imported persisted dashboard state to live stores', () => {
    importDashboardConfig({
      ...baseConfig,
      cardZones: {
        'light.kitchen': 'actions',
      },
      homeDashboardLayout: {
        mode: 'sectioned',
        showHero: false,
        cardIds: ['light.kitchen'],
        sections: [
          {
            id: 'main',
            title: 'Main',
            x: 0,
            y: 0,
            w: 12,
            h: 1,
          },
        ],
        cardSectionAssignments: {
          'light.kitchen': 'main',
        },
      },
      roomOrder: ['Kitchen'],
    });

    expect(useCardZonesStore.getState().cardZones).toEqual({
      'light.kitchen': 'actions',
    });
    expect(useHomeDashboardLayoutStore.getState()).toMatchObject({
      mode: 'sectioned',
      showHero: false,
      cardIds: ['light.kitchen'],
      cardSectionAssignments: {
        'light.kitchen': 'main',
      },
    });
  });

  it('exports locked card ids with dashboard entity state', () => {
    useDashboardEntitiesStore.getState().lockCard('light.kitchen');

    const exported = exportDashboardConfig();

    expect(exported.dashboardEntities?.lockedCardIds).toEqual(['light.kitchen']);
  });

  it('round-trips the summary bar dashboard setting', () => {
    useSettingsStore.getState().updateSettings({ showHomeSummaryBar: false });

    const exported = exportDashboardConfig();

    expect(exported.settings.showHomeSummaryBar).toBe(false);

    useSettingsStore.getState().updateSettings({ showHomeSummaryBar: true });

    importDashboardConfig({
      ...baseConfig,
      settings: {
        showHomeSummaryBar: false,
      },
    });

    expect(useSettingsStore.getState().showHomeSummaryBar).toBe(false);
  });

  it('can import shared profile data without replacing current navigation', () => {
    useNavigationStore.getState().applyNavigationState({
      currentRoom: 'Kitchen',
      activeSection: 'home',
    });

    importDashboardConfig(
      {
        ...baseConfig,
        navigation: {
          currentRoom: 'Unassigned',
          activeSection: 'settings',
        },
      },
      { applyNavigation: false }
    );

    expect(useNavigationStore.getState().currentRoom).toBe('Kitchen');
    expect(useNavigationStore.getState().activeSection).toBe('home');
  });

  it('imports dashboard config from a runtime URL', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        [
          'version: 3',
          'app: navet',
          'theme:',
          '  theme: dark',
          '  primaryColor: orange',
          'settings: {}',
          'navigation:',
          '  currentRoom: all',
          '  activeSection: home',
          'dashboardEntities:',
          '  onboardingCompleted: true',
        ].join('\n'),
        { status: 200 }
      )
    );

    await importDashboardConfigFromUrl('/navet-dashboard.yaml');

    expect(fetch).toHaveBeenCalledWith('/navet-dashboard.yaml', {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    expect(localStorage.getItem('navet-dashboard-entities')).toContain('onboardingCompleted');
  });
});
