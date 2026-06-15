/**
 * Optimized selectors for Zustand stores
 * Use these to prevent unnecessary re-renders
 */

import { getProviderNativeId } from '@navet/app/utils/provider-ids';
import type { ErrorStoreState } from './error-store';
import type { HomeAssistantStore } from './home-assistant-store';
import type { IntegrationStore } from './integration-store';
import type {
  CustomCardsState,
  EditModeState,
  NavigationState,
  SearchState,
  SettingsState,
  ThemeState,
} from './types';

function hasOwnKey(record: object, key: PropertyKey) {
  return typeof key === 'string' && Object.keys(record).includes(key);
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
  headerTitleMode: (state: SettingsState) => state.headerTitleMode,
  headerCustomText: (state: SettingsState) => state.headerCustomText,
  showNotifications: (state: SettingsState) => state.showNotifications,
  showWeatherInHeader: (state: SettingsState) => state.showWeatherInHeader,
  showHomeSummaryBar: (state: SettingsState) => state.showHomeSummaryBar,
  keepDeviceAwake: (state: SettingsState) => state.keepDeviceAwake,
  use24HourTime: (state: SettingsState) => state.use24HourTime,
  temperatureUnit: (state: SettingsState) => state.temperatureUnit,
  defaultView: (state: SettingsState) => state.defaultView,
  compactMode: (state: SettingsState) => state.compactMode,
  kioskMode: (state: SettingsState) => state.kioskMode,
  dashboardSpaceMode: (state: SettingsState) => state.dashboardSpaceMode,
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
  cameraStreamPreference: (state: SettingsState) => state.cameraStreamPreference,
  cameraStreamPreferenceForEntity: (entityId: string) => (state: SettingsState) =>
    state.cameraStreamPreferences[entityId] ?? state.cameraStreamPreference,
  cameraFitMode: (state: SettingsState) => state.cameraFitMode,
  cameraFitModeForEntity: (entityId: string) => (state: SettingsState) =>
    state.cameraFitModes[entityId] ?? state.cameraFitMode,
  ambientLightBleed: (state: SettingsState) => state.ambientLightBleed,
  weatherForecastMode: (state: SettingsState) => state.weatherForecastMode,
  weatherMetricIds: (state: SettingsState) => state.weatherMetricIds,
  advancedCustomizationEnabled: (state: SettingsState) => state.advancedCustomizationEnabled,
  customSidebarActions: (state: SettingsState) => state.customSidebarActions,
  customSummaryPills: (state: SettingsState) => state.customSummaryPills,

  // Actions
  updateSettings: (state: SettingsState) => state.updateSettings,
  updateCameraViewMode: (state: SettingsState) => state.updateCameraViewMode,
  updateCameraStreamPreference: (state: SettingsState) => state.updateCameraStreamPreference,
  updateCameraFitMode: (state: SettingsState) => state.updateCameraFitMode,
  resetSettings: (state: SettingsState) => state.resetSettings,

  // Combined selectors
  displaySettings: (state: SettingsState) => ({
    language: state.language,
    headerTitleMode: state.headerTitleMode,
    headerCustomText: state.headerCustomText,
    showHomeSummaryBar: state.showHomeSummaryBar,
    keepDeviceAwake: state.keepDeviceAwake,
    use24HourTime: state.use24HourTime,
    temperatureUnit: state.temperatureUnit,
    compactMode: state.compactMode,
    dashboardSpaceMode: state.dashboardSpaceMode,
    disableAnimations: state.disableAnimations,
    lowPowerMode: state.lowPowerMode,
    effectsQuality: state.effectsQuality,
    entityInteractionMode: state.entityInteractionMode,
    cameraDashboardViewMode: state.cameraDashboardViewMode,
    cameraViewMode: state.cameraDashboardViewMode,
    cameraStreamPreference: state.cameraStreamPreference,
    cameraFitMode: state.cameraFitMode,
    ambientLightBleed: state.ambientLightBleed,
    weatherForecastMode: state.weatherForecastMode,
    weatherMetricIds: state.weatherMetricIds,
    advancedCustomizationEnabled: state.advancedCustomizationEnabled,
    customSidebarActions: state.customSidebarActions,
    customSummaryPills: state.customSummaryPills,
  }),
};

