import { isDevOrLocalBuild } from '@navet/app/constants/app-build-metadata';
import { useI18n } from '@navet/app/hooks';
import { FlaskConical } from 'lucide-react';
import type { SettingsSectionController } from '../hooks/use-settings-section-controller';
import { OnOffPillToggle } from './settings-pill-toggle';
import { SettingsItem, SettingsSectionShell } from './settings-section-shell';

interface SettingsExperimentalSectionProps {
  controller: SettingsSectionController;
  localHabitsTabEnabled?: boolean;
  onLocalHabitsTabEnabledChange?: (enabled: boolean) => void;
}

export function SettingsExperimentalSection({
  controller,
  localHabitsTabEnabled = false,
  onLocalHabitsTabEnabledChange = () => {},
}: SettingsExperimentalSectionProps) {
  const { t } = useI18n();
  const { styles } = controller;
  const showLocalHabitsToggle = isDevOrLocalBuild();

  return (
    <SettingsSectionShell
      id="experimental"
      icon={FlaskConical}
      title={t('settings.experimental.sectionTitle')}
      description={t('settings.experimental.sectionDescription')}
      styles={styles}
    >
      {showLocalHabitsToggle ? (
        <SettingsItem
          title={t('settings.experimental.localHabits.title')}
          description={t('settings.experimental.localHabits.description')}
          styles={styles}
        >
          <OnOffPillToggle
            value={localHabitsTabEnabled}
            onChange={onLocalHabitsTabEnabledChange}
            ariaLabel={t('settings.experimental.localHabits.title')}
          />
        </SettingsItem>
      ) : null}
    </SettingsSectionShell>
  );
}
