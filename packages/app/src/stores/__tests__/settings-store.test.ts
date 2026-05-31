import { STORE_STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { resetAppStores } from '@navet/app/test/store-reset';
import { beforeEach, describe, expect, it } from 'vitest';
import { defaultSettings, resolveCameraGo2RtcConfig, useSettingsStore } from '../settings-store';

describe('useSettingsStore', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  it('updates partial settings', () => {
    useSettingsStore.getState().updateSettings({
      compactMode: true,
      kioskMode: true,
      keepDeviceAwake: true,
      showHomeSummaryBar: false,
      temperatureUnit: 'celsius',
    });

    expect(useSettingsStore.getState().compactMode).toBe(true);
    expect(useSettingsStore.getState().kioskMode).toBe(true);
    expect(useSettingsStore.getState().keepDeviceAwake).toBe(true);
    expect(useSettingsStore.getState().showHomeSummaryBar).toBe(false);
    expect(useSettingsStore.getState().temperatureUnit).toBe('celsius');
  });

  it('applies imported settings wholesale', () => {
    useSettingsStore.getState().applyImportedSettings({
      ...defaultSettings,
      username: 'Vishal',
      weatherForecastMode: 'hourly',
    });

    expect(useSettingsStore.getState().username).toBe('Vishal');
    expect(useSettingsStore.getState().weatherForecastMode).toBe('hourly');
  });

  it('resets back to defaults', () => {
    useSettingsStore
      .getState()
      .updateSettings({ kioskMode: true, keepDeviceAwake: true, lowPowerMode: true });
    useSettingsStore.getState().updateCameraViewMode('camera.front_door', 'snapshot');
    useSettingsStore.getState().updateCameraFeedMode('camera.front_door', 'web_rtc');
    useSettingsStore.getState().updateCameraGo2RtcConfig('camera.front_door', {
      serverUrl: 'http://go2rtc.local:1984',
      streamName: 'front_door',
    });
    useSettingsStore.getState().resetSettings();

    expect(useSettingsStore.getState().lowPowerMode).toBe(defaultSettings.lowPowerMode);
    expect(useSettingsStore.getState().kioskMode).toBe(defaultSettings.kioskMode);
    expect(useSettingsStore.getState().keepDeviceAwake).toBe(defaultSettings.keepDeviceAwake);
    expect(useSettingsStore.getState().showHomeSummaryBar).toBe(defaultSettings.showHomeSummaryBar);
    expect(useSettingsStore.getState().username).toBe(defaultSettings.username);
    expect(useSettingsStore.getState().cameraDashboardViewMode).toBe('live');
    expect(useSettingsStore.getState().cameraViewMode).toBe('live');
    expect(useSettingsStore.getState().cameraViewModes).toEqual({});
    expect(useSettingsStore.getState().cameraFeedModes).toEqual({});
    expect(useSettingsStore.getState().cameraGo2RtcDefaults).toEqual({
      serverUrl: '',
      streamNamingMode: 'entity_id',
    });
    expect(useSettingsStore.getState().cameraGo2RtcConfigs).toEqual({});
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

  it('stores camera feed mode per entity', () => {
    useSettingsStore.getState().updateCameraFeedMode('camera.front_door', 'go2rtc');
    useSettingsStore.getState().updateCameraFeedMode('camera.garage', 'mjpeg');

    expect(useSettingsStore.getState().cameraFeedModes).toEqual({
      'camera.front_door': 'go2rtc',
      'camera.garage': 'mjpeg',
    });
  });

  it('stores direct go2rtc config per entity', () => {
    useSettingsStore.getState().updateCameraGo2RtcConfig('camera.front_door', {
      serverUrl: ' http://go2rtc.local:1984 ',
      streamName: ' front_door ',
    });

    expect(useSettingsStore.getState().cameraGo2RtcConfigs).toEqual({
      'camera.front_door': {
        serverUrl: 'http://go2rtc.local:1984',
        streamName: 'front_door',
      },
    });
  });

  it('stores global go2rtc defaults', () => {
    useSettingsStore.getState().updateCameraGo2RtcDefaults({
      serverUrl: ' http://go2rtc.local:1984 ',
      streamNamingMode: 'short_entity_id',
    });

    expect(useSettingsStore.getState().cameraGo2RtcDefaults).toEqual({
      serverUrl: 'http://go2rtc.local:1984',
      streamNamingMode: 'short_entity_id',
    });
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

    expect(useSettingsStore.getState().compactMode).toBe(true);
    expect(useSettingsStore.getState().kioskMode).toBe(false);
    expect(useSettingsStore.getState().keepDeviceAwake).toBe(false);
    expect(useSettingsStore.getState().language).toBe('sv');
    expect(useSettingsStore.getState().weatherForecastMode).toBe('hourly');
    expect(useSettingsStore.getState().cameraDashboardViewMode).toBe('live');
    expect(useSettingsStore.getState().cameraViewMode).toBe('live');
    expect(useSettingsStore.getState().cameraViewModes).toEqual({});
    expect(useSettingsStore.getState().cameraFeedModes).toEqual({});
    expect(useSettingsStore.getState().cameraGo2RtcDefaults).toEqual({
      serverUrl: '',
      streamNamingMode: 'entity_id',
    });
    expect(useSettingsStore.getState().cameraGo2RtcConfigs).toEqual({});
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

  it('rehydrates valid per-camera feed modes only', async () => {
    localStorage.removeItem(STORE_STORAGE_KEYS.settings);
    localStorage.setItem(
      'ha-dashboard-settings',
      JSON.stringify({
        state: {
          cameraFeedModes: {
            'camera.front_door': 'go2rtc',
            'camera.garage': 'mjpeg',
            'camera.invalid': 'rtsp',
          },
        },
        version: 0,
      })
    );

    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState().cameraFeedModes).toEqual({
      'camera.front_door': 'go2rtc',
      'camera.garage': 'mjpeg',
    });
  });

  it('rehydrates valid direct go2rtc configs only', async () => {
    localStorage.removeItem(STORE_STORAGE_KEYS.settings);
    localStorage.setItem(
      'ha-dashboard-settings',
      JSON.stringify({
        state: {
          cameraGo2RtcConfigs: {
            'camera.front_door': {
              serverUrl: ' http://go2rtc.local:1984 ',
              streamName: ' front_door ',
            },
            'camera.invalid': {
              serverUrl: 1984,
              streamName: 'invalid',
            },
          },
        },
        version: 0,
      })
    );

    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState().cameraGo2RtcConfigs).toEqual({
      'camera.front_door': {
        serverUrl: 'http://go2rtc.local:1984',
        streamName: 'front_door',
      },
    });
  });

  it('rehydrates valid global go2rtc defaults only', async () => {
    localStorage.removeItem(STORE_STORAGE_KEYS.settings);
    localStorage.setItem(
      'ha-dashboard-settings',
      JSON.stringify({
        state: {
          cameraGo2RtcDefaults: {
            serverUrl: ' http://go2rtc.local:1984 ',
            streamNamingMode: 'short_entity_id',
          },
        },
        version: 0,
      })
    );

    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState().cameraGo2RtcDefaults).toEqual({
      serverUrl: 'http://go2rtc.local:1984',
      streamNamingMode: 'short_entity_id',
    });
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

  it('resolves per-camera go2rtc overrides before global defaults', () => {
    expect(
      resolveCameraGo2RtcConfig({
        entityId: 'camera.front_door',
        defaults: {
          serverUrl: 'http://global-go2rtc.local:1984',
          streamNamingMode: 'entity_id',
        },
        override: {
          serverUrl: 'http://camera-go2rtc.local:1984',
          streamName: 'front_door_override',
        },
        canUseEmbeddedPanel: false,
      })
    ).toMatchObject({
      serverUrl: 'http://camera-go2rtc.local:1984',
      streamName: 'front_door_override',
      source: 'per_camera_override',
      hasFeed: true,
    });
  });

  it('resolves global defaults when per-camera override is empty', () => {
    expect(
      resolveCameraGo2RtcConfig({
        entityId: 'camera.front_door',
        defaults: {
          serverUrl: 'http://global-go2rtc.local:1984',
          streamNamingMode: 'entity_id',
        },
        override: {
          serverUrl: '',
          streamName: '',
        },
        canUseEmbeddedPanel: false,
      })
    ).toMatchObject({
      serverUrl: 'http://global-go2rtc.local:1984',
      streamName: 'camera.front_door',
      source: 'global_default',
      hasFeed: true,
    });
  });

  it('infers short entity stream names from the camera entity id', () => {
    expect(
      resolveCameraGo2RtcConfig({
        entityId: 'camera.front_door',
        defaults: {
          serverUrl: 'http://global-go2rtc.local:1984',
          streamNamingMode: 'short_entity_id',
        },
        override: {
          serverUrl: '',
          streamName: '',
        },
        canUseEmbeddedPanel: false,
      })
    ).toMatchObject({
      streamName: 'front_door',
      streamNameWasInferred: true,
    });
  });

  it('disables direct go2rtc when no server URL is configured', () => {
    expect(
      resolveCameraGo2RtcConfig({
        entityId: 'camera.front_door',
        defaults: {
          serverUrl: '',
          streamNamingMode: 'entity_id',
        },
        override: {
          serverUrl: '',
          streamName: '',
        },
        canUseEmbeddedPanel: false,
      })
    ).toMatchObject({
      serverUrl: '',
      source: 'unavailable',
      hasFeed: false,
    });
  });
});
