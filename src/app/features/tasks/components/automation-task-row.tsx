import { Bot, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Panel, Switch } from '@/app/components/primitives';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useHomeAssistant, useI18n, useServiceActionHandler, useTheme } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import type { AutomationTask } from '../types';
import { buildAutomationConfigSections } from '../utils/automation-config-details';

interface AutomationTaskRowProps {
  task: AutomationTask;
}

interface DetailSectionProps {
  title: string;
  items: string[];
  loading: boolean;
  error: string | null;
  emptyLabel: string;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}

function DetailSection({ title, items, loading, error, emptyLabel, surface }: DetailSectionProps) {
  return (
    <Panel muted padded={false} className="grid gap-3 p-4">
      <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}>
        {title}
      </div>
      {loading ? (
        <p className={`text-sm ${surface.textSecondary}`}>{emptyLabel}</p>
      ) : error ? (
        <p className={`text-sm ${surface.textSecondary}`}>{error}</p>
      ) : items.length > 0 ? (
        <ol className={`space-y-2 text-sm leading-6 ${surface.textPrimary}`}>
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="flex gap-3">
              <span className={`mt-0.5 text-xs font-semibold ${surface.textMuted}`}>
                {index + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className={`text-sm ${surface.textSecondary}`}>{emptyLabel}</p>
      )}
    </Panel>
  );
}

