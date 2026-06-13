import { TabList, TabPanel, Tabs, TabTrigger } from '@navet/app/components/primitives';
import { useI18n, usePersistedState } from '@navet/app/hooks';
import { isProductionEnvironment } from '@navet/app/utils/environment';
import {
  Brain,
  FlaskConical,
  Hand,
  Info,
  Languages,
  LayoutGrid,
  Palette,
  Server,
} from 'lucide-react';
import { startTransition, useEffect } from 'react';
import { useSettingsSectionController } from '../hooks/use-settings-section-controller';
import { SettingsAppearanceSection } from './settings-appearance-section';
import { SettingsDashboardSection } from './settings-dashboard-section';
import { SettingsExperimentalSection } from './settings-experimental-section';
import { SettingsHabitsSection } from './settings-habits-section';
import { SettingsInteractionSection } from './settings-interaction-section';
import { SettingsLocalizationSection } from './settings-localization-section';
import { SettingsProjectSection } from './settings-project-section';
import { SettingsHero } from './settings-section-shell';
import { SettingsSystemSection } from './settings-system-section';

type SettingsTabId =
  | 'appearance'
  | 'localization'
  | 'interaction'
  | 'dashboard'
  | 'habits'
  | 'experimental'
  | 'system'
  | 'project';

interface SettingsSectionProps {
  hiddenTabs?: SettingsTabId[];
}

const SETTINGS_TAB_STORAGE_KEY = 'navet-settings-active-tab';

export function SettingsSection({ hiddenTabs = [] }: SettingsSectionProps) {
  const { t } = useI18n();
  const controller = useSettingsSectionController();
  const hiddenTabSet = new Set<string>(
    isProductionEnvironment() ? [...hiddenTabs, 'habits'] : hiddenTabs
  );
  const navItems = [
    { id: 'appearance', label: t('settings.nav.appearance'), icon: Palette },
    { id: 'localization', label: t('settings.nav.localization'), icon: Languages },
    { id: 'interaction', label: t('settings.nav.interaction'), icon: Hand },
    { id: 'dashboard', label: t('settings.nav.dashboard'), icon: LayoutGrid },
    { id: 'habits', label: t('settings.nav.habits'), icon: Brain },
    { id: 'experimental', label: t('settings.nav.experimental'), icon: FlaskConical },
    { id: 'system', label: t('settings.nav.system'), icon: Server },
    { id: 'project', label: t('settings.nav.project'), icon: Info },
  ].filter(({ id }) => !hiddenTabSet.has(id));
  const fallbackTab = (navItems[0]?.id ?? 'appearance') as SettingsTabId;
  const [persistedTab, setPersistedTab] = usePersistedState<SettingsTabId>(
    SETTINGS_TAB_STORAGE_KEY,
    fallbackTab
  );
  const activeTab = navItems.some(({ id }) => id === persistedTab) ? persistedTab : fallbackTab;

  useEffect(() => {
    if (activeTab !== persistedTab) {
      setPersistedTab(activeTab);
    }
  }, [activeTab, persistedTab, setPersistedTab]);

  return (
    <div className="h-full min-w-0 overflow-x-hidden overflow-y-auto">
      <div className="mx-auto min-w-0 max-w-6xl space-y-4 md:space-y-5">
        <SettingsHero navItems={[]} styles={controller.styles} />

        <Tabs
          value={activeTab}
          defaultValue={activeTab}
          onValueChange={(value) => {
            startTransition(() => {
              setPersistedTab(value as SettingsTabId);
            });
          }}
        >
          <TabList
            size="compact"
            className="md:!flex-nowrap md:!overflow-x-auto md:!overflow-y-hidden md:gap-2 md:rounded-[28px] md:px-4 md:py-3"
          >
            {navItems.map(({ id, label, icon: Icon }) => (
              <TabTrigger
                key={id}
                value={id}
                size="compact"
                className="md:h-10 md:min-h-10 md:px-4"
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </TabTrigger>
            ))}
          </TabList>

          <TabPanel value="appearance">
            <SettingsAppearanceSection controller={controller} />
          </TabPanel>
          <TabPanel value="localization">
            <SettingsLocalizationSection controller={controller} />
          </TabPanel>
          <TabPanel value="interaction">
            <SettingsInteractionSection controller={controller} />
          </TabPanel>
          <TabPanel value="dashboard">
            <SettingsDashboardSection controller={controller} />
          </TabPanel>
          <TabPanel value="habits">
            <SettingsHabitsSection controller={controller} />
          </TabPanel>
          <TabPanel value="experimental">
            <SettingsExperimentalSection controller={controller} />
          </TabPanel>
          {hiddenTabSet.has('system') ? null : (
            <TabPanel value="system">
              <SettingsSystemSection controller={controller} />
            </TabPanel>
          )}
          <TabPanel value="project">
            <SettingsProjectSection controller={controller} />
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
}
