import type { TranslateFn } from '@navet/app/hooks';
import type { AppLanguage } from '@navet/app/i18n/config';
import type { UserSettings } from '@navet/app/stores/settings-store';
import { Languages, SlidersHorizontal } from 'lucide-react';

type LanguageOption = {
  value: AppLanguage;
  label: string;
};

type LocalizationSettings = Pick<UserSettings, 'language' | 'use24HourTime' | 'temperatureUnit'>;

export function OnboardingLocalizationStep({
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
            <p className={`mt-1 text-sm leading-relaxed ${mutedColor}`}>
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
            <p className={`mt-1 text-sm leading-relaxed ${mutedColor}`}>
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
            <p className={`mt-1 text-sm leading-relaxed ${mutedColor}`}>
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
