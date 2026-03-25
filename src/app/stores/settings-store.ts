import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { type AppLanguage, getNavigatorLanguage } from '@/app/i18n/config';
import { detectDeviceTier } from '@/app/utils/detect-device-tier';

export type EntityInteractionMode = 'control-first' | 'toggle-first';
export type EffectsQuality = 'high' | 'medium' | 'low';
export const PAGE_ZOOM_OPTIONS = [50, 67, 75, 80, 90, 100] as const;
export type PageZoom = (typeof PAGE_ZOOM_OPTIONS)[number];

export function normalizePageZoom(value: unknown): PageZoom {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 100;
  }

  if (PAGE_ZOOM_OPTIONS.includes(value as PageZoom)) {
    return value as PageZoom;
  }

  return PAGE_ZOOM_OPTIONS.reduce(
    (closest, option) => {
      const optionDistance = Math.abs(option - value);
      const closestDistance = Math.abs(closest - value);

      if (optionDistance < closestDistance) {
        return option;
      }

      if (optionDistance === closestDistance && option < closest) {
        return option;
      }

      return closest;
    },
    PAGE_ZOOM_OPTIONS[PAGE_ZOOM_OPTIONS.length - 1]
  );
}

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
      updateSettings: (newSettings) =>
        set((state) => ({
          ...state,
          ...newSettings,
          ...(newSettings.pageZoom !== undefined
            ? { pageZoom: normalizePageZoom(newSettings.pageZoom) }
            : {}),
        })),
      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'ha-dashboard-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
