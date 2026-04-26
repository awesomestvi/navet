/**
 * Theme hook backed by the theme store.
 * Color generation logic is in use-theme-colors.ts
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { resolvePrimaryColorValue } from '@/app/components/shared/theme/theme-colors';
import { themeSelectors } from '@/app/stores/selectors';
import type { PrimaryColor, ThemeMode as ThemeType } from '../stores/theme-store';
import { useThemeStore } from '../stores/theme-store';
import { useMediaQuery } from './use-media-query';
import { generateThemeColors, type ThemeColors } from './use-theme-colors';

export type { PrimaryColor, ThemeColors, ThemeType };

interface ThemeValue {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  followSystemTheme: boolean;
  setFollowSystemTheme: (follow: boolean) => void;
  colors: ThemeColors;
  primaryColor: PrimaryColor;
  setPrimaryColor: (color: PrimaryColor) => void;
  customPrimaryColor: string | null;
  setCustomPrimaryColor: (color: string | null) => void;
  accentColor: string;
  wallpaper: string | null;
  setWallpaper: (wallpaper: string | null) => void;
}

export function useTheme(): ThemeValue {
  const { theme, followSystemTheme, primaryColor, customPrimaryColor, wallpaper } = useThemeStore(
    useShallow(themeSelectors.allValues)
  );
  const { setTheme, setFollowSystemTheme, setPrimaryColor, setCustomPrimaryColor, setWallpaper } =
    useThemeStore(useShallow(themeSelectors.allActions));
  const sysDark = useMediaQuery('(prefers-color-scheme: dark)');
  const effectiveTheme: ThemeType = followSystemTheme ? (sysDark ? 'dark' : 'light') : theme;
  const accentColor = useMemo(
    () => resolvePrimaryColorValue(primaryColor, customPrimaryColor),
    [customPrimaryColor, primaryColor]
  );
  const colors = useMemo(
    () => generateThemeColors(effectiveTheme, primaryColor, customPrimaryColor),
    [customPrimaryColor, primaryColor, effectiveTheme]
  );

  return useMemo(
    () => ({
      theme: effectiveTheme,
      setTheme,
      followSystemTheme,
      setFollowSystemTheme,
      colors,
      primaryColor,
      setPrimaryColor,
      customPrimaryColor,
      setCustomPrimaryColor,
      accentColor,
      wallpaper,
      setWallpaper,
    }),
    [
      effectiveTheme,
      setTheme,
      followSystemTheme,
      setFollowSystemTheme,
      colors,
      primaryColor,
      setPrimaryColor,
      customPrimaryColor,
      setCustomPrimaryColor,
      accentColor,
      wallpaper,
      setWallpaper,
    ]
  );
}
