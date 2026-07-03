import { SectionCard } from '@navet/app/components/patterns';
import { Badge, Button, MessageBar, Panel, Tag } from '@navet/app/components/primitives';
import { EntityCardHeader } from '@navet/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useAccentColor, useI18n, useThemeMode } from '@navet/app/hooks';
import { Brain, Clock3, ShieldCheck, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useHabitStore } from '../habit-store';

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

export function HabitInsightsPanel() {
  const { t } = useI18n();
  const theme = useThemeMode();
  const accentColor = useAccentColor();
  const surface = getThemeSurfaceTokens(theme);
  const { enabled, initialized, insights, addFeedback, saveRule } = useHabitStore(
    useShallow((state) => ({
      enabled: state.enabled,
      initialized: state.initialized,
      insights: state.insights,
      addFeedback: state.addFeedback,
      saveRule: state.saveRule,
    }))
  );

  const visibleInsights = useMemo(() => insights.slice(0, 5), [insights]);
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
          {visibleInsights.map((insight) => (
            <Panel key={insight.id} muted padded={false} className="grid gap-4 p-4 md:p-5">
              <EntityCardHeader
                title={insight.title}
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
                    <Tag tone="neutral" size="small" className="gap-1">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatMinuteRange(
                        insight.suggestedRule?.trigger.startMinute ?? 0,
                        insight.suggestedRule?.trigger.endMinute ?? 0
                      )}
                    </Tag>
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
                  variant="ghost"
                  size="small"
                  onClick={() =>
                    void addFeedback({
                      insightId: insight.id,
                      candidateId: insight.candidateId,
                      outcome: 'dismissed',
                      reason: 'not_useful',
                    })
                  }
                >
                  {t('habits.actions.dismiss')}
                </Button>
                <Button
                  variant="soft"
                  size="small"
                  onClick={() =>
                    void addFeedback({
                      insightId: insight.id,
                      candidateId: insight.candidateId,
                      outcome: 'remind_later',
                      reason: 'wrong_time',
                    })
                  }
                >
                  {t('habits.actions.remindLater')}
                </Button>
                <Button
                  size="small"
                  disabled={!insight.suggestedRule}
                  onClick={() => {
                    if (!insight.suggestedRule) {
                      return;
                    }

                    void saveRule(insight.suggestedRule);
                    void addFeedback({
                      insightId: insight.id,
                      candidateId: insight.candidateId,
                      outcome: 'created_rule',
                    });
                  }}
                >
                  {t('habits.actions.createRule')}
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
