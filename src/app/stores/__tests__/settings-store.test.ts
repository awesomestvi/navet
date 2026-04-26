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
    useSettingsStore.getState().resetSettings();

    expect(useSettingsStore.getState().lowPowerMode).toBe(defaultSettings.lowPowerMode);
    expect(useSettingsStore.getState().username).toBe(defaultSettings.username);
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
  });
});
