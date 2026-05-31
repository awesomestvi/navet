import { useSearchStore } from '../stores/search-store';
import { searchSelectors } from '../stores/selectors';

export function useSearch() {
  const searchQuery = useSearchStore(searchSelectors.searchQuery);
  const filteredDeviceIds = useSearchStore(searchSelectors.filteredDeviceIds);
  const setSearchQuery = useSearchStore(searchSelectors.setSearchQuery);
  const setFilteredDeviceIds = useSearchStore(searchSelectors.setFilteredDeviceIds);
  const clearSearch = useSearchStore(searchSelectors.clearSearch);

  return {
    searchQuery,
    filteredDeviceIds,
    setSearchQuery,
    setFilteredDeviceIds,
    clearSearch,
    isSearchActive: searchQuery.trim().length > 0,
  };
}
