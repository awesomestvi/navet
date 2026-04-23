import {
  ArrowLeft,
  Download,
  Languages,
  Layers3,
  Palette,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { ColorInputSwatch } from '@/app/components/primitives/color-input-swatch';
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
    <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-5 md:grid-cols-3">
      <button
        type="button"
        onClick={onChooseAll}
        disabled={isClosing}
        className={`flex h-full flex-col items-start rounded-[22px] border ${borderColor} ${cardBg} p-4 text-left transition-colors sm:rounded-[28px] sm:p-6`}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl"
          style={{ backgroundColor: `${accentColor}22` }}
        >
          <Sparkles className="h-[18px] w-[18px] sm:h-5 sm:w-5" style={{ color: accentColor }} />
        </div>
        <h3 className={`mt-4 text-base font-semibold sm:mt-5 sm:text-lg ${textColor}`}>
          {t('dashboard.onboarding.route.all.title')}
        </h3>
        <p className={`mt-2 text-sm leading-relaxed sm:mt-2.5 ${mutedColor}`}>
          {t('dashboard.onboarding.route.all.body')}
        </p>
      </button>

      <button
        type="button"
        onClick={onChooseBlank}
        disabled={isClosing}
        className={`flex h-full flex-col items-start rounded-[22px] border ${borderColor} ${cardBg} p-4 text-left transition-colors sm:rounded-[28px] sm:p-6`}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl"
          style={{ backgroundColor: `${accentColor}22` }}
        >
          <Layers3 className="h-[18px] w-[18px] sm:h-5 sm:w-5" style={{ color: accentColor }} />
        </div>
        <h3 className={`mt-4 text-base font-semibold sm:mt-5 sm:text-lg ${textColor}`}>
          {t('dashboard.onboarding.route.blank.title')}
        </h3>
        <p className={`mt-2 text-sm leading-relaxed sm:mt-2.5 ${mutedColor}`}>
          {t('dashboard.onboarding.route.blank.body')}
        </p>
      </button>

      <button
        type="button"
        onClick={onImport}
        disabled={isImporting || isClosing}
        className={`flex h-full flex-col items-start rounded-[22px] border ${borderColor} ${
          isImporting || isClosing ? disabledCardBg : cardBg
        } p-4 text-left transition-colors disabled:cursor-wait sm:rounded-[28px] sm:p-6`}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl"
          style={{ backgroundColor: `${accentColor}22` }}
        >
          <Download className="h-[18px] w-[18px] sm:h-5 sm:w-5" style={{ color: accentColor }} />
        </div>
        <h3 className={`mt-4 text-base font-semibold sm:mt-5 sm:text-lg ${textColor}`}>
          {isClosing
            ? t('dashboard.onboarding.route.import.preparing')
            : isImporting
              ? t('dashboard.onboarding.route.import.importing')
              : t('dashboard.onboarding.route.import.title')}
        </h3>
        <p className={`mt-2 text-sm leading-relaxed sm:mt-2.5 ${mutedColor}`}>
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
  isLightTheme = false,
  language,
  languageOptions,
  mutedColor,
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
  isLightTheme?: boolean;
  language: string;
  languageOptions: LanguageOption[];
  mutedColor: string;
  routeLabel: string;
  staticCardBg: string;
  temperatureUnit: 'celsius' | 'fahrenheit';
  textColor: string;
  t: TranslateFn;
  updateSettings: (settings: Partial<LocalizationSettings>) => void;
  use24HourTime: boolean;
}) {
  const sectionCardClassName = `rounded-[22px] border ${borderColor} ${staticCardBg} p-4 sm:rounded-[24px] sm:p-5`;

  return (
    <div className="mt-4 space-y-4 sm:mt-5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-11 sm:w-11"
          style={{ backgroundColor: `${accentColor}22` }}
        >
          <SlidersHorizontal className="h-5 w-5" style={{ color: accentColor }} />
        </div>
        <div className="min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${mutedColor}`}>
            {t('dashboard.onboarding.localization.stepLabel')}
          </p>
          <p className={`mt-1 text-sm font-semibold ${textColor}`}>{routeLabel}</p>
        </div>
      </div>

      <section className={sectionCardClassName}>
        <div className="flex items-start gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${accentColor}18` }}
          >
            <Languages className="h-[18px] w-[18px]" style={{ color: accentColor }} />
          </div>
          <div>
            <p className={`text-sm font-semibold ${textColor}`}>
              {t('settings.localization.language.title')}
            </p>
            <p className={`mt-1 text-xs leading-relaxed ${mutedColor}`}>
              {t('settings.localization.language.description')}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {languageOptions.map((option) => {
            const isActive = language === option.value;

            return (
              <button
                type="button"
                key={option.value}
                onClick={() => updateSettings({ language: option.value })}
                aria-pressed={isActive}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${textColor}`}
                style={
                  isActive
                    ? {
                        borderColor: `${accentColor}66`,
                        background: `linear-gradient(180deg, ${accentColor}22, ${accentColor}12)`,
                        boxShadow: `0 0 0 1px ${accentColor}33 inset`,
                      }
                    : {
                        borderColor: isLightTheme
                          ? 'rgba(148,163,184,0.42)'
                          : 'rgba(255,255,255,0.14)',
                        background: isLightTheme
                          ? 'rgba(248,250,252,0.95)'
                          : 'rgba(255,255,255,0.015)',
                      }
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className={sectionCardClassName}>
          <div>
            <p className={`text-sm font-semibold ${textColor}`}>
              {t('settings.localization.timeFormat.title')}
            </p>
            <p className={`mt-1 text-xs leading-relaxed ${mutedColor}`}>
              {t('settings.localization.timeFormat.description')}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            {[
              {
                value: false,
                label: t('settings.localization.timeFormat.twelveHour'),
              },
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
                  aria-pressed={isActive}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${textColor}`}
                  style={
                    isActive
                      ? {
                          borderColor: `${accentColor}66`,
                          background: `linear-gradient(180deg, ${accentColor}22, ${accentColor}12)`,
                          boxShadow: `0 0 0 1px ${accentColor}33 inset`,
                        }
                      : {
                          borderColor: isLightTheme
                            ? 'rgba(148,163,184,0.42)'
                            : 'rgba(255,255,255,0.14)',
                          background: isLightTheme
                            ? 'rgba(248,250,252,0.95)'
                            : 'rgba(255,255,255,0.015)',
                        }
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className={sectionCardClassName}>
          <div>
            <p className={`text-sm font-semibold ${textColor}`}>
              {t('settings.localization.temperatureUnit.title')}
            </p>
            <p className={`mt-1 text-xs leading-relaxed ${mutedColor}`}>
              {t('settings.localization.temperatureUnit.description')}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            {[
              {
                value: 'celsius' as const,
                label: t('settings.localization.temperatureUnit.celsius'),
              },
              {
                value: 'fahrenheit' as const,
                label: t('settings.localization.temperatureUnit.fahrenheit'),
              },
            ].map((option) => {
              const isActive = temperatureUnit === option.value;

              return (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => updateSettings({ temperatureUnit: option.value })}
                  aria-pressed={isActive}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${textColor}`}
                  style={
                    isActive
                      ? {
                          borderColor: `${accentColor}66`,
                          background: `linear-gradient(180deg, ${accentColor}22, ${accentColor}12)`,
                          boxShadow: `0 0 0 1px ${accentColor}33 inset`,
                        }
                      : {
                          borderColor: isLightTheme
                            ? 'rgba(148,163,184,0.42)'
                            : 'rgba(255,255,255,0.14)',
                          background: isLightTheme
                            ? 'rgba(248,250,252,0.95)'
                            : 'rgba(255,255,255,0.015)',
                        }
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export function ThemeStep({
  accentColor,
  borderColor,
  isLightTheme = false,
  mutedColor,
  routeLabel,
  selectedAccent,
  selectedCustomAccent,
  selectedTheme,
  setSelectedAccent,
  setSelectedCustomAccent,
  setSelectedTheme,
  staticCardBg,
  textColor,
  t,
}: {
  accentColor: string;
  borderColor: string;
  isLightTheme?: boolean;
  mutedColor: string;
  routeLabel: string;
  selectedAccent: PrimaryColor;
  selectedCustomAccent: string | null;
  selectedTheme: ThemeType;
  setSelectedAccent: (accent: PrimaryColor) => void;
  setSelectedCustomAccent: (accent: string | null) => void;
  setSelectedTheme: (theme: ThemeType) => void;
  staticCardBg: string;
  textColor: string;
  t: TranslateFn;
}) {
  const sectionCardClassName = `rounded-[22px] border ${borderColor} ${staticCardBg} p-4 sm:rounded-[24px] sm:p-5`;

  return (
    <div className="mt-4 space-y-4 sm:mt-5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-11 sm:w-11"
          style={{ backgroundColor: `${accentColor}22` }}
        >
          <Palette className="h-5 w-5" style={{ color: accentColor }} />
        </div>
        <div className="min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${mutedColor}`}>
            {t('dashboard.onboarding.theme.stepLabel')}
          </p>
          <p className={`text-sm font-semibold ${textColor}`}>{routeLabel}</p>
        </div>
      </div>

      <section className={sectionCardClassName}>
        <div>
          <p className={`text-sm font-semibold ${textColor}`}>{t('themePicker.themeMode')}</p>
          <p className={`mt-0.5 text-xs leading-relaxed ${mutedColor}`}>
            {t('themePicker.manualThemeEnabledHelp')}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {THEME_OPTIONS.map((option) => {
            const isActive = selectedTheme === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedTheme(option.value)}
                aria-pressed={isActive}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${textColor}`}
                style={
                  isActive
                    ? {
                        borderColor: `${accentColor}66`,
                        background: `linear-gradient(180deg, ${accentColor}22, ${accentColor}12)`,
                        boxShadow: `0 0 0 1px ${accentColor}33 inset`,
                      }
                    : {
                        borderColor: isLightTheme
                          ? 'rgba(148,163,184,0.42)'
                          : 'rgba(255,255,255,0.14)',
                        background: isLightTheme
                          ? 'rgba(248,250,252,0.95)'
                          : 'rgba(255,255,255,0.015)',
                      }
                }
              >
                {t(option.labelKey)}
              </button>
            );
          })}
        </div>

        <p className={`mt-3 text-xs leading-relaxed ${mutedColor}`}>
          {t(
            THEME_OPTIONS.find((option) => option.value === selectedTheme)?.descriptionKey ??
              'themeOption.dark.description'
          )}
        </p>
      </section>

      <section className={sectionCardClassName}>
        <div>
          <p className={`text-sm font-semibold ${textColor}`}>{t('themePicker.accentColor')}</p>
          <p className={`mt-0.5 text-xs leading-relaxed ${mutedColor}`}>
            {t('themePicker.accentHelp')}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <ColorInputSwatch
            value={selectedCustomAccent ?? '#f97316'}
            ariaLabel={t('themePicker.customAccent')}
            title={t('themePicker.customAccent')}
            size="small"
            selected={selectedAccent === 'custom'}
            ringColor={selectedCustomAccent ?? '#f97316'}
            onClick={() => setSelectedAccent('custom')}
            onChange={(value) => {
              setSelectedCustomAccent(value);
              setSelectedAccent('custom');
            }}
          />
          {PRIMARY_COLOR_OPTIONS.filter((option) => option.value !== 'custom').map((option) => {
            const isActive = selectedAccent === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedAccent(option.value)}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-transform ${
                  isActive ? 'scale-110 ring-2 ring-offset-2' : 'hover:scale-105'
                }`}
                style={{
                  backgroundColor: option.color,
                  ...(isActive
                    ? {
                        boxShadow: `0 0 0 2px ${accentColor}`,
                      }
                    : undefined),
                }}
                title={option.label}
                aria-label={`Select ${option.label} accent color`}
              />
            );
          })}
        </div>
      </section>
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
    <div className="mt-5 flex flex-col gap-2.5 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <button
        type="button"
        onClick={onBack}
        disabled={isClosing}
        className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium sm:px-5 sm:py-3 ${borderColor} ${textColor}`}
      >
        <ArrowLeft className="h-4 w-4" />
        {t('dashboard.onboarding.back')}
      </button>
      <button
        type="button"
        onClick={onContinue}
        disabled={isClosing}
        className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] sm:px-6 sm:py-3"
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
