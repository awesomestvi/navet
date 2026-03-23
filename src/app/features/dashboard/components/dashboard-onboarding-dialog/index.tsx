import { ArrowLeft, Download, Languages, Layers3, Palette, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ThemeAppearancePicker } from '@/app/components/shared/theme/theme-appearance-picker';
import {
  getThemeColorValue,
  sanitizeCustomPrimaryColor,
} from '@/app/components/shared/theme/theme-colors';
import { PRIMARY_COLOR_OPTIONS, THEME_OPTIONS } from '@/app/constants/theme-options';
import { useI18n, useTheme } from '@/app/hooks';
import type { PrimaryColor, ThemeType } from '@/app/hooks/use-theme';
import { useSettingsStore } from '@/app/stores';
import type { DashboardOnboardingDialogProps, WizardRoute, WizardStep } from './types';

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

  if (!open) return null;

  const previewTheme = step === 'theme' ? selectedTheme : theme;
  const previewAccent = step === 'theme' ? selectedAccent : primaryColor;
  const accentColor =
    previewAccent === 'custom' && selectedCustomAccent
      ? selectedCustomAccent
      : getThemeColorValue(previewAccent);
  const isContrast = previewTheme === 'contrast';
  const bgColor =
    previewTheme === 'light'
      ? 'bg-white/95 border-gray-200/80'
      : isContrast
        ? 'bg-black border-white/16'
        : previewTheme === 'glass'
          ? 'bg-white/10 border-white/18'
          : 'bg-gray-950/95 border-white/10';
  const textColor = previewTheme === 'light' ? 'text-gray-900' : 'text-white';
  const mutedColor = previewTheme === 'light' ? 'text-gray-600' : 'text-gray-300';
  const cardBg =
    previewTheme === 'light'
      ? 'bg-gray-50 hover:bg-gray-100'
      : isContrast
        ? 'bg-black hover:bg-black'
        : previewTheme === 'glass'
          ? 'bg-white/8 hover:bg-white/12'
          : 'bg-white/5 hover:bg-white/10';
  const borderColor =
    previewTheme === 'light'
      ? 'border-gray-200/80'
      : isContrast
        ? 'border-white/16'
        : 'border-white/10';
  const staticCardBg =
    previewTheme === 'light'
      ? 'bg-gray-50'
      : isContrast
        ? 'bg-black'
        : previewTheme === 'glass'
          ? 'bg-white/8'
          : 'bg-white/5';
  const disabledCardBg =
    previewTheme === 'light'
      ? 'bg-gray-50 opacity-70'
      : isContrast
        ? 'bg-black opacity-70'
        : previewTheme === 'glass'
          ? 'bg-white/8 opacity-70'
          : 'bg-white/5 opacity-70';
  const pillBg =
    previewTheme === 'light'
      ? 'bg-gray-100 text-gray-700'
      : isContrast
        ? 'bg-black text-white/72'
        : previewTheme === 'glass'
          ? 'bg-white/10 text-white/72'
          : 'bg-white/8 text-white/72';
  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      await onImportConfig(file);
    } finally {
      event.target.value = '';
      setIsImporting(false);
    }
  };

  const isClosing = phase === 'closing';
  const routeLabel =
    selectedRoute === 'all'
      ? t('dashboard.onboarding.route.all.title')
      : t('dashboard.onboarding.route.blank.title');

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

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-black/55 p-4 safe-area-pt-4 backdrop-blur-sm sm:flex sm:items-center sm:justify-center"
      style={{
        animation: isClosing ? 'navet-onboarding-backdrop-exit 0.9s ease forwards' : undefined,
      }}
    >
      <style>{`
        @keyframes navet-onboarding-backdrop-exit {
          0% { opacity: 1; backdrop-filter: blur(10px); }
          100% { opacity: 0; backdrop-filter: blur(22px); }
        }

        @keyframes navet-onboarding-panel-exit {
          0% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          100% { opacity: 0; transform: translateY(26px) scale(0.94); filter: blur(10px); }
        }
      `}</style>
      <div
        className={`relative mx-auto w-full max-w-3xl rounded-[32px] border ${bgColor} p-6 shadow-2xl max-sm:min-h-[calc(100dvh-2rem)] max-sm:overflow-y-auto sm:max-h-[calc(100dvh-2rem)] sm:overflow-y-auto md:p-8`}
        style={{
          animation: isClosing
            ? 'navet-onboarding-panel-exit 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards'
            : undefined,
        }}
      >
        <div>
          <div className="mb-5 flex items-center">
            <img src="./logo.svg" alt="" className="h-12 w-12" />
          </div>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${mutedColor}`}>
            {t('dashboard.onboarding.welcome')}
          </p>
          <h2 className={`mt-3 text-3xl font-semibold tracking-tight ${textColor}`}>
            {step === 'route'
              ? t('dashboard.onboarding.heading.route')
              : step === 'localization'
                ? t('dashboard.onboarding.heading.localization')
                : t('dashboard.onboarding.heading.theme')}
          </h2>
          <p className={`mt-3 max-w-2xl text-sm leading-relaxed ${mutedColor}`}>
            {step === 'route'
              ? t('dashboard.onboarding.body.route')
              : step === 'localization'
                ? t('dashboard.onboarding.body.localization')
                : t('dashboard.onboarding.body.theme')}
          </p>
        </div>

        {step === 'route' ? (
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <button
              type="button"
              onClick={() => handleContinueToLocalization('all')}
              disabled={isClosing}
              className={`flex h-full flex-col items-start rounded-[28px] border ${borderColor} ${cardBg} p-6 text-left transition-colors`}
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${accentColor}22` }}
              >
                <Sparkles className="h-5 w-5" style={{ color: accentColor }} />
              </div>
              <h3 className={`mt-5 text-lg font-semibold ${textColor}`}>
                {t('dashboard.onboarding.route.all.title')}
              </h3>
              <p className={`mt-2 text-sm leading-relaxed ${mutedColor}`}>
                {t('dashboard.onboarding.route.all.body')}
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleContinueToLocalization('blank')}
              disabled={isClosing}
              className={`flex h-full flex-col items-start rounded-[28px] border ${borderColor} ${cardBg} p-6 text-left transition-colors`}
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${accentColor}22` }}
              >
                <Layers3 className="h-5 w-5" style={{ color: accentColor }} />
              </div>
              <h3 className={`mt-5 text-lg font-semibold ${textColor}`}>
                {t('dashboard.onboarding.route.blank.title')}
              </h3>
              <p className={`mt-2 text-sm leading-relaxed ${mutedColor}`}>
                {t('dashboard.onboarding.route.blank.body')}
              </p>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting || isClosing}
              className={`flex h-full flex-col items-start rounded-[28px] border ${borderColor} ${
                isImporting || isClosing ? disabledCardBg : cardBg
              } p-6 text-left transition-colors disabled:cursor-wait`}
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${accentColor}22` }}
              >
                <Download className="h-5 w-5" style={{ color: accentColor }} />
              </div>
              <h3 className={`mt-5 text-lg font-semibold ${textColor}`}>
                {isClosing
                  ? t('dashboard.onboarding.route.import.preparing')
                  : isImporting
                    ? t('dashboard.onboarding.route.import.importing')
                    : t('dashboard.onboarding.route.import.title')}
              </h3>
              <p className={`mt-2 text-sm leading-relaxed ${mutedColor}`}>
                {isClosing
                  ? t('dashboard.onboarding.route.import.closingBody')
                  : t('dashboard.onboarding.route.import.body')}
              </p>
            </button>
          </div>
        ) : step === 'localization' ? (
          <div className={`mt-5 rounded-[28px] border ${borderColor} ${staticCardBg} p-5 md:p-6`}>
            <div className="mb-5 flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${accentColor}22` }}
              >
                <Languages className="h-5 w-5" style={{ color: accentColor }} />
              </div>
              <div>
                <p className={`text-sm font-semibold ${textColor}`}>{routeLabel}</p>
                <p className={`text-xs ${mutedColor}`}>
                  {t('dashboard.onboarding.localization.stepLabel')}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className={`mb-2 text-xs font-medium ${mutedColor}`}>
                  {t('settings.localization.language.title')}
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {languageOptions.map((option) => {
                    const isActive = language === option.value;
                    return (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => updateSettings({ language: option.value })}
                        style={
                          isActive
                            ? {
                                backgroundColor: accentColor,
                                color: '#ffffff',
                              }
                            : undefined
                        }
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${borderColor} ${
                          isActive ? 'shadow-sm' : `${pillBg} ${textColor}`
                        }`}
                        aria-pressed={isActive}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className={`mb-2 text-xs font-medium ${mutedColor}`}>
                    {t('settings.localization.timeFormat.title')}
                  </p>
                  <div
                    className={`inline-flex flex-wrap rounded-full border p-1 ${borderColor} ${pillBg}`}
                  >
                    {[
                      { value: false, label: t('settings.localization.timeFormat.twelveHour') },
                      {
                        value: true,
                        label: t('settings.localization.timeFormat.twentyFourHour'),
                      },
                    ].map((option) => {
                      const isActive = use24HourTime === option.value;
                      return (
                        <button
                          type="button"
                          key={option.label}
                          onClick={() => updateSettings({ use24HourTime: option.value })}
                          style={
                            isActive
                              ? {
                                  backgroundColor: accentColor,
                                  color: '#ffffff',
                                }
                              : undefined
                          }
                          className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                            isActive ? 'shadow-sm' : textColor
                          }`}
                          aria-pressed={isActive}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className={`mb-2 text-xs font-medium ${mutedColor}`}>
                    {t('settings.localization.temperatureUnit.title')}
                  </p>
                  <div
                    className={`inline-flex flex-wrap rounded-full border p-1 ${borderColor} ${pillBg}`}
                  >
                    {[
                      {
                        value: 'fahrenheit' as const,
                        label: t('settings.localization.temperatureUnit.fahrenheit'),
                      },
                      {
                        value: 'celsius' as const,
                        label: t('settings.localization.temperatureUnit.celsius'),
                      },
                    ].map((option) => {
                      const isActive = temperatureUnit === option.value;
                      return (
                        <button
                          type="button"
                          key={option.value}
                          onClick={() => updateSettings({ temperatureUnit: option.value })}
                          style={
                            isActive
                              ? {
                                  backgroundColor: accentColor,
                                  color: '#ffffff',
                                }
                              : undefined
                          }
                          className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                            isActive ? 'shadow-sm' : textColor
                          }`}
                          aria-pressed={isActive}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <ThemeAppearancePicker
              colorOptions={PRIMARY_COLOR_OPTIONS}
              customAccent={selectedCustomAccent}
              selectedAccent={selectedAccent}
              selectedTheme={selectedTheme}
              themeOptions={THEME_OPTIONS}
              onAccentChange={setSelectedAccent}
              onCustomAccentChange={setSelectedCustomAccent}
              onThemeChange={setSelectedTheme}
              lead={
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: `${accentColor}22` }}
                  >
                    <Palette className="h-5 w-5" style={{ color: accentColor }} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${textColor}`}>{routeLabel}</p>
                    <p className={`text-xs ${mutedColor}`}>
                      {t('dashboard.onboarding.theme.stepLabel')}
                    </p>
                  </div>
                </div>
              }
            />
          </div>
        )}

        {step !== 'route' ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setStep(step === 'theme' ? 'localization' : 'route')}
              disabled={isClosing}
              className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-medium ${borderColor} ${textColor}`}
            >
              <ArrowLeft className="h-4 w-4" />
              {t('dashboard.onboarding.back')}
            </button>
            {step === 'localization' ? (
              <button
                type="button"
                onClick={handleContinueToTheme}
                disabled={isClosing}
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                  boxShadow: `0 18px 40px ${accentColor}40`,
                }}
              >
                {t('dashboard.onboarding.next')}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishThemeSetup}
                disabled={isClosing}
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                  boxShadow: `0 18px 40px ${accentColor}40`,
                }}
              >
                {t('dashboard.onboarding.continue')}
              </button>
            )}
          </div>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept=".yaml,.yml,application/yaml,text/yaml"
          className="hidden"
          onChange={handleImportFileChange}
        />
      </div>
    </div>
  );
}
