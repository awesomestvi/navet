/**
 * Custom Hooks Index
 * Central export point for all custom hooks
 */

export type { TranslateFn } from '../i18n';
export { useI18n } from '../i18n';
export type { Section } from '../navigation/sections';
export { isSection, NAVIGATION_SECTIONS } from '../navigation/sections';
// Existing hooks
export { useCardState } from './use-card-state';
export { useClickOutside } from './use-click-outside';
export { useDashboardDevices } from './use-dashboard-devices';
export { useDeviceMap } from './use-device-map';
export { useDevices, useRooms } from './use-devices';
export { useEditMode } from './use-edit-mode';
export { useHaCommandQueue } from './use-ha-command-queue';
export { useHomeAssistant } from './use-home-assistant';
export { useLogout } from './use-logout';
export { useMediaQuery } from './use-media-query';
export { useNavigation } from './use-navigation';
// New reusable hooks
export { usePersistedState } from './use-persisted-state';
export type {
  EntityRoomRegistryContext,
  EntityRoomRegistryPick,
  RegistryDeviceIdsSlice,
} from './use-registry-device-topology';
export {
  useCameraRegistryDeviceTopology,
  useEntityRoomRegistryContext,
  useHvacRegistryDeviceTopology,
  useSwitchRegistryDeviceTopology,
} from './use-registry-device-topology';
export { useRoomNavigation } from './use-room-navigation';
export { useSearch } from './use-search';
export { useServiceActionHandler } from './use-service-action-handler';
export type { PrimaryColor, ThemeType } from './use-theme';
export { useTheme } from './use-theme';
