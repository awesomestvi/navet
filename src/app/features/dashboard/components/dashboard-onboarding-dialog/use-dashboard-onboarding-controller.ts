import { useEffect, useRef, useState } from 'react';
import {
  getThemeColorValue,
  sanitizeCustomPrimaryColor,
} from '@/app/components/shared/theme/theme-colors';
import { useI18n } from '@/app/hooks';
import type { PrimaryColor, ThemeType } from '@/app/hooks/use-theme';
import { useSettingsStore } from '@/app/stores';
import type { DashboardOnboardingDialogProps, WizardRoute, WizardStep } from './types';

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
  const { t } = useI18n();
  const language = useSettingsStore((state) => state.language);
  const use24HourTime = useSettingsStore((state) => state.use24HourTime);
  const temperatureUnit = useSettingsStore((state) => state.temperatureUnit);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<WizardRoute>(null);
  const [step, setStep] = useState<WizardStep>('route');
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>(theme);
  const [selectedAccent, setSelectedAccent] = useState<PrimaryColor>(primaryColor);
  const [selectedCustomAccent, setSelectedCustomAccent] = useState<string | null>(
    customPrimaryColor
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep('route');
    setSelectedRoute(null);
    setSelectedTheme(theme);
    setSelectedAccent(primaryColor);
    setSelectedCustomAccent(customPrimaryColor);
  }, [customPrimaryColor, open, primaryColor, theme]);

  useEffect(() => {
    if (phase !== 'closing' || !onClosingAnimationComplete) {
      return;
    }

    const timeoutId = window.setTimeout(onClosingAnimationComplete, 900);
    return () => window.clearTimeout(timeoutId);
  }, [onClosingAnimationComplete, phase]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const previewTheme = step === 'theme' ? selectedTheme : theme;
  const previewAccent = step === 'theme' ? selectedAccent : primaryColor;
  const accentColor =
    previewAccent === 'custom' && selectedCustomAccent
      ? selectedCustomAccent
      : getThemeColorValue(previewAccent);
  const isClosing = phase === 'closing';
  const routeLabel =
    selectedRoute === 'all'
      ? t('dashboard.onboarding.route.all.title')
      : t('dashboard.onboarding.route.blank.title');

  const handleImportFileChange = async (file: File | null) => {
    if (!file) {
      return;
    }

    try {
      setIsImporting(true);
      await onImportConfig(file);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setIsImporting(false);
    }
  };

  const handleContinueToLocalization = (route: Exclude<WizardRoute, null>) => {
    setSelectedRoute(route);
    setSelectedTheme(theme);
    setSelectedAccent(primaryColor);
    setSelectedCustomAccent(customPrimaryColor);
    setStep('localization');
  };

  const handleContinueToTheme = () => {
    setStep('theme');
  };

  const handleBack = () => {
    setStep(step === 'theme' ? 'localization' : 'route');
  };

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
