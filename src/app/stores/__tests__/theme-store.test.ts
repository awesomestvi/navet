import { beforeEach, describe, expect, it } from 'vitest';
import { resetAppStores } from '@/test/store-reset';
import { useThemeStore } from '../theme-store';

describe('useThemeStore', () => {
  beforeEach(async () => {
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
    expect(useThemeStore.getState().wallpaper).toBe('./wallpapers/sunrise.jpg');
  });

  it('normalizes same-origin wallpaper URLs when set directly', () => {
    useThemeStore.getState().setWallpaper(`${window.location.origin}/wallpapers/aurora.jpg`);

    expect(useThemeStore.getState().wallpaper).toBe('./wallpapers/aurora.jpg');
  });

  it('rehydrates normalized persisted values', async () => {
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
    expect(useThemeStore.getState().wallpaper).toBe('./wallpapers/night.jpg');
    expect(useThemeStore.getState().primaryColor).toBe('green');
  });
});
