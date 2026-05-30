import { Hand } from 'lucide-react';
import { InteractionPreviewCard } from '@/app/components/patterns/interaction-preview-card';
import { InteractivePill } from '@/app/components/primitives/interactive-pill';
import { useI18n } from '@/app/hooks';
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
  const { entityInteractionMode, styles, theme, updateSettings } = controller;
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
    </SettingsSectionShell>
  );
}
