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
import { Brain, Clock3, Database, ShieldCheck, Sparkles } from 'lucide-react';
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
    }))
  );

  useEffect(() => {
    if (!state && !loading) void initialize();
  }, [initialize, loading, state]);

  const insights = useMemo(
    () => state?.insights.filter((item) => item.status === 'new') ?? [],
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
            disabled={loading || !state}
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

      {state &&
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

      <SectionCard
        title={t('navetAi.insights.title')}
        description={t('navetAi.insights.description')}
        action={<Badge tone={insights.length > 0 ? 'accent' : 'neutral'}>{insights.length}</Badge>}
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
                  <Brain className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
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
    </div>
  );
}
