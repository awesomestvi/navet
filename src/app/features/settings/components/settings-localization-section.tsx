import { Languages } from 'lucide-react';
import { InteractivePill } from '@/app/components/primitives/interactive-pill';
import { Select } from '@/app/components/primitives/select';
import { useI18n } from '@/app/hooks';
import type { SettingsSectionController } from '../hooks/use-settings-section-controller';
import { SettingsItem, SettingsSectionShell } from './settings-section-shell';

interface SettingsLocalizationSectionProps {
  controller: SettingsSectionController;
}

export function SettingsLocalizationSection({ controller }: SettingsLocalizationSectionProps) {
  const { t } = useI18n();
  const { language, languageOptions, styles, updateSettings, use24HourTime, temperatureUnit } =
    controller;

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
        <Select
          value={language}
          onChange={(event) => {
            const nextLanguage = languageOptions.find(
              (option) => option.value === event.currentTarget.value
            )?.value;

            if (nextLanguage) {
              updateSettings({ language: nextLanguage });
            }
          }}
          aria-label={t('settings.localization.language.title')}
          containerClassName="max-w-xs"
        >
          {languageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
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
              <InteractivePill
                key={option.label}
                active={isActive}
                size="small"
                onClick={() => updateSettings({ use24HourTime: option.value })}
                aria-pressed={isActive}
              >
                {option.label}
              </InteractivePill>
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
              <InteractivePill
                key={option.value}
                active={isActive}
                size="small"
                onClick={() => updateSettings({ temperatureUnit: option.value })}
                aria-pressed={isActive}
              >
                {option.label}
              </InteractivePill>
            );
          })}
        </div>
      </SettingsItem>
    </SettingsSectionShell>
  );
}
