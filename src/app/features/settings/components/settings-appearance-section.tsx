import { Palette } from 'lucide-react';
import { useI18n } from '@/app/hooks';
import type { SettingsSectionController } from '../hooks/use-settings-section-controller';
import {
  AppearanceAmbienceItem,
  AppearanceEffectsQualityItem,
  AppearancePageZoomItem,
  AppearanceThemeAccentItem,
  AppearanceWallpaperItem,
} from './settings-appearance-content';
import { SettingsSectionShell } from './settings-section-shell';

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
    >
      <AppearanceThemeAccentItem controller={controller} />
      <AppearanceEffectsQualityItem controller={controller} />
      <AppearancePageZoomItem controller={controller} />
      <AppearanceAmbienceItem controller={controller} />
      <AppearanceWallpaperItem controller={controller} />
    </SettingsSectionShell>
  );
}
