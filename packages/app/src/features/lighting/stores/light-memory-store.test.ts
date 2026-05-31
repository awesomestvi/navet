import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { beforeEach, describe, expect, it } from 'vitest';
import { useLightMemoryStore } from './light-memory-store';

describe('useLightMemoryStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useLightMemoryStore.setState(useLightMemoryStore.getInitialState(), true);
  });

  it('migrates the legacy light memory key to the navet namespace', async () => {
    localStorage.removeItem(STORAGE_KEYS.lightMemoryState);
    localStorage.setItem(
      LEGACY_STORAGE_KEYS.lightMemoryState,
      JSON.stringify({
        state: {
          rememberedStates: {
            'light.kitchen': {
              brightness: 55,
              colorTemp: 3200,
            },
          },
        },
        version: 0,
      })
    );

    await useLightMemoryStore.persist.rehydrate();

    expect(useLightMemoryStore.getState().rememberedStates).toEqual({
      'light.kitchen': {
        brightness: 55,
        colorTemp: 3200,
      },
    });
    expect(localStorage.getItem(STORAGE_KEYS.lightMemoryState)).toContain('"light.kitchen"');
    expect(localStorage.getItem(LEGACY_STORAGE_KEYS.lightMemoryState)).toBeNull();
  });
});
