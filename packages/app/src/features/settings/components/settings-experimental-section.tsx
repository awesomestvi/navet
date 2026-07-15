import { useI18n } from '@navet/app/hooks';
import { FlaskConical } from 'lucide-react';
import type { SettingsSectionController } from '../hooks/use-settings-section-controller';
import { OnOffPillToggle } from './settings-pill-toggle';
import { SettingsItem, SettingsSectionShell } from './settings-section-shell';

interface SettingsExperimentalSectionProps {
  controller: SettingsSectionController;
  localHabitsEnabled?: boolean;
  onLocalHabitsEnabledChange?: (enabled: boolean) => void;
}

export function SettingsExperimentalSection({
  controller,
  localHabitsEnabled = false,
  onLocalHabitsEnabledChange = () => {},
}: SettingsExperimentalSectionProps) {
  const { t } = useI18n();
  const { styles } = controller;

  return (
    <SettingsSectionShell
      id="experimental"
      icon={FlaskConical}
      title={t('settings.experimental.sectionTitle')}
      description={t('settings.experimental.sectionDescription')}
      styles={styles}
    >
      <SettingsItem
        title={t('settings.experimental.localHabits.title')}
        description={t('settings.experimental.localHabits.description')}
        styles={styles}
      >
        <OnOffPillToggle
          value={localHabitsEnabled}
          onChange={onLocalHabitsEnabledChange}
          ariaLabel={t('settings.experimental.localHabits.title')}
        />
      </SettingsItem>
    </SettingsSectionShell>
  );
}
