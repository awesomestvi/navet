/**
 * Optimized selectors for Zustand stores
 * Use these to prevent unnecessary re-renders
 */

import type { ErrorStoreState } from './error-store';
import type { HomeAssistantStore } from './home-assistant-store';
import { type CameraGo2RtcConfig, getEmptyCameraGo2RtcConfig } from './settings-store';
import type {
  CustomCardsState,
  EditModeState,
  NavigationState,
  SearchState,
  SettingsState,
  ThemeState,
} from './types';

const EMPTY_CAMERA_GO2RTC_CONFIG = getEmptyCameraGo2RtcConfig();
const emptyCameraGo2RtcConfigByEntityId = new Map<string, CameraGo2RtcConfig>();
function hasOwnKey(record: object, key: PropertyKey) {
  return typeof key === 'string' && Object.keys(record).includes(key);
}

function getCachedEmptyCameraGo2RtcConfig(entityId: string) {
  const cached = emptyCameraGo2RtcConfigByEntityId.get(entityId);
  if (cached) {
    return cached;
  }

  const config = { ...EMPTY_CAMERA_GO2RTC_CONFIG };
  emptyCameraGo2RtcConfigByEntityId.set(entityId, config);
  return config;
}

/**
 * Global app error overlay (`ErrorDisplay`) — distinct from HA connection errors.
 */
export const appErrorSelectors = {
  error: (state: ErrorStoreState) => state.error,
  hasError: (state: ErrorStoreState) => state.error !== null,
  setError: (state: ErrorStoreState) => state.setError,
  clearError: (state: ErrorStoreState) => state.clearError,
};

/**
 * Theme Store Selectors
 * Use these to subscribe only to specific values
 */
export const themeSelectors = {
  // Single value selectors
  theme: (state: ThemeState) => state.theme,
  followSystemTheme: (state: ThemeState) => state.followSystemTheme,
  primaryColor: (state: ThemeState) => state.primaryColor,
  customPrimaryColor: (state: ThemeState) => state.customPrimaryColor,
  wallpaper: (state: ThemeState) => state.wallpaper,

  // Action selectors (never cause re-renders)
  setTheme: (state: ThemeState) => state.setTheme,
  setFollowSystemTheme: (state: ThemeState) => state.setFollowSystemTheme,
  setPrimaryColor: (state: ThemeState) => state.setPrimaryColor,
  setCustomPrimaryColor: (state: ThemeState) => state.setCustomPrimaryColor,
  setWallpaper: (state: ThemeState) => state.setWallpaper,

  // Combined selectors (use with shallow equality)
  allValues: (state: ThemeState) => ({
    theme: state.theme,
    followSystemTheme: state.followSystemTheme,
    primaryColor: state.primaryColor,
    customPrimaryColor: state.customPrimaryColor,
    wallpaper: state.wallpaper,
  }),
  allActions: (state: ThemeState) => ({
    setTheme: state.setTheme,
    setFollowSystemTheme: state.setFollowSystemTheme,
    setPrimaryColor: state.setPrimaryColor,
    setCustomPrimaryColor: state.setCustomPrimaryColor,
    setWallpaper: state.setWallpaper,
  }),
};

/**
 * Edit Mode Store Selectors
 */
export const editModeSelectors = {
  isEditMode: (state: EditModeState) => state.isEditMode,
  setEditMode: (state: EditModeState) => state.setEditMode,
  toggleEditMode: (state: EditModeState) => state.toggleEditMode,
};

/**
 * Navigation Store Selectors
 */
export const navigationSelectors = {
  currentRoom: (state: NavigationState) => state.currentRoom,
  setCurrentRoom: (state: NavigationState) => state.setCurrentRoom,
  activeSection: (state: NavigationState) => state.activeSection,
  setActiveSection: (state: NavigationState) => state.setActiveSection,
};

/**
 * Search Store Selectors
 */
export const searchSelectors = {
  searchQuery: (state: SearchState) => state.searchQuery,
  filteredDeviceIds: (state: SearchState) => state.filteredDeviceIds,
  setSearchQuery: (state: SearchState) => state.setSearchQuery,
  setFilteredDeviceIds: (state: SearchState) => state.setFilteredDeviceIds,
  clearSearch: (state: SearchState) => state.clearSearch,

  // Computed selectors
  isSearching: (state: SearchState) => state.searchQuery.length > 0,
};

/**
 * Settings Store Selectors
 */
