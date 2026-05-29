/**
 * Custom Hooks Index
 * Central export point for all custom hooks
 */

export type { TranslateFn } from '../i18n';
export { useI18n } from '../i18n';
export type { Section } from '../navigation/sections';
export { isSection, NAVIGATION_SECTIONS } from '../navigation/sections';
export { useAggregatedRooms } from './use-aggregated-rooms';
export { useAreaRooms } from './use-area-rooms';
// Existing hooks
export { useCardState } from './use-card-state';
export { useClickOutside } from './use-click-outside';
export { useCurrentIntegrationConnectionState } from './use-current-integration-connection';
export { useDashboardDevices } from './use-dashboard-devices';
export { useDashboardWidgetRoomOptions } from './use-dashboard-widget-room-options';
export { useDeviceMap } from './use-device-map';
export {
  useAggregatedDevices,
  useCalendarDevicesCollection,
  useDevices,
  useProviderCalendarCollections,
  useProviderDevices,
  useProviderWeatherCollections,
  useRooms,
  useWeatherDevicesCollection,
} from './use-devices';
export { useEditMode } from './use-edit-mode';
export { useHaCommandQueue } from './use-ha-command-queue';
export { useHomeAssistant } from './use-home-assistant';
export {
  useCurrentIntegrationStore,
  useIntegrationStore,
} from './use-integration-store';
export { useLogout } from './use-logout';
export { useMediaQuery } from './use-media-query';
export { useNavigation } from './use-navigation';
// New reusable hooks
export { usePersistedState } from './use-persisted-state';
export {
  useProviderCalendarDevices,
  useProviderCalendarDevicesCollection,
} from './use-provider-calendar-devices';
export { useProviderEntityModel } from './use-provider-device';
export {
  useProviderConnectionState,
  useProviderEntityRegistryEntries,
  useProviderEntitySnapshot,
  useProviderEntitySnapshotRecord,
  useProviderEntitySnapshots,
  useProviderTemperatureUnit,
} from './use-provider-entity';
export {
  resolveProviderIdForFeatureSupport,
  useEntityProviderFeature,
  useEntityProviderFeatureMatrix,
  useProviderFeature,
  useProviderFeatureMatrix,
} from './use-provider-feature-support';
export { useProviderHealth } from './use-provider-health';
export { useProviderResource } from './use-provider-resource';
export { useProviderRuntime } from './use-provider-runtime';
export {
  useProviderWeatherDevices,
  useProviderWeatherDevicesCollection,
} from './use-provider-weather-devices';
export type {
  EntityRoomRegistryContext,
  EntityRoomRegistryPick,
  ProviderDeviceTopology,
  ProviderEntityRoomContext,
  RegistryDeviceIdsSlice,
} from './use-registry-device-topology';
export {
  useCameraRegistryDeviceTopology,
  useEntityRoomRegistryContext,
  useHvacRegistryDeviceTopology,
  useProviderCameraTopology,
  useProviderEntityRoomContext,
  useProviderHvacTopology,
  useProviderSwitchTopology,
  useSwitchRegistryDeviceTopology,
} from './use-registry-device-topology';
export { useRoomNavigation } from './use-room-navigation';
export { useSearch } from './use-search';
export { useServiceActionHandler } from './use-service-action-handler';
export type { PrimaryColor, ThemeType } from './use-theme';
export {
  useAccentColor,
  usePrimaryColor,
  useTheme,
  useThemeColors,
  useThemeMode,
  useWallpaper,
} from './use-theme';
