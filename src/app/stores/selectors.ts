/**
 * Optimized selectors for Zustand stores
 * Use these to prevent unnecessary re-renders
 */

import type { HomeAssistantStore } from './home-assistant-store';
import type {
  CustomCardsState,
  EditModeState,
  NavigationState,
  SearchState,
  SettingsState,
  ThemeState,
} from './types';

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
  use24HourTime: (state: SettingsState) => state.use24HourTime,
  temperatureUnit: (state: SettingsState) => state.temperatureUnit,
  defaultView: (state: SettingsState) => state.defaultView,
  compactMode: (state: SettingsState) => state.compactMode,
  disableAnimations: (state: SettingsState) => state.disableAnimations,
  lowPowerMode: (state: SettingsState) => state.lowPowerMode,
  effectsQuality: (state: SettingsState) => state.effectsQuality,
  pageZoom: (state: SettingsState) => state.pageZoom,
  pageZoomScale: (state: SettingsState) => state.pageZoom / 100,
  entityInteractionMode: (state: SettingsState) => state.entityInteractionMode,
  ambientLightBleed: (state: SettingsState) => state.ambientLightBleed,
  weatherForecastMode: (state: SettingsState) => state.weatherForecastMode,

  // Actions
  updateSettings: (state: SettingsState) => state.updateSettings,
  resetSettings: (state: SettingsState) => state.resetSettings,

  // Combined selectors
  displaySettings: (state: SettingsState) => ({
    language: state.language,
    use24HourTime: state.use24HourTime,
    temperatureUnit: state.temperatureUnit,
    compactMode: state.compactMode,
    disableAnimations: state.disableAnimations,
    lowPowerMode: state.lowPowerMode,
    effectsQuality: state.effectsQuality,
    pageZoom: state.pageZoom,
    entityInteractionMode: state.entityInteractionMode,
    ambientLightBleed: state.ambientLightBleed,
    weatherForecastMode: state.weatherForecastMode,
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