export const settingsSelectors = {
  // Individual settings
  username: (state: SettingsState) => state.username,
  email: (state: SettingsState) => state.email,
  language: (state: SettingsState) => state.language,
  showNotifications: (state: SettingsState) => state.showNotifications,
  showWeatherInHeader: (state: SettingsState) => state.showWeatherInHeader,
  showHomeSummaryBar: (state: SettingsState) => state.showHomeSummaryBar,
  keepDeviceAwake: (state: SettingsState) => state.keepDeviceAwake,
  use24HourTime: (state: SettingsState) => state.use24HourTime,
  temperatureUnit: (state: SettingsState) => state.temperatureUnit,
  defaultView: (state: SettingsState) => state.defaultView,
  compactMode: (state: SettingsState) => state.compactMode,
  kioskMode: (state: SettingsState) => state.kioskMode,
  disableAnimations: (state: SettingsState) => state.disableAnimations,
  lowPowerMode: (state: SettingsState) => state.lowPowerMode,
  effectsQuality: (state: SettingsState) => state.effectsQuality,
  entityInteractionMode: (state: SettingsState) => state.entityInteractionMode,
  cameraDashboardViewMode: (state: SettingsState) => state.cameraDashboardViewMode,
  cameraViewMode: (state: SettingsState) => state.cameraDashboardViewMode,
  cameraDashboardViewModeForEntity: (entityId: string) => (state: SettingsState) =>
    state.cameraViewModes[entityId] ?? state.cameraDashboardViewMode,
  hasCameraViewModeOverrideForEntity: (entityId: string) => (state: SettingsState) =>
    hasOwnKey(state.cameraViewModes, entityId),
  cameraViewModeForEntity: (entityId: string) => (state: SettingsState) =>
    state.cameraViewModes[entityId] ?? state.cameraDashboardViewMode,
  cameraFeedModeForEntity: (entityId: string) => (state: SettingsState) =>
    state.cameraFeedModes[entityId] ?? 'auto',
  cameraGo2RtcDefaults: (state: SettingsState) => state.cameraGo2RtcDefaults,
  cameraGo2RtcConfigForEntity: (entityId: string) => (state: SettingsState) =>
    state.cameraGo2RtcConfigs[entityId] ?? getCachedEmptyCameraGo2RtcConfig(entityId),
  ambientLightBleed: (state: SettingsState) => state.ambientLightBleed,
  weatherForecastMode: (state: SettingsState) => state.weatherForecastMode,
  weatherMetricIds: (state: SettingsState) => state.weatherMetricIds,

  // Actions
  updateSettings: (state: SettingsState) => state.updateSettings,
  updateCameraViewMode: (state: SettingsState) => state.updateCameraViewMode,
  updateCameraFeedMode: (state: SettingsState) => state.updateCameraFeedMode,
  updateCameraGo2RtcDefaults: (state: SettingsState) => state.updateCameraGo2RtcDefaults,
  updateCameraGo2RtcConfig: (state: SettingsState) => state.updateCameraGo2RtcConfig,
  resetSettings: (state: SettingsState) => state.resetSettings,

  // Combined selectors
  displaySettings: (state: SettingsState) => ({
    language: state.language,
    showHomeSummaryBar: state.showHomeSummaryBar,
    keepDeviceAwake: state.keepDeviceAwake,
    use24HourTime: state.use24HourTime,
    temperatureUnit: state.temperatureUnit,
    compactMode: state.compactMode,
    disableAnimations: state.disableAnimations,
    lowPowerMode: state.lowPowerMode,
    effectsQuality: state.effectsQuality,
    entityInteractionMode: state.entityInteractionMode,
    cameraDashboardViewMode: state.cameraDashboardViewMode,
    cameraViewMode: state.cameraDashboardViewMode,
    cameraGo2RtcDefaults: state.cameraGo2RtcDefaults,
    ambientLightBleed: state.ambientLightBleed,
    weatherForecastMode: state.weatherForecastMode,
    weatherMetricIds: state.weatherMetricIds,
  }),
};

/**
 * Home Assistant Store Selectors
 */
export const homeAssistantSelectors = {
  connected: (state: HomeAssistantStore) => state.connected,
  connecting: (state: HomeAssistantStore) => state.connecting,
  reconnecting: (state: HomeAssistantStore) => state.reconnecting,
  config: (state: HomeAssistantStore) => state.config,
  entities: (state: HomeAssistantStore) => state.entities,
  // Per-entity selector — only re-renders when that specific entity's reference changes.
  // home-assistant-js-websocket preserves entity object references for unchanged entities,
  // so this produces no re-render when a different entity updates.
  entity: (entityId: string) => (state: HomeAssistantStore) => state.entities?.[entityId],
  // Entities hydration check — stable selector for checking if entities are loaded
  entitiesHydrated: (state: HomeAssistantStore) => state.entities != null,
  registriesHydrated: (state: HomeAssistantStore) => state.registriesHydrated,
  user: (state: HomeAssistantStore) => state.user,
  areas: (state: HomeAssistantStore) => state.areas,
  deviceRegistry: (state: HomeAssistantStore) => state.deviceRegistry,
  entityRegistry: (state: HomeAssistantStore) => state.entityRegistry,
  connection: (state: HomeAssistantStore) => state.connection,
  error: (state: HomeAssistantStore) => state.error,
  connect: (state: HomeAssistantStore) => state.connect,
  disconnect: (state: HomeAssistantStore) => state.disconnect,
  clearError: (state: HomeAssistantStore) => state.clearError,
};

/**
 * Custom Cards Store Selectors
 */
export const customCardsSelectors = {
  cards: (state: CustomCardsState) => state.cards,
  addCard: (state: CustomCardsState) => state.addCard,
  removeCard: (state: CustomCardsState) => state.removeCard,
  updateCard: (state: CustomCardsState) => state.updateCard,
  getCardsForRoom: (state: CustomCardsState) => state.getCardsForRoom,
};

/**
 * Example usage:
 *
 * // ✅ Optimized - only re-renders when theme changes
 * const theme = useThemeStore(themeSelectors.theme);
 *
 * // ✅ Actions only - never causes re-renders
 * const setTheme = useThemeStore(themeSelectors.setTheme);
 *
 * // ✅ Multiple values with shallow equality
 * import { useShallow } from 'zustand/react/shallow';
 * const { theme, primaryColor } = useThemeStore(
 *   useShallow((state) => ({
 *     theme: state.theme,
 *     primaryColor: state.primaryColor,
 *   }))
 * );
 */
