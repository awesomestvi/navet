import { Download, LayoutGrid, Moon, Scale, Upload } from 'lucide-react';
import { Button } from '@/app/components/primitives';
import { InteractivePill } from '@/app/components/primitives/interactive-pill';
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
import {
  activateKeepDeviceAwakeFallback,
  useKeepDeviceAwakeSnapshot,
} from '@/app/hooks/use-keep-device-awake';
import type { TranslationKey } from '@/app/i18n';
import type { SettingsSectionController } from '../hooks/use-settings-section-controller';
import { SettingsItem, SettingsSectionShell } from './settings-section-shell';

interface SettingsDashboardSectionProps {
  controller: SettingsSectionController;
}

interface OnOffPillToggleProps {
  ariaLabel: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

function OnOffPillToggle({ ariaLabel, value, onChange }: OnOffPillToggleProps) {
  const { t } = useI18n();
  const options = [
    { value: true, label: t('common.on') },
    { value: false, label: t('common.off') },
  ];

  return (
    <fieldset className="w-fit">
      <legend className="sr-only">{ariaLabel}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = value === option.value;
          return (
            <InteractivePill
              key={option.label}
              active={isActive}
              size="small"
              onClick={() => onChange(option.value)}
              aria-pressed={isActive}
            >
              {option.label}
            </InteractivePill>
          );
        })}
      </div>
    </fieldset>
  );
}

function getKeepDeviceAwakeStatusLabel({
  enabled,
  mode,
  t,
}: {
  enabled: boolean;
  mode: ReturnType<typeof useKeepDeviceAwakeSnapshot>['mode'];
  t: ReturnType<typeof useI18n>['t'];
}) {
  if (!enabled || mode === 'disabled') {
    return t('common.off');
  }

  return t(`settings.dashboard.keepAwake.status.${mode}` as TranslationKey);
}

export function SettingsDashboardSection({ controller }: SettingsDashboardSectionProps) {
  const { t } = useI18n();
  const keepAwakeSnapshot = useKeepDeviceAwakeSnapshot();
  const {
    handleExportDashboardConfig,
    handleImportDashboardConfig,
    handleRestartOnboarding,
    hiddenEntityIds,
    importInputRef,
    keepDeviceAwake,
    kioskMode,
    setShowRestartOnboardingConfirm,
    setShowRevealAllConfirm,
    showHomeSummaryBar,
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
        title={t('settings.dashboard.homeSummaryBar.title')}
        description={t('settings.dashboard.homeSummaryBar.description')}
        styles={styles}
      >
        <OnOffPillToggle
          value={showHomeSummaryBar}
          onChange={(checked) => controller.updateSettings({ showHomeSummaryBar: checked })}
          ariaLabel={t('settings.dashboard.homeSummaryBar.title')}
        />
      </SettingsItem>

      <SettingsItem
        title={t('settings.dashboard.kioskMode.title')}
        description={t('settings.dashboard.kioskMode.description')}
        styles={styles}
      >
        <div className="flex flex-col gap-2">
          <OnOffPillToggle
            value={kioskMode}
            onChange={(checked) => controller.updateSettings({ kioskMode: checked })}
            ariaLabel={t('settings.dashboard.kioskMode.title')}
          />
          <p className={`max-w-2xl text-sm leading-relaxed ${styles.subtleColor}`}>
            {t('settings.dashboard.kioskMode.recoveryHint')}
          </p>
        </div>
      </SettingsItem>

      <SettingsItem
        title={t('settings.dashboard.keepAwake.title')}
        description={t('settings.dashboard.keepAwake.description')}
        styles={styles}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <OnOffPillToggle
              value={keepDeviceAwake}
              onChange={(checked) => controller.updateSettings({ keepDeviceAwake: checked })}
              ariaLabel={t('settings.dashboard.keepAwake.title')}
            />
            <p className={`max-w-2xl text-sm leading-relaxed ${styles.subtleColor}`}>
              {t('settings.dashboard.keepAwake.caveat')}
            </p>
          </div>

          <div
            className={`rounded-[20px] border px-4 py-3.5 md:rounded-[24px] md:px-5 md:py-4 ${styles.borderColor} ${styles.softBg}`}
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className={`text-xs uppercase tracking-[0.18em] ${styles.subtleColor}`}>
                  {t('settings.dashboard.keepAwake.statusLabel')}
                </p>
                <p className={`mt-2 text-sm font-medium ${styles.textColor}`}>
                  {getKeepDeviceAwakeStatusLabel({
                    enabled: keepAwakeSnapshot.enabled,
                    mode: keepAwakeSnapshot.mode,
                    t,
                  })}
                </p>
              </div>
              <div
                className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${styles.borderColor} ${styles.textColor}`}
              >
                <Moon className="h-3.5 w-3.5" />
                <span>{t('settings.dashboard.keepAwake.experimental')}</span>
              </div>
            </div>

            <p className={`mt-3 max-w-2xl text-sm leading-relaxed ${styles.subtleColor}`}>
              {t('settings.dashboard.keepAwake.bestEffort')}
            </p>

            {keepAwakeSnapshot.canActivateFallback ? (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  variant="secondary"
                  size="small"
                  className="rounded-full"
                  onClick={() => {
                    void activateKeepDeviceAwakeFallback();
                  }}
                >
                  {t('settings.dashboard.keepAwake.activateFallback')}
                </Button>
                <p className={`text-sm leading-relaxed ${styles.subtleColor}`}>
                  {t('settings.dashboard.keepAwake.activationHint')}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </SettingsItem>

      <SettingsItem
        title={t('settings.dashboard.entityVisibility.title')}
        description={t('settings.dashboard.entityVisibility.description')}
        styles={styles}
      >
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="small"
            leading={<LayoutGrid className="h-4 w-4" />}
            onClick={() => setShowRevealAllConfirm(true)}
            disabled={hiddenEntityIds.length === 0}
            className="rounded-full"
          >
            {t('settings.dashboard.entityVisibility.revealAll')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="small"
            leading={<Scale className="h-4 w-4" />}
            onClick={() => setShowRestartOnboardingConfirm(true)}
            className="rounded-full"
          >
            {t('settings.dashboard.entityVisibility.restartOnboarding')}
          </Button>
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
