import { useI18n } from '@navet/app/hooks';
import { Palette } from 'lucide-react';
import type { SettingsSectionController } from '../hooks/use-settings-section-controller';
import {
  AppearanceAmbienceItem,
  AppearanceEffectsQualityItem,
  AppearanceSpaceModeItem,
  AppearanceThemeAccentItem,
  AppearanceWallpaperItem,
} from './settings-appearance-content';
import { SettingsSectionGroup, SettingsSectionShell } from './settings-section-shell';

interface SettingsAppearanceSectionProps {
  controller: SettingsSectionController;
}

export function SettingsAppearanceSection({ controller }: SettingsAppearanceSectionProps) {
  const { t } = useI18n();
  const { styles } = controller;

  return (
    <SettingsSectionShell
      id="appearance"
      icon={Palette}
      title={t('settings.appearance.sectionTitle')}
      description={t('settings.appearance.sectionDescription')}
      styles={styles}
      grouped
    >
      <SettingsSectionGroup
        id="appearance-theme-background"
        title={t('settings.appearance.group.themeBackground')}
        styles={styles}
      >
        <AppearanceThemeAccentItem controller={controller} />
        <AppearanceWallpaperItem controller={controller} />
      </SettingsSectionGroup>

      <SettingsSectionGroup
        id="appearance-layout"
        title={t('settings.appearance.group.layout')}
        styles={styles}
      >
        <AppearanceSpaceModeItem controller={controller} />
      </SettingsSectionGroup>

      <SettingsSectionGroup
        id="appearance-effects-performance"
        title={t('settings.appearance.group.effectsPerformance')}
        styles={styles}
      >
        <AppearanceEffectsQualityItem controller={controller} />
        <AppearanceAmbienceItem controller={controller} />
      </SettingsSectionGroup>
    </SettingsSectionShell>
  );
}
