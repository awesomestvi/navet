import {
  getThemeColorValue,
  sanitizeCustomPrimaryColor,
} from '@navet/app/components/shared/theme/theme-colors';
import { resolveBuiltInWallpaperToken } from '@navet/app/constants/built-in-wallpapers';
import type { PrimaryColor, ThemeType } from '@navet/app/hooks/use-theme';
import { useSettingsStore } from '@navet/app/stores';
import { useShallow } from 'zustand/react/shallow';
import type { DashboardOnboardingDialogProps } from './types';
import { useOnboardingWizardSteps } from './use-onboarding-wizard-steps';

export function useDashboardOnboardingController({
  customPrimaryColor,
  onChooseAll,
  onChooseBlank,
  onClosingAnimationComplete,
  onImportConfig,
  open,
  phase,
  primaryColor,
  setCustomPrimaryColor,
  setPrimaryColor,
  setTheme,
  setWallpaper,
  theme,
  wallpaper,
}: Pick<
  DashboardOnboardingDialogProps,
  | 'onChooseAll'
  | 'onChooseBlank'
  | 'onImportConfig'
  | 'open'
  | 'phase'
  | 'onClosingAnimationComplete'
> & {
  customPrimaryColor: string | null;
  primaryColor: PrimaryColor;
  setCustomPrimaryColor: (color: string | null) => void;
  setPrimaryColor: (color: PrimaryColor) => void;
  setTheme: (theme: ThemeType) => void;
  setWallpaper: (wallpaper: string | null) => void;
  theme: ThemeType;
  wallpaper: string | null;
}) {
  const { language, use24HourTime, temperatureUnit, updateSettings } = useSettingsStore(
    useShallow((state) => ({
      language: state.language,
      use24HourTime: state.use24HourTime,
      temperatureUnit: state.temperatureUnit,
      updateSettings: state.updateSettings,
    }))
  );

  const {
    fileInputRef,
    handleBack,
    handleContinueToLocalization,
    handleContinueToTheme,
    handleImportFileChange,
    isClosing,
    isImporting,
    routeLabel,
    selectedAccent,
    selectedCustomAccent,
    selectedRoute,
    selectedTheme,
    selectedWallpaper,
    setSelectedAccent,
    setSelectedCustomAccent,
    setSelectedTheme,
    setSelectedWallpaper,
    step,
  } = useOnboardingWizardSteps({
    open,
    phase,
    onClosingAnimationComplete,
    onImportConfig,
    theme,
    primaryColor,
    customPrimaryColor,
    wallpaper,
  });

  const previewTheme = step === 'theme' ? selectedTheme : theme;
  const previewAccent = step === 'theme' ? selectedAccent : primaryColor;
  const accentColor =
    previewAccent === 'custom' && selectedCustomAccent
      ? selectedCustomAccent
      : getThemeColorValue(previewAccent);

  const handleFinishThemeSetup = () => {
    setTheme(selectedTheme);
    setPrimaryColor(selectedAccent);
    setCustomPrimaryColor(sanitizeCustomPrimaryColor(selectedCustomAccent));
    setWallpaper(resolveBuiltInWallpaperToken(selectedWallpaper) ?? null);

    if (selectedRoute === 'all') {
      onChooseAll();
      return;
    }

    if (selectedRoute === 'blank') {
      onChooseBlank();
    }
  };

  return {
    accentColor,
    fileInputRef,
    handleBack,
    handleContinueToLocalization,
    handleContinueToTheme,
    handleFinishThemeSetup,
    handleImportFileChange,
    isClosing,
    isImporting,
    language,
    previewTheme,
    routeLabel,
    selectedAccent,
    selectedCustomAccent,
    selectedTheme,
    selectedWallpaper,
    setSelectedAccent,
    setSelectedCustomAccent,
    setSelectedTheme,
    setSelectedWallpaper,
    step,
    temperatureUnit,
    updateSettings,
    use24HourTime,
  };
}
