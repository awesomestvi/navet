import { STORE_STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { resetAppStores } from '@navet/app/test/store-reset';
import { beforeEach, describe, expect, it } from 'vitest';
import { defaultSettings, useSettingsStore } from '../settings-store';

describe('useSettingsStore', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  it('updates partial settings', () => {
    useSettingsStore.getState().updateSettings({
      dashboardSpaceMode: 'more_space',
      compactMode: true,
      headerCustomText: 'Movie night',
      headerTitleMode: 'custom_text',
      kioskMode: true,
      keepDeviceAwake: true,
      showHomeSummaryBar: false,
      temperatureUnit: 'celsius',
    });

    expect(useSettingsStore.getState().compactMode).toBe(true);
    expect(useSettingsStore.getState().dashboardSpaceMode).toBe('more_space');
    expect(useSettingsStore.getState().headerCustomText).toBe('Movie night');
    expect(useSettingsStore.getState().headerTitleMode).toBe('custom_text');
    expect(useSettingsStore.getState().kioskMode).toBe(true);
    expect(useSettingsStore.getState().keepDeviceAwake).toBe(true);
    expect(useSettingsStore.getState().showHomeSummaryBar).toBe(false);
    expect(useSettingsStore.getState().temperatureUnit).toBe('celsius');
  });

  it('applies imported settings wholesale', () => {
    useSettingsStore.getState().applyImportedSettings({
      ...defaultSettings,
      dashboardSpaceMode: 'more_space',
      headerCustomText: 'Relax',
      headerTitleMode: 'custom_text',
      username: 'Vishal',
      weatherForecastMode: 'hourly',
    });

    expect(useSettingsStore.getState().headerCustomText).toBe('Relax');
    expect(useSettingsStore.getState().dashboardSpaceMode).toBe('more_space');
    expect(useSettingsStore.getState().headerTitleMode).toBe('custom_text');
    expect(useSettingsStore.getState().username).toBe('Vishal');
    expect(useSettingsStore.getState().weatherForecastMode).toBe('hourly');
  });

  it('resets back to defaults', () => {
    useSettingsStore.getState().updateSettings({
      kioskMode: true,
      keepDeviceAwake: true,
      lowPowerMode: true,
    });
    useSettingsStore.getState().updateCameraViewMode('camera.front_door', 'snapshot');
    useSettingsStore.getState().updateCameraStreamPreference('camera.front_door', 'hls');
    useSettingsStore
      .getState()
      .updateCameraDirectStreamUrl(
        'camera.front_door',
        'http://192.168.68.71:1984/stream.html?src=camera_front'
      );
    useSettingsStore.getState().updateCameraWebRtcStreamSource('camera.front_door', 'direct');
    useSettingsStore.getState().updateCameraFitMode('camera.front_door', 'contain');
    useSettingsStore.getState().resetSettings();

    expect(useSettingsStore.getState().lowPowerMode).toBe(defaultSettings.lowPowerMode);
    expect(useSettingsStore.getState().kioskMode).toBe(defaultSettings.kioskMode);
    expect(useSettingsStore.getState().dashboardSpaceMode).toBe(defaultSettings.dashboardSpaceMode);
    expect(useSettingsStore.getState().keepDeviceAwake).toBe(defaultSettings.keepDeviceAwake);
    expect(useSettingsStore.getState().showHomeSummaryBar).toBe(defaultSettings.showHomeSummaryBar);
    expect(useSettingsStore.getState().headerCustomText).toBe(defaultSettings.headerCustomText);
    expect(useSettingsStore.getState().headerTitleMode).toBe(defaultSettings.headerTitleMode);
    expect(useSettingsStore.getState().username).toBe(defaultSettings.username);
    expect(useSettingsStore.getState().cameraDashboardViewMode).toBe('live');
    expect(useSettingsStore.getState().cameraViewMode).toBe('live');
    expect(useSettingsStore.getState().cameraViewModes).toEqual({});
    expect(useSettingsStore.getState().cameraStreamPreference).toBe('auto');
    expect(useSettingsStore.getState().cameraStreamPreferences).toEqual({});
    expect(useSettingsStore.getState().cameraWebRtcStreamSources).toEqual({});
    expect(useSettingsStore.getState().cameraDirectStreamUrls).toEqual({});
    expect(useSettingsStore.getState().cameraFitMode).toBe('cover');
    expect(useSettingsStore.getState().cameraFitModes).toEqual({});
    expect(localStorage.getItem(STORE_STORAGE_KEYS.settings)).toContain('"compactMode":false');
    expect(localStorage.getItem('ha-dashboard-settings')).toBeNull();
  });

  it('stores camera view mode per entity', () => {
    useSettingsStore.getState().updateCameraViewMode('camera.front_door', 'snapshot');
    useSettingsStore.getState().updateCameraViewMode('camera.garage', 'auto');

    expect(useSettingsStore.getState().cameraViewModes).toEqual({
      'camera.front_door': 'snapshot',
      'camera.garage': 'auto',
    });
  });

  it('stores camera stream preference per entity', () => {
    useSettingsStore.getState().updateCameraStreamPreference('camera.front_door', 'hls');
    useSettingsStore.getState().updateCameraStreamPreference('camera.garage', 'web_rtc');

    expect(useSettingsStore.getState().cameraStreamPreferences).toEqual({
      'camera.front_door': 'hls',
      'camera.garage': 'web_rtc',
    });
  });

  it('stores and clears WebRTC stream source per entity', () => {
    useSettingsStore.getState().updateCameraWebRtcStreamSource('camera.front_door', 'direct');
    useSettingsStore.getState().updateCameraWebRtcStreamSource('camera.garage', 'direct');

    expect(useSettingsStore.getState().cameraWebRtcStreamSources).toEqual({
      'camera.front_door': 'direct',
      'camera.garage': 'direct',
    });

    useSettingsStore.getState().updateCameraWebRtcStreamSource('camera.garage', 'provider');

    expect(useSettingsStore.getState().cameraWebRtcStreamSources).toEqual({
      'camera.front_door': 'direct',
    });
  });

  it('stores and clears direct camera stream URLs per entity', () => {
    useSettingsStore
      .getState()
      .updateCameraDirectStreamUrl(
        'camera.front_door',
        '  http://192.168.68.71:1984/stream.html?src=camera_front  '
      );
    useSettingsStore
      .getState()
      .updateCameraDirectStreamUrl('camera.garage', 'http://192.168.68.72:1984/stream.html');

    expect(useSettingsStore.getState().cameraDirectStreamUrls).toEqual({
      'camera.front_door': 'http://192.168.68.71:1984/stream.html?src=camera_front',
      'camera.garage': 'http://192.168.68.72:1984/stream.html',
    });

    useSettingsStore.getState().updateCameraDirectStreamUrl('camera.garage', '');

    expect(useSettingsStore.getState().cameraDirectStreamUrls).toEqual({
      'camera.front_door': 'http://192.168.68.71:1984/stream.html?src=camera_front',
    });
  });

  it('stores camera fit mode per entity', () => {
    useSettingsStore.getState().updateCameraFitMode('camera.front_door', 'contain');
    useSettingsStore.getState().updateCameraFitMode('camera.garage', 'cover');

    expect(useSettingsStore.getState().cameraFitModes).toEqual({
      'camera.front_door': 'contain',
      'camera.garage': 'cover',
    });
  });

  it('sanitizes advanced customization items before persisting them', () => {
    useSettingsStore.getState().updateSettings({
      advancedCustomizationEnabled: true,
      customSidebarActions: [
        {
          id: 'quick-home',
          label: ' Home ',
          icon: 'home',
          targetType: 'section',
          targetSection: 'home',
          visibility: 'always',
        },
        {
          id: 'bad-url',
          label: 'Bad',
          icon: 'link',
          targetType: 'url',
          targetUrl: 'javascript:alert(1)',
          visibility: 'always',
        },
        {
          id: 'movie-status',
          label: ' Movie status ',
          icon: 'link',
          targetType: 'iframe',
          targetUrl: '/embedded/status',
          visibility: 'always',
        },
        {
          id: 'bad-iframe',
          label: 'Bad iframe',
          icon: 'link',
          targetType: 'iframe',
          targetUrl: 'data:text/html,hi',
          visibility: 'always',
        },
      ],
      customSummaryPills: [
        {
          id: 'temp',
          label: ' Entry ',
          icon: 'sparkles',
          valueSourceType: 'entity',
          entityId: 'sensor.entryway_temperature',
          actionType: 'none',
          visibility: 'when_value_available',
        },
        {
          id: 'bad-pill',
          label: 'Broken',
          icon: 'sparkles',
          valueSourceType: 'static',
          staticValue: '',
          actionType: 'none',
        },
      ],
    });

    expect(useSettingsStore.getState().advancedCustomizationEnabled).toBe(true);
    expect(useSettingsStore.getState().customSidebarActions).toEqual([
      expect.objectContaining({
        id: 'quick-home',
        label: 'Home',
        targetType: 'section',
        targetSection: 'home',
      }),
      expect.objectContaining({
        id: 'movie-status',
        label: 'Movie status',
        targetType: 'iframe',
      }),
    ]);
    expect(useSettingsStore.getState().customSummaryPills).toEqual([
      expect.objectContaining({
        id: 'temp',
        label: 'Entry',
        valueSourceType: 'entity',
        entityId: 'sensor.entryway_temperature',
      }),
    ]);
  });

  it('rehydrates persisted settings', async () => {
    localStorage.removeItem(STORE_STORAGE_KEYS.settings);
    localStorage.setItem(
      'ha-dashboard-settings',
      JSON.stringify({
        state: { compactMode: true, language: 'sv', weatherForecastMode: 'hourly' },
        version: 0,
      })
    );

    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState().headerTitleMode).toBe(defaultSettings.headerTitleMode);
    expect(useSettingsStore.getState().headerCustomText).toBe(defaultSettings.headerCustomText);
    expect(useSettingsStore.getState().compactMode).toBe(true);
    expect(useSettingsStore.getState().dashboardSpaceMode).toBe('default');
    expect(useSettingsStore.getState().kioskMode).toBe(false);
    expect(useSettingsStore.getState().keepDeviceAwake).toBe(false);
    expect(useSettingsStore.getState().language).toBe('sv');
    expect(useSettingsStore.getState().weatherForecastMode).toBe('hourly');
    expect(useSettingsStore.getState().cameraDashboardViewMode).toBe('live');
    expect(useSettingsStore.getState().cameraViewMode).toBe('live');
    expect(useSettingsStore.getState().cameraViewModes).toEqual({});
    expect(useSettingsStore.getState().cameraStreamPreference).toBe('auto');
    expect(useSettingsStore.getState().cameraStreamPreferences).toEqual({});
    expect(useSettingsStore.getState().cameraFitMode).toBe('cover');
    expect(useSettingsStore.getState().cameraFitModes).toEqual({});
  });

  it('rehydrates valid header title settings and trims imported custom text', async () => {
    localStorage.removeItem(STORE_STORAGE_KEYS.settings);
    localStorage.setItem(
      'ha-dashboard-settings',
      JSON.stringify({
        state: { headerTitleMode: 'custom_text', headerCustomText: '  Focus  ' },
        version: 0,
      })
    );

    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState().headerTitleMode).toBe('custom_text');
    expect(useSettingsStore.getState().headerCustomText).toBe('Focus');
  });

  it('falls back to default header title settings for invalid persisted values', async () => {
    localStorage.removeItem(STORE_STORAGE_KEYS.settings);
    localStorage.setItem(
      'ha-dashboard-settings',
      JSON.stringify({
        state: { headerTitleMode: 'ticker', headerCustomText: 12 },
        version: 0,
      })
    );

    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState().headerTitleMode).toBe(defaultSettings.headerTitleMode);
    expect(useSettingsStore.getState().headerCustomText).toBe(defaultSettings.headerCustomText);
  });

  it('limits custom header text length', () => {
    useSettingsStore
      .getState()
      .updateSettings({ headerCustomText: '1234567890123456789012345678901234567890-extra' });

    expect(useSettingsStore.getState().headerCustomText).toBe(
      '1234567890123456789012345678901234567890'
    );
  });

  it('rehydrates kiosk mode from persisted settings', async () => {
    localStorage.removeItem(STORE_STORAGE_KEYS.settings);
    localStorage.setItem(
      'ha-dashboard-settings',
      JSON.stringify({
        state: { kioskMode: true },
        version: 0,
      })
    );

    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState().kioskMode).toBe(true);
  });

  it('rehydrates dashboard space mode from persisted settings', async () => {
    localStorage.removeItem(STORE_STORAGE_KEYS.settings);
    localStorage.setItem(
      'ha-dashboard-settings',
      JSON.stringify({
        state: { dashboardSpaceMode: 'more_space' },
        version: 0,
      })
    );

    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState().dashboardSpaceMode).toBe('more_space');
  });

  it('rehydrates keep-awake mode from persisted settings', async () => {
    localStorage.removeItem(STORE_STORAGE_KEYS.settings);
    localStorage.setItem(
      'ha-dashboard-settings',
      JSON.stringify({
        state: { keepDeviceAwake: true },
        version: 0,
      })
    );

    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState().keepDeviceAwake).toBe(true);
  });

  it('rehydrates low effects quality from persisted navet settings', async () => {
    localStorage.setItem(
      STORE_STORAGE_KEYS.settings,
      JSON.stringify({
        state: {
          effectsQuality: 'low',
        },
        version: 0,
      })
    );

    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState().effectsQuality).toBe('low');
    expect(useSettingsStore.getState().lowPowerMode).toBe(false);
  });

  it('preserves high requested quality while rehydrating low-power mode from persisted navet settings', async () => {
    localStorage.setItem(
      STORE_STORAGE_KEYS.settings,
      JSON.stringify({
        state: {
          effectsQuality: 'high',
          lowPowerMode: true,
        },
        version: 0,
      })
    );

    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState().effectsQuality).toBe('high');
    expect(useSettingsStore.getState().lowPowerMode).toBe(true);
  });

  it('rehydrates valid per-camera view modes only', async () => {
    localStorage.removeItem(STORE_STORAGE_KEYS.settings);
    localStorage.setItem(
      'ha-dashboard-settings',
      JSON.stringify({
        state: {
          cameraViewModes: {
            'camera.front_door': 'snapshot',
            'camera.garage': 'auto',
            'camera.invalid': 'cinema',
          },
        },
        version: 0,
      })
    );

    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState().cameraViewModes).toEqual({
      'camera.front_door': 'snapshot',
      'camera.garage': 'auto',
    });
  });

  it('rehydrates valid camera stream preferences only', async () => {
    localStorage.removeItem(STORE_STORAGE_KEYS.settings);
    localStorage.setItem(
      'ha-dashboard-settings',
      JSON.stringify({
        state: {
          cameraStreamPreference: 'web_rtc',
          cameraStreamPreferences: {
            'camera.front_door': 'hls',
            'camera.garage': 'mjpeg',
            'camera.invalid': 'rtsp',
          },
        },
        version: 0,
      })
    );

    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState().cameraStreamPreference).toBe('web_rtc');
    expect(useSettingsStore.getState().cameraStreamPreferences).toEqual({
      'camera.front_door': 'hls',
      'camera.garage': 'mjpeg',
    });
  });

  it('rehydrates valid camera fit modes only', async () => {
    localStorage.removeItem(STORE_STORAGE_KEYS.settings);
    localStorage.setItem(
      'ha-dashboard-settings',
      JSON.stringify({
        state: {
          cameraFitMode: 'contain',
          cameraFitModes: {
            'camera.front_door': 'contain',
            'camera.garage': 'cover',
            'camera.invalid': 'stretch',
          },
        },
        version: 0,
      })
    );

    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState().cameraFitMode).toBe('contain');
    expect(useSettingsStore.getState().cameraFitModes).toEqual({
      'camera.front_door': 'contain',
      'camera.garage': 'cover',
    });
  });

  it('rehydrates the dashboard preview default from the legacy camera view mode', async () => {
    localStorage.removeItem(STORE_STORAGE_KEYS.settings);
    localStorage.setItem(
      'ha-dashboard-settings',
      JSON.stringify({
        state: {
          cameraViewMode: 'live',
        },
        version: 0,
      })
    );

    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState().cameraDashboardViewMode).toBe('live');
  });

  it('drops unknown persisted settings keys on rehydrate', async () => {
    localStorage.removeItem(STORE_STORAGE_KEYS.settings);
    localStorage.setItem(
      'ha-dashboard-settings',
      JSON.stringify({
        state: {
          unknownCameraSetting: 'legacy-value',
        },
        version: 0,
      })
    );

    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState()).not.toHaveProperty('unknownCameraSetting');
  });

  it('prefers the navet settings key when both keys exist', async () => {
    localStorage.setItem(
      STORE_STORAGE_KEYS.settings,
      JSON.stringify({
        state: {
          compactMode: false,
          language: 'fr',
        },
        version: 0,
      })
    );
    localStorage.setItem(
      'ha-dashboard-settings',
      JSON.stringify({
        state: {
          compactMode: true,
          language: 'sv',
        },
        version: 0,
      })
    );

    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState().compactMode).toBe(false);
    expect(useSettingsStore.getState().language).toBe('fr');
    expect(localStorage.getItem('ha-dashboard-settings')).toBeNull();
  });
});
