import { Button } from '@navet/app/components/primitives';
import { useI18n } from '@navet/app/hooks';
import {
  activateKeepDeviceAwakeFallback,
  useKeepDeviceAwakeSnapshot,
} from '@navet/app/hooks/use-keep-device-awake';
import { FlaskConical } from 'lucide-react';
import type { SettingsSectionController } from '../hooks/use-settings-section-controller';
import { OnOffPillToggle } from './settings-pill-toggle';
import { SettingsItem, SettingsSectionShell } from './settings-section-shell';

interface SettingsExperimentalSectionProps {
  controller: SettingsSectionController;
}

export function SettingsExperimentalSection({ controller }: SettingsExperimentalSectionProps) {
  const { t } = useI18n();
  const keepAwakeSnapshot = useKeepDeviceAwakeSnapshot();
  const { keepDeviceAwake, styles, updateSettings } = controller;

  return (
    <SettingsSectionShell
      id="experimental"
      icon={FlaskConical}
      title={t('settings.experimental.sectionTitle')}
      description={t('settings.experimental.sectionDescription')}
      styles={styles}
    >
      <SettingsItem
        title={t('settings.dashboard.keepAwake.title')}
        description={t('settings.dashboard.keepAwake.description')}
        styles={styles}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <OnOffPillToggle
              value={keepDeviceAwake}
              onChange={(checked) => updateSettings({ keepDeviceAwake: checked })}
              ariaLabel={t('settings.dashboard.keepAwake.title')}
            />
            <p className={`max-w-2xl text-sm leading-relaxed ${styles.subtleColor}`}>
              {t('settings.dashboard.keepAwake.caveat')}
            </p>
            {keepDeviceAwake ? (
              <p className={`max-w-2xl text-sm leading-relaxed ${styles.subtleColor}`}>
                {t('settings.dashboard.keepAwake.bestEffort')}
              </p>
            ) : null}
          </div>

          {keepDeviceAwake && keepAwakeSnapshot.mode === 'pending-activation' ? (
            <div className="flex flex-col gap-2">
              <p className={`max-w-2xl text-sm font-medium leading-relaxed ${styles.textColor}`}>
                {t('settings.dashboard.keepAwake.status.pending-activation')}
              </p>
              {keepAwakeSnapshot.canActivateFallback ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    variant="secondary"
                    size="small"
                    className="rounded-full"
                    onClick={() => {
                      void activateKeepDeviceAwakeFallback();
                    }}
                  >
                    {t('settings.dashboard.keepAwake.activateFallback')}
                  </Button>
                  <p className={`text-sm leading-relaxed ${styles.subtleColor}`}>
                    {t('settings.dashboard.keepAwake.activationHint')}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </SettingsItem>
    </SettingsSectionShell>
  );
}
