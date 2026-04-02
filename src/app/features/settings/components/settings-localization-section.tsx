import { Languages } from 'lucide-react';
import { getThemeAppearancePickerTokens } from '@/app/components/shared/theme/theme-appearance-picker-tokens';
import { useI18n } from '@/app/hooks';
import type { SettingsSectionController } from '../hooks/use-settings-section-controller';
import { SettingsItem, SettingsSectionShell } from './settings-section-shell';

interface SettingsLocalizationSectionProps {
  controller: SettingsSectionController;
}

export function SettingsLocalizationSection({ controller }: SettingsLocalizationSectionProps) {
  const { t } = useI18n();
  const {
    language,
    languageOptions,
    styles,
    theme,
    updateSettings,
    use24HourTime,
    temperatureUnit,
  } = controller;
  const pillTokens = getThemeAppearancePickerTokens(theme, styles.accentColor);

  return (
    <SettingsSectionShell
      id="localization"
      icon={Languages}
      title={t('settings.localization.sectionTitle')}
      description={t('settings.localization.sectionDescription')}
      styles={styles}
    >
      <SettingsItem
        title={t('settings.localization.language.title')}
        description={t('settings.localization.language.description')}
        styles={styles}
      >
        <div className="flex flex-wrap gap-2.5 md:gap-3">
          {languageOptions.map((option) => {
            const isActive = language === option.value;
            return (
              <button
                type="button"
                key={option.value}
                onClick={() => updateSettings({ language: option.value })}
                style={isActive ? pillTokens.activeOptionStyle : undefined}
                className={`rounded-full border px-4 py-2.5 text-sm font-medium transition-all md:px-5 md:py-3 ${pillTokens.textClassName} ${pillTokens.optionBorderClassName} ${!isActive ? pillTokens.optionCardClassName : ''} ${
                  isActive ? 'shadow-sm' : ''
                }`}
                aria-pressed={isActive}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </SettingsItem>

      <SettingsItem
        title={t('settings.localization.timeFormat.title')}
        description={t('settings.localization.timeFormat.description')}
        styles={styles}
      >
        <div className="flex flex-wrap gap-2">
          {[
            { value: false, label: t('settings.localization.timeFormat.twelveHour') },
            { value: true, label: t('settings.localization.timeFormat.twentyFourHour') },
          ].map((option) => {
            const isActive = use24HourTime === option.value;
            return (
              <button
                type="button"
                key={option.label}
                onClick={() => updateSettings({ use24HourTime: option.value })}
                style={isActive ? pillTokens.activeOptionStyle : undefined}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-all md:px-5 ${pillTokens.textClassName} ${pillTokens.optionBorderClassName} ${!isActive ? pillTokens.optionCardClassName : ''} ${
                  isActive ? 'shadow-sm' : ''
                }`}
                aria-pressed={isActive}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </SettingsItem>

      <SettingsItem
        title={t('settings.localization.temperatureUnit.title')}
        description={t('settings.localization.temperatureUnit.description')}
        styles={styles}
      >
        <div className="flex flex-wrap gap-2">
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
                style={isActive ? pillTokens.activeOptionStyle : undefined}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-all md:px-5 ${pillTokens.textClassName} ${pillTokens.optionBorderClassName} ${!isActive ? pillTokens.optionCardClassName : ''} ${
                  isActive ? 'shadow-sm' : ''
                }`}
                aria-pressed={isActive}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </SettingsItem>
    </SettingsSectionShell>
  );
}
