import { SectionCard } from '@navet/app/components/patterns';
import { Badge, Button, MessageBar, Panel, Tag } from '@navet/app/components/primitives';
import { useI18n } from '@navet/app/hooks';
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
  const { enabled, initialized, insights, activity, addFeedback, saveRule } = useHabitStore(
    useShallow((state) => ({
      enabled: state.enabled,
      initialized: state.initialized,
      insights: state.insights,
      activity: state.activity,
      addFeedback: state.addFeedback,
      saveRule: state.saveRule,
    }))
  );

  const visibleInsights = useMemo(() => insights.slice(0, 5), [insights]);
  const recentActivity = useMemo(() => activity.slice(0, 5), [activity]);
  const confidenceLabels = {
    low: t('habits.confidence.low'),
    medium: t('habits.confidence.medium'),
    high: t('habits.confidence.high'),
  } as const;
  const timelineLabels = {
    dismissed: t('habits.timeline.dismissed'),
    remind_later: t('habits.timeline.remind_later'),
    created_rule: t('habits.timeline.created_rule'),
    accepted: t('habits.timeline.accepted'),
    undone: t('habits.timeline.undone'),
    rule: t('habits.timeline.rule'),
    insight: t('habits.timeline.insight'),
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
      <MessageBar tone="info" title={t('habits.safety.title')}>
        {t('habits.safety.body')}
      </MessageBar>

      {visibleInsights.length === 0 ? (
        <Panel muted className="p-4 text-sm">
          {t('habits.tasks.empty')}
        </Panel>
      ) : (
        <div className="space-y-3">
          {visibleInsights.map((insight) => (
            <Panel key={insight.id} muted padded={false} className="space-y-4 p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-white/12 bg-white/6">
                      <Brain className="h-4 w-4" />
                    </span>
                    <h3 className="text-base font-semibold">{insight.title}</h3>
                    <Badge tone={insight.confidenceLabel === 'high' ? 'accent' : 'neutral'}>
                      {confidenceLabels[insight.confidenceLabel]}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-white/80">{insight.summary}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Tag>
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatMinuteRange(
                      insight.suggestedRule?.trigger.startMinute ?? 0,
                      insight.suggestedRule?.trigger.endMinute ?? 0
                    )}
                  </Tag>
                  <Tag>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {t('habits.tasks.safeTag')}
                  </Tag>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                  {t('habits.why.title')}
                </p>
                <ul className="space-y-1 text-sm text-white/75">
                  {insight.evidence.slice(0, 3).map((entry) => (
                    <li key={entry} className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/45" />
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

      {recentActivity.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
            {t('habits.timeline.title')}
          </p>
          <div className="space-y-2">
            {recentActivity.map((item) => (
              <Panel
                key={item.id}
                muted
                className="flex items-center justify-between gap-3 p-3 text-sm"
              >
                <span>{timelineLabels[item.type as keyof typeof timelineLabels] ?? item.type}</span>
                <span className="text-white/55">{new Date(item.timestamp).toLocaleString()}</span>
              </Panel>
            ))}
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}
