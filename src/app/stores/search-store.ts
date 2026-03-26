import { create } from 'zustand';
import { storage } from '@/app/utils/storage';

const LEGACY_SEARCH_STORAGE_KEY = 'ha-dashboard-search';

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

storage.remove(LEGACY_SEARCH_STORAGE_KEY);
useSearchStore.setState({ searchQuery: '', filteredDeviceIds: [] });
