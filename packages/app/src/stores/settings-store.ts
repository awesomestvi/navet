import { STORE_STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { type AppLanguage, getNavigatorLanguage } from '@navet/app/i18n/config';
import type { PlatformCameraTransport } from '@navet/app/platform/provider-feature-models';
import {
  type CustomSidebarAction,
  type CustomSummaryPill,
  normalizeCustomSidebarActions,
  normalizeCustomSummaryPills,
} from '@navet/app/utils/custom-extensions';
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
export type HeaderTitleMode = 'auto_greeting' | 'custom_text' | 'clock';
export type DashboardSpaceMode = 'default' | 'more_space';
export const HEADER_CUSTOM_TEXT_MAX_LENGTH = 40;
export type CameraViewMode = 'live' | 'auto' | 'snapshot';
export type CameraDashboardViewMode = CameraViewMode;
export type CameraStreamPreference = 'auto' | PlatformCameraTransport;
export type CameraFitMode = 'cover' | 'contain';
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
  headerTitleMode: HeaderTitleMode;
  headerCustomText: string;
  showNotifications: boolean;
  showWeatherInHeader: boolean;
  showHomeSummaryBar: boolean;
  keepDeviceAwake: boolean;
  use24HourTime: boolean;
  temperatureUnit: 'celsius' | 'fahrenheit';
  defaultView: 'all' | string;
  compactMode: boolean;
  kioskMode: boolean;
  dashboardSpaceMode: DashboardSpaceMode;
  disableAnimations: boolean;
  lowPowerMode: boolean;
  effectsQuality: EffectsQuality;
  entityInteractionMode: EntityInteractionMode;
  cameraDashboardViewMode: CameraDashboardViewMode;
  cameraViewMode: CameraViewMode;
  cameraViewModes: Record<string, CameraViewMode>;
  cameraStreamPreference: CameraStreamPreference;
  cameraStreamPreferences: Record<string, CameraStreamPreference>;
  cameraFitMode: CameraFitMode;
  cameraFitModes: Record<string, CameraFitMode>;
  ambientLightBleed: boolean;
  weatherForecastMode: WeatherForecastMode;
  weatherMetricIds: WeatherMetricId[];
  advancedCustomizationEnabled: boolean;
  customSidebarActions: CustomSidebarAction[];
  customSummaryPills: CustomSummaryPill[];
}

interface SettingsState extends UserSettings {
  updateSettings: (settings: Partial<UserSettings>) => void;
  updateCameraViewMode: (entityId: string, mode: CameraViewMode) => void;
  updateCameraStreamPreference: (entityId: string, preference: CameraStreamPreference) => void;
  updateCameraFitMode: (entityId: string, mode: CameraFitMode) => void;
  applyImportedSettings: (settings: UserSettings) => void;
  resetSettings: () => void;
}

export const defaultSettings: UserSettings = {
  username: 'User',
  email: '',
  language: getNavigatorLanguage(),
  headerTitleMode: 'auto_greeting',
  headerCustomText: '',
  showNotifications: true,
  showWeatherInHeader: true,
  showHomeSummaryBar: true,
  keepDeviceAwake: false,
  use24HourTime: false,
  temperatureUnit: 'fahrenheit',
  defaultView: 'all',
  compactMode: false,
  kioskMode: false,
  dashboardSpaceMode: 'default',
  disableAnimations: false,
  lowPowerMode: false,
  effectsQuality: 'high',
  entityInteractionMode: 'toggle-first',
  cameraDashboardViewMode: 'live',
  cameraViewMode: 'live',
  cameraViewModes: {},
  cameraStreamPreference: 'auto',
  cameraStreamPreferences: {},
  cameraFitMode: 'cover',
  cameraFitModes: {},
  ambientLightBleed: true,
  weatherForecastMode: 'weekly',
  weatherMetricIds: ['precipitation', 'humidity', 'wind'],
  advancedCustomizationEnabled: false,
  customSidebarActions: [],
  customSummaryPills: [],
};

function isCameraViewMode(value: unknown): value is CameraViewMode {
  return value === 'live' || value === 'auto' || value === 'snapshot';
}

function isCameraStreamPreference(value: unknown): value is CameraStreamPreference {
  return value === 'auto' || value === 'web_rtc' || value === 'hls' || value === 'mjpeg';
}

function isCameraFitMode(value: unknown): value is CameraFitMode {
  return value === 'cover' || value === 'contain';
}

function isHeaderTitleMode(value: unknown): value is HeaderTitleMode {
  return value === 'auto_greeting' || value === 'custom_text' || value === 'clock';
}

function isDashboardSpaceMode(value: unknown): value is DashboardSpaceMode {
  return value === 'default' || value === 'more_space';
}

export function normalizeHeaderCustomText(value: unknown): string {
  if (typeof value !== 'string') {
    return defaultSettings.headerCustomText;
  }

  return value.trim().slice(0, HEADER_CUSTOM_TEXT_MAX_LENGTH);
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

function normalizeCameraStreamPreferences(value: unknown): Record<string, CameraStreamPreference> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, CameraStreamPreference] =>
      isCameraStreamPreference(entry[1])
    )
  );
}

function normalizeCameraFitModes(value: unknown): Record<string, CameraFitMode> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, CameraFitMode] =>
      isCameraFitMode(entry[1])
    )
  );
}

const knownSettingsKeys = new Set<keyof UserSettings>(
  Object.keys(defaultSettings) as Array<keyof UserSettings>
);

