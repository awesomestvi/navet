import { Check, Monitor, Palette } from 'lucide-react';
import { ColorInputSwatch } from '@/app/components/shared/color-input-swatch';
import type { PrimaryColorOption, ThemeOption } from '@/app/constants/theme-options';
import { useI18n } from '@/app/hooks';
import type { PrimaryColor, ThemeType } from '@/app/hooks/use-theme';
import { getThemeAppearancePickerTokens } from './theme-appearance-picker-tokens';
import { getThemeColorValue } from './theme-colors';

interface ThemeAppearancePickerProps {
  colorOptions: PrimaryColorOption[];
  customAccent: string | null;
  selectedAccent: PrimaryColor;
  selectedTheme: ThemeType;
  effectiveTheme?: ThemeType;
  themeOptions: ThemeOption[];
  onAccentChange: (accent: PrimaryColor) => void;
  onCustomAccentChange: (accent: string | null) => void;
  onThemeChange: (theme: ThemeType) => void;
  lead?: React.ReactNode;
  followSystemTheme?: boolean;
  onFollowSystemThemeChange?: (follow: boolean) => void;
}

export function ThemeAppearancePicker({
  colorOptions,
  customAccent,
  selectedAccent,
  selectedTheme,
  effectiveTheme,
  themeOptions,
  onAccentChange,
  onCustomAccentChange,
  onThemeChange,
  lead,
  followSystemTheme,
  onFollowSystemThemeChange,
}: ThemeAppearancePickerProps) {
  const { t } = useI18n();
  const customAccentValue = customAccent ?? '#f97316';
  const accentColor =
    selectedAccent === 'custom' && customAccent ? customAccent : getThemeColorValue(selectedAccent);
  const previewTheme = effectiveTheme ?? selectedTheme;
  const pickerTokens = getThemeAppearancePickerTokens(previewTheme, accentColor);
  const showSystemTheme =
    followSystemTheme !== undefined && onFollowSystemThemeChange !== undefined;
  const manualThemeLocked = showSystemTheme && followSystemTheme;
  const activeThemeLabel = t(
    themeOptions.find((option) => option.value === previewTheme)?.labelKey ??
      'themeOption.dark.label'
  );
  const selectedThemeLabel = t(
    themeOptions.find((option) => option.value === selectedTheme)?.labelKey ??
      'themeOption.dark.label'
  );

  return (
    <div>
      <div
        className={`rounded-[22px] border p-4 md:rounded-[28px] md:p-5 ${pickerTokens.panelInsetClassName}`}
      >
        {lead ? <div className="mb-4 md:mb-6">{lead}</div> : null}

        {showSystemTheme ? (
          <div>
            <p className={`text-sm font-semibold ${pickerTokens.textClassName}`}>
              {t('settings.appearance.systemTheme.title')}
            </p>
            <p className={`mt-1 text-xs leading-relaxed ${pickerTokens.mutedClassName}`}>
              {t('themePicker.systemModeHelp')}
            </p>

            <div className="mt-3 grid gap-2.5 md:grid-cols-2 md:gap-3">
              {[
                {
                  value: true,
                  icon: Monitor,
                  title: t('settings.appearance.systemTheme.title'),
                  description: t('settings.appearance.systemTheme.description'),
                },
                {
                  value: false,
                  icon: Palette,
                  title: t('themePicker.manualThemeTitle'),
                  description: t('themePicker.manualThemeDescription'),
                },
              ].map((option) => {
                const isActive = followSystemTheme === option.value;
                const Icon = option.icon;

                return (
                  <button
                    key={option.title}
                    type="button"
                    onClick={() => onFollowSystemThemeChange(option.value)}
                    className={`flex items-start gap-3 rounded-[18px] border px-3.5 py-3.5 text-left transition-all md:rounded-[22px] md:px-4 md:py-4 ${pickerTokens.optionBorderClassName} ${pickerTokens.optionCardClassName} ${
                      isActive ? 'shadow-sm' : ''
                    }`}
                    style={isActive ? pickerTokens.activeOptionStyle : undefined}
                    aria-pressed={isActive}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: isActive ? `${accentColor}20` : undefined }}
                    >
                      <Icon
                        className="h-4 w-4"
                        style={{ color: isActive ? accentColor : undefined }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold ${pickerTokens.textClassName}`}
                        style={isActive ? { color: accentColor } : undefined}
                      >
                        {option.title}
                      </p>
                      <p className={`mt-1 text-xs leading-relaxed ${pickerTokens.mutedClassName}`}>
                        {option.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div
              className={`mt-3 rounded-[18px] border px-3.5 py-3 md:rounded-[20px] md:px-4 ${pickerTokens.optionBorderClassName} ${pickerTokens.optionCardClassName}`}
            >
              <p
                className={`text-xs font-semibold uppercase tracking-[0.16em] ${pickerTokens.mutedClassName}`}
              >
                {t('themePicker.currentAppearance')}
              </p>
              <p className={`mt-1 text-sm font-semibold ${pickerTokens.textClassName}`}>
                {followSystemTheme
                  ? t('themePicker.systemActiveSummary', { mode: activeThemeLabel })
                  : t('themePicker.manualActiveSummary', { mode: selectedThemeLabel })}
              </p>
              <p className={`mt-1 text-xs leading-relaxed ${pickerTokens.mutedClassName}`}>
                {followSystemTheme
                  ? t('themePicker.systemActiveDetail')
                  : t('themePicker.manualActiveDetail')}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-5 md:mt-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`text-sm font-semibold ${pickerTokens.textClassName}`}>
                {t('themePicker.themeMode')}
              </p>
              <p className={`mt-1 text-xs leading-relaxed ${pickerTokens.mutedClassName}`}>
                {manualThemeLocked
                  ? t('themePicker.manualThemeDisabledHelp')
                  : t('themePicker.manualThemeEnabledHelp')}
              </p>
            </div>
            {manualThemeLocked ? (
              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${pickerTokens.optionBorderClassName} ${pickerTokens.mutedClassName}`}
              >
                {t('settings.appearance.systemTheme.auto')}
              </span>
            ) : null}
          </div>

          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 md:gap-3">
            {themeOptions.map((option) => {
              const isActive = selectedTheme === option.value;
              const optionLabel = t(option.labelKey);
              const optionDescription = t(option.descriptionKey);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onThemeChange(option.value)}
                  disabled={manualThemeLocked}
                  className={`flex flex-col items-start justify-start rounded-[18px] border px-3.5 py-3.5 text-left transition-all md:rounded-[22px] md:px-4 md:py-4 ${pickerTokens.optionBorderClassName} ${pickerTokens.optionCardClassName} ${
                    isActive ? 'shadow-sm' : ''
                  } ${manualThemeLocked ? 'cursor-not-allowed opacity-50' : ''}`}
                  style={isActive ? pickerTokens.activeOptionStyle : undefined}
                >
                  <p
                    className={`text-sm font-semibold ${pickerTokens.textClassName}`}
                    style={isActive ? { color: accentColor } : undefined}
                  >
                    {optionLabel}
                  </p>
                  <p className={`mt-1 text-xs leading-relaxed ${pickerTokens.mutedClassName}`}>
                    {optionDescription}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 md:mt-6">
          <p className={`text-sm font-semibold ${pickerTokens.textClassName}`}>
            {t('themePicker.accentColor')}
          </p>
          <p className={`mt-1 text-xs leading-relaxed ${pickerTokens.mutedClassName}`}>
            {t('themePicker.accentHelp')}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <ColorInputSwatch
              value={customAccentValue}
              ariaLabel={t('themePicker.customAccent')}
              title={t('themePicker.customAccent')}
              size="small"
              selected={selectedAccent === 'custom'}
              ringColor={customAccentValue}
              onClick={() => onAccentChange('custom')}
              onChange={(value) => {
                onCustomAccentChange(value);
                onAccentChange('custom');
              }}
            />
            {colorOptions
              .filter((option) => option.value !== 'custom')
              .map((option) => {
                const isActive = selectedAccent === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onAccentChange(option.value)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-transform ${
                      isActive ? 'scale-110 ring-2 ring-offset-2' : 'hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: option.color,
                      ...(isActive
                        ? {
                            boxShadow: `${pickerTokens.accentRingShadow}${option.color}`,
                          }
                        : undefined),
                    }}
                    title={option.label}
                    aria-label={`Select ${option.label} accent color`}
                  >
                    {isActive ? (
                      <Check className="h-3 w-3 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
                    ) : null}
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
