import { SectionCard } from '@navet/app/components/patterns';
import {
  Badge,
  Button,
  InteractivePill,
  MessageBar,
  Panel,
  Tag,
} from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useThemeMode } from '@navet/app/hooks';
import { Clock3, Database, ShieldCheck, Sparkles, Telescope } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useNavetAiStore } from '../navet-ai-store';
import { ModelDownloadProgress } from './model-download-progress';

export function NavetAiSection() {
  const { t } = useI18n();
  const theme = useThemeMode();
  const surface = getThemeSurfaceTokens(theme);
  const {
    state,
    loading,
    error,
    initialize,
    generate,
    addFeedback,
    consentToModelDownload,
    cancelModelDownload,
    updateSettings,
    deletePriorityFeedback,
  } = useNavetAiStore(
    useShallow((store) => ({
      state: store.state,
      loading: store.loading,
      error: store.error,
      initialize: store.initialize,
      generate: store.generate,
      addFeedback: store.addFeedback,
      consentToModelDownload: store.consentToModelDownload,
      cancelModelDownload: store.cancelModelDownload,
      updateSettings: store.updateSettings,
      deletePriorityFeedback: store.deletePriorityFeedback,
    }))
  );

  useEffect(() => {
    if (!state && !loading) void initialize();
  }, [initialize, loading, state]);

  const insights = useMemo(
    () =>
      state?.settings.learningEnabled === true
        ? state.insights.filter((item) => item.status === 'new')
        : [],
    [state]
  );
  const modelSizeMb = state?.capabilities.model.downloadBytes
    ? Math.ceil(state.capabilities.model.downloadBytes / 1024 ** 2)
    : null;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <SectionCard
        eyebrow={t('navetAi.page.eyebrow')}
        title={t('sidebar.ai')}
        description={t('navetAi.page.description')}
        action={
          <Button
            size="small"
            disabled={
              loading ||
              !state ||
              state.settings.enabled === false ||
              state.settings.learningEnabled !== true
            }
            onClick={() => void generate(navigator.language)}
          >
            {t('navetAi.generate')}
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2">
          <Tag tone="accent" size="small" className="gap-1">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> {t('navetAi.readOnly')}
          </Tag>
          <Tag tone="neutral" size="small" className="gap-1">
            <Database className="h-3.5 w-3.5" aria-hidden="true" /> {t('navetAi.localStorage')}
          </Tag>
          {state ? (
            <Badge
              tone={
                state.capabilities.model.status === 'ready'
                  ? 'success'
                  : state.capabilities.model.status === 'downloading'
                    ? 'accent'
                    : state.capabilities.model.status === 'error'
                      ? 'danger'
                      : 'neutral'
              }
            >
              {t(`navetAi.model.${state.capabilities.model.status}`)}
            </Badge>
          ) : null}
        </div>
      </SectionCard>

      {error ? (
        <MessageBar tone="warning" title={t('navetAi.unavailable.title')}>
          {t('navetAi.unavailable.description')}
        </MessageBar>
      ) : null}

      {state?.settings.enabled === false ? (
        <MessageBar tone="info" title={t('navetAi.settings.resetTitle')}>
          {t('navetAi.settings.disabledDescription')}
        </MessageBar>
      ) : null}

      {state && state.settings.enabled !== false ? (
        <SectionCard
          title={t('navetAi.priorities.title')}
          description={t('navetAi.priorities.description')}
        >
          <div className="grid gap-4">
            <label className="flex items-start justify-between gap-4">
              <span>
                <span className="block text-sm font-semibold">
                  {t('navetAi.priorities.feedTitle')}
                </span>
                <span className={`mt-1 block text-sm ${surface.textSecondary}`}>
                  {t('navetAi.priorities.feedDescription')}
                </span>
              </span>
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 accent-[var(--navet-accent)]"
                checked={state.settings.priorityFeedEnabled !== false}
                onChange={(event) =>
                  void updateSettings({ priorityFeedEnabled: event.target.checked })
                }
              />
            </label>
            <label className="flex items-start justify-between gap-4">
              <span>
                <span className="block text-sm font-semibold">
                  {t('navetAi.priorities.learningTitle')}
                </span>
                <span className={`mt-1 block text-sm ${surface.textSecondary}`}>
                  {t('navetAi.priorities.learningDescription')}
                </span>
              </span>
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 accent-[var(--navet-accent)]"
                checked={state.settings.learningEnabled === true}
                onChange={(event) => void updateSettings({ learningEnabled: event.target.checked })}
              />
            </label>
            <label className="flex items-start justify-between gap-4">
              <span>
                <span className="block text-sm font-semibold">
                  {t('navetAi.priorities.historyTitle')}
                </span>
                <span className={`mt-1 block text-sm ${surface.textSecondary}`}>
                  {t('navetAi.priorities.historyDescription')}
                </span>
              </span>
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 accent-[var(--navet-accent)]"
                checked={state.settings.historyBackfillEnabled === true}
                disabled={!state.settings.learningEnabled}
                onChange={(event) =>
                  void updateSettings({ historyBackfillEnabled: event.target.checked })
                }
              />
            </label>
            <details className={`rounded-2xl border p-4 ${surface.border}`}>
              <summary className="cursor-pointer text-sm font-semibold">
                {t('navetAi.priorities.detailsTitle')}
              </summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(
                  ['security', 'chores', 'weather', 'calendar', 'maintenance', 'energy'] as const
                ).map((source) => (
                  <label
                    key={source}
                    className="flex min-h-10 items-center justify-between gap-3 text-sm capitalize"
                  >
                    {t(
                      source === 'security'
                        ? 'sidebar.security'
                        : source === 'chores'
                          ? 'sidebar.tasks'
                          : source === 'energy'
                            ? 'sidebar.energy'
                            : source === 'weather'
                              ? 'deviceType.weather'
                              : source === 'calendar'
                                ? 'deviceType.calendar'
                                : 'sidebar.settings'
                    )}
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-[var(--navet-accent)]"
                      checked={state.settings.prioritySources?.[source] !== false}
                      onChange={(event) =>
                        void updateSettings({
                          prioritySources: {
                            security: state.settings.prioritySources?.security !== false,
                            chores: state.settings.prioritySources?.chores !== false,
                            weather: state.settings.prioritySources?.weather !== false,
                            calendar: state.settings.prioritySources?.calendar !== false,
                            maintenance: state.settings.prioritySources?.maintenance !== false,
                            energy: state.settings.prioritySources?.energy !== false,
                            [source]: event.target.checked,
                          },
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <div className={`mt-4 grid gap-3 border-t pt-4 ${surface.border}`}>
                <label className="flex items-center justify-between gap-3 text-sm">
                  {t('navetAi.priorities.calendarTitles')}
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[var(--navet-accent)]"
                    checked={state.settings.privateDetails?.calendarTitles === true}
                    onChange={(event) =>
                      void updateSettings({
                        privateDetails: {
                          calendarTitles: event.target.checked,
                          notificationText:
                            state.settings.privateDetails?.notificationText === true,
                        },
                      })
                    }
                  />
                </label>
                <label className="flex items-center justify-between gap-3 text-sm">
                  {t('navetAi.priorities.notificationText')}
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[var(--navet-accent)]"
                    checked={state.settings.privateDetails?.notificationText === true}
                    onChange={(event) =>
                      void updateSettings({
                        privateDetails: {
                          calendarTitles: state.settings.privateDetails?.calendarTitles === true,
                          notificationText: event.target.checked,
                        },
                      })
                    }
                  />
                </label>
                <p className={`text-xs leading-5 ${surface.textSecondary}`}>
                  {t('navetAi.priorities.excluded')}
                </p>
              </div>
            </details>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className={`text-sm ${surface.textSecondary}`}>
                {t('navetAi.priorities.knowledge', {
                  feedback: state.priorityFeedback?.length ?? 0,
                  events: state.eventCount,
                })}
              </p>
              <Button
                variant="ghost"
                size="small"
                disabled={loading || (state.priorityFeedback?.length ?? 0) === 0}
                onClick={() => {
                  window.localStorage.removeItem('navet.priority-feedback.v1');
                  window.dispatchEvent(new Event('navet-priority-feedback-cleared'));
                  void deletePriorityFeedback();
                }}
              >
                {t('navetAi.priorities.deleteFeedback')}
              </Button>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {state &&
      state.settings.enabled !== false &&
      ['not_downloaded', 'downloading', 'error'].includes(state.capabilities.model.status) ? (
        <SectionCard
          title={
            state.capabilities.model.status === 'error'
              ? t('navetAi.model.retryTitle')
              : state.capabilities.model.status === 'downloading'
                ? t('navetAi.model.downloading')
                : t('navetAi.model.downloadTitle')
          }
          description={t('navetAi.model.downloadDescription', {
            model: state.capabilities.model.selectedId,
            details: modelSizeMb ? ` (${modelSizeMb} MB, Apache-2.0)` : '',
          })}
          action={
            state.capabilities.model.status === 'downloading' ? null : (
              <InteractivePill
                active
                intent="action"
                size="small"
                disabled={loading}
                onClick={() => void consentToModelDownload()}
              >
                {state.capabilities.model.status === 'error'
                  ? t('navetAi.model.retryAction')
                  : t('navetAi.model.downloadAction')}
              </InteractivePill>
            )
          }
        >
          {state.capabilities.model.status === 'downloading' ? (
            <ModelDownloadProgress
              downloadedBytes={state.capabilities.model.downloadedBytes}
              totalBytes={state.capabilities.model.downloadBytes}
              disabled={loading}
              onCancel={() => void cancelModelDownload()}
            />
          ) : (
            <p className={`text-sm leading-6 ${surface.textSecondary}`}>
              {t('navetAi.model.explainer')}
            </p>
          )}
        </SectionCard>
      ) : null}

      {state?.settings.enabled !== false ? (
        <SectionCard
          title={t('navetAi.insights.title')}
          description={t('navetAi.insights.description')}
          action={
            <Badge tone={insights.length > 0 ? 'accent' : 'neutral'}>{insights.length}</Badge>
          }
          padding="none"
          contentClassName="space-y-3 px-4 py-5 md:px-8 md:py-8"
        >
          {loading && !state ? (
            <Panel muted className="p-4 text-sm">
              {t('navetAi.insights.loading')}
            </Panel>
          ) : null}
          {!loading && state && insights.length === 0 ? (
            <Panel muted className="p-4 text-sm">
              {t('navetAi.insights.empty')}
            </Panel>
          ) : null}
          <div className="grid gap-3">
            {insights.map((insight) => (
              <Panel key={insight.id} muted padded={false} className="grid gap-3 p-4 md:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <Telescope className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <h3 className="font-semibold">{insight.title}</h3>
                      <p className={`mt-1 text-sm leading-6 ${surface.textSecondary}`}>
                        {insight.summary}
                      </p>
                    </div>
                  </div>
                  <Tag tone="neutral" size="small" className="shrink-0 gap-1">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> {insight.confidenceLabel}
                  </Tag>
                </div>
                <ul className={`space-y-1 text-sm leading-6 ${surface.textSecondary}`}>
                  {insight.facts.slice(0, 3).map((fact) => (
                    <li key={fact} className="flex items-start gap-2">
                      <Sparkles className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() =>
                      void addFeedback({
                        insightId: insight.id,
                        evidenceId: insight.evidenceId,
                        outcome: 'helpful',
                      })
                    }
                  >
                    {t('navetAi.feedback.helpful')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() =>
                      void addFeedback({
                        insightId: insight.id,
                        evidenceId: insight.evidenceId,
                        outcome: 'not_useful',
                        reason: 'not_relevant',
                      })
                    }
                  >
                    {t('navetAi.feedback.notUseful')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() =>
                      void addFeedback({
                        insightId: insight.id,
                        evidenceId: insight.evidenceId,
                        outcome: 'hide_similar',
                      })
                    }
                  >
                    {t('navetAi.feedback.hideSimilar')}
                  </Button>
                </div>
              </Panel>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
