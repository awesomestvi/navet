import { ColorInputSwatch } from '@navet/app/components/primitives/color-input-swatch';
import { Switch } from '@navet/app/components/primitives/switch';
import type { PrimaryColorOption, ThemeOption } from '@navet/app/constants/theme-options';
import { useI18n } from '@navet/app/hooks';
import type { PrimaryColor, ThemeType } from '@navet/app/hooks/use-theme';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
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
  return (
    <div>
      <div className="space-y-4">
        {lead ? <div>{lead}</div> : null}
        {showSystemTheme ? (
          <div className="flex items-center justify-between gap-4">
            <p className={`text-sm font-semibold ${pickerTokens.textClassName}`}>
              {t('settings.appearance.systemTheme.title')}
            </p>
            <Switch
              size="compact"
              className="shrink-0"
              checked={followSystemTheme}
              onCheckedChange={onFollowSystemThemeChange}
              aria-label={t('settings.appearance.systemTheme.title')}
            />
          </div>
        ) : null}

        <div className="@container/theme-picker mt-4">
          <fieldset>
            <legend className={`text-sm font-semibold ${pickerTokens.textClassName}`}>
              {t('themePicker.themeMode')}
            </legend>
            <div className="mt-3 grid grid-cols-2 gap-3 @min-[480px]/theme-picker:grid-cols-4 @min-[480px]/theme-picker:gap-2">
              {themeOptions.map((option) => {
                const isActive =
                  (manualThemeLocked ? previewTheme : selectedTheme) === option.value;
                const preview = getThemeAppearancePickerTokens(option.value, accentColor);
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isActive}
                    disabled={manualThemeLocked}
                    onClick={() => onThemeChange(option.value)}
                    className={`group min-w-0 rounded-xl text-sm focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-not-allowed ${pickerTokens.textClassName}`}
                  >
                    <div
                      aria-hidden="true"
                      className={`relative h-[84px] overflow-hidden rounded-xl border p-2 ${pickerTokens.optionBorderClassName}`}
                      style={{
                        background: preview.materialBackground,
                        borderColor: isActive ? accentColor : undefined,
                        boxShadow: isActive ? `0 0 0 1px ${accentColor}` : undefined,
                      }}
                    >
                      <svg
                        viewBox="17.5 11.5 93 49"
                        preserveAspectRatio="none"
                        className="h-full w-full"
                        fill="none"
                        aria-hidden="true"
                      >
                        <rect
                          x="18"
                          y="12"
                          width="92"
                          height="48"
                          rx="9"
                          fill={preview.materialPanel}
                          stroke={preview.materialEdge}
                        />
                        <path d="M38 13V59" stroke={preview.materialEdge} />
                        <rect x="25" y="20" width="6" height="6" rx="2" fill={accentColor} />
                        <path
                          d="M26 33H30M26 40H30"
                          stroke={preview.previewSecondaryBarColor}
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M47 21H73"
                          stroke={preview.previewPrimaryBarColor}
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                        <rect
                          x="46"
                          y="30"
                          width="25"
                          height="22"
                          rx="5"
                          fill={preview.materialTile}
                          stroke={preview.materialEdge}
                        />
                        <circle cx="53" cy="37" r="3" fill={accentColor} />
                        <path
                          d="M51 46H62"
                          stroke={preview.previewSecondaryBarColor}
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <rect
                          x="77"
                          y="30"
                          width="25"
                          height="22"
                          rx="5"
                          fill={preview.materialTile}
                          stroke={preview.materialEdge}
                        />
                        <path
                          d="M85 37H94M85 44H90"
                          stroke={preview.previewSecondaryBarColor}
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <span className="flex min-h-8 items-center justify-center gap-1.5 px-1 py-1 text-xs font-medium">
                      {t(option.labelKey)}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div className="mt-4">
          <p className={`text-sm font-semibold ${pickerTokens.textClassName}`}>
            {t('themePicker.accentColor')}
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
                const optionLabel = t(option.labelKey);

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onAccentChange(option.value)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 motion-safe:transition-transform ${
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
                    aria-pressed={isActive}
                    title={optionLabel}
                    aria-label={t('themePicker.selectAccent', { color: optionLabel })}
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
