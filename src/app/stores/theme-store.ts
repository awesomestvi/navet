import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'contrast' | 'glass';
export type PrimaryColor =
  | 'blue'
  | 'purple'
  | 'pink'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'custom';

interface ThemeState {
  theme: ThemeMode;
  followSystemTheme: boolean;
  primaryColor: PrimaryColor;
  customPrimaryColor: string | null;
  wallpaper: string | null;
  applyImportedTheme: (theme: {
    theme: ThemeMode;
    primaryColor: PrimaryColor;
    customPrimaryColor: string | null;
    wallpaper: string | null;
  }) => void;
  setTheme: (theme: ThemeMode) => void;
  setFollowSystemTheme: (follow: boolean) => void;
  setPrimaryColor: (color: PrimaryColor) => void;
  setCustomPrimaryColor: (color: string | null) => void;
  setWallpaper: (wallpaper: string | null) => void;
}

function normalizeWallpaperPath(wallpaper: string | null | undefined) {
  if (!wallpaper) {
    return null;
  }

  const trimmed = wallpaper.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('/wallpapers/')) {
    return `.${trimmed}`;
  }

  if (typeof window !== 'undefined') {
    try {
      const resolved = new URL(trimmed, window.location.href);
      if (
        resolved.origin === window.location.origin &&
        resolved.pathname.startsWith('/wallpapers/')
      ) {
        return `.${resolved.pathname}`;
      }
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      followSystemTheme: false,
      primaryColor: 'orange',
      customPrimaryColor: null,
      wallpaper: null,
      applyImportedTheme: (nextTheme) =>
        set({
          theme: nextTheme.theme,
          primaryColor: nextTheme.primaryColor,
          customPrimaryColor: nextTheme.customPrimaryColor,
          wallpaper: normalizeWallpaperPath(nextTheme.wallpaper),
        }),
      setTheme: (theme) => set({ theme }),
      setFollowSystemTheme: (followSystemTheme) => set({ followSystemTheme }),
      setPrimaryColor: (primaryColor) => set({ primaryColor }),
      setCustomPrimaryColor: (customPrimaryColor) => set({ customPrimaryColor }),
      setWallpaper: (wallpaper) => set({ wallpaper: normalizeWallpaperPath(wallpaper) }),
    }),
    {
      name: 'ha-dashboard-theme',
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const next = (persisted as Partial<ThemeState> | null) ?? {};

        return {
          ...current,
          ...next,
          wallpaper: normalizeWallpaperPath(next.wallpaper ?? current.wallpaper),
        };
      },
    }
  )
);
