import {
  getThemeColorValue,
  sanitizeCustomPrimaryColor,
} from '@/app/components/shared/theme/theme-colors';
import type { PrimaryColor, ThemeType } from '@/app/hooks/use-theme';
import { useSettingsStore } from '@/app/stores';
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
  theme,
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
  theme: ThemeType;
}) {
  const language = useSettingsStore((state) => state.language);
  const use24HourTime = useSettingsStore((state) => state.use24HourTime);
  const temperatureUnit = useSettingsStore((state) => state.temperatureUnit);
  const updateSettings = useSettingsStore((state) => state.updateSettings);

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
    setSelectedAccent,
    setSelectedCustomAccent,
    setSelectedTheme,
    step,
  } = useOnboardingWizardSteps({
    open,
    phase,
    onClosingAnimationComplete,
    onImportConfig,
    theme,
    primaryColor,
    customPrimaryColor,
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
    setSelectedAccent,
    setSelectedCustomAccent,
    setSelectedTheme,
    step,
    temperatureUnit,
    updateSettings,
    use24HourTime,
  };
}
