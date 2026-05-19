import { Palette } from 'lucide-react';
import { ColorInputSwatch } from '@/app/components/primitives/color-input-swatch';
import { PRIMARY_COLOR_OPTIONS, THEME_OPTIONS } from '@/app/constants/theme-options';
import type { TranslateFn } from '@/app/hooks';
import type { PrimaryColor, ThemeType } from '@/app/hooks/use-theme';

export function OnboardingThemeStep({
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
          <p className={`mt-0.5 text-sm leading-relaxed ${mutedColor}`}>
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

        <p className={`mt-3 text-sm leading-relaxed ${mutedColor}`}>
          {t(
            THEME_OPTIONS.find((option) => option.value === selectedTheme)?.descriptionKey ??
              'themeOption.dark.description'
          )}
        </p>
      </section>

      <section className={sectionCardClassName}>
        <div>
          <p className={`text-sm font-semibold ${textColor}`}>{t('themePicker.accentColor')}</p>
          <p className={`mt-0.5 text-sm leading-relaxed ${mutedColor}`}>
            {t('themePicker.accentHelp')}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <ColorInputSwatch
            value={selectedCustomAccent ?? '#f97316'}
            ariaLabel={t('themePicker.customAccent')}
            title={t('themePicker.customAccent')}
            size="small"
            visual="rainbow"
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
