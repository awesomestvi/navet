import { STORE_STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { type AppLanguage, getNavigatorLanguage } from '@navet/app/i18n/config';
import { detectDeviceTier } from '@navet/app/utils/detect-device-tier';
import {
  readLocalStorageWithMigration,
  removeLocalStorageWithMigration,
  writeLocalStorageWithMigration,
} from '@navet/app/utils/local-storage-migration';
import { storage } from '@navet/app/utils/storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type EntityInteractionMode = 'control-first' | 'toggle-first';
export type EffectsQuality = 'high' | 'medium' | 'low';
export type CameraViewMode = 'live' | 'auto' | 'snapshot';
export type CameraDashboardViewMode = CameraViewMode;
export type CameraFeedMode = 'auto' | 'go2rtc' | 'web_rtc' | 'hls' | 'mjpeg';
export type CameraGo2RtcStreamNamingMode = 'entity_id' | 'short_entity_id';
export interface CameraGo2RtcConfig {
  serverUrl: string;
  streamName: string;
}
export interface CameraGo2RtcDefaults {
  serverUrl: string;
  streamNamingMode: CameraGo2RtcStreamNamingMode;
}
export type CameraGo2RtcSource =
  | 'unavailable'
  | 'embedded_panel'
  | 'per_camera_override'
  | 'global_default';
export interface ResolvedCameraGo2RtcConfig extends CameraGo2RtcConfig {
  hasFeed: boolean;
  source: CameraGo2RtcSource;
  usesEmbeddedPanel: boolean;
  streamNameWasInferred: boolean;
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
  showHomeSummaryBar: boolean;
  keepDeviceAwake: boolean;
  use24HourTime: boolean;
  temperatureUnit: 'celsius' | 'fahrenheit';
  defaultView: 'all' | string;
  compactMode: boolean;
  kioskMode: boolean;
  disableAnimations: boolean;
  lowPowerMode: boolean;
  effectsQuality: EffectsQuality;
  entityInteractionMode: EntityInteractionMode;
  cameraDashboardViewMode: CameraDashboardViewMode;
  cameraViewMode: CameraViewMode;
  cameraViewModes: Record<string, CameraViewMode>;
  cameraFeedModes: Record<string, CameraFeedMode>;
  cameraGo2RtcDefaults: CameraGo2RtcDefaults;
  cameraGo2RtcConfigs: Record<string, CameraGo2RtcConfig>;
  ambientLightBleed: boolean;
  weatherForecastMode: WeatherForecastMode;
  weatherMetricIds: WeatherMetricId[];
}

interface SettingsState extends UserSettings {
  updateSettings: (settings: Partial<UserSettings>) => void;
  updateCameraViewMode: (entityId: string, mode: CameraViewMode) => void;
  updateCameraFeedMode: (entityId: string, mode: CameraFeedMode) => void;
  updateCameraGo2RtcDefaults: (defaults: CameraGo2RtcDefaults) => void;
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
  showHomeSummaryBar: true,
  keepDeviceAwake: false,
  use24HourTime: false,
  temperatureUnit: 'fahrenheit',
  defaultView: 'all',
  compactMode: false,
  kioskMode: false,
  disableAnimations: false,
  lowPowerMode: false,
  effectsQuality: 'high',
  entityInteractionMode: 'toggle-first',
  cameraDashboardViewMode: 'live',
  cameraViewMode: 'live',
  cameraViewModes: {},
  cameraFeedModes: {},
  cameraGo2RtcDefaults: {
    serverUrl: '',
    streamNamingMode: 'entity_id',
  },
  cameraGo2RtcConfigs: {},
  ambientLightBleed: true,
  weatherForecastMode: 'weekly',
  weatherMetricIds: ['precipitation', 'humidity', 'wind'],
};

function isCameraViewMode(value: unknown): value is CameraViewMode {
  return value === 'live' || value === 'auto' || value === 'snapshot';
}

function resolveCameraDashboardViewMode(
  value: unknown,
  legacyValue: unknown = undefined
): CameraDashboardViewMode {
  if (isCameraViewMode(value)) {
    return value;
  }

  if (isCameraViewMode(legacyValue)) {
    return legacyValue;
  }

  return defaultSettings.cameraDashboardViewMode;
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

function isCameraGo2RtcStreamNamingMode(value: unknown): value is CameraGo2RtcStreamNamingMode {
  return value === 'entity_id' || value === 'short_entity_id';
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

function normalizeCameraGo2RtcConfig(config: CameraGo2RtcConfig): CameraGo2RtcConfig {
  return {
    serverUrl: config.serverUrl.trim(),
    streamName: config.streamName.trim(),
  };
}

function isCameraGo2RtcDefaults(value: unknown): value is CameraGo2RtcDefaults {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as Partial<CameraGo2RtcDefaults>).serverUrl === 'string' &&
    isCameraGo2RtcStreamNamingMode((value as Partial<CameraGo2RtcDefaults>).streamNamingMode)
  );
}

export function normalizeCameraGo2RtcDefaults(value: unknown): CameraGo2RtcDefaults {
  if (!isCameraGo2RtcDefaults(value)) {
    return defaultSettings.cameraGo2RtcDefaults;
  }

  return {
    serverUrl: value.serverUrl.trim(),
    streamNamingMode: value.streamNamingMode,
  };
}

function normalizeCameraGo2RtcConfigs(value: unknown): Record<string, CameraGo2RtcConfig> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, CameraGo2RtcConfig] => isCameraGo2RtcConfig(entry[1]))
      .map(([entityId, config]) => [entityId, normalizeCameraGo2RtcConfig(config)])
  );
}

