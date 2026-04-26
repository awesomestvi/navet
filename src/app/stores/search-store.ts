import { create } from 'zustand';
import { storage } from '@/app/utils/storage';

const LEGACY_SEARCH_STORAGE_KEY = 'ha-dashboard-search';
let searchStoreInitialized = false;

interface SearchState {
  searchQuery: string;
  filteredDeviceIds: string[];
  setSearchQuery: (query: string) => void;
  setFilteredDeviceIds: (ids: string[]) => void;
  clearSearch: () => void;
}

export const useSearchStore = create<SearchState>()((set) => ({
  searchQuery: '',
  filteredDeviceIds: [],
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilteredDeviceIds: (filteredDeviceIds) =>
    set((state) => {
      if (
        state.filteredDeviceIds.length === filteredDeviceIds.length &&
        state.filteredDeviceIds.every((id, index) => id === filteredDeviceIds[index])
      ) {
        return state;
      }

      return { filteredDeviceIds };
    }),
  clearSearch: () => set({ searchQuery: '', filteredDeviceIds: [] }),
}));

export function initializeSearchStore() {
  if (searchStoreInitialized) {
    return;
  }

  searchStoreInitialized = true;
  storage.remove(LEGACY_SEARCH_STORAGE_KEY);
  useSearchStore.getState().clearSearch();
}
