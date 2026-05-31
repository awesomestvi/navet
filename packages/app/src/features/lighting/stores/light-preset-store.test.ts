import { LEGACY_STORE_STORAGE_KEYS, STORE_STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { beforeEach, describe, expect, it } from 'vitest';
import { useLightPresetStore } from './light-preset-store';

describe('useLightPresetStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useLightPresetStore.setState(useLightPresetStore.getInitialState(), true);
  });

  it('migrates the legacy light preset key to the navet namespace', async () => {
    localStorage.removeItem(STORE_STORAGE_KEYS.lightPresetSettings);
    localStorage.setItem(
      LEGACY_STORE_STORAGE_KEYS.lightPresetSettings,
      JSON.stringify({
        state: {
          globalBrightnessPresetValues: {
            bright: 90,
            dim: 45,
            night: 10,
          },
          globalBrightnessPresetOrder: ['bright', 'dim', 'night'],
          lightPresetConfigs: {
            'light.kitchen': {
              brightnessPresetOrder: ['dim', 'bright', 'night'],
              brightnessPresetValues: {
                dim: 50,
              },
            },
          },
        },
        version: 2,
      })
    );

    await useLightPresetStore.persist.rehydrate();

    expect(useLightPresetStore.getState().globalBrightnessPresetOrder).toEqual([
      'bright',
      'dim',
      'night',
    ]);
    expect(useLightPresetStore.getState().lightPresetConfigs['light.kitchen']).toMatchObject({
      brightnessPresetOrder: ['dim', 'bright', 'night'],
    });
    expect(localStorage.getItem(STORE_STORAGE_KEYS.lightPresetSettings)).toContain(
      '"light.kitchen"'
    );
    expect(localStorage.getItem(LEGACY_STORE_STORAGE_KEYS.lightPresetSettings)).toBeNull();
  });
});
