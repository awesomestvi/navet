import { Check } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { ColorInputSwatch } from '@/app/components/primitives/color-input-swatch';
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
  lead?: ReactNode;
  followSystemTheme?: boolean;
  onFollowSystemThemeChange?: (follow: boolean) => void;
}

const CUSTOM_ACCENT_CHANGE_DEBOUNCE_MS = 120;
const THEME_PICKER_PILL_CLASS_NAME =
  'inline-flex h-9 items-center justify-center rounded-full border px-3.5 text-sm font-medium transition-all';

interface ThemeAppearancePickerPillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean;
  children: ReactNode;
  pickerTokens: ReturnType<typeof getThemeAppearancePickerTokens>;
}

function ThemeAppearancePickerPill({
  active,
  children,
  className = '',
  pickerTokens,
  style,
  ...props
}: ThemeAppearancePickerPillProps) {
  return (
    <button
      type="button"
      className={`${THEME_PICKER_PILL_CLASS_NAME} ${pickerTokens.textClassName} ${pickerTokens.optionBorderClassName} ${
        active ? 'shadow-sm' : pickerTokens.optionCardClassName
      } ${className}`}
      style={active ? { ...pickerTokens.activeOptionStyle, ...style } : style}
      aria-pressed={active}
      {...props}
    >
      {children}
    </button>
  );
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
            <p className={`mt-1 text-sm leading-relaxed ${pickerTokens.mutedClassName}`}>
              {t('themePicker.systemModeHelp')}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {[
                {
                  value: true,
                  title: t('settings.appearance.systemTheme.auto'),
                  description: t('settings.appearance.systemTheme.description'),
                },
                {
                  value: false,
                  title: t('themePicker.manualThemeTitle'),
                  description: t('themePicker.manualThemeDescription'),
                },
              ].map((option) => {
                const isActive = followSystemTheme === option.value;

                return (
                  <ThemeAppearancePickerPill
                    key={option.title}
                    active={isActive}
                    pickerTokens={pickerTokens}
                    onClick={() => onFollowSystemThemeChange(option.value)}
                  >
                    {option.title}
                  </ThemeAppearancePickerPill>
                );
              })}
            </div>

            <p className={`mt-3 px-0.5 text-sm ${pickerTokens.mutedClassName}`}>
              <span className={`font-semibold ${pickerTokens.textClassName}`}>
                {followSystemTheme
                  ? t('themePicker.systemActiveSummary', { mode: activeThemeLabel })
                  : t('themePicker.manualActiveSummary', { mode: selectedThemeLabel })}
              </span>{' '}
              <span>
                {followSystemTheme
                  ? t('themePicker.systemActiveDetail')
                  : t('themePicker.manualActiveDetail')}
              </span>
            </p>
          </div>
        ) : null}

        <div className="mt-5 md:mt-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`text-sm font-semibold ${pickerTokens.textClassName}`}>
                {t('themePicker.themeMode')}
              </p>
              <p className={`mt-1 text-sm leading-relaxed ${pickerTokens.mutedClassName}`}>
                {manualThemeLocked
                  ? t('themePicker.manualThemeDisabledHelp')
                  : t('themePicker.manualThemeEnabledHelp')}
              </p>
            </div>
            {manualThemeLocked ? (
              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${pickerTokens.optionBorderClassName} ${pickerTokens.mutedClassName}`}
              >
                {t('settings.appearance.systemTheme.auto')}
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {themeOptions.map((option) => {
              const isActive = selectedTheme === option.value;
              const optionLabel = t(option.labelKey);

              return (
                <ThemeAppearancePickerPill
                  key={option.value}
                  active={isActive}
                  pickerTokens={pickerTokens}
                  onClick={() => onThemeChange(option.value)}
                  disabled={manualThemeLocked}
                  className={manualThemeLocked ? 'cursor-not-allowed opacity-50' : ''}
                >
                  {optionLabel}
                </ThemeAppearancePickerPill>
              );
            })}
          </div>

          <p className={`mt-3 text-sm leading-relaxed ${pickerTokens.mutedClassName}`}>
            {t(
              themeOptions.find((option) => option.value === selectedTheme)?.descriptionKey ??
                'themeOption.dark.description'
            )}
          </p>
        </div>

        <div className="mt-5 md:mt-6">
          <p className={`text-sm font-semibold ${pickerTokens.textClassName}`}>
            {t('themePicker.accentColor')}
          </p>
          <p className={`mt-1 text-sm leading-relaxed ${pickerTokens.mutedClassName}`}>
            {t('themePicker.accentHelp')}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <ColorInputSwatch
              value={customAccentValue}
              ariaLabel={t('themePicker.customAccent')}
              title={t('themePicker.customAccent')}
              size="small"
              visual="rainbow"
              selected={selectedAccent === 'custom'}
              ringColor={customAccentValue}
              changeDebounceMs={CUSTOM_ACCENT_CHANGE_DEBOUNCE_MS}
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
