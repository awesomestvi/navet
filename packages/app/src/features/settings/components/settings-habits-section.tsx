import { Button, MessageBar, Panel, Switch } from '@navet/app/components/primitives';
import { useHabitStore } from '@navet/app/features/habits';
import { useI18n } from '@navet/app/hooks';
import { Brain, RotateCcw, ShieldCheck } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import type { SettingsSectionController } from '../hooks/use-settings-section-controller';
import { SettingsItem, SettingsSectionShell } from './settings-section-shell';

function formatMinuteRange(startMinute: number, endMinute: number) {
  const format = (minute: number) => {
    const hours = Math.floor(minute / 60)
      .toString()
      .padStart(2, '0');
    const minutes = (minute % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return `${format(startMinute)}-${format(endMinute)}`;
}

export function SettingsHabitsSection({ controller }: { controller: SettingsSectionController }) {
  const { t } = useI18n();
  const {
    enabled,
    debugEnabled,
    hardwareProfile,
    lastRunAt,
    events,
    insights,
    rules,
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
      rules: state.rules,
      setEnabled: state.setEnabled,
      setDebugEnabled: state.setDebugEnabled,
      resetLocalData: state.resetLocalData,
    }))
  );

  return (
    <SettingsSectionShell
      id="habits"
      icon={Brain}
      title={t('habits.settings.sectionTitle')}
      description={t('habits.settings.sectionDescription')}
      styles={controller.styles}
    >
      <SettingsItem
        title={t('habits.settings.enable.title')}
        description={t('habits.settings.enable.description')}
        styles={controller.styles}
      >
        <div className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/6 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {enabled ? t('habits.status.on') : t('habits.status.off')}
            </p>
            <p className="mt-1 text-sm text-white/65">
              {t('habits.settings.enable.helper', {
                tier: hardwareProfile.tier,
              })}
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </SettingsItem>

      <SettingsItem
        title={t('habits.settings.privacy.title')}
        description={t('habits.settings.privacy.description')}
        styles={controller.styles}
      >
        <div className="space-y-3">
          <MessageBar tone="info" title={t('habits.settings.privacy.localTitle')}>
            {t('habits.settings.privacy.localBody')}
          </MessageBar>
          <MessageBar tone="warning" title={t('habits.settings.privacy.safetyTitle')}>
            {t('habits.settings.privacy.safetyBody')}
          </MessageBar>
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
            <Panel muted className="p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                {t('habits.settings.rules.events')}
              </p>
              <p className="mt-2 text-2xl font-semibold">{events.length}</p>
            </Panel>
            <Panel muted className="p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                {t('habits.settings.rules.suggestions')}
              </p>
              <p className="mt-2 text-2xl font-semibold">{insights.length}</p>
            </Panel>
            <Panel muted className="p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                {t('habits.settings.rules.activeRules')}
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {rules.filter((rule) => rule.enabled).length}
              </p>
            </Panel>
          </div>

          {rules.length > 0 ? (
            <div className="space-y-2">
              {rules.map((rule) => (
                <Panel key={rule.id} muted className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {rule.action.type === 'turn_on'
                        ? t('habits.rules.turnOn')
                        : t('habits.rules.turnOff')}
                    </p>
                    <p className="mt-1 text-sm text-white/65">
                      {t('habits.rules.window', {
                        count: rule.action.entityIds.length,
                        range: formatMinuteRange(rule.trigger.startMinute, rule.trigger.endMinute),
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 text-white/55" />
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(checked) =>
                        void useHabitStore.getState().saveRule({
                          ...rule,
                          enabled: checked,
                          updatedAt: new Date().toISOString(),
                        })
                      }
                    />
                  </div>
                </Panel>
              ))}
            </div>
          ) : (
            <Panel muted className="p-4 text-sm">
              {t('habits.settings.rules.empty')}
            </Panel>
          )}
        </div>
      </SettingsItem>

      <SettingsItem
        title={t('habits.settings.debug.title')}
        description={t('habits.settings.debug.description')}
        styles={controller.styles}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/6 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{t('habits.settings.debug.switchLabel')}</p>
              <p className="mt-1 text-sm text-white/65">{t('habits.settings.debug.helper')}</p>
            </div>
            <Switch checked={debugEnabled} onCheckedChange={setDebugEnabled} />
          </div>

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
    </SettingsSectionShell>
  );
}
