import type { CardSize } from '../components/shared/card-size-selector';
import type { AppLanguage } from '../i18n';
import type { Section } from '../navigation/sections';
import type {
  EffectsQuality,
  EntityInteractionMode,
  PageZoom,
  WeatherForecastMode,
} from './settings-store';
import type { PrimaryColor, ThemeMode } from './theme-store';

export type ThemeType = ThemeMode;

export interface ThemeState {
  theme: ThemeMode;
  primaryColor: PrimaryColor;
  customPrimaryColor: string | null;
  wallpaper: string | null;
  setTheme: (theme: ThemeMode) => void;
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
  activeSection: Section;
  setCurrentRoom: (room: string) => void;
  setActiveSection: (section: Section) => void;
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
  weatherForecastMode: WeatherForecastMode;
}

export interface SettingsState extends UserSettings {
  updateSettings: (settings: Partial<UserSettings>) => void;
  resetSettings: () => void;
}

export type CardType = 'rss' | 'photo' | 'note';

export interface CustomCard {
  id: string;
  type: CardType;
  size: CardSize;
  room: string;
  data?: Record<string, unknown>;
  createdAt: number;
}

export interface CustomCardsState {
  cards: CustomCard[];
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
