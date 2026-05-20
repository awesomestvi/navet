import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '@/app/constants/storage-keys';
import { useCustomCardsStore, useDashboardEntitiesStore } from '@/app/features/dashboard';
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
    expect(localStorage.getItem(STORAGE_KEYS.homeDashboardLayout)).toContain('null');
    expect(useDashboardEntitiesStore.getState().lockedCardIds).toEqual([
      'light.kitchen',
      'custom-note',
    ]);
  });

  it('exports locked card ids with dashboard entity state', () => {
    useDashboardEntitiesStore.getState().lockCard('light.kitchen');

    const exported = exportDashboardConfig();

    expect(exported.dashboardEntities?.lockedCardIds).toEqual(['light.kitchen']);
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
