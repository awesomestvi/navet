import { InteractionPreviewCard } from '@navet/app/components/patterns/interaction-preview-card';
import { InteractivePill } from '@navet/app/components/primitives/interactive-pill';
import { useI18n } from '@navet/app/hooks';
import { isHomeAssistantPanelMode } from '@navet/app/runtime/app-mode';
import { Hand } from 'lucide-react';
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
  const { entityInteractionMode, preventBrowserZoom, styles, theme, updateSettings } = controller;
  const interactionOptions: SettingsInteractionOption[] = [
    { value: 'toggle-first', label: t('settings.dashboard.interaction.toggleFirst') },
    { value: 'control-first', label: t('settings.dashboard.interaction.controlFirst') },
  ];

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

      {!isHomeAssistantPanelMode() ? (
        <SettingsItem
          title={t('settings.interaction.browserZoom.title')}
          description={t('settings.interaction.browserZoom.description')}
          styles={styles}
        >
          <div className="space-y-2">
            <fieldset>
              <legend className="sr-only">{t('settings.interaction.browserZoom.title')}</legend>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: false, label: t('settings.interaction.browserZoom.allow') },
                  { value: true, label: t('settings.interaction.browserZoom.limit') },
                ].map((option) => (
                  <InteractivePill
                    key={String(option.value)}
                    active={preventBrowserZoom === option.value}
                    size="small"
                    aria-pressed={preventBrowserZoom === option.value}
                    onClick={() => updateSettings({ preventBrowserZoom: option.value })}
                  >
                    {option.label}
                  </InteractivePill>
                ))}
              </div>
            </fieldset>
            <p className={`text-sm leading-5 ${styles.subtleColor}`}>
              {t('settings.interaction.browserZoom.warning')}
            </p>
          </div>
        </SettingsItem>
      ) : null}
    </SettingsSectionShell>
  );
}
