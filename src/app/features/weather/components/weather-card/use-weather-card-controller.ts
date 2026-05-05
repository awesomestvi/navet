import { useState } from 'react';
import { useEntityCardInteractionController } from '@/app/components/shared/entity-card-interaction-controller';
import { getAccentCardShellTokens } from '@/app/components/shared/theme/accent-card-shell-tokens';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getCustomCardTintSurface } from '@/app/components/shared/theme/custom-card-tint-surface';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { STORAGE_KEYS } from '@/app/constants/storage-keys';
import { useI18n, usePersistedState, useTheme } from '@/app/hooks';
import { settingsSelectors } from '@/app/stores/selectors';
import { useSettingsStore } from '@/app/stores/settings-store';
import { getWeatherCityName, getWeatherTextTreatment } from './weather-card-utils';
import type { WeatherCondition } from './weather-icon';

interface WeatherCardControllerArgs {
  id: string;
  location: string;
  condition: WeatherCondition | string;
  isEditMode: boolean;
}

export function useWeatherCardController({
  id,
  location,
  condition,
  isEditMode,
}: WeatherCardControllerArgs) {
  const { theme, accentColor } = useTheme();
  const { t: _t } = useI18n();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [weatherTintColors, setWeatherTintColors] = usePersistedState<Record<string, string>>(
    STORAGE_KEYS.weatherCardTintColors,
    {}
  );
  const selectedForecastMode = useSettingsStore(settingsSelectors.weatherForecastMode);
  const updateSettings = useSettingsStore(settingsSelectors.updateSettings);

  const cardShell = getCardShellSurfaceTokens(theme);
  const surface = getThemeSurfaceTokens(theme);
  const tintColor = weatherTintColors[id];
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const hasCustomTint = Boolean(tintSurface.panelStyle);
  const weatherTintStyle = hasCustomTint
    ? {
        borderColor: tintSurface.panelStyle?.borderColor,
        boxShadow: tintSurface.panelStyle?.boxShadow,
      }
    : undefined;

  const textTokens = getCardReadableTextTokens({
    theme,
    tone: 'blue',
    accentColor,
    baseColor: tintColor,
  });
  const isGlass = theme === 'glass';
  const shell = getAccentCardShellTokens(theme, 'blue');
  const weatherShellClassName = hasCustomTint ? '' : shell.containerClassName;

  const cityName = getWeatherCityName(location);
  const weatherTextTreatment = getWeatherTextTreatment(condition, hasCustomTint, textTokens);
  const dashedBorder =
    theme === 'light' ? 'border-gray-300' : isGlass ? 'border-white/18' : 'border-slate-600';

  const interaction = useEntityCardInteractionController({
    ariaLabel: cityName,
    isEditMode,
    onOpenControls: () => setIsSettingsOpen(true),
    onOpenSettings: () => setIsSettingsOpen(true),
  });

  const setTintColor = (nextTintColor?: string) => {
    setWeatherTintColors((current) => {
      if (!nextTintColor) {
        const { [id]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [id]: nextTintColor };
    });
  };

  return {
    theme,
    surface,
    isGlass,
    cardShell,
    shell,
    tintColor,
    tintSurface,
    hasCustomTint,
    weatherTintStyle,
    weatherTextTreatment,
    weatherShellClassName,
    dashedBorder,
    isSettingsOpen,
    setIsSettingsOpen,
    interaction,
    cityName,
    selectedForecastMode,
    updateSettings,
    setTintColor,
  };
}
