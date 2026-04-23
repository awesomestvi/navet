import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { type AppLanguage, getNavigatorLanguage } from '@/app/i18n/config';
import { detectDeviceTier } from '@/app/utils/detect-device-tier';
import { storage } from '@/app/utils/storage';

export type EntityInteractionMode = 'control-first' | 'toggle-first';
export type EffectsQuality = 'high' | 'medium' | 'low';
export type WeatherForecastMode = 'weekly' | 'hourly';

export interface UserSettings {
  username: string;
  email: string;
  language: AppLanguage;
  showNotifications: boolean;
  showWeatherInHeader: boolean;
  use24HourTime: boolean;
  temperatureUnit: 'celsius' | 'fahrenheit';
  defaultView: 'all' | string;
  compactMode: boolean;
  disableAnimations: boolean;
  lowPowerMode: boolean;
  effectsQuality: EffectsQuality;
  entityInteractionMode: EntityInteractionMode;
  ambientLightBleed: boolean;
  weatherForecastMode: WeatherForecastMode;
}

interface SettingsState extends UserSettings {
  updateSettings: (settings: Partial<UserSettings>) => void;
  applyImportedSettings: (settings: UserSettings) => void;
  resetSettings: () => void;
}

export const defaultSettings: UserSettings = {
  username: 'User',
  email: '',
  language: getNavigatorLanguage(),
  showNotifications: true,
  showWeatherInHeader: true,
  use24HourTime: false,
  temperatureUnit: 'fahrenheit',
  defaultView: 'all',
  compactMode: false,
  disableAnimations: false,
  lowPowerMode: false,
  effectsQuality: 'high',
  entityInteractionMode: 'toggle-first',
  ambientLightBleed: true,
  weatherForecastMode: 'weekly',
};

/**
 * On first load (no persisted settings), auto-detect the device's rendering
 * tier so RPi-class hardware gets low effects without manual configuration.
 * Returns the default 'high' on subsequent loads — persist middleware then
 * overwrites it with the user's saved preference.
 */
function getInitialEffectsQuality(): EffectsQuality {
  if (storage.get<unknown>('ha-dashboard-settings', null) === null) {
    return detectDeviceTier();
  }
  return defaultSettings.effectsQuality;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      effectsQuality: getInitialEffectsQuality(),
      updateSettings: (newSettings) => set((state) => ({ ...state, ...newSettings })),
      applyImportedSettings: (importedSettings) => set(() => ({ ...importedSettings })),
      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'ha-dashboard-settings',
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const next = (persisted as Partial<SettingsState> | null) ?? {};
        return {
          ...current,
          ...next,
        };
      },
    }
  )
);
