import { STORE_STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { resetAppStores } from '@navet/app/test/store-reset';
import { beforeEach, describe, expect, it } from 'vitest';
import { useThemeStore } from '../theme-store';

describe('useThemeStore', () => {
  beforeEach(async () => {
    document.querySelector('base')?.remove();
    window.history.replaceState(null, '', '/');
    await resetAppStores();
  });

  it('normalizes imported contrast themes and wallpaper paths', () => {
    useThemeStore.getState().applyImportedTheme({
      theme: 'black',
      primaryColor: 'orange',
      customPrimaryColor: null,
      wallpaper: '/wallpapers/sunrise.jpg',
    });

    expect(useThemeStore.getState().theme).toBe('black');
    expect(useThemeStore.getState().wallpaper).toBe('/wallpapers/sunrise.jpg');
  });

  it('normalizes same-origin wallpaper URLs when set directly', () => {
    useThemeStore.getState().setWallpaper(`${window.location.origin}/wallpapers/aurora.jpg`);

    expect(useThemeStore.getState().wallpaper).toBe('/wallpapers/aurora.jpg');
  });

  it('maps legacy adaptive wallpaper presets to the flat pack', () => {
    useThemeStore.getState().setWallpaper('preset:soft-dark-gradient');

    expect(useThemeStore.getState().wallpaper).toBe('/wallpapers/soft-dark-gradient.svg');
  });

  it('normalizes built-in wallpapers under the Home Assistant add-on ingress base', () => {
    const base = document.createElement('base');
    base.href = `${window.location.origin}/api/hassio_ingress/navet_dev/`;
    document.head.append(base);

    useThemeStore.getState().setWallpaper('/wallpapers/luxury-living-room-ambient.svg');

    expect(useThemeStore.getState().wallpaper).toBe(
      '/api/hassio_ingress/navet_dev/wallpapers/luxury-living-room-ambient.svg'
    );
  });

  it('migrates persisted built-in wallpaper paths to the current ingress base', async () => {
    const base = document.createElement('base');
    base.href = `${window.location.origin}/api/hassio_ingress/current_slug/`;
    document.head.append(base);
    localStorage.removeItem(STORE_STORAGE_KEYS.theme);
    localStorage.setItem(
      'ha-dashboard-theme',
      JSON.stringify({
        state: {
          wallpaper: '/api/hassio_ingress/old_slug/wallpapers/luxury-living-room-ambient.svg',
        },
        version: 0,
      })
    );

    await useThemeStore.persist.rehydrate();

    expect(useThemeStore.getState().wallpaper).toBe(
      '/api/hassio_ingress/current_slug/wallpapers/luxury-living-room-ambient.svg'
    );
    expect(localStorage.getItem(STORE_STORAGE_KEYS.theme)).toContain('old_slug');
    expect(localStorage.getItem('ha-dashboard-theme')).toBeNull();
  });

  it('rehydrates normalized persisted values', async () => {
    localStorage.removeItem(STORE_STORAGE_KEYS.theme);
    localStorage.setItem(
      'ha-dashboard-theme',
      JSON.stringify({
        state: {
          theme: 'contrast',
          wallpaper: '/wallpapers/night.jpg',
          primaryColor: 'green',
        },
        version: 0,
      })
    );

    await useThemeStore.persist.rehydrate();

    expect(useThemeStore.getState().theme).toBe('black');
    expect(useThemeStore.getState().wallpaper).toBe('/wallpapers/night.jpg');
    expect(useThemeStore.getState().primaryColor).toBe('green');
  });

  it('prefers the navet theme key when both keys exist', async () => {
    localStorage.setItem(
      STORE_STORAGE_KEYS.theme,
      JSON.stringify({
        state: {
          theme: 'black',
          primaryColor: 'red',
        },
        version: 0,
      })
    );
    localStorage.setItem(
      'ha-dashboard-theme',
      JSON.stringify({
        state: {
          theme: 'contrast',
          primaryColor: 'green',
        },
        version: 0,
      })
    );

    await useThemeStore.persist.rehydrate();

    expect(useThemeStore.getState().theme).toBe('black');
    expect(useThemeStore.getState().primaryColor).toBe('red');
    expect(localStorage.getItem('ha-dashboard-theme')).toBeNull();
  });
});
