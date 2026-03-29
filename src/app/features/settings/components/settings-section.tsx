import { Hand, Info, Languages, LayoutGrid, Palette, Server } from 'lucide-react';
import { startTransition, useState } from 'react';
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

  const renderActiveSection = () => {
    switch (activeTab) {
      case 'appearance':
        return <SettingsAppearanceSection controller={controller} />;
      case 'localization':
        return <SettingsLocalizationSection controller={controller} />;
      case 'interaction':
        return <SettingsInteractionSection controller={controller} />;
      case 'dashboard':
        return <SettingsDashboardSection controller={controller} />;
      case 'system':
        return <SettingsSystemSection controller={controller} />;
      case 'project':
        return <SettingsProjectSection controller={controller} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full min-w-0 overflow-x-hidden overflow-y-auto px-3 py-3 md:px-6 md:py-6">
      <div className="mx-auto min-w-0 w-[min(72rem,calc(var(--navet-visible-viewport-width,100vw)-1.5rem))] max-w-full space-y-4 md:w-[min(72rem,calc(var(--navet-visible-viewport-width,100vw)-7rem))] md:space-y-5 lg:w-[min(72rem,calc(var(--navet-visible-viewport-width,100vw)-8rem))]">
        <SettingsHero navItems={[]} styles={controller.styles} />

        <div
          className={`rounded-[24px] border px-3 py-2.5 md:rounded-[28px] md:px-4 md:py-3 ${controller.styles.borderColor} ${controller.styles.cardBg}`}
        >
          <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible">
            {navItems.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    startTransition(() => {
                      setActiveTab(id);
                    });
                  }}
                  className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors md:px-4 ${
                    isActive
                      ? controller.styles.textColor
                      : `${controller.styles.mutedColor} ${controller.styles.chipHoverBg}`
                  }`}
                  style={
                    isActive
                      ? {
                          borderColor: `${controller.styles.accentColor}55`,
                          backgroundColor: `${controller.styles.accentColor}12`,
                          boxShadow: `inset 0 0 0 1px ${controller.styles.accentColor}22`,
                        }
                      : undefined
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {renderActiveSection()}
      </div>
    </div>
  );
}
