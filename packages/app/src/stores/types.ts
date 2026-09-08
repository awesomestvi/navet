import type { CardSize } from '../components/shared/card-size-selector';
import type { Section } from '../navigation/sections';

export type { SettingsState } from './settings-store';

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
  currentRoomId: string | null;
  lastExplicitRoom: string;
  lastExplicitRoomId: string | null;
  activeSection: Section;
  activeCustomSidebarActionId: string | null;
  applyNavigationState: (state: {
    currentRoom: string;
    currentRoomId?: string | null;
    activeSection: Section;
  }) => void;
  setCurrentRoom: (room: string, options?: { explicit?: boolean; roomId?: string | null }) => void;
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
  | 'assist'
  | 'map'
  | 'entity';

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
