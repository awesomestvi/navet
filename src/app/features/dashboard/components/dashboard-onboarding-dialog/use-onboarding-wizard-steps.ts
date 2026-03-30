import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/app/hooks';
import type { PrimaryColor, ThemeType } from '@/app/hooks/use-theme';
import type { DashboardOnboardingDialogProps, WizardRoute, WizardStep } from './types';

interface UseOnboardingWizardStepsProps {
  open: boolean;
  phase: DashboardOnboardingDialogProps['phase'];
  onClosingAnimationComplete: DashboardOnboardingDialogProps['onClosingAnimationComplete'];
  onImportConfig: DashboardOnboardingDialogProps['onImportConfig'];
  theme: ThemeType;
  primaryColor: PrimaryColor;
  customPrimaryColor: string | null;
}

export function useOnboardingWizardSteps({
  open,
  phase,
  onClosingAnimationComplete,
  onImportConfig,
  theme,
  primaryColor,
  customPrimaryColor,
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
    setSelectedAccent,
    setSelectedCustomAccent,
    setSelectedTheme,
    step,
  };
}
