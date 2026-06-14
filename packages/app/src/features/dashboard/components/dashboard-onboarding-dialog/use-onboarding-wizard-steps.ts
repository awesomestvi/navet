import {
  type BuiltInWallpaperToken,
  resolveBuiltInWallpaperToken,
} from '@navet/app/constants/built-in-wallpapers';
import { useI18n } from '@navet/app/hooks';
import type { PrimaryColor, ThemeType } from '@navet/app/hooks/use-theme';
import { useEffect, useRef, useState } from 'react';
import type { DashboardOnboardingDialogProps, WizardRoute, WizardStep } from './types';

interface UseOnboardingWizardStepsProps {
  open: boolean;
  phase: DashboardOnboardingDialogProps['phase'];
  onClosingAnimationComplete: DashboardOnboardingDialogProps['onClosingAnimationComplete'];
  onImportConfig: DashboardOnboardingDialogProps['onImportConfig'];
  theme: ThemeType;
  primaryColor: PrimaryColor;
  customPrimaryColor: string | null;
  wallpaper: string | null;
}

export function useOnboardingWizardSteps({
  open,
  phase,
  onClosingAnimationComplete,
  onImportConfig,
  theme,
  primaryColor,
  customPrimaryColor,
  wallpaper,
}: UseOnboardingWizardStepsProps) {
  const { t } = useI18n();
  const [isImporting, setIsImporting] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<WizardRoute>(null);
  const [step, setStep] = useState<WizardStep>('route');
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>(theme);
  const [selectedAccent, setSelectedAccent] = useState<PrimaryColor>(primaryColor);
  const [selectedCustomAccent, setSelectedCustomAccent] = useState<string | null>(
    customPrimaryColor
  );
  const [selectedWallpaper, setSelectedWallpaper] = useState<BuiltInWallpaperToken | null>(
    resolveBuiltInWallpaperToken(wallpaper)
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
    setSelectedWallpaper(resolveBuiltInWallpaperToken(wallpaper));
  }, [customPrimaryColor, open, primaryColor, theme, wallpaper]);

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
    setSelectedWallpaper(resolveBuiltInWallpaperToken(wallpaper));
    setStep('localization');
  };

  const handleContinueToTheme = () => {
    setStep('theme');
  };

  const handleBack = () => {
    setStep(step === 'theme' ? 'localization' : 'route');
  };

  return {
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
    setSelectedWallpaper: (nextWallpaper: BuiltInWallpaperToken | null) =>
      setSelectedWallpaper(nextWallpaper),
    step,
  };
}