export function inferCameraGo2RtcStreamName(
  entityId: string,
  streamNamingMode: CameraGo2RtcStreamNamingMode
) {
  if (streamNamingMode === 'short_entity_id') {
    return entityId.replace(/^[^.]+\./, '');
  }

  return entityId;
}

export function getEmptyCameraGo2RtcConfig(): CameraGo2RtcConfig {
  return {
    serverUrl: '',
    streamName: '',
  };
}

export function resolveCameraGo2RtcConfig({
  entityId,
  defaults,
  override,
  canUseEmbeddedPanel,
}: {
  entityId: string;
  defaults: CameraGo2RtcDefaults;
  override: CameraGo2RtcConfig;
  canUseEmbeddedPanel: boolean;
}): ResolvedCameraGo2RtcConfig {
  const normalizedDefaults = normalizeCameraGo2RtcDefaults(defaults);
  const normalizedOverride = normalizeCameraGo2RtcConfig(override);
  const inferredStreamName = inferCameraGo2RtcStreamName(
    entityId,
    normalizedDefaults.streamNamingMode
  );
  const streamName = normalizedOverride.streamName || inferredStreamName;
  const streamNameWasInferred = normalizedOverride.streamName.length === 0;

  if (canUseEmbeddedPanel) {
    return {
      serverUrl: '',
      streamName,
      hasFeed: true,
      source: 'embedded_panel',
      usesEmbeddedPanel: true,
      streamNameWasInferred,
    };
  }

  if (normalizedOverride.serverUrl.length > 0) {
    return {
      serverUrl: normalizedOverride.serverUrl,
      streamName,
      hasFeed: true,
      source: 'per_camera_override',
      usesEmbeddedPanel: false,
      streamNameWasInferred,
    };
  }

  if (normalizedDefaults.serverUrl.length > 0) {
    return {
      serverUrl: normalizedDefaults.serverUrl,
      streamName,
      hasFeed: true,
      source: 'global_default',
      usesEmbeddedPanel: false,
      streamNameWasInferred,
    };
  }

  return {
    serverUrl: '',
    streamName,
    hasFeed: false,
    source: 'unavailable',
    usesEmbeddedPanel: false,
    streamNameWasInferred,
  };
}

