import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import {
  useCardZonesStore,
  useCustomCardsStore,
  useDashboardEntitiesStore,
  useHomeDashboardLayoutStore,
} from '@navet/app/features/dashboard';
import { useNavigationStore } from '@navet/app/stores/navigation-store';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import {
  exportDashboardConfig,
  importDashboardConfig,
  importDashboardConfigFromUrl,
} from '@navet/app/utils/dashboard-config';
import { setSettingsProfileScope } from '@navet/app/utils/settings-profile-scope';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    expect(cards[1]?.size).toBe('small');
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
      'home_assistant:light.kitchen': 'actions',
    });
    expect(useHomeDashboardLayoutStore.getState()).toMatchObject({
      mode: 'sectioned',
      showHero: false,
      cardIds: ['home_assistant:light.kitchen'],
      cardSectionAssignments: {
        'home_assistant:light.kitchen': 'main',
      },
    });
  });

  it('imports home dashboard layout from legacy persisted storage wrappers', () => {
    importDashboardConfig({
      ...baseConfig,
      customCards: [
        {
          id: 'custom-note',
          type: 'note',
          size: 'medium',
          room: '__home__',
          createdAt: 1,
        },
      ],
      homeDashboardLayout: {
        state: {
          mode: 'flow',
          showHero: true,
          cardIds: ['custom-note'],
          sections: [],
          cardSectionAssignments: {},
        },
        version: 0,
      },
    });

    expect(useHomeDashboardLayoutStore.getState().cardIds).toEqual(['custom-note']);
  });

  it('imports legacy sensor-group cards as canonical info cards', () => {
    importDashboardConfig({
      ...baseConfig,
      customCards: [
        {
          id: 'custom-sensor-group',
          type: 'sensor-group',
          size: 'medium',
          room: 'Kitchen',
          createdAt: 1,
          data: {
            name: 'Kitchen sensors',
            sensorEntityIds: ['sensor.kitchen_temperature', 'sensor.kitchen_humidity'],
            accentColor: 'teal',
          },
        },
      ],
    });

    expect(useCustomCardsStore.getState().cards).toEqual([
      expect.objectContaining({
        id: 'custom-sensor-group',
        type: 'info',
        data: {
          name: 'Kitchen sensors',
          sensorEntityIds: ['sensor.kitchen_temperature', 'sensor.kitchen_humidity'],
          accentColor: 'teal',
        },
      }),
    ]);

    expect(exportDashboardConfig().customCards).toEqual([
      expect.objectContaining({
        id: 'custom-sensor-group',
        type: 'info',
      }),
    ]);
  });

  it('exports home dashboard layout without the persisted storage wrapper', () => {
    useHomeDashboardLayoutStore.getState().replaceLayout({
      mode: 'flow',
      showHero: true,
      cardIds: ['light.kitchen'],
      sections: [],
      cardSectionAssignments: {},
    });

    const exported = exportDashboardConfig();

    expect(exported.homeDashboardLayout).toMatchObject({
      mode: 'flow',
      showHero: true,
      cardIds: ['home_assistant:light.kitchen'],
      sections: [],
      cardSectionAssignments: {},
    });
    expect(exported.homeDashboardLayout).not.toHaveProperty('state');
    expect(exported.homeDashboardLayout).not.toHaveProperty('version');
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

  it('round-trips dashboard behavior settings', () => {
    useSettingsStore.getState().updateSettings({
      dashboardSpaceMode: 'more_space',
      keepDeviceAwake: true,
      kioskMode: true,
      weatherForecastMode: 'hourly',
    });

    const exported = exportDashboardConfig();

    expect(exported.settings.dashboardSpaceMode).toBe('more_space');
    expect(exported.settings.keepDeviceAwake).toBe(true);
    expect(exported.settings.kioskMode).toBe(true);
    expect(exported.settings.weatherForecastMode).toBe('hourly');

    useSettingsStore.getState().updateSettings({
      dashboardSpaceMode: 'default',
      keepDeviceAwake: false,
      kioskMode: false,
      weatherForecastMode: 'weekly',
    });

    importDashboardConfig({
      ...baseConfig,
      settings: {
        dashboardSpaceMode: 'more_space',
        keepDeviceAwake: true,
        kioskMode: true,
        weatherForecastMode: 'hourly',
      },
    });

    expect(useSettingsStore.getState().kioskMode).toBe(true);
    expect(useSettingsStore.getState().keepDeviceAwake).toBe(true);
    expect(useSettingsStore.getState().dashboardSpaceMode).toBe('more_space');
    expect(useSettingsStore.getState().weatherForecastMode).toBe('hourly');
  });

  it('keeps this-device scoped dashboard behavior settings out of shared profiles', () => {
    useSettingsStore.getState().updateSettings({
      dashboardSpaceMode: 'more_space',
      keepDeviceAwake: true,
      kioskMode: true,
    });
    setSettingsProfileScope(['dashboardSpaceMode', 'keepDeviceAwake', 'kioskMode'], 'device');

    const exported = exportDashboardConfig();

    expect(exported.settings).not.toHaveProperty('dashboardSpaceMode');
    expect(exported.settings).not.toHaveProperty('keepDeviceAwake');
    expect(exported.settings).not.toHaveProperty('kioskMode');

    importDashboardConfig({
      ...baseConfig,
      settings: {
        dashboardSpaceMode: 'default',
        keepDeviceAwake: false,
        kioskMode: false,
      },
    });

    expect(useSettingsStore.getState().dashboardSpaceMode).toBe('more_space');
    expect(useSettingsStore.getState().keepDeviceAwake).toBe(true);
    expect(useSettingsStore.getState().kioskMode).toBe(true);
  });

  it('preserves remembered all-device values while exporting this-device overrides', () => {
    useSettingsStore.getState().updateSettings({ kioskMode: true });
    setSettingsProfileScope(['kioskMode'], 'device', useSettingsStore.getState());
    useSettingsStore.getState().updateSettings({ kioskMode: false });

    const exported = exportDashboardConfig();

    expect(useSettingsStore.getState().kioskMode).toBe(false);
    expect(exported.settings.kioskMode).toBe(true);
  });

  it('round-trips header title settings', () => {
    useSettingsStore.getState().updateSettings({
      headerTitleMode: 'custom_text',
      headerCustomText: 'Movie night',
    });

    const exported = exportDashboardConfig();

    expect(exported.settings.headerTitleMode).toBe('custom_text');
    expect(exported.settings.headerCustomText).toBe('Movie night');

    useSettingsStore.getState().updateSettings({
      headerTitleMode: 'auto_greeting',
      headerCustomText: '',
    });

    importDashboardConfig({
      ...baseConfig,
      settings: {
        headerTitleMode: 'custom_text',
        headerCustomText: '  Wind down  ',
      },
    });

    expect(useSettingsStore.getState().headerTitleMode).toBe('custom_text');
    expect(useSettingsStore.getState().headerCustomText).toBe('Wind down');
  });

  it('falls back to defaults for invalid imported header title settings', () => {
    useSettingsStore.getState().updateSettings({
      headerTitleMode: 'custom_text',
      headerCustomText: 'Keep me',
    });

    importDashboardConfig({
      ...baseConfig,
      settings: {
        headerTitleMode: 'ticker',
        headerCustomText: 45,
      },
    });

    expect(useSettingsStore.getState().headerTitleMode).toBe('auto_greeting');
    expect(useSettingsStore.getState().headerCustomText).toBe('');
  });

  it('round-trips the camera dashboard preview default', () => {
    useSettingsStore.getState().updateSettings({ cameraDashboardViewMode: 'auto' });

    const exported = exportDashboardConfig();

    expect(exported.settings.cameraDashboardViewMode).toBe('auto');

    useSettingsStore.getState().updateSettings({ cameraDashboardViewMode: 'snapshot' });

    importDashboardConfig({
      ...baseConfig,
      settings: {
        cameraDashboardViewMode: 'auto',
      },
    });

    expect(useSettingsStore.getState().cameraDashboardViewMode).toBe('auto');
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
