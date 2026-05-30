import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '@/app/stores/settings-store';
import { useHeaderSearch } from './use-header-search';

const {
  useDevicesMock,
  searchState,
  setFilteredDeviceIdsMock,
  setSearchQueryMock,
  clearSearchMock,
} = vi.hoisted(() => ({
  useDevicesMock: vi.fn(() => ({
    lights: [],
    fans: [],
    hvac: [],
    climate: [],
    media: [],
    weather: [],
    switches: [],
    helpers: [],
    covers: [],
    locks: [],
    scenes: [],
    persons: [],
    sensors: [],
    vacuums: [],
    calendars: [],
    cameras: [],
    'grouped-sensors': [],
  })),
  searchState: {
    searchQuery: '',
    filteredDeviceIds: [] as string[],
  },
  setFilteredDeviceIdsMock: vi.fn(),
  setSearchQueryMock: vi.fn((value: string) => {
    searchState.searchQuery = value;
  }),
  clearSearchMock: vi.fn(() => {
    searchState.searchQuery = '';
    searchState.filteredDeviceIds = [];
  }),
}));

vi.mock('@/app/hooks', () => ({
  useDevices: useDevicesMock,
  useSearch: () => ({
    searchQuery: searchState.searchQuery,
    filteredDeviceIds: searchState.filteredDeviceIds,
    setSearchQuery: setSearchQueryMock,
    setFilteredDeviceIds: setFilteredDeviceIdsMock,
    clearSearch: clearSearchMock,
    isSearchActive: searchState.searchQuery.trim().length > 0,
  }),
}));

describe('useHeaderSearch', () => {
  beforeEach(() => {
    useDevicesMock.mockClear();
    setFilteredDeviceIdsMock.mockClear();
    setSearchQueryMock.mockClear();
    clearSearchMock.mockClear();
    searchState.searchQuery = '';
    searchState.filteredDeviceIds = [];
    useSettingsStore.setState({ ...useSettingsStore.getInitialState(), lowPowerMode: true }, true);
  });

  it('keeps device loading disabled while low-power search is idle', () => {
    renderHook(() => useHeaderSearch());

    expect(useDevicesMock).toHaveBeenCalledWith({
      enabled: false,
      includeFeatureCollections: false,
    });
  });

  it('enables device loading after search input becomes active in low-power mode', () => {
    const { result, rerender } = renderHook(() => useHeaderSearch());

    act(() => {
      result.current.handleSearchChange('kitchen');
    });
    rerender();

    expect(useDevicesMock).toHaveBeenLastCalledWith({
      enabled: true,
      includeFeatureCollections: false,
    });
  });
});
