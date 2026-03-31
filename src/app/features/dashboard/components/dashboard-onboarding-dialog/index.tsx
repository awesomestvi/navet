import { useI18n, useTheme } from '@/app/hooks';
import { OnboardingShell } from './onboarding-shell';
import { LocalizationStep, RouteStep, StepActions, ThemeStep } from './onboarding-steps';
import type { DashboardOnboardingDialogProps } from './types';
import { useDashboardOnboardingController } from './use-dashboard-onboarding-controller';

export function DashboardOnboardingDialog({
  open,
  onChooseAll,
  onChooseBlank,
  onImportConfig,
  phase = 'idle',
  onClosingAnimationComplete,
}: DashboardOnboardingDialogProps) {
  const { languageOptions, t } = useI18n();
  const {
    customPrimaryColor,
    theme,
    primaryColor,
    setCustomPrimaryColor,
    setPrimaryColor,
    setTheme,
  } = useTheme();
  const {
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
  } = useDashboardOnboardingController({
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
  });
  if (!open) return null;

  const isLightTheme = previewTheme === 'light';
  const isContrast = previewTheme === 'contrast';
  const bgColor = isLightTheme
    ? 'bg-white/95 border-gray-200/80'
    : isContrast
      ? 'bg-black border-white/16'
      : previewTheme === 'glass'
        ? 'bg-white/10 border-white/18'
        : 'bg-gray-950/95 border-white/10';
  const textColor = isLightTheme ? 'text-gray-900' : 'text-white';
  const mutedColor = isLightTheme ? 'text-gray-600' : 'text-gray-300';
  const cardBg = isLightTheme
    ? 'bg-gray-50 hover:bg-gray-100'
    : isContrast
      ? 'bg-black hover:bg-black'
      : previewTheme === 'glass'
        ? 'bg-white/8 hover:bg-white/12'
        : 'bg-white/5 hover:bg-white/10';
  const borderColor = isLightTheme
    ? 'border-gray-200/80'
    : isContrast
      ? 'border-white/16'
      : 'border-white/10';
  const staticCardBg = isLightTheme
    ? 'bg-gray-50'
    : isContrast
      ? 'bg-black'
      : previewTheme === 'glass'
        ? 'bg-white/8'
        : 'bg-white/5';
  const disabledCardBg = isLightTheme
    ? 'bg-gray-50 opacity-70'
    : isContrast
      ? 'bg-black opacity-70'
      : previewTheme === 'glass'
        ? 'bg-white/8 opacity-70'
        : 'bg-white/5 opacity-70';
  return (
    <OnboardingShell
      accentColor={accentColor}
      bgColor={bgColor}
      isClosing={isClosing}
      mutedColor={mutedColor}
      step={step}
      textColor={textColor}
      title={
        step === 'route'
          ? t('dashboard.onboarding.heading.route')
          : step === 'localization'
            ? t('dashboard.onboarding.heading.localization')
            : t('dashboard.onboarding.heading.theme')
      }
      body={
        step === 'route'
          ? t('dashboard.onboarding.body.route')
          : step === 'localization'
            ? t('dashboard.onboarding.body.localization')
            : t('dashboard.onboarding.body.theme')
      }
      welcomeLabel={t('dashboard.onboarding.welcome')}
    >
      {step === 'route' ? (
        <RouteStep
          accentColor={accentColor}
          borderColor={borderColor}
          cardBg={cardBg}
          disabledCardBg={disabledCardBg}
          isClosing={isClosing}
          isImporting={isImporting}
          mutedColor={mutedColor}
          onChooseAll={() => handleContinueToLocalization('all')}
          onChooseBlank={() => handleContinueToLocalization('blank')}
          onImport={() => fileInputRef.current?.click()}
          textColor={textColor}
          t={t}
        />
      ) : step === 'localization' ? (
        <LocalizationStep
          accentColor={accentColor}
          borderColor={borderColor}
          isLightTheme={isLightTheme}
          language={language}
          languageOptions={languageOptions}
          mutedColor={mutedColor}
          routeLabel={routeLabel}
          staticCardBg={staticCardBg}
          temperatureUnit={temperatureUnit}
          textColor={textColor}
          t={t}
          updateSettings={updateSettings}
          use24HourTime={use24HourTime}
        />
      ) : (
        <ThemeStep
          accentColor={accentColor}
          borderColor={borderColor}
          isLightTheme={isLightTheme}
          mutedColor={mutedColor}
          routeLabel={routeLabel}
          selectedAccent={selectedAccent}
          selectedCustomAccent={selectedCustomAccent}
          selectedTheme={selectedTheme}
          setSelectedAccent={setSelectedAccent}
          setSelectedCustomAccent={setSelectedCustomAccent}
          setSelectedTheme={setSelectedTheme}
          staticCardBg={staticCardBg}
          textColor={textColor}
          t={t}
        />
      )}

      {step !== 'route' ? (
        <StepActions
          accentColor={accentColor}
          borderColor={borderColor}
          isClosing={isClosing}
          onBack={handleBack}
          onContinue={step === 'localization' ? handleContinueToTheme : handleFinishThemeSetup}
          step={step}
          textColor={textColor}
          t={t}
        />
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept=".yaml,.yml,application/yaml,text/yaml"
        className="hidden"
        onChange={(event) => handleImportFileChange(event.target.files?.[0] ?? null)}
      />
    </OnboardingShell>
  );
}
