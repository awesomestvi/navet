import { ExternalLink, LogOut, Server, Settings2 } from 'lucide-react';
import { useI18n } from '@/app/hooks';
import type { SettingsSectionController } from '../hooks/use-settings-section-controller';
import { SettingsItem, SettingsSectionShell } from './settings-section-shell';

interface SettingsSystemSectionProps {
  controller: SettingsSectionController;
}

export function SettingsSystemSection({ controller }: SettingsSystemSectionProps) {
  const { t } = useI18n();
  const { config, handleLogout, handleResetConnection, styles } = controller;

  return (
    <SettingsSectionShell
      id="system"
      icon={Server}
      title={t('settings.system.sectionTitle')}
      description={t('settings.system.sectionDescription')}
      styles={styles}
    >
      <SettingsItem
        title={t('settings.system.connection.title')}
        description={t('settings.system.connection.description')}
        styles={styles}
      >
        <div
          className={`rounded-[20px] border px-4 py-3.5 md:rounded-[24px] md:px-5 md:py-4 ${styles.borderColor} ${styles.softBg}`}
        >
          <p className={`text-[11px] uppercase tracking-[0.18em] ${styles.subtleColor}`}>
            {t('settings.system.connection.connectedTo')}
          </p>
          <p className={`mt-2 break-all font-mono text-sm ${styles.textColor}`}>
            {config?.url || t('settings.system.connection.notConnected')}
          </p>
        </div>

        {config?.url ? (
          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:gap-3">
            <a
              href={config.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors md:px-5 md:py-3 ${styles.borderColor} ${styles.softBg} ${styles.hoverBg} ${styles.textColor}`}
            >
              <ExternalLink className="h-4 w-4" />
              <span>{t('settings.system.connection.openHomeAssistant')}</span>
            </a>

            <button
              type="button"
              onClick={handleResetConnection}
              className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors md:px-5 md:py-3 ${styles.borderColor} ${styles.softBg} ${styles.hoverBg} ${styles.textColor}`}
            >
              <Settings2 className="h-4 w-4" />
              <span>{t('settings.system.connection.reset')}</span>
            </button>
          </div>
        ) : null}
      </SettingsItem>

      <SettingsItem
        title={t('settings.project.logout')}
        description={t('settings.system.logout.description')}
        styles={styles}
      >
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/8 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/12"
        >
          <LogOut className="h-4 w-4" />
          <span>{t('settings.project.logout')}</span>
        </button>
      </SettingsItem>
    </SettingsSectionShell>
  );
}
