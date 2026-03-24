import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { type AppLanguage, getNavigatorLanguage } from '@/app/i18n/config';
import { detectDeviceTier } from '@/app/utils/detect-device-tier';

export type EntityInteractionMode = 'control-first' | 'toggle-first';
export type EffectsQuality = 'high' | 'medium' | 'low';
export type PageZoom = 75 | 80 | 85 | 90 | 95 | 100;

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
  pageZoom: PageZoom;
  entityInteractionMode: EntityInteractionMode;
  ambientLightBleed: boolean;
}

interface SettingsState extends UserSettings {
  updateSettings: (settings: Partial<UserSettings>) => void;
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
  pageZoom: 100,
  entityInteractionMode: 'toggle-first',
  ambientLightBleed: true,
};

/**
 * On first load (no persisted settings), auto-detect the device's rendering
 * tier so RPi-class hardware gets low effects without manual configuration.
 * Returns the default 'high' on subsequent loads — persist middleware then
 * overwrites it with the user's saved preference.
 */
function getInitialEffectsQuality(): EffectsQuality {
  try {
    if (typeof localStorage !== 'undefined' && !localStorage.getItem('ha-dashboard-settings')) {
      return detectDeviceTier();
    }
  } catch {
    // localStorage may be unavailable in some private-browsing environments
  }
  return defaultSettings.effectsQuality;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      effectsQuality: getInitialEffectsQuality(),
      updateSettings: (newSettings) => set((state) => ({ ...state, ...newSettings })),
      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'ha-dashboard-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