function pickKnownSettings(value: unknown): Partial<UserSettings> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(([key]) => knownSettingsKeys.has(key as keyof UserSettings))
  ) as Partial<UserSettings>;
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
          headerTitleMode:
            newSettings.headerTitleMode !== undefined &&
            isHeaderTitleMode(newSettings.headerTitleMode)
              ? newSettings.headerTitleMode
              : state.headerTitleMode,
          headerCustomText:
            newSettings.headerCustomText !== undefined
              ? normalizeHeaderCustomText(newSettings.headerCustomText)
              : state.headerCustomText,
          dashboardSpaceMode:
            newSettings.dashboardSpaceMode !== undefined &&
            isDashboardSpaceMode(newSettings.dashboardSpaceMode)
              ? newSettings.dashboardSpaceMode
              : state.dashboardSpaceMode,
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
          cameraStreamPreference:
            newSettings.cameraStreamPreference !== undefined &&
            isCameraStreamPreference(newSettings.cameraStreamPreference)
              ? newSettings.cameraStreamPreference
              : state.cameraStreamPreference,
          cameraFitMode:
            newSettings.cameraFitMode !== undefined && isCameraFitMode(newSettings.cameraFitMode)
              ? newSettings.cameraFitMode
              : state.cameraFitMode,
          customSidebarActions:
            newSettings.customSidebarActions !== undefined
              ? normalizeCustomSidebarActions(newSettings.customSidebarActions)
              : state.customSidebarActions,
          customSummaryPills:
            newSettings.customSummaryPills !== undefined
              ? normalizeCustomSummaryPills(newSettings.customSummaryPills)
              : state.customSummaryPills,
        })),
      updateCameraViewMode: (entityId, mode) =>
        set((state) => ({
          cameraViewModes: {
            ...state.cameraViewModes,
            [entityId]: mode,
          },
        })),
      updateCameraStreamPreference: (entityId, preference) =>
        set((state) => ({
          cameraStreamPreferences: {
            ...state.cameraStreamPreferences,
            [entityId]: preference,
          },
        })),
      updateCameraFitMode: (entityId, mode) =>
        set((state) => ({
          cameraFitModes: {
            ...state.cameraFitModes,
            [entityId]: mode,
          },
        })),
      applyImportedSettings: (importedSettings) => {
        const supportedSettings = pickKnownSettings(importedSettings);
        return set(() => ({
          ...defaultSettings,
          ...supportedSettings,
          headerTitleMode: isHeaderTitleMode(supportedSettings.headerTitleMode)
            ? supportedSettings.headerTitleMode
            : defaultSettings.headerTitleMode,
          headerCustomText: normalizeHeaderCustomText(supportedSettings.headerCustomText),
          dashboardSpaceMode: isDashboardSpaceMode(supportedSettings.dashboardSpaceMode)
            ? supportedSettings.dashboardSpaceMode
            : defaultSettings.dashboardSpaceMode,
          cameraDashboardViewMode: resolveCameraDashboardViewMode(
            supportedSettings.cameraDashboardViewMode,
            supportedSettings.cameraViewMode
          ),
          cameraViewMode: isCameraViewMode(supportedSettings.cameraViewMode)
            ? supportedSettings.cameraViewMode
            : resolveCameraDashboardViewMode(supportedSettings.cameraDashboardViewMode),
          cameraViewModes: normalizeCameraViewModes(supportedSettings.cameraViewModes),
          cameraStreamPreference: isCameraStreamPreference(supportedSettings.cameraStreamPreference)
            ? supportedSettings.cameraStreamPreference
            : defaultSettings.cameraStreamPreference,
          cameraStreamPreferences: normalizeCameraStreamPreferences(
            supportedSettings.cameraStreamPreferences
          ),
          cameraFitMode: isCameraFitMode(supportedSettings.cameraFitMode)
            ? supportedSettings.cameraFitMode
            : defaultSettings.cameraFitMode,
          cameraFitModes: normalizeCameraFitModes(supportedSettings.cameraFitModes),
          customSidebarActions: normalizeCustomSidebarActions(
            supportedSettings.customSidebarActions
          ),
          customSummaryPills: normalizeCustomSummaryPills(supportedSettings.customSummaryPills),
        }));
      },
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
        const next = pickKnownSettings(persisted);
        return {
          ...current,
          ...next,
          headerTitleMode: isHeaderTitleMode(next.headerTitleMode)
            ? next.headerTitleMode
            : current.headerTitleMode,
          headerCustomText: normalizeHeaderCustomText(next.headerCustomText),
          dashboardSpaceMode: isDashboardSpaceMode(next.dashboardSpaceMode)
            ? next.dashboardSpaceMode
            : current.dashboardSpaceMode,
          cameraDashboardViewMode: resolveCameraDashboardViewMode(
            next.cameraDashboardViewMode,
            next.cameraViewMode
          ),
          cameraViewMode: isCameraViewMode(next.cameraViewMode)
            ? next.cameraViewMode
            : resolveCameraDashboardViewMode(next.cameraDashboardViewMode, current.cameraViewMode),
          cameraViewModes: normalizeCameraViewModes(next.cameraViewModes),
          cameraStreamPreference: isCameraStreamPreference(next.cameraStreamPreference)
            ? next.cameraStreamPreference
            : current.cameraStreamPreference,
          cameraStreamPreferences: normalizeCameraStreamPreferences(next.cameraStreamPreferences),
          cameraFitMode: isCameraFitMode(next.cameraFitMode)
            ? next.cameraFitMode
            : current.cameraFitMode,
          cameraFitModes: normalizeCameraFitModes(next.cameraFitModes),
          customSidebarActions: normalizeCustomSidebarActions(next.customSidebarActions),
          customSummaryPills: normalizeCustomSummaryPills(next.customSummaryPills),
        };
      },
    }
  )
);
