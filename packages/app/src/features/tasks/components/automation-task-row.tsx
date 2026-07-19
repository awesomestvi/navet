import { dispatchEntityCommand } from '@navet/app/commands';
import { Button, IconButton, Tag } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useAccentColor, useI18n, useServiceActionHandler, useThemeMode } from '@navet/app/hooks';
import type { PlatformTaskEntityMap } from '@navet/app/platform/provider-feature-models';
import { integrationTaskService } from '@navet/app/services/integration-task.service';
import { AlertTriangle, ChevronDown, ChevronUp, Play, Power, PowerOff } from 'lucide-react';
import { useMemo, useState, useSyncExternalStore } from 'react';
import type { AutomationRoutine } from '../types';
import { buildAutomationConfigSections } from '../utils/automation-config-details';
import {
  buildAutomationDependencySummaries,
  getAutomationConfigEntityIds,
} from '../utils/automation-dependencies';

interface AutomationTaskRowProps {
  automation: AutomationRoutine;
  shouldReduceMotion: boolean;
  striped?: boolean;
}

interface DetailSectionProps {
  title: string;
  items: string[];
  loading: boolean;
  error: string | null;
  emptyLabel: string;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  accentColor: string;
  step: number;
  isLast?: boolean;
}

function DetailSection({
  title,
  items,
  loading,
  error,
  emptyLabel,
  surface,
  accentColor,
  step,
  isLast = false,
}: DetailSectionProps) {
  return (
    <section className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3">
      <div className="relative flex justify-center" aria-hidden="true">
        <span
          className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold"
          style={{
            borderColor: `${accentColor}66`,
            backgroundColor: `${accentColor}14`,
            color: accentColor,
          }}
        >
          {step}
        </span>
        {!isLast ? (
          <span
            className="absolute top-6 bottom-[-1.25rem] w-px"
            style={{ backgroundColor: `${accentColor}2e` }}
          />
        ) : null}
      </div>
      <div className={isLast ? '' : 'pb-5'}>
        <h4 className="mb-1 text-xs font-semibold leading-5" style={{ color: accentColor }}>
          {title}
        </h4>
        {loading ? (
          <p className={`text-sm leading-6 ${surface.textMuted}`}>{emptyLabel}</p>
        ) : error ? (
          <p className={`text-sm leading-6 ${surface.textSecondary}`}>{error}</p>
        ) : items.length > 0 ? (
          <ol className={`grid gap-1.5 text-sm leading-6 ${surface.textPrimary}`}>
            {items.map((item, index) => (
              <li
                key={`${title}-${index}`}
                className="grid grid-cols-[0.75rem_minmax(0,1fr)] gap-2"
              >
                <span className="pt-0.5 text-xs" style={{ color: `${accentColor}b3` }}>
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className={`text-sm leading-6 ${surface.textMuted}`}>{emptyLabel}</p>
        )}
      </div>
    </section>
  );
}

export function AutomationTaskRow({
  automation,
  shouldReduceMotion,
  striped = false,
}: AutomationTaskRowProps) {
  const { t } = useI18n();
  const theme = useThemeMode();
  const accentColor = useAccentColor();
  const surface = getThemeSurfaceTokens(theme);
  const runAction = useServiceActionHandler();
  const [isTriggering, setIsTriggering] = useState(false);
  const [isUpdatingEnabled, setIsUpdatingEnabled] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [automationConfig, setAutomationConfig] = useState<Record<string, unknown> | null>(null);
  const detailEntityIds = useMemo(
    () => getAutomationConfigEntityIds(automationConfig),
    [automationConfig]
  );
  const taskRuntime = useSyncExternalStore(
    integrationTaskService.subscribeTaskRuntimeSnapshot,
    integrationTaskService.getTaskRuntimeSnapshot,
    integrationTaskService.getTaskRuntimeSnapshot
  );
  const detailEntities = useMemo((): PlatformTaskEntityMap | null => {
    if (!taskRuntime.entities || detailEntityIds.length === 0) {
      return null;
    }

    const entities: PlatformTaskEntityMap = {};
    for (const entityId of detailEntityIds) {
      const entity = taskRuntime.entities[entityId];
      if (entity) {
        entities[entityId] = entity;
      }
    }

    return entities;
  }, [detailEntityIds, taskRuntime.entities]);
  const dependencySummaries = useMemo(
    () => buildAutomationDependencySummaries(detailEntityIds, taskRuntime.entities),
    [detailEntityIds, taskRuntime.entities]
  );

  const configSections = useMemo(
    () =>
      automationConfig
        ? buildAutomationConfigSections(automationConfig, { entities: detailEntities })
        : {
            overview: automation.description,
            description: automation.description,
            triggers: [],
            conditions: [],
            actions: [],
          },
    [automation.description, automationConfig, detailEntities]
  );

  const handleTrigger = () => {
    setIsTriggering(true);
    void runAction(
      () => integrationTaskService.triggerAutomation(automation.id),
      t('tasks.automation.triggerFailed', { name: automation.name })
    ).finally(() => {
      setIsTriggering(false);
    });
  };

  const handleEnabledChange = (nextEnabled: boolean) => {
    setIsUpdatingEnabled(true);
    void runAction(
      async () => {
        await dispatchEntityCommand({
          type: nextEnabled ? 'turn_on' : 'turn_off',
          entityId: automation.id,
        });
      },
      nextEnabled
        ? t('tasks.automation.enableFailed', { name: automation.name })
        : t('tasks.automation.disableFailed', { name: automation.name })
    ).finally(() => {
      setIsUpdatingEnabled(false);
    });
  };

  const loadDetails = () => {
    if (automationConfig || isLoadingDetails) {
      return;
    }

    setIsLoadingDetails(true);
    setDetailsError(null);
    void integrationTaskService
      .getAutomationDetails(automation.id)
      .then((response) => {
        setAutomationConfig(response.config);
      })
      .catch(() => {
        setDetailsError(t('tasks.automation.details.loadFailed'));
      })
      .finally(() => {
        setIsLoadingDetails(false);
      });
  };

  const handleDetailsToggle = () => {
    setIsDetailsOpen((open) => {
      const nextOpen = !open;
      if (nextOpen) {
        loadDetails();
      }
      return nextOpen;
    });
  };
  const attentionLabel =
    automation.attentionReason === 'unavailable'
      ? t('tasks.automation.attention.unavailable')
      : automation.attentionReason === 'unknown'
        ? t('tasks.automation.attention.unknown')
        : t('tasks.automation.attention.error');
  const cardDescription = isDetailsOpen ? configSections.overview : automation.description;
  const hasDescription = Boolean(cardDescription);
  const statusLabel = automation.needsAttention
    ? t('tasks.automation.needsAttention')
    : automation.enabled
      ? t('tasks.automation.enabled')
      : t('tasks.automation.disabled');
  const statusTone = automation.needsAttention
    ? 'warning'
    : automation.enabled
      ? 'success'
      : 'neutral';

  return (
    <article
      className={`${striped ? surface.subtleBg : ''} ${
        shouldReduceMotion ? '' : 'transition-colors duration-200'
      } ${automation.status === 'disabled' ? 'md:brightness-[0.96]' : ''}`}
    >
      <div className="grid gap-3 px-4 py-3 text-sm sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] @2xl/automation-table:grid-cols-[minmax(0,1fr)_10rem_7rem_15rem] @2xl/automation-table:items-center">
        <div className="min-w-0 sm:col-span-2 @2xl/automation-table:col-span-1">
          <div className={`truncate font-medium ${surface.textPrimary}`}>{automation.name}</div>
          {hasDescription ? (
            <p
              className={`whitespace-normal break-words text-xs font-normal leading-5 ${surface.textSecondary}`}
            >
              {cardDescription}
            </p>
          ) : null}
          {automation.needsAttention ? (
            <div
              className="mt-2 text-xs leading-5"
              style={{
                color: theme === 'light' ? '#92400e' : '#fbbf24',
              }}
            >
              {attentionLabel}
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 items-center justify-between gap-3 lg:block">
          <div className={`text-xs font-medium @2xl/automation-table:hidden ${surface.textMuted}`}>
            {t('tasks.automation.category')}
          </div>
          <div
            className={`truncate ${automation.category ? surface.textSecondary : surface.textMuted}`}
          >
            {automation.category ?? '—'}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 lg:block">
          <div className={`text-xs font-medium @2xl/automation-table:hidden ${surface.textMuted}`}>
            {t('dashboard.zones.status')}
          </div>
          <Tag tone={statusTone} size="small" className="gap-1">
            {automation.needsAttention ? (
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            ) : null}
            {statusLabel}
          </Tag>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:col-span-2 lg:justify-end @2xl/automation-table:col-span-1">
          <Button
            variant="secondary"
            size="small"
            leading={
              automation.enabled ? (
                <PowerOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Power className="h-4 w-4" aria-hidden="true" />
              )
            }
            loading={isUpdatingEnabled}
            onClick={() => handleEnabledChange(!automation.enabled)}
            aria-label={
              automation.enabled
                ? t('tasks.automation.disableAutomation', { name: automation.name })
                : t('tasks.automation.enableAutomation', { name: automation.name })
            }
            className="min-w-20 flex-1 sm:flex-none"
          >
            {automation.enabled ? t('tasks.automation.disable') : t('tasks.automation.enable')}
          </Button>
          <Button
            variant="secondary"
            size="small"
            leading={<Play className="h-4 w-4" aria-hidden="true" />}
            loading={isTriggering}
            onClick={handleTrigger}
            aria-label={t('tasks.automation.runAutomation', { name: automation.name })}
            className="min-w-20 flex-1 sm:flex-none"
          >
            {isTriggering ? t('tasks.automation.running') : t('tasks.automation.run')}
          </Button>
          <IconButton
            variant="ghost"
            size="small"
            label={
              isDetailsOpen ? t('tasks.automation.hideDetails') : t('tasks.automation.viewDetails')
            }
            icon={
              isDetailsOpen ? (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              )
            }
            onClick={handleDetailsToggle}
            aria-expanded={isDetailsOpen}
          />
        </div>
      </div>

      {isDetailsOpen ? (
        <div className="border-t" style={{ borderColor: `${accentColor}26` }}>
          <div className="px-5 py-5 md:px-6 md:py-6">
            <div className="max-w-4xl">
              <DetailSection
                title={t('tasks.automation.details.when')}
                items={configSections.triggers}
                loading={isLoadingDetails}
                error={detailsError}
                emptyLabel={t('tasks.automation.details.none')}
                surface={surface}
                accentColor={accentColor}
                step={1}
              />
              <DetailSection
                title={t('tasks.automation.details.if')}
                items={configSections.conditions}
                loading={isLoadingDetails}
                error={detailsError}
                emptyLabel={t('tasks.automation.details.none')}
                surface={surface}
                accentColor={accentColor}
                step={2}
              />
              <DetailSection
                title={t('tasks.automation.details.then')}
                items={configSections.actions}
                loading={isLoadingDetails}
                error={detailsError}
                emptyLabel={t('tasks.automation.details.none')}
                surface={surface}
                accentColor={accentColor}
                step={3}
                isLast
              />
            </div>
          </div>

          <div
            className="grid gap-4 border-t px-5 py-4 md:grid-cols-[6rem_minmax(0,1fr)] md:px-6"
            style={{ borderColor: `${accentColor}1f` }}
          >
            <h4 className={`text-xs font-semibold leading-5 ${surface.textMuted}`}>
              {t('tasks.automation.details.diagnostics')}
            </h4>
            <div className="min-w-0">
              <dl
                className={`grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto_auto] ${surface.textSecondary}`}
              >
                <div className="min-w-0">
                  <dt className={`mb-0.5 text-xs ${surface.textMuted}`}>
                    {t('tasks.automation.details.entityId')}
                  </dt>
                  <dd className="truncate font-mono text-xs">{automation.id}</dd>
                </div>
                <div>
                  <dt className={`mb-0.5 text-xs ${surface.textMuted}`}>
                    {t('tasks.automation.details.state')}
                  </dt>
                  <dd>{automation.state}</dd>
                </div>
                {automation.currentRuns !== undefined ? (
                  <div>
                    <dt className={`mb-0.5 text-xs ${surface.textMuted}`}>
                      {t('tasks.automation.details.currentRuns')}
                    </dt>
                    <dd>{automation.currentRuns}</dd>
                  </div>
                ) : null}
              </dl>
              {dependencySummaries.length > 0 ? (
                <div className="mt-4 border-t pt-3" style={{ borderColor: `${accentColor}1f` }}>
                  <div className={`text-xs font-semibold leading-4 ${surface.textMuted}`}>
                    {t('tasks.automation.details.dependencies')}
                  </div>
                  <ul
                    className={`mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 ${surface.textSecondary}`}
                  >
                    {dependencySummaries.map((dependency) => (
                      <li key={dependency.entityId} className="flex justify-between gap-4">
                        <span className="min-w-0 truncate">{dependency.label}</span>
                        <span className={`shrink-0 font-mono text-xs ${surface.textMuted}`}>
                          {dependency.state}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