export const integrationSelectors = {
  providerHealth: (state: IntegrationStore) => state.providerHealth,
  providerRuntime: (state: IntegrationStore) => state.providerRuntime,
  currentProviderRuntime: (state: IntegrationStore) =>
    state.providerRuntime[state.currentProviderId],
  providerRuntimeById:
    (providerId: keyof IntegrationStore['providerRuntime']) => (state: IntegrationStore) =>
      state.providerRuntime[providerId],
  providers: (state: IntegrationStore) => state.providers,
  currentProviderId: (state: IntegrationStore) => state.currentProviderId,
  providerSessions: (state: IntegrationStore) => state.providerSessions,
  providerEntitiesByProviderId: (state: IntegrationStore) => state.providerEntitiesByProviderId,
  providerEntitiesForId:
    (providerId: keyof IntegrationStore['providerEntitiesByProviderId']) =>
    (state: IntegrationStore) =>
      state.providerEntitiesByProviderId[providerId] ?? {},
  providerEntityLookupForId:
    (providerId: keyof IntegrationStore['providerEntityLookupByProviderId']) =>
    (state: IntegrationStore) =>
      state.providerEntityLookupByProviderId[providerId] ?? {},
  providerEntityByLookup:
    (providerId: keyof IntegrationStore['providerEntitiesByProviderId'], entityId: string) =>
    (state: IntegrationStore) => {
      const entities = state.providerEntitiesByProviderId[providerId] ?? {};
      const canonicalId =
        entities[entityId]?.canonicalId ??
        state.providerEntityLookupByProviderId[providerId]?.[entityId];

      return canonicalId ? (entities[canonicalId] ?? null) : null;
    },
  providerEntitiesByCanonicalId: (state: IntegrationStore) => state.providerEntitiesByCanonicalId,
  providerEntityViewsByProviderId: (state: IntegrationStore) =>
    state.providerEntityViewsByProviderId,
  providerEntityViewsByCanonicalId: (state: IntegrationStore) =>
    state.providerEntityViewsByCanonicalId,
  providerDeviceCollectionById:
    (providerId: keyof IntegrationStore['providerDeviceCollectionsByProviderId']) =>
    (state: IntegrationStore) =>
      state.providerDeviceCollectionsByProviderId[providerId],
  providerDeviceCollectionsByProviderId: (state: IntegrationStore) =>
    state.providerDeviceCollectionsByProviderId,
  providerEvents: (state: IntegrationStore) => state.providerEvents,
  roomsByCanonicalId: (state: IntegrationStore) => state.roomsByCanonicalId,
  roomDescriptors: (state: IntegrationStore) => state.roomDescriptors,
  availableProviderIds: (state: IntegrationStore) => state.availableProviderIds,
  selectedProviderIds: (state: IntegrationStore) => state.selectedProviderIds,
  setSelectedProviders: (state: IntegrationStore) => state.setSelectedProviders,
  currentUser: (state: IntegrationStore) => state.currentUser,
  setIntegrationUser: (state: IntegrationStore) => state.setIntegrationUser,
  setCurrentProviderId: (state: IntegrationStore) => state.setCurrentProviderId,
  setProviderSessions: (state: IntegrationStore) => state.setProviderSessions,
};

export const providerRuntimeSelectors = integrationSelectors;

/**
 * Explicit Home Assistant compatibility selectors.
 * Raw Home Assistant entities, registries, and transport state should stay here.
 */
export const homeAssistantRuntimeSelectors = {
  connected: (state: HomeAssistantStore) => state.connected,
  connecting: (state: HomeAssistantStore) => state.connecting,
  reconnecting: (state: HomeAssistantStore) => state.reconnecting,
  config: (state: HomeAssistantStore) => state.config,
  entities: (state: HomeAssistantStore) => state.entities,
  entity: (entityId: string) => (state: HomeAssistantStore) =>
    state.entities?.[getProviderNativeId(entityId)],
  entitiesHydrated: (state: HomeAssistantStore) => state.entities != null,
  registriesHydrated: (state: HomeAssistantStore) => state.registriesHydrated,
  user: (state: HomeAssistantStore) => state.user,
  areas: (state: HomeAssistantStore) => state.areas,
  deviceRegistry: (state: HomeAssistantStore) => state.deviceRegistry,
  entityRegistry: (state: HomeAssistantStore) => state.entityRegistry,
  connection: (state: HomeAssistantStore) => state.connection,
  error: (state: HomeAssistantStore) => state.error,
  connect: (state: HomeAssistantStore) => state.connect,
  syncPanelHass: (state: HomeAssistantStore) => state.syncPanelHass,
  disconnect: (state: HomeAssistantStore) => state.disconnect,
  clearError: (state: HomeAssistantStore) => state.clearError,
};

export const homeAssistantSelectors = homeAssistantRuntimeSelectors;

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
