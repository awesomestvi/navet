import { Hand } from 'lucide-react';
import { InteractionPreviewCard } from '@/app/components/patterns/interaction-preview-card';
import { Input } from '@/app/components/primitives';
import { InteractivePill } from '@/app/components/primitives/interactive-pill';
import { useI18n } from '@/app/hooks';
import type { TranslationKey } from '@/app/i18n';
import type { CameraGo2RtcStreamNamingMode } from '@/app/stores';
import type {
  SettingsInteractionOption,
  SettingsSectionController,
} from '../hooks/use-settings-section-controller';
import { SettingsItem, SettingsSectionShell } from './settings-section-shell';

interface SettingsInteractionSectionProps {
  controller: SettingsSectionController;
}

export function SettingsInteractionSection({ controller }: SettingsInteractionSectionProps) {
  const { t } = useI18n();
  const { cameraGo2RtcDefaults, entityInteractionMode, styles, theme, updateSettings } = controller;
  const interactionOptions: SettingsInteractionOption[] = [
    { value: 'toggle-first', label: t('settings.dashboard.interaction.toggleFirst') },
    { value: 'control-first', label: t('settings.dashboard.interaction.controlFirst') },
  ];
  const streamNamingOptions: CameraGo2RtcStreamNamingMode[] = ['entity_id', 'short_entity_id'];

  return (
    <SettingsSectionShell
      id="interaction"
      icon={Hand}
      title={t('settings.interaction.sectionTitle')}
      description={t('settings.interaction.sectionDescription')}
      styles={styles}
    >
      <SettingsItem
        title={t('settings.interaction.cardBehavior.title')}
        description={t('settings.interaction.cardBehavior.description')}
        styles={styles}
      >
        <div className="grid items-start gap-4 md:gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex w-fit flex-wrap gap-2">
            {interactionOptions.map((option) => {
              const isActive = entityInteractionMode === option.value;
              return (
                <InteractivePill
                  key={option.value}
                  active={isActive}
                  size="small"
                  onClick={() => updateSettings({ entityInteractionMode: option.value })}
                  aria-pressed={isActive}
                >
                  {option.label}
                </InteractivePill>
              );
            })}
          </div>

          <div className="hidden md:block">
            <InteractionPreviewCard
              mode={entityInteractionMode}
              accentColor={styles.accentColor}
              theme={theme}
            />
          </div>
        </div>
      </SettingsItem>

      <SettingsItem
        title={t('settings.interaction.cameraStreams.title')}
        description={t('settings.interaction.cameraStreams.description')}
        styles={styles}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label
              className={`block text-xs font-medium ${styles.subtleColor}`}
              htmlFor="go2rtc-default-server-url"
            >
              {t('camera.settings.go2rtc.defaultServerUrl')}
            </label>
            <Input
              id="go2rtc-default-server-url"
              value={cameraGo2RtcDefaults.serverUrl}
              onChange={(event) =>
                updateSettings({
                  cameraGo2RtcDefaults: {
                    ...cameraGo2RtcDefaults,
                    serverUrl: event.target.value,
                  },
                })
              }
              placeholder="http://homeassistant.local:11984"
              size="small"
              variant="soft"
              spellCheck={false}
            />
          </div>

          <div className="space-y-2">
            <p className={`text-xs font-medium ${styles.subtleColor}`}>
              {t('camera.settings.go2rtc.streamNamingMode')}
            </p>
            <div className="flex flex-wrap gap-2">
              {streamNamingOptions.map((option) => {
                const isActive = cameraGo2RtcDefaults.streamNamingMode === option;
                return (
                  <InteractivePill
                    key={option}
                    active={isActive}
                    size="small"
                    onClick={() =>
                      updateSettings({
                        cameraGo2RtcDefaults: {
                          ...cameraGo2RtcDefaults,
                          streamNamingMode: option,
                        },
                      })
                    }
                    aria-pressed={isActive}
                  >
                    {t(`camera.settings.go2rtc.streamNamingMode.${option}` as TranslationKey)}
                  </InteractivePill>
                );
              })}
            </div>
          </div>
        </div>
      </SettingsItem>
    </SettingsSectionShell>
  );
}