/**
 * On first load (no persisted settings), auto-detect the device's rendering
 * tier so RPi-class hardware gets low effects without manual configuration.
 * Returns the default 'high' on subsequent loads — persist middleware then
 * overwrites it with the user's saved preference.
 */
function getInitialEffectsQuality(): EffectsQuality {
  if (storage.get<unknown>(STORE_STORAGE_KEYS.settings, null) === null) {
    return detectDeviceTier();
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
          cameraDashboardViewMode:
            newSettings.cameraDashboardViewMode !== undefined
              ? resolveCameraDashboardViewMode(newSettings.cameraDashboardViewMode)
              : state.cameraDashboardViewMode,
          cameraViewMode:
            newSettings.cameraDashboardViewMode !== undefined
              ? resolveCameraDashboardViewMode(newSettings.cameraDashboardViewMode)
              : newSettings.cameraViewMode !== undefined
                ? resolveCameraDashboardViewMode(newSettings.cameraViewMode)
                : state.cameraViewMode,
          cameraGo2RtcDefaults:
            newSettings.cameraGo2RtcDefaults !== undefined
              ? normalizeCameraGo2RtcDefaults(newSettings.cameraGo2RtcDefaults)
              : state.cameraGo2RtcDefaults,
        })),
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
      updateCameraGo2RtcDefaults: (defaults) =>
        set(() => ({
          cameraGo2RtcDefaults: normalizeCameraGo2RtcDefaults(defaults),
        })),
      updateCameraGo2RtcConfig: (entityId, config) =>
        set((state) => ({
          cameraGo2RtcConfigs: {
            ...state.cameraGo2RtcConfigs,
            [entityId]: normalizeCameraGo2RtcConfig(config),
          },
        })),
      applyImportedSettings: (importedSettings) =>
        set(() => ({
          ...defaultSettings,
          ...importedSettings,
          cameraDashboardViewMode: resolveCameraDashboardViewMode(
            importedSettings.cameraDashboardViewMode,
            importedSettings.cameraViewMode
          ),
          cameraViewMode: isCameraViewMode(importedSettings.cameraViewMode)
            ? importedSettings.cameraViewMode
            : resolveCameraDashboardViewMode(importedSettings.cameraDashboardViewMode),
          cameraViewModes: normalizeCameraViewModes(importedSettings.cameraViewModes),
          cameraFeedModes: normalizeCameraFeedModes(importedSettings.cameraFeedModes),
          cameraGo2RtcDefaults: normalizeCameraGo2RtcDefaults(
            importedSettings.cameraGo2RtcDefaults
          ),
          cameraGo2RtcConfigs: normalizeCameraGo2RtcConfigs(importedSettings.cameraGo2RtcConfigs),
        })),
      resetSettings: () => set(defaultSettings),
    }),
    {
      name: STORE_STORAGE_KEYS.settings,
      storage: createJSONStorage(() => ({
        getItem: (name) => readLocalStorageWithMigration(name, localStorage),
        setItem: (name, value) => writeLocalStorageWithMigration(name, value, localStorage),
        removeItem: (name) => removeLocalStorageWithMigration(name, localStorage),
      })),
      merge: (persisted, current) => {
        const next = (persisted as Partial<SettingsState> | null) ?? {};
        return {
          ...current,
          ...next,
          cameraDashboardViewMode: resolveCameraDashboardViewMode(
            next.cameraDashboardViewMode,
            next.cameraViewMode
          ),
          cameraViewMode: isCameraViewMode(next.cameraViewMode)
            ? next.cameraViewMode
            : resolveCameraDashboardViewMode(next.cameraDashboardViewMode, current.cameraViewMode),
          cameraViewModes: normalizeCameraViewModes(next.cameraViewModes),
          cameraFeedModes: normalizeCameraFeedModes(next.cameraFeedModes),
          cameraGo2RtcDefaults: normalizeCameraGo2RtcDefaults(next.cameraGo2RtcDefaults),
          cameraGo2RtcConfigs: normalizeCameraGo2RtcConfigs(next.cameraGo2RtcConfigs),
        };
      },
    }
  )
);
