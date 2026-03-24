import { ExternalLink, FileText, GitBranch, Info, LogOut, Scale } from 'lucide-react';
import { AppReleaseBadge } from '@/app/components/shared/app-release-badge';
import { APP_VERSION } from '@/app/constants/app-version';
import { useI18n } from '@/app/hooks';
import type { SettingsSectionController } from '../hooks/use-settings-section-controller';
import { SettingsItem, SettingsSectionShell } from './settings-section-shell';

interface SettingsProjectSectionProps {
  controller: SettingsSectionController;
}

export function SettingsProjectSection({ controller }: SettingsProjectSectionProps) {
  const { t } = useI18n();
  const { handleLogout, setShowLicense, setShowTerms, showLicense, showTerms, styles } = controller;

  return (
    <SettingsSectionShell
      id="project"
      icon={Info}
      title={t('settings.project.sectionTitle')}
      description={t('settings.project.sectionDescription')}
      styles={styles}
    >
      <SettingsItem
        title={t('settings.project.about.title')}
        description={t('settings.project.about.description')}
        styles={styles}
      >
        <div className="grid gap-2.5 sm:grid-cols-2 md:gap-3">
          <div
            className={`rounded-[20px] border px-4 py-3.5 md:rounded-[24px] md:px-5 md:py-4 ${styles.borderColor} ${styles.softBg}`}
          >
            <p className={`text-[11px] uppercase tracking-[0.18em] ${styles.subtleColor}`}>
              {t('settings.project.about.version')}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className={`text-lg font-semibold ${styles.textColor}`}>{APP_VERSION}</p>
              <AppReleaseBadge />
            </div>
          </div>
          <div
            className={`rounded-[20px] border px-4 py-3.5 md:rounded-[24px] md:px-5 md:py-4 ${styles.borderColor} ${styles.softBg}`}
          >
            <p className={`text-[11px] uppercase tracking-[0.18em] ${styles.subtleColor}`}>
              {t('settings.project.about.build')}
            </p>
            <p className={`mt-2 text-lg font-semibold ${styles.textColor}`}>March 2026</p>
          </div>
        </div>
      </SettingsItem>

      <SettingsItem
        title={t('settings.project.credits.title')}
        description={t('settings.project.credits.description')}
        styles={styles}
      >
        <a
          href="https://github.com/awesomestvi/"
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-3 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors md:py-3 ${styles.borderColor} ${styles.softBg} ${styles.hoverBg} ${styles.textColor}`}
        >
          <GitBranch className="h-4 w-4" />
          <span>awesomestvi</span>
          <ExternalLink className={`h-3.5 w-3.5 ${styles.subtleColor}`} />
        </a>

        <div className={`mt-4 space-y-1 text-sm leading-relaxed ${styles.subtleColor}`}>
          <p>React & TypeScript</p>
          <p>Tailwind CSS v4</p>
          <p>Radix UI</p>
          <p>{t('settings.project.credits.community')}</p>
        </div>
      </SettingsItem>

      <SettingsItem
        title={t('settings.project.license.title')}
        description={t('settings.project.license.description')}
        styles={styles}
      >
        <button
          type="button"
          onClick={() => setShowLicense(!showLicense)}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors md:px-5 md:py-3 ${styles.borderColor} ${styles.softBg} ${styles.hoverBg} ${styles.textColor}`}
        >
          <Scale className="h-4 w-4" />
          <span>
            {showLicense ? t('settings.project.license.hide') : t('settings.project.license.show')}
          </span>
        </button>

        {showLicense ? (
          <div
            className={`mt-4 rounded-[20px] border p-4 md:rounded-[24px] md:p-5 ${styles.borderColor} ${styles.softBg}`}
          >
            <div className={`space-y-3 text-sm leading-relaxed ${styles.textColor}`}>
              <p>{t('settings.project.license.summary')}</p>
              <p>{t('settings.project.license.networkUse')}</p>
              <p>{t('settings.project.license.trademark')}</p>
              <a
                href="https://www.gnu.org/licenses/agpl-3.0-standalone.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-500 hover:underline"
              >
                <span>{t('settings.project.license.readFull')}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        ) : null}
      </SettingsItem>

      <SettingsItem
        title={t('settings.project.terms.title')}
        description={t('settings.project.terms.description')}
        styles={styles}
      >
        <button
          type="button"
          onClick={() => setShowTerms(!showTerms)}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors md:px-5 md:py-3 ${styles.borderColor} ${styles.softBg} ${styles.hoverBg} ${styles.textColor}`}
        >
          <FileText className="h-4 w-4" />
          <span>
            {showTerms ? t('settings.project.terms.hide') : t('settings.project.terms.show')}
          </span>
        </button>

        {showTerms ? (
          <div
            className={`mt-4 rounded-[20px] border p-4 md:rounded-[24px] md:p-5 ${styles.borderColor} ${styles.softBg}`}
          >
            <div className={`space-y-3 text-sm leading-relaxed ${styles.textColor}`}>
              <div>
                <p className="font-semibold">{t('settings.project.terms.allowedTitle')}</p>
                <ul className="mt-2 ml-4 list-disc space-y-1">
                  <li>{t('settings.project.terms.allowed.1')}</li>
                  <li>{t('settings.project.terms.allowed.2')}</li>
                  <li>{t('settings.project.terms.allowed.3')}</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold">{t('settings.project.terms.prohibitedTitle')}</p>
                <ul className="mt-2 ml-4 list-disc space-y-1">
                  <li>{t('settings.project.terms.prohibited.1')}</li>
                  <li>{t('settings.project.terms.prohibited.2')}</li>
                  <li>{t('settings.project.terms.prohibited.3')}</li>
                </ul>
              </div>
              <p className={styles.subtleColor}>{t('settings.project.terms.disclaimer')}</p>
            </div>
          </div>
        ) : null}
      </SettingsItem>

      <div className="pt-4 md:pt-6">
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/15 md:px-5 md:py-3"
        >
          <LogOut className="h-4 w-4" />
          <span>{t('settings.project.logout')}</span>
        </button>
      </div>
    </SettingsSectionShell>
  );
}
