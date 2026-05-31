import { STORE_STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { resetAppStores } from '@navet/app/test/store-reset';
import { beforeEach, describe, expect, it } from 'vitest';
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
    expect(localStorage.getItem(STORE_STORAGE_KEYS.editMode)).toContain('"isEditMode":true');
  });

  it('migrates the legacy edit-mode key to the navet namespace', async () => {
    localStorage.removeItem(STORE_STORAGE_KEYS.editMode);
    localStorage.setItem(
      'ha-dashboard-edit-mode',
      JSON.stringify({
        state: { isEditMode: true },
        version: 0,
      })
    );

    await useEditModeStore.persist.rehydrate();

    expect(useEditModeStore.getState().isEditMode).toBe(true);
    expect(localStorage.getItem(STORE_STORAGE_KEYS.editMode)).toContain('"isEditMode":true');
    expect(localStorage.getItem('ha-dashboard-edit-mode')).toBeNull();
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
