import { ArrowLeft, Download, Languages, Layers3, Palette, Sparkles } from 'lucide-react';
import { ThemeAppearancePicker } from '@/app/components/shared/theme/theme-appearance-picker';
import { PRIMARY_COLOR_OPTIONS, THEME_OPTIONS } from '@/app/constants/theme-options';
import type { TranslateFn } from '@/app/hooks';
import type { PrimaryColor, ThemeType } from '@/app/hooks/use-theme';
import type { AppLanguage } from '@/app/i18n/config';
import type { UserSettings } from '@/app/stores/settings-store';

type LanguageOption = {
  value: AppLanguage;
  label: string;
};

type LocalizationSettings = Pick<UserSettings, 'language' | 'use24HourTime' | 'temperatureUnit'>;

export function RouteStep({
  accentColor,
  borderColor,
  cardBg,
  disabledCardBg,
  isClosing,
  isImporting,
  mutedColor,
  onChooseAll,
  onChooseBlank,
  onImport,
  textColor,
  t,
}: {
  accentColor: string;
  borderColor: string;
  cardBg: string;
  disabledCardBg: string;
  isClosing: boolean;
  isImporting: boolean;
  mutedColor: string;
  onChooseAll: () => void;
  onChooseBlank: () => void;
  onImport: () => void;
  textColor: string;
  t: TranslateFn;
}) {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      <button
        type="button"
        onClick={onChooseAll}
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
        onClick={onChooseBlank}
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
        onClick={onImport}
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
  );
}

export function LocalizationStep({
  accentColor,
  borderColor,
  language,
  languageOptions,
  mutedColor,
  pillBg,
  routeLabel,
  staticCardBg,
  temperatureUnit,
  textColor,
  t,
  updateSettings,
  use24HourTime,
}: {
  accentColor: string;
  borderColor: string;
  language: string;
  languageOptions: LanguageOption[];
  mutedColor: string;
  pillBg: string;
  routeLabel: string;
  staticCardBg: string;
  temperatureUnit: 'celsius' | 'fahrenheit';
  textColor: string;
  t: TranslateFn;
  updateSettings: (settings: Partial<LocalizationSettings>) => void;
  use24HourTime: boolean;
}) {
  return (
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
  );
}

export function ThemeStep({
  accentColor,
  mutedColor,
  routeLabel,
  selectedAccent,
  selectedCustomAccent,
  selectedTheme,
  setSelectedAccent,
  setSelectedCustomAccent,
  setSelectedTheme,
  textColor,
  t,
}: {
  accentColor: string;
  mutedColor: string;
  routeLabel: string;
  selectedAccent: PrimaryColor;
  selectedCustomAccent: string | null;
  selectedTheme: ThemeType;
  setSelectedAccent: (accent: PrimaryColor) => void;
  setSelectedCustomAccent: (accent: string | null) => void;
  setSelectedTheme: (theme: ThemeType) => void;
  textColor: string;
  t: TranslateFn;
}) {
  return (
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
              <p className={`text-xs ${mutedColor}`}>{t('dashboard.onboarding.theme.stepLabel')}</p>
            </div>
          </div>
        }
      />
    </div>
  );
}

export function StepActions({
  accentColor,
  borderColor,
  isClosing,
  onBack,
  onContinue,
  step,
  textColor,
  t,
}: {
  accentColor: string;
  borderColor: string;
  isClosing: boolean;
  onBack: () => void;
  onContinue: () => void;
  step: 'localization' | 'theme';
  textColor: string;
  t: TranslateFn;
}) {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={onBack}
        disabled={isClosing}
        className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-medium ${borderColor} ${textColor}`}
      >
        <ArrowLeft className="h-4 w-4" />
        {t('dashboard.onboarding.back')}
      </button>
      <button
        type="button"
        onClick={onContinue}
        disabled={isClosing}
        className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
          boxShadow: `0 18px 40px ${accentColor}40`,
        }}
      >
        {step === 'localization'
          ? t('dashboard.onboarding.next')
          : t('dashboard.onboarding.continue')}
      </button>
    </div>
  );
}
