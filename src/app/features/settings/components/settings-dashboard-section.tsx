import { Download, LayoutGrid, Scale, Upload } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { useI18n } from '@/app/hooks';
import type { SettingsSectionController } from '../hooks/use-settings-section-controller';
import { SettingsItem, SettingsSectionShell } from './settings-section-shell';

interface SettingsDashboardSectionProps {
  controller: SettingsSectionController;
}

export function SettingsDashboardSection({ controller }: SettingsDashboardSectionProps) {
  const { t } = useI18n();
  const {
    handleExportDashboardConfig,
    handleImportDashboardConfig,
    handleRestartOnboarding,
    hiddenEntityIds,
    importInputRef,
    setShowRestartOnboardingConfirm,
    setShowRevealAllConfirm,
    showAllEntities,
    showRestartOnboardingConfirm,
    showRevealAllConfirm,
    styles,
  } = controller;

  return (
    <SettingsSectionShell
      id="dashboard"
      icon={LayoutGrid}
      title={t('settings.dashboard.sectionTitle')}
      description={t('settings.dashboard.sectionDescription')}
      styles={styles}
    >
      <SettingsItem
        title={t('settings.dashboard.entityVisibility.title')}
        description={t('settings.dashboard.entityVisibility.description')}
        styles={styles}
      >
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowRevealAllConfirm(true)}
            disabled={hiddenEntityIds.length === 0}
            className={`inline-flex h-9 items-center justify-center gap-2 rounded-full px-3.5 text-sm font-medium transition-colors ${
              hiddenEntityIds.length === 0
                ? 'cursor-not-allowed opacity-50'
                : `border ${styles.borderColor} ${styles.softBg} ${styles.hoverBg} ${styles.textColor}`
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            <span>{t('settings.dashboard.entityVisibility.revealAll')}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowRestartOnboardingConfirm(true)}
            className={`inline-flex h-9 items-center justify-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors ${styles.borderColor} ${styles.softBg} ${styles.hoverBg} ${styles.textColor}`}
          >
            <Scale className="h-4 w-4" />
            <span>{t('settings.dashboard.entityVisibility.restartOnboarding')}</span>
          </button>
        </div>
        <p className={`mt-3 text-sm leading-relaxed ${styles.subtleColor}`}>
          {t('settings.dashboard.entityVisibility.hiddenSummary', {
            count: hiddenEntityIds.length,
          })}
        </p>

        <AlertDialog open={showRevealAllConfirm} onOpenChange={setShowRevealAllConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('settings.dashboard.confirmReveal.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('settings.dashboard.confirmReveal.description')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  showAllEntities();
                  setShowRevealAllConfirm(false);
                }}
              >
                {t('settings.dashboard.confirmReveal.action')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={showRestartOnboardingConfirm}
          onOpenChange={setShowRestartOnboardingConfirm}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('settings.dashboard.confirmRestart.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('settings.dashboard.confirmRestart.description')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleRestartOnboarding}>
                {t('common.restart')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SettingsItem>

      <SettingsItem
        title={t('settings.dashboard.backup.title')}
        description={t('settings.dashboard.backup.description')}
        styles={styles}
      >
        <p className={`max-w-2xl text-sm leading-relaxed ${styles.subtleColor}`}>
          {t('settings.dashboard.backup.body')}
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row md:mt-5">
          <button
            type="button"
            onClick={handleExportDashboardConfig}
            className={`inline-flex h-9 items-center justify-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors ${styles.borderColor} ${styles.softBg} ${styles.hoverBg} ${styles.textColor}`}
          >
            <Upload className="h-4 w-4" />
            <span>{t('settings.dashboard.backup.export')}</span>
          </button>
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className={`inline-flex h-9 items-center justify-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors ${styles.borderColor} ${styles.softBg} ${styles.hoverBg} ${styles.textColor}`}
          >
            <Download className="h-4 w-4" />
            <span>{t('settings.dashboard.backup.import')}</span>
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".yaml,.yml,application/yaml,text/yaml"
            className="hidden"
            onChange={handleImportDashboardConfig}
          />
        </div>
      </SettingsItem>
    </SettingsSectionShell>
  );
}
