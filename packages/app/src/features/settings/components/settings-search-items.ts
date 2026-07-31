import type { TranslateFn, TranslationKey } from '@navet/app/i18n';
import type { SettingsSearchItem } from './settings-navigation-shell';

type SearchSectionId =
  | 'appearance'
  | 'localization'
  | 'interaction'
  | 'dashboard'
  | 'habits'
  | 'experimental'
  | 'system'
  | 'project';

interface SearchSectionDefinition {
  descriptionKey: TranslationKey;
  id: SearchSectionId;
  labelKey: TranslationKey;
}

interface SearchSettingDefinition {
  descriptionKey: TranslationKey;
  id: string;
  labelKey: TranslationKey;
  sectionId: SearchSectionId;
}

const SECTIONS: SearchSectionDefinition[] = [
  {
    id: 'appearance',
    labelKey: 'settings.appearance.sectionTitle',
    descriptionKey: 'settings.appearance.sectionDescription',
  },
  {
    id: 'localization',
    labelKey: 'settings.localization.sectionTitle',
    descriptionKey: 'settings.localization.sectionDescription',
  },
  {
    id: 'interaction',
    labelKey: 'settings.interaction.sectionTitle',
    descriptionKey: 'settings.interaction.sectionDescription',
  },
  {
    id: 'dashboard',
    labelKey: 'settings.dashboard.sectionTitle',
    descriptionKey: 'settings.dashboard.sectionDescription',
  },
  {
    id: 'habits',
    labelKey: 'habits.settings.sectionTitle',
    descriptionKey: 'habits.settings.sectionDescription',
  },
  {
    id: 'experimental',
    labelKey: 'settings.experimental.sectionTitle',
    descriptionKey: 'settings.experimental.sectionDescription',
  },
  {
    id: 'system',
    labelKey: 'settings.system.sectionTitle',
    descriptionKey: 'settings.system.sectionDescription',
  },
  {
    id: 'project',
    labelKey: 'settings.project.sectionTitle',
    descriptionKey: 'settings.project.sectionDescription',
  },
];

