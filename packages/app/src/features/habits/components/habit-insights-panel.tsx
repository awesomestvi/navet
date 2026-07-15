import { SectionCard } from '@navet/app/components/patterns';
import { Badge, Button, MessageBar, Panel, Tag } from '@navet/app/components/primitives';
import { EntityCardHeader } from '@navet/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@navet/app/components/ui/alert-dialog';
import {
  useAccentColor,
  useI18n,
  useIntegrationStore,
  useServiceActionHandler,
  useThemeMode,
} from '@navet/app/hooks';
import { integrationTaskService } from '@navet/app/services/integration-task.service';
import { integrationSelectors } from '@navet/app/stores/selectors';
import { getProviderNativeId } from '@navet/app/utils/provider-ids';
import type { HabitInsight, HabitRule } from '@navet/core/habits';
import type { NavetEntity } from '@navet/core/types';
import { Brain, Clock3, ShieldCheck, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useHabitStore } from '../habit-store';

function isUnsupportedAutomationProviderError(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes('not supported');
}

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

function getActionLabel(rule: HabitRule, t: ReturnType<typeof useI18n>['t']) {
  switch (rule.action.type) {
    case 'turn_on':
      return t('habits.rules.turnOn');
    case 'turn_off':
      return t('habits.rules.turnOff');
    case 'notify':
      return t('habits.rules.notify');
  }
}

