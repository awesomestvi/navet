import { beforeEach, describe, expect, it } from 'vitest';
import { resetAppStores } from '@/test/store-reset';
import { defaultSettings, useSettingsStore } from '../settings-store';

describe('useSettingsStore', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  it('updates partial settings', () => {
    useSettingsStore.getState().updateSettings({
      compactMode: true,
      temperatureUnit: 'celsius',
    });

    expect(useSettingsStore.getState().compactMode).toBe(true);
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
    useSettingsStore.getState().updateSettings({ lowPowerMode: true });
    useSettingsStore.getState().updateCameraViewMode('camera.front_door', 'snapshot');
    useSettingsStore.getState().updateCameraFeedMode('camera.front_door', 'web_rtc');
    useSettingsStore.getState().resetSettings();

    expect(useSettingsStore.getState().lowPowerMode).toBe(defaultSettings.lowPowerMode);
    expect(useSettingsStore.getState().username).toBe(defaultSettings.username);
    expect(useSettingsStore.getState().cameraViewMode).toBe('live');
    expect(useSettingsStore.getState().cameraViewModes).toEqual({});
    expect(useSettingsStore.getState().cameraFeedModes).toEqual({});
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
    useSettingsStore.getState().updateCameraFeedMode('camera.front_door', 'web_rtc');
    useSettingsStore.getState().updateCameraFeedMode('camera.garage', 'mjpeg');

    expect(useSettingsStore.getState().cameraFeedModes).toEqual({
      'camera.front_door': 'web_rtc',
      'camera.garage': 'mjpeg',
    });
  });

  it('rehydrates persisted settings', async () => {
    localStorage.setItem(
      'ha-dashboard-settings',
      JSON.stringify({
        state: { compactMode: true, language: 'sv', weatherForecastMode: 'hourly' },
        version: 0,
      })
    );

    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState().compactMode).toBe(true);
    expect(useSettingsStore.getState().language).toBe('sv');
    expect(useSettingsStore.getState().weatherForecastMode).toBe('hourly');
    expect(useSettingsStore.getState().cameraViewMode).toBe('live');
    expect(useSettingsStore.getState().cameraViewModes).toEqual({});
    expect(useSettingsStore.getState().cameraFeedModes).toEqual({});
  });

  it('rehydrates valid per-camera view modes only', async () => {
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

  it('rehydrates valid per-camera feed modes only', async () => {
    localStorage.setItem(
      'ha-dashboard-settings',
      JSON.stringify({
        state: {
          cameraFeedModes: {
            'camera.front_door': 'web_rtc',
            'camera.garage': 'mjpeg',
            'camera.invalid': 'rtsp',
          },
        },
        version: 0,
      })
    );

    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState().cameraFeedModes).toEqual({
      'camera.front_door': 'web_rtc',
      'camera.garage': 'mjpeg',
    });
  });
});
