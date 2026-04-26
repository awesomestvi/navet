import { beforeEach, describe, expect, it } from 'vitest';
import { resetAppStores } from '@/test/store-reset';
import { useEditModeStore } from '../edit-mode-store';
import { useErrorStore } from '../error-store';
import { useSearchStore } from '../search-store';

describe('misc shared stores', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  it('stores and clears global app errors', () => {
    useErrorStore.getState().setError('Boom', 'Details');

    expect(useErrorStore.getState().error?.message).toBe('Boom');
    expect(useErrorStore.getState().error?.details).toBe('Details');

    useErrorStore.getState().clearError();
    expect(useErrorStore.getState().error).toBeNull();
  });

  it('toggles edit mode and persists it', () => {
    useEditModeStore.getState().toggleEditMode();
    expect(useEditModeStore.getState().isEditMode).toBe(true);
    expect(localStorage.getItem('ha-dashboard-edit-mode')).toContain('"isEditMode":true');
  });

  it('avoids replacing filtered ids when the contents are identical', () => {
    useSearchStore.getState().setFilteredDeviceIds(['a', 'b']);
    const previousState = useSearchStore.getState();

    useSearchStore.getState().setFilteredDeviceIds(['a', 'b']);

    expect(useSearchStore.getState()).toBe(previousState);
  });

  it('clears search state', () => {
    useSearchStore.getState().setSearchQuery('lamp');
    useSearchStore.getState().setFilteredDeviceIds(['light.lamp']);

    useSearchStore.getState().clearSearch();

    expect(useSearchStore.getState().searchQuery).toBe('');
    expect(useSearchStore.getState().filteredDeviceIds).toEqual([]);
  });
});