function getFallbackDeviceName(entityId: string) {
  const nativeId = getProviderNativeId(entityId);
  const objectId = nativeId.split('.').at(-1) ?? nativeId;
  return objectId
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function getRuleDeviceNames(rule: HabitRule, entitiesByCanonicalId: Record<string, NavetEntity>) {
  return rule.action.entityIds.map((entityId) => {
    const entity = entitiesByCanonicalId[entityId];
    return entity?.name.trim() || getFallbackDeviceName(entityId);
  });
}

function getDeviceListLabel(deviceNames: string[], t: ReturnType<typeof useI18n>['t']) {
  if (deviceNames.length === 0) {
    return t('habits.suggestion.unknownDevice');
  }

  if (deviceNames.length === 1) {
    return deviceNames[0];
  }

  if (deviceNames.length === 2) {
    return t('habits.suggestion.twoDevices', {
      first: deviceNames[0],
      second: deviceNames[1],
    });
  }

  return t('habits.suggestion.moreDevices', {
    first: deviceNames[0],
    count: deviceNames.length - 1,
  });
}

function getSuggestedRuleName(
  insight: HabitInsight,
  deviceNames: string[],
  t: ReturnType<typeof useI18n>['t']
) {
  const rule = insight.suggestedRule;
  if (!rule) {
    return insight.title;
  }

  if (rule.name?.trim()) {
    return rule.name.trim();
  }

  const values = {
    devices: getDeviceListLabel(deviceNames, t),
    time: formatMinuteRange(rule.trigger.startMinute, rule.trigger.endMinute).split('-')[0],
  };

  switch (rule.action.type) {
    case 'turn_on':
      return t('habits.suggestion.name.turnOn', values);
    case 'turn_off':
      return t('habits.suggestion.name.turnOff', values);
    case 'notify':
      return t('habits.suggestion.name.notify', values);
  }
}

export function HabitInsightsPanel() {
  const { t } = useI18n();
  const theme = useThemeMode();
  const accentColor = useAccentColor();
  const runAction = useServiceActionHandler();
  const surface = getThemeSurfaceTokens(theme);
  const entitiesByCanonicalId = useIntegrationStore(
    integrationSelectors.providerEntitiesByCanonicalId
  );
  const { enabled, initialized, insights, addFeedback, saveRule } = useHabitStore(
    useShallow((state) => ({
      enabled: state.enabled,
      initialized: state.initialized,
      insights: state.insights,
      addFeedback: state.addFeedback,
      saveRule: state.saveRule,
    }))
  );
  const [pendingRuleInsight, setPendingRuleInsight] = useState<HabitInsight | null>(null);
  const pendingRule = pendingRuleInsight?.suggestedRule;

  const visibleInsights = useMemo(() => insights.slice(0, 5), [insights]);
  const presentations = useMemo(
    () =>
      new Map(
        visibleInsights.map((insight) => {
          const deviceNames = insight.suggestedRule
            ? getRuleDeviceNames(insight.suggestedRule, entitiesByCanonicalId)
            : [];
          return [
            insight.id,
            {
              deviceNames,
              name: getSuggestedRuleName(insight, deviceNames, t),
            },
          ] as const;
        })
      ),
    [entitiesByCanonicalId, t, visibleInsights]
  );
  const pendingPresentation = pendingRuleInsight
    ? presentations.get(pendingRuleInsight.id)
    : undefined;
  const confidenceLabels = {
    low: t('habits.confidence.low'),
    medium: t('habits.confidence.medium'),
    high: t('habits.confidence.high'),
  } as const;

  if (!enabled) {
    return (
      <SectionCard
        title={t('habits.tasks.title')}
        description={t('habits.tasks.description')}
        action={<Badge tone="neutral">{t('habits.status.off')}</Badge>}
      >
        <MessageBar tone="info" title={t('habits.tasks.disabledTitle')}>
          {t('habits.tasks.disabledDescription')}
        </MessageBar>
      </SectionCard>
    );
  }

  if (!initialized) {
    return (
      <SectionCard
        title={t('habits.tasks.title')}
        description={t('habits.tasks.description')}
        action={<Badge tone="accent">{t('habits.status.learning')}</Badge>}
      >
        <Panel muted className="p-4 text-sm">
          {t('habits.tasks.loading')}
        </Panel>
      </SectionCard>
    );
  }

  return (
    <>
      <SectionCard
        title={t('habits.tasks.title')}
        description={t('habits.tasks.description')}
        action={
          <Badge tone={visibleInsights.length > 0 ? 'accent' : 'neutral'}>
            {visibleInsights.length > 0
              ? t('habits.tasks.count', { count: visibleInsights.length })
              : t('habits.status.learning')}
          </Badge>
        }
        contentClassName="space-y-4 px-4 py-5 md:px-8 md:py-8"
        padding="none"
      >
        {visibleInsights.length === 0 ? (
          <Panel muted className="p-4 text-sm">
            {t('habits.tasks.empty')}
          </Panel>
        ) : (
          <div className="grid gap-3">
            {visibleInsights.map((insight) => {
              const presentation = presentations.get(insight.id);
              return (
                <Panel key={insight.id} muted padded={false} className="grid gap-4 p-4 md:p-5">
                  <EntityCardHeader
                    title={presentation?.name ?? insight.title}
                    subtitle={confidenceLabels[insight.confidenceLabel]}
                    size="medium"
                    layout="eyebrow-first"
                    leading={
                      <EntityCardHeaderIcon
                        IconComponent={Brain}
                        isActive={insight.confidenceLabel === 'high'}
                        size="medium"
                        tone={insight.confidenceLabel === 'high' ? 'primary' : 'neutral'}
                        baseColor={accentColor}
                      />
                    }
                    trailing={
                      <div className="flex flex-wrap justify-end gap-2">
                        {insight.suggestedRule ? (
                          <Tag tone="neutral" size="small" className="gap-1">
                            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                            {formatMinuteRange(
                              insight.suggestedRule.trigger.startMinute,
                              insight.suggestedRule.trigger.endMinute
                            )}
                          </Tag>
                        ) : null}
                        <Tag tone="accent" size="small" className="gap-1">
                          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          {t('habits.tasks.safeTag')}
                        </Tag>
                      </div>
                    }
                    titleClassName="text-base leading-6"
                    subtitleClassName="text-xs"
                    marginBottomClassName="mb-0"
                  />

                  <p className={`text-sm leading-6 ${surface.textSecondary}`}>{insight.summary}</p>

                  <div className="space-y-2">
                    <p className={`text-xs font-semibold ${surface.textMuted}`}>
                      {t('habits.why.title')}
                    </p>
                    <ul className={`space-y-1 text-sm leading-6 ${surface.textSecondary}`}>
                      {insight.evidence.slice(0, 3).map((entry) => (
                        <li key={entry} className="flex items-start gap-2">
                          <Sparkles
                            className="mt-1 h-3.5 w-3.5 shrink-0"
                            style={{ color: `${accentColor}cc` }}
                            aria-hidden="true"
                          />
                          <span>{entry}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="small"
                      className="h-9 min-h-9"
                      onClick={() =>
                        void addFeedback({
                          insightId: insight.id,
                          candidateId: insight.candidateId,
                          outcome: 'dont_suggest',
                          reason: 'not_useful',
                        })
                      }
                    >
                      {t('habits.actions.dontSuggest')}
                    </Button>
                    <Button
                      size="small"
                      className="h-9 min-h-9"
                      disabled={!insight.suggestedRule}
                      onClick={() => setPendingRuleInsight(insight)}
                    >
                      {t('habits.actions.createRule')}
                    </Button>
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </SectionCard>

      <AlertDialog
        open={Boolean(pendingRule)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingRuleInsight(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('habits.confirmCreateRule.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('habits.confirmCreateRule.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingRule ? (
            <div className="space-y-3 text-sm">
              <Panel muted className="space-y-2 p-4">
                <p>
                  <span className="font-semibold">{t('habits.confirmCreateRule.routine')}:</span>{' '}
                  {pendingPresentation?.name ??
                    pendingRuleInsight?.title ??
                    t('habits.tasks.title')}
                </p>
                <p>
                  <span className="font-semibold">{t('habits.confirmCreateRule.when')}:</span>{' '}
                  {formatMinuteRange(
                    pendingRule.trigger.startMinute,
                    pendingRule.trigger.endMinute
                  )}
                </p>
                <p>
                  <span className="font-semibold">{t('habits.confirmCreateRule.action')}:</span>{' '}
                  {getActionLabel(pendingRule, t)}
                </p>
                <p>
                  <span className="font-semibold">{t('habits.confirmCreateRule.devices')}:</span>{' '}
                  {pendingPresentation
                    ? pendingPresentation.deviceNames.join(', ')
                    : t('habits.confirmCreateRule.deviceCount', {
                        count: pendingRule.action.entityIds.length,
                      })}
                </p>
                <p>
                  <span className="font-semibold">{t('habits.confirmCreateRule.confidence')}:</span>{' '}
                  {pendingRuleInsight ? confidenceLabels[pendingRuleInsight.confidenceLabel] : ''}
                </p>
              </Panel>
              <p className={surface.textSecondary}>{t('habits.confirmCreateRule.safety')}</p>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={!pendingRule || !pendingRuleInsight}
              onClick={() => {
                if (!pendingRule || !pendingRuleInsight) {
                  return;
                }

                void runAction(async () => {
                  const ruleName = pendingPresentation?.name ?? pendingRuleInsight.title;
                  if (integrationTaskService.createAutomationFromHabitRule) {
                    try {
                      await integrationTaskService.createAutomationFromHabitRule(pendingRule, {
                        name: ruleName,
                        description: pendingRuleInsight.summary,
                      });
                    } catch (error) {
                      if (!isUnsupportedAutomationProviderError(error)) {
                        throw error;
                      }

                      await saveRule({
                        ...pendingRule,
                        name: ruleName,
                        description: pendingRuleInsight.summary,
                      });
                    }
                  } else {
                    await saveRule({
                      ...pendingRule,
                      name: ruleName,
                      description: pendingRuleInsight.summary,
                    });
                  }

                  await addFeedback({
                    insightId: pendingRuleInsight.id,
                    candidateId: pendingRuleInsight.candidateId,
                    outcome: 'created_rule',
                  });
                  setPendingRuleInsight(null);
                }, t('habits.confirmCreateRule.createFailed'));
              }}
            >
              {t('habits.confirmCreateRule.actionButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