export function AutomationTaskRow({ task }: AutomationTaskRowProps) {
  const { formatDateTime, t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const entities = useHomeAssistant(homeAssistantSelectors.entities);
  const runAction = useServiceActionHandler();
  const [isTriggering, setIsTriggering] = useState(false);
  const [isUpdatingEnabled, setIsUpdatingEnabled] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [automationConfig, setAutomationConfig] = useState<Record<string, unknown> | null>(null);
  const [hasPrefetchedConfig, setHasPrefetchedConfig] = useState(false);

  const lastTriggeredLabel = useMemo(() => {
    if (!task.lastTriggered) {
      return null;
    }

    const parsed = new Date(task.lastTriggered);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return t('tasks.automation.lastTriggered', {
      time: formatDateTime(parsed, { dateStyle: 'medium', timeStyle: 'short' }),
    });
  }, [formatDateTime, task.lastTriggered, t]);

  const handleTrigger = () => {
    setIsTriggering(true);
    void runAction(
      () => homeAssistantService.callService('automation', 'trigger', {}, { entity_id: task.id }),
      t('tasks.automation.triggerFailed', { name: task.name })
    ).finally(() => {
      setIsTriggering(false);
    });
  };

  const handleEnabledChange = (nextEnabled: boolean) => {
    setIsUpdatingEnabled(true);
    void runAction(
      () =>
        homeAssistantService.callService(
          'automation',
          nextEnabled ? 'turn_on' : 'turn_off',
          {},
          { entity_id: task.id }
        ),
      nextEnabled
        ? t('tasks.automation.enableFailed', { name: task.name })
        : t('tasks.automation.disableFailed', { name: task.name })
    ).finally(() => {
      setIsUpdatingEnabled(false);
    });
  };

  const configSections = useMemo(
    () =>
      automationConfig
        ? buildAutomationConfigSections(automationConfig, {
            entities,
          })
        : null,
    [automationConfig, entities]
  );

  const detailsRows = [
    { label: t('tasks.automation.details.entityId'), value: task.id, mono: true },
    { label: t('tasks.automation.details.room'), value: task.room },
    { label: t('tasks.automation.details.state'), value: task.state },
    { label: t('tasks.automation.details.mode'), value: task.mode },
    {
      label: t('tasks.automation.details.currentRuns'),
      value: task.currentRuns !== undefined ? String(task.currentRuns) : undefined,
    },
    { label: t('tasks.automation.details.lastTriggered'), value: lastTriggeredLabel ?? undefined },
  ].filter((row) => row.value);

  const overview = configSections?.overview?.trim() || task.description?.trim();

  useEffect(() => {
    if (task.description?.trim() || automationConfig || hasPrefetchedConfig) {
      return;
    }

    let cancelled = false;

    void homeAssistantService
      .getAutomationConfig(task.id)
      .then((response) => {
        if (!cancelled) {
          setAutomationConfig(response.config);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setHasPrefetchedConfig(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [automationConfig, hasPrefetchedConfig, task.description, task.id]);

  useEffect(() => {
    if (!isDetailsOpen || automationConfig || detailsError) {
      return;
    }

    let cancelled = false;
    setIsLoadingDetails(true);
    setDetailsError(null);

    void homeAssistantService
      .getAutomationConfig(task.id)
      .then((response) => {
        if (!cancelled) {
          setAutomationConfig(response.config);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setDetailsError(
            error instanceof Error ? error.message : t('tasks.automation.details.loadFailed')
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingDetails(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [automationConfig, detailsError, isDetailsOpen, task.id, t]);

  return (
    <Panel as="article" muted padded={false} className="flex flex-col gap-4 p-4 md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 rounded-2xl border p-2.5 ${surface.border} ${surface.panel}`}>
              <Bot className={`h-4 w-4 ${surface.textSecondary}`} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className={`truncate text-base font-semibold tracking-tight ${surface.textPrimary}`}
                >
                  {task.name}
                </h3>
                <Badge tone={task.enabled ? 'success' : 'neutral'}>
                  {task.enabled ? t('tasks.automation.enabled') : t('tasks.automation.disabled')}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${surface.border} ${surface.textSecondary}`}
                >
                  {task.room}
                </span>
                {lastTriggeredLabel ? (
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${surface.border} ${surface.textSecondary}`}
                  >
                    {lastTriggeredLabel}
                  </span>
                ) : null}
              </div>
              <p
                className={`max-w-3xl text-sm leading-6 ${overview ? surface.textPrimary : surface.textSecondary}`}
              >
                {overview || t('tasks.automation.details.noDescription')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 lg:max-w-xs lg:justify-end">
          <Button
            variant="ghost"
            size="small"
            leading={
              isDetailsOpen ? (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              )
            }
            onClick={() => {
              if (detailsError && !automationConfig) {
                setDetailsError(null);
              }
              setIsDetailsOpen((open) => !open);
            }}
            aria-expanded={isDetailsOpen}
            aria-controls={`automation-details-${task.id}`}
          >
            {isDetailsOpen ? t('tasks.automation.hideDetails') : t('tasks.automation.viewDetails')}
          </Button>
          <Button
            variant="secondary"
            size="small"
            leading={<Play className="h-4 w-4" aria-hidden="true" />}
            loading={isTriggering}
            disabled={isUpdatingEnabled}
            onClick={handleTrigger}
            aria-label={t('tasks.automation.runAutomation', { name: task.name })}
          >
            {isTriggering ? t('tasks.automation.running') : t('tasks.automation.run')}
          </Button>
          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-2 ${surface.border} ${surface.panel}`}
          >
            <span className={`text-xs font-medium ${surface.textSecondary}`}>
              {task.enabled ? t('tasks.automation.disable') : t('tasks.automation.enable')}
            </span>
            <Switch
              checked={task.enabled}
              disabled={isTriggering || isUpdatingEnabled}
              onCheckedChange={handleEnabledChange}
              aria-label={t('tasks.automation.toggleAutomation', { name: task.name })}
            />
          </div>
        </div>
      </div>

      {isDetailsOpen ? (
        <div id={`automation-details-${task.id}`} className="grid gap-4">
          <Panel muted padded={false} className="grid gap-3 p-4">
            <div
              className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
            >
              {t('tasks.automation.details.whatItDoes')}
            </div>
            <p className={`text-sm leading-6 ${surface.textPrimary}`}>
              {configSections?.description?.trim() ||
                task.description?.trim() ||
                configSections?.overview?.trim() ||
                t('tasks.automation.details.noDescription')}
            </p>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-3">
            <DetailSection
              title={t('tasks.automation.details.when')}
              items={configSections?.triggers ?? []}
              loading={isLoadingDetails}
              error={detailsError}
              emptyLabel={
                isLoadingDetails
                  ? t('tasks.automation.details.loading')
                  : t('tasks.automation.details.none')
              }
              surface={surface}
            />
            <DetailSection
              title={t('tasks.automation.details.if')}
              items={configSections?.conditions ?? []}
              loading={isLoadingDetails}
              error={detailsError}
              emptyLabel={
                isLoadingDetails
                  ? t('tasks.automation.details.loading')
                  : t('tasks.automation.details.none')
              }
              surface={surface}
            />
            <DetailSection
              title={t('tasks.automation.details.then')}
              items={configSections?.actions ?? []}
              loading={isLoadingDetails}
              error={detailsError}
              emptyLabel={
                isLoadingDetails
                  ? t('tasks.automation.details.loading')
                  : t('tasks.automation.details.none')
              }
              surface={surface}
            />
          </div>

          <Panel muted padded={false} className="grid gap-3 p-4">
            <div
              className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
            >
              {t('tasks.automation.details.diagnostics')}
            </div>
            <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {detailsRows.map((row) => (
                <div key={row.label} className="grid gap-1">
                  <dt
                    className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${surface.textMuted}`}
                  >
                    {row.label}
                  </dt>
                  <dd
                    className={`${row.mono ? 'break-all font-mono text-[12px]' : 'text-sm'} ${surface.textSecondary}`}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      ) : null}
    </Panel>
  );
}
