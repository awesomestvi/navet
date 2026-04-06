import { Hand, Info, Languages, LayoutGrid, Palette, Server } from 'lucide-react';
import { startTransition, useState } from 'react';
import { TabList, TabPanel, Tabs, TabTrigger } from '@/app/components/primitives';
import { useI18n } from '@/app/hooks';
import { useSettingsSectionController } from '../hooks/use-settings-section-controller';
import { SettingsAppearanceSection } from './settings-appearance-section';
import { SettingsDashboardSection } from './settings-dashboard-section';
import { SettingsInteractionSection } from './settings-interaction-section';
import { SettingsLocalizationSection } from './settings-localization-section';
import { SettingsProjectSection } from './settings-project-section';
import { SettingsHero } from './settings-section-shell';
import { SettingsSystemSection } from './settings-system-section';

export function SettingsSection() {
  const { t } = useI18n();
  const controller = useSettingsSectionController();
  const [activeTab, setActiveTab] = useState<
    'appearance' | 'localization' | 'interaction' | 'dashboard' | 'system' | 'project'
  >('appearance');
  const navItems = [
    { id: 'appearance', label: t('settings.nav.appearance'), icon: Palette },
    { id: 'localization', label: t('settings.nav.localization'), icon: Languages },
    { id: 'interaction', label: t('settings.nav.interaction'), icon: Hand },
    { id: 'dashboard', label: t('settings.nav.dashboard'), icon: LayoutGrid },
    { id: 'system', label: t('settings.nav.system'), icon: Server },
    { id: 'project', label: t('settings.nav.project'), icon: Info },
  ] as const;

  return (
    <div className="h-full min-w-0 overflow-x-hidden overflow-y-auto px-3 py-3 md:px-6 md:py-6">
      <div className="mx-auto min-w-0 w-[min(72rem,calc(var(--navet-visible-viewport-width,100vw)-1.5rem))] max-w-full space-y-4 md:w-[min(72rem,calc(var(--navet-visible-viewport-width,100vw)-7rem))] md:space-y-5 lg:w-[min(72rem,calc(var(--navet-visible-viewport-width,100vw)-8rem))]">
        <SettingsHero navItems={[]} styles={controller.styles} />

        <Tabs
          value={activeTab}
          defaultValue="appearance"
          onValueChange={(value) => {
            startTransition(() => {
              setActiveTab(value as typeof activeTab);
            });
          }}
        >
          <TabList>
            {navItems.map(({ id, label, icon: Icon }) => (
              <TabTrigger key={id} value={id}>
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
          <TabPanel value="system">
            <SettingsSystemSection controller={controller} />
          </TabPanel>
          <TabPanel value="project">
            <SettingsProjectSection controller={controller} />
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
}