const SETTINGS: SearchSettingDefinition[] = [
  {
    id: 'appearance-theme-accent',
    sectionId: 'appearance',
    labelKey: 'settings.appearance.themeAccent.title',
    descriptionKey: 'settings.appearance.themeAccent.description',
  },
  {
    id: 'appearance-space-usage',
    sectionId: 'appearance',
    labelKey: 'settings.dashboard.spaceMode.title',
    descriptionKey: 'settings.dashboard.spaceMode.description',
  },
  {
    id: 'appearance-visual-quality',
    sectionId: 'appearance',
    labelKey: 'settings.system.effectsQuality.title',
    descriptionKey: 'settings.system.effectsQuality.description',
  },
  {
    id: 'appearance-ambience',
    sectionId: 'appearance',
    labelKey: 'settings.appearance.ambience.title',
    descriptionKey: 'settings.appearance.ambience.description',
  },
  {
    id: 'appearance-wallpaper',
    sectionId: 'appearance',
    labelKey: 'settings.appearance.wallpaper.title',
    descriptionKey: 'settings.appearance.wallpaper.description',
  },
  {
    id: 'localization-language',
    sectionId: 'localization',
    labelKey: 'settings.localization.language.title',
    descriptionKey: 'settings.localization.language.description',
  },
  {
    id: 'localization-time-format',
    sectionId: 'localization',
    labelKey: 'settings.localization.timeFormat.title',
    descriptionKey: 'settings.localization.timeFormat.description',
  },
  {
    id: 'localization-temperature-unit',
    sectionId: 'localization',
    labelKey: 'settings.localization.temperatureUnit.title',
    descriptionKey: 'settings.localization.temperatureUnit.description',
  },
  {
    id: 'interaction-card-behavior',
    sectionId: 'interaction',
    labelKey: 'settings.interaction.cardBehavior.title',
    descriptionKey: 'settings.interaction.cardBehavior.description',
  },
  {
    id: 'dashboard-multiple-dashboards',
    sectionId: 'dashboard',
    labelKey: 'dashboard.multiple.manager.title',
    descriptionKey: 'dashboard.multiple.manager.description',
  },
  {
    id: 'dashboard-profile-mode',
    sectionId: 'dashboard',
    labelKey: 'settings.dashboard.profileMode.title',
    descriptionKey: 'settings.dashboard.profileMode.description',
  },
  {
    id: 'dashboard-header-title',
    sectionId: 'dashboard',
    labelKey: 'settings.dashboard.headerTitle.title',
    descriptionKey: 'settings.dashboard.headerTitle.description',
  },
  {
    id: 'dashboard-home-summary',
    sectionId: 'dashboard',
    labelKey: 'settings.dashboard.homeSummaryBar.title',
    descriptionKey: 'settings.dashboard.homeSummaryBar.description',
  },
  {
    id: 'dashboard-kiosk-mode',
    sectionId: 'dashboard',
    labelKey: 'settings.dashboard.kioskMode.title',
    descriptionKey: 'settings.dashboard.kioskMode.description',
  },
  {
    id: 'dashboard-keep-awake',
    sectionId: 'dashboard',
    labelKey: 'settings.dashboard.keepAwake.title',
    descriptionKey: 'settings.dashboard.keepAwake.description',
  },
  {
    id: 'dashboard-entity-visibility',
    sectionId: 'dashboard',
    labelKey: 'settings.dashboard.entityVisibility.title',
    descriptionKey: 'settings.dashboard.entityVisibility.description',
  },
  {
    id: 'dashboard-backup',
    sectionId: 'dashboard',
    labelKey: 'settings.dashboard.backup.title',
    descriptionKey: 'settings.dashboard.backup.description',
  },
  {
    id: 'habits-enable',
    sectionId: 'habits',
    labelKey: 'habits.settings.enable.title',
    descriptionKey: 'habits.settings.enable.description',
  },
  {
    id: 'habits-privacy',
    sectionId: 'habits',
    labelKey: 'habits.settings.privacy.title',
    descriptionKey: 'habits.settings.privacy.description',
  },
  {
    id: 'habits-rules',
    sectionId: 'habits',
    labelKey: 'habits.settings.rules.title',
    descriptionKey: 'habits.settings.rules.description',
  },
  {
    id: 'habits-debug',
    sectionId: 'habits',
    labelKey: 'habits.settings.debug.title',
    descriptionKey: 'habits.settings.debug.description',
  },
  {
    id: 'experimental-local-habits',
    sectionId: 'experimental',
    labelKey: 'settings.experimental.localHabits.title',
    descriptionKey: 'settings.experimental.localHabits.description',
  },
  {
    id: 'system-providers',
    sectionId: 'system',
    labelKey: 'settings.system.providers.title',
    descriptionKey: 'settings.system.providers.description',
  },
  {
    id: 'system-connected-devices',
    sectionId: 'system',
    labelKey: 'settings.system.clients.title',
    descriptionKey: 'settings.system.clients.description',
  },
  {
    id: 'system-local-data',
    sectionId: 'system',
    labelKey: 'settings.project.localData.title',
    descriptionKey: 'settings.project.localData.description',
  },
  {
    id: 'system-logout',
    sectionId: 'system',
    labelKey: 'settings.project.logout',
    descriptionKey: 'settings.system.logout.description',
  },
  {
    id: 'project-about',
    sectionId: 'project',
    labelKey: 'settings.project.about.title',
    descriptionKey: 'settings.project.about.description',
  },
  {
    id: 'project-credits',
    sectionId: 'project',
    labelKey: 'settings.project.credits.title',
    descriptionKey: 'settings.project.credits.description',
  },
  {
    id: 'project-license',
    sectionId: 'project',
    labelKey: 'settings.project.license.title',
    descriptionKey: 'settings.project.license.description',
  },
  {
    id: 'project-terms',
    sectionId: 'project',
    labelKey: 'settings.project.terms.title',
    descriptionKey: 'settings.project.terms.description',
  },
];

export function createSettingsSearchItems(
  t: TranslateFn,
  localHabitsEnabled: boolean
): SettingsSearchItem[] {
  const availableSections = SECTIONS.filter(
    (section) => section.id !== 'habits' || localHabitsEnabled
  );
  const sectionById = new Map(availableSections.map((section) => [section.id, section]));
  const sectionItems = availableSections.map((section) => ({
    id: `section-${section.id}`,
    sectionId: section.id,
    sectionLabel: t(section.labelKey),
    label: t(section.labelKey),
    description: t(section.descriptionKey),
  }));
  const settingItems = SETTINGS.filter((setting) => sectionById.has(setting.sectionId)).map(
    (setting) => {
      const section = sectionById.get(setting.sectionId);
      const label = t(setting.labelKey);
      return {
        id: setting.id,
        sectionId: setting.sectionId,
        sectionLabel: section ? t(section.labelKey) : '',
        label,
        description: t(setting.descriptionKey),
        targetLabel: label,
      };
    }
  );

  return [...sectionItems, ...settingItems];
}
