import type { CardSize } from '../components/shared/card-size-selector';
import type { AppLanguage } from '../i18n';
import type { Section } from '../navigation/sections';
import type { CustomSidebarAction, CustomSummaryPill } from '../utils/custom-extensions';
import type {
  CameraDashboardViewMode,
  CameraFitMode,
  CameraStreamPreference,
  CameraViewMode,
  DashboardSpaceMode,
  EffectsQuality,
  EntityInteractionMode,
  HeaderTitleMode,
  WeatherForecastMode,
  WeatherMetricId,
} from './settings-store';
import type { PrimaryColor, ThemeMode } from './theme-store';

export type ThemeType = ThemeMode;

export interface ThemeState {
  theme: ThemeMode;
  followSystemTheme: boolean;
  primaryColor: PrimaryColor;
  customPrimaryColor: string | null;
  wallpaper: string | null;
  applyImportedTheme: (theme: {
    theme: ThemeMode;
    primaryColor: PrimaryColor;
    customPrimaryColor: string | null;
    wallpaper: string | null;
  }) => void;
  setTheme: (theme: ThemeMode) => void;
  setFollowSystemTheme: (follow: boolean) => void;
  setPrimaryColor: (color: PrimaryColor) => void;
  setCustomPrimaryColor: (color: string | null) => void;
  setWallpaper: (wallpaper: string | null) => void;
}

export interface EditModeState {
  isEditMode: boolean;
  setEditMode: (isEditMode: boolean) => void;
  toggleEditMode: () => void;
}

export interface NavigationState {
  currentRoom: string;
  lastExplicitRoom: string;
  activeSection: Section;
  activeCustomSidebarActionId: string | null;
  applyNavigationState: (state: { currentRoom: string; activeSection: Section }) => void;
  setCurrentRoom: (room: string, options?: { explicit?: boolean }) => void;
  setActiveSection: (section: Section) => void;
  setActiveCustomSidebarAction: (actionId: string) => void;
}

export interface SearchState {
  searchQuery: string;
  filteredDeviceIds: string[];
  setSearchQuery: (query: string) => void;
  setFilteredDeviceIds: (ids: string[]) => void;
  clearSearch: () => void;
}

interface UserSettings {
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

export interface SettingsState extends UserSettings {
  updateSettings: (settings: Partial<UserSettings>) => void;
  updateCameraViewMode: (entityId: string, mode: CameraViewMode) => void;
  updateCameraStreamPreference: (entityId: string, preference: CameraStreamPreference) => void;
  updateCameraFitMode: (entityId: string, mode: CameraFitMode) => void;
  applyImportedSettings: (settings: UserSettings) => void;
  resetSettings: () => void;
}

export type CardType =
  | 'info'
  | 'rss'
  | 'photo'
  | 'note'
  | 'battery'
  | 'ups'
  | 'energy-now'
  | 'media-stack'
  | 'button'
  | 'map';

export interface CustomCard {
  id: string;
  type: CardType;
  size: CardSize;
  room: string;
  zone?: string;
  data?: Record<string, unknown>;
  createdAt: number;
}

export interface CustomCardsState {
  cards: CustomCard[];
  replaceCards: (cards: CustomCard[]) => void;
  addCard: (
    type: CardType,
    size: CardSize,
    room: string,
    data?: Record<string, unknown>
  ) => CustomCard;
  removeCard: (cardId: string) => void;
  updateCard: (cardId: string, updates: Partial<Omit<CustomCard, 'id' | 'createdAt'>>) => void;
  getCardsForRoom: (room: string) => CustomCard[];
}
