import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { type AppLanguage, getNavigatorLanguage } from '@/app/i18n/config';
import { detectDeviceTier } from '@/app/utils/detect-device-tier';
import { storage } from '@/app/utils/storage';

export type EntityInteractionMode = 'control-first' | 'toggle-first';
export type EffectsQuality = 'high' | 'medium' | 'low';
export type CameraViewMode = 'live' | 'auto' | 'snapshot';
export type CameraFeedMode = 'auto' | 'go2rtc' | 'web_rtc' | 'hls' | 'mjpeg';
export interface CameraGo2RtcConfig {
  serverUrl: string;
  streamName: string;
}
export type WeatherForecastMode = 'weekly' | 'hourly';
export type WeatherMetricId =
  | 'precipitation'
  | 'humidity'
  | 'wind'
  | 'feelsLike'
  | 'windGust'
  | 'pressure'
  | 'uvIndex'
  | 'cloudCover';

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
  kioskMode: boolean;
  disableAnimations: boolean;
  lowPowerMode: boolean;
  effectsQuality: EffectsQuality;
  entityInteractionMode: EntityInteractionMode;
  cameraViewMode: CameraViewMode;
  cameraViewModes: Record<string, CameraViewMode>;
  cameraFeedModes: Record<string, CameraFeedMode>;
  cameraGo2RtcConfigs: Record<string, CameraGo2RtcConfig>;
  ambientLightBleed: boolean;
  weatherForecastMode: WeatherForecastMode;
  weatherMetricIds: WeatherMetricId[];
}

interface SettingsState extends UserSettings {
  updateSettings: (settings: Partial<UserSettings>) => void;
  updateCameraViewMode: (entityId: string, mode: CameraViewMode) => void;
  updateCameraFeedMode: (entityId: string, mode: CameraFeedMode) => void;
  updateCameraGo2RtcConfig: (entityId: string, config: CameraGo2RtcConfig) => void;
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
  kioskMode: false,
  disableAnimations: false,
  lowPowerMode: false,
  effectsQuality: 'high',
  entityInteractionMode: 'toggle-first',
  cameraViewMode: 'live',
  cameraViewModes: {},
  cameraFeedModes: {},
  cameraGo2RtcConfigs: {},
  ambientLightBleed: true,
  weatherForecastMode: 'weekly',
  weatherMetricIds: ['precipitation', 'humidity', 'wind'],
};

function isCameraViewMode(value: unknown): value is CameraViewMode {
  return value === 'live' || value === 'auto' || value === 'snapshot';
}

function isCameraFeedMode(value: unknown): value is CameraFeedMode {
  return (
    value === 'auto' ||
    value === 'go2rtc' ||
    value === 'web_rtc' ||
    value === 'hls' ||
    value === 'mjpeg'
  );
}

function normalizeCameraViewModes(value: unknown): Record<string, CameraViewMode> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, CameraViewMode] =>
      isCameraViewMode(entry[1])
    )
  );
}

function normalizeCameraFeedModes(value: unknown): Record<string, CameraFeedMode> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, CameraFeedMode] =>
      isCameraFeedMode(entry[1])
    )
  );
}

function isCameraGo2RtcConfig(value: unknown): value is CameraGo2RtcConfig {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as Partial<CameraGo2RtcConfig>).serverUrl === 'string' &&
    typeof (value as Partial<CameraGo2RtcConfig>).streamName === 'string'
  );
}

function normalizeCameraGo2RtcConfigs(value: unknown): Record<string, CameraGo2RtcConfig> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, CameraGo2RtcConfig] => isCameraGo2RtcConfig(entry[1]))
      .map(([entityId, config]) => [
        entityId,
        {
          serverUrl: config.serverUrl.trim(),
          streamName: config.streamName.trim(),
        },
      ])
  );
}

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
      updateCameraViewMode: (entityId, mode) =>
        set((state) => ({
          cameraViewModes: {
            ...state.cameraViewModes,
            [entityId]: mode,
          },
        })),
      updateCameraFeedMode: (entityId, mode) =>
        set((state) => ({
          cameraFeedModes: {
            ...state.cameraFeedModes,
            [entityId]: mode,
          },
        })),
      updateCameraGo2RtcConfig: (entityId, config) =>
        set((state) => ({
          cameraGo2RtcConfigs: {
            ...state.cameraGo2RtcConfigs,
            [entityId]: {
              serverUrl: config.serverUrl.trim(),
              streamName: config.streamName.trim(),
            },
          },
        })),
      applyImportedSettings: (importedSettings) =>
        set(() => ({
          ...defaultSettings,
          ...importedSettings,
          cameraViewMode: isCameraViewMode(importedSettings.cameraViewMode)
            ? importedSettings.cameraViewMode
            : defaultSettings.cameraViewMode,
          cameraViewModes: normalizeCameraViewModes(importedSettings.cameraViewModes),
          cameraFeedModes: normalizeCameraFeedModes(importedSettings.cameraFeedModes),
          cameraGo2RtcConfigs: normalizeCameraGo2RtcConfigs(importedSettings.cameraGo2RtcConfigs),
        })),
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
          cameraViewMode: isCameraViewMode(next.cameraViewMode)
            ? next.cameraViewMode
            : current.cameraViewMode,
          cameraViewModes: normalizeCameraViewModes(next.cameraViewModes),
          cameraFeedModes: normalizeCameraFeedModes(next.cameraFeedModes),
          cameraGo2RtcConfigs: normalizeCameraGo2RtcConfigs(next.cameraGo2RtcConfigs),
        };
      },
    }
  )
);
