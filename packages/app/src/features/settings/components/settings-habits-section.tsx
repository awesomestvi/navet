import { Button, Panel } from '@navet/app/components/primitives';
import { useHabitStore } from '@navet/app/features/habits';
import { useI18n } from '@navet/app/hooks';
import type { LucideIcon } from 'lucide-react';
import { Brain, Database, Lightbulb, ListChecks, RotateCcw, ShieldCheck } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import type { SettingsSectionController } from '../hooks/use-settings-section-controller';
import { OnOffPillToggle } from './settings-pill-toggle';
import { SettingsItem, SettingsSectionShell } from './settings-section-shell';

function HabitsAssuranceRow({
  icon: Icon,
  title,
  body,
  styles,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  styles: SettingsSectionController['styles'];
}) {
  return (
    <div
      className={`flex gap-3 rounded-[18px] border p-3.5 md:p-4 ${styles.borderColor} ${styles.softBg}`}
    >
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${styles.borderColor} ${styles.iconBg}`}
      >
        <Icon className={`h-4 w-4 ${styles.mutedColor}`} />
      </span>
      <div className="min-w-0">
        <p className={`text-sm font-medium ${styles.textColor}`}>{title}</p>
        <p className={`mt-1 text-sm leading-relaxed ${styles.subtleColor}`}>{body}</p>
      </div>
    </div>
  );
}

function HabitsMetricPanel({
  icon: Icon,
  label,
  value,
  detail,
  styles,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  detail?: string;
  styles: SettingsSectionController['styles'];
}) {
  return (
    <Panel muted className="p-4">
      <div className="flex items-start justify-between gap-3">
        <p className={`text-sm font-medium ${styles.subtleColor}`}>{label}</p>
        <Icon className={`h-4 w-4 ${styles.mutedColor}`} />
      </div>
      <p className={`mt-3 text-2xl font-semibold tabular-nums ${styles.textColor}`}>{value}</p>
      {detail ? <p className={`mt-1 text-sm ${styles.subtleColor}`}>{detail}</p> : null}
    </Panel>
  );
}

export function SettingsHabitsSection({
  controller,
  embedded = false,
}: {
  controller: SettingsSectionController;
  embedded?: boolean;
}) {
  const { t } = useI18n();
  const {
    enabled,
    debugEnabled,
    hardwareProfile,
    lastRunAt,
    events,
    insights,
    feedback,
    setEnabled,
    setDebugEnabled,
    resetLocalData,
  } = useHabitStore(
    useShallow((state) => ({
      enabled: state.enabled,
      debugEnabled: state.debugEnabled,
      hardwareProfile: state.hardwareProfile,
      lastRunAt: state.lastRunAt,
      events: state.events,
      insights: state.insights,
      feedback: state.feedback,
      setEnabled: state.setEnabled,
      setDebugEnabled: state.setDebugEnabled,
      resetLocalData: state.resetLocalData,
    }))
  );

  const content = (
    <>
      <SettingsItem
        title={t('habits.settings.enable.title')}
        description={t('habits.settings.enable.description')}
        styles={controller.styles}
      >
        <div className="space-y-3">
          <OnOffPillToggle
            value={enabled}
            onChange={setEnabled}
            ariaLabel={t('habits.settings.enable.title')}
          />
          <p className={`min-w-0 text-sm ${controller.styles.subtleColor}`}>
            {t('habits.settings.enable.helper', {
              tier: hardwareProfile.tier,
            })}
          </p>
        </div>
      </SettingsItem>

      <SettingsItem
        title={t('habits.settings.privacy.title')}
        description={t('habits.settings.privacy.description')}
        styles={controller.styles}
      >
        <div className="space-y-3">
          <HabitsAssuranceRow
            icon={Database}
            title={t('habits.settings.privacy.localTitle')}
            body={t('habits.settings.privacy.localBody')}
            styles={controller.styles}
          />
          <HabitsAssuranceRow
            icon={ShieldCheck}
            title={t('habits.settings.privacy.safetyTitle')}
            body={t('habits.settings.privacy.safetyBody')}
            styles={controller.styles}
          />
          <Button
            variant="soft"
            size="small"
            leading={<RotateCcw className="h-4 w-4" />}
            onClick={() => void resetLocalData()}
          >
            {t('habits.settings.reset')}
          </Button>
        </div>
      </SettingsItem>

      <SettingsItem
        title={t('habits.settings.rules.title')}
        description={t('habits.settings.rules.description')}
        styles={controller.styles}
      >
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <HabitsMetricPanel
              icon={Database}
              label={t('habits.settings.rules.events')}
              value={events.length}
              detail={`Capped at ${hardwareProfile.maxJournalEvents}`}
              styles={controller.styles}
            />
            <HabitsMetricPanel
              icon={Lightbulb}
              label={t('habits.settings.rules.suggestions')}
              value={insights.length}
              styles={controller.styles}
            />
            <HabitsMetricPanel
              icon={ListChecks}
              label={t('habits.settings.rules.activeRules')}
              value={feedback.filter((entry) => entry.outcome === 'created_rule').length}
              styles={controller.styles}
            />
          </div>
        </div>
      </SettingsItem>

      <SettingsItem
        title={t('habits.settings.debug.title')}
        description={t('habits.settings.debug.description')}
        styles={controller.styles}
      >
        <div className="space-y-3">
          <OnOffPillToggle
            value={debugEnabled}
            onChange={setDebugEnabled}
            ariaLabel={t('habits.settings.debug.switchLabel')}
          />
          <p className={`text-sm ${controller.styles.subtleColor}`}>
            {t('habits.settings.debug.helper')}
          </p>

          {debugEnabled ? (
            <Panel muted className="space-y-2 p-4 text-sm">
              <p>
                <strong>{t('habits.settings.debug.hardware')}:</strong> {hardwareProfile.tier}
              </p>
              <p>
                <strong>{t('habits.settings.debug.detectorBudget')}:</strong>{' '}
                {hardwareProfile.detectorBudget}
              </p>
              <p>
                <strong>{t('habits.settings.debug.lastRun')}:</strong>{' '}
                {lastRunAt
                  ? new Date(lastRunAt).toLocaleString()
                  : t('habits.settings.debug.never')}
              </p>
            </Panel>
          ) : null}
        </div>
      </SettingsItem>
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <SettingsSectionShell
      id="habits"
      icon={Brain}
      title={t('habits.settings.sectionTitle')}
      description={t('habits.settings.sectionDescription')}
      styles={controller.styles}
    >
      {content}
    </SettingsSectionShell>
  );
}
