import { dispatchEntityCommand } from '@navet/app/commands';
import { Button, IconButton, Panel, Switch, Tag } from '@navet/app/components/primitives';
import { EntityCardHeader } from '@navet/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useAccentColor, useI18n, useServiceActionHandler, useThemeMode } from '@navet/app/hooks';
import type { PlatformTaskEntityMap } from '@navet/app/platform/provider-feature-models';
import { integrationTaskService } from '@navet/app/services/integration-task.service';
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Play,
  Power,
  PowerOff,
} from 'lucide-react';
import { useMemo, useState, useSyncExternalStore } from 'react';
import type { AutomationRoutine } from '../types';
import { buildAutomationConfigSections } from '../utils/automation-config-details';

interface AutomationTaskRowProps {
  automation: AutomationRoutine;
  shouldReduceMotion: boolean;
}

interface DetailSectionProps {
  title: string;
  items: string[];
  loading: boolean;
  error: string | null;
  emptyLabel: string;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  accentColor: string;
}

function DetailSection({
  title,
  items,
  loading,
  error,
  emptyLabel,
  surface,
  accentColor,
}: DetailSectionProps) {
  return (
    <Panel muted padded={false} className="grid gap-3 p-4">
      <div className="text-xs font-semibold leading-4" style={{ color: accentColor }}>
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
              <span className="mt-0.5 text-xs font-semibold" style={{ color: accentColor }}>
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

function collectEntityIds(value: unknown, entityIds = new Set<string>()): Set<string> {
  if (typeof value === 'string') {
    const matches = value.match(/\b[a-z_]+\.[a-zA-Z0-9_]+\b/g);
    for (const match of matches ?? []) {
      entityIds.add(match);
    }
    return entityIds;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectEntityIds(item, entityIds);
    }
    return entityIds;
  }

  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) {
      collectEntityIds(item, entityIds);
    }
  }

  return entityIds;
}

function parseTimeLabel(
  value: string,
  formatDateTime: ReturnType<typeof useI18n>['formatDateTime']
) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return formatDateTime(parsed, { dateStyle: 'medium', timeStyle: 'short' });
}

export function AutomationTaskRow({ automation, shouldReduceMotion }: AutomationTaskRowProps) {
  const { formatDateTime, t } = useI18n();
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
    () => (automationConfig ? [...collectEntityIds(automationConfig)].sort() : []),
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
  const statusIcon = automation.needsAttention
    ? AlertTriangle
    : automation.enabled
      ? Power
      : PowerOff;
  const stateBorderColor = automation.needsAttention
    ? 'rgba(245, 158, 11, 0.54)'
    : automation.enabled
      ? `${accentColor}26`
      : undefined;
  const nextRunLabel = automation.nextRunLabel
    ? parseTimeLabel(automation.nextRunLabel, formatDateTime)
    : undefined;
  const lastRunLabel = automation.lastTriggeredDate
    ? formatDateTime(automation.lastTriggeredDate, { dateStyle: 'medium', timeStyle: 'short' })
    : undefined;
  const lastRunHeaderLabel = lastRunLabel
    ? t('tasks.automation.lastTriggered', { time: lastRunLabel })
    : undefined;
  const cardDescription = isDetailsOpen ? configSections.overview : automation.description;
  const hasDescription = Boolean(cardDescription);
  const showRoom = automation.room !== 'Unassigned';
  const headerSubtitle = [showRoom ? automation.room : undefined, lastRunHeaderLabel]
    .filter(Boolean)
    .join(' - ');
  const currentRuns = automation.currentRuns;
  const showCurrentRuns = currentRuns !== undefined && currentRuns > 0;
  const hasMetadata = Boolean(nextRunLabel) || showCurrentRuns;
  const hasBodyContent = hasDescription || automation.needsAttention || hasMetadata;

  return (
    <Panel
      as="article"
      muted
      padded={false}
      className={`grid gap-4 p-4 md:p-5 ${shouldReduceMotion ? '' : 'transition-shadow duration-200'} ${
        automation.status === 'disabled' ? 'md:brightness-[0.96]' : ''
      }`}
      style={{
        borderColor: stateBorderColor,
        boxShadow: automation.needsAttention
          ? '0 18px 50px -40px rgba(245, 158, 11, 0.8)'
          : undefined,
      }}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <EntityCardHeader
            title={automation.name}
            subtitle={headerSubtitle}
            size="medium"
            layout="eyebrow-first"
            leading={
              <EntityCardHeaderIcon
                IconComponent={statusIcon}
                isActive={automation.enabled || automation.needsAttention}
                size="medium"
                tone={
                  automation.needsAttention ? 'amber' : automation.enabled ? 'primary' : 'neutral'
                }
                baseColor={automation.needsAttention ? '#f59e0b' : accentColor}
              />
            }
            trailing={
              automation.needsAttention ? (
                <Tag tone="warning" size="small" className="gap-1">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  {t('tasks.automation.needsAttention')}
                </Tag>
              ) : null
            }
            titleClassName="text-base leading-6"
            subtitleClassName="text-xs"
            marginBottomClassName={hasBodyContent ? 'mb-3' : 'mb-0'}
          />

          {hasDescription ? (
            <p className={`line-clamp-2 text-sm leading-6 ${surface.textSecondary}`}>
              {cardDescription}
            </p>
          ) : null}

          {automation.needsAttention ? (
            <div
              className={`${hasDescription ? 'mt-3' : ''} rounded-2xl border px-3 py-2 text-sm leading-5`}
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderColor: 'rgba(245, 158, 11, 0.26)',
                color: theme === 'light' ? '#92400e' : '#fbbf24',
              }}
            >
              {attentionLabel}
            </div>
          ) : null}

          {hasMetadata ? (
            <div
              className={`${hasDescription || automation.needsAttention ? 'mt-3' : ''} flex flex-wrap gap-x-4 gap-y-2 text-sm ${surface.textSecondary}`}
            >
              {nextRunLabel ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('tasks.automation.nextRun', { time: nextRunLabel })}
                </span>
              ) : null}
              {showCurrentRuns ? (
                <Tag tone="accent">{t('tasks.automation.currentRuns', { count: currentRuns })}</Tag>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
          <Switch
            checked={automation.enabled}
            disabled={isUpdatingEnabled}
            onCheckedChange={handleEnabledChange}
            aria-label={t('tasks.automation.toggleAutomation', { name: automation.name })}
          />
          <Button
            variant="secondary"
            size="small"
            leading={<Play className="h-4 w-4" aria-hidden="true" />}
            loading={isTriggering}
            onClick={handleTrigger}
            aria-label={t('tasks.automation.runAutomation', { name: automation.name })}
            className="min-w-24 flex-1 sm:flex-none"
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
        <div
          className="grid gap-3 border-t pt-4 md:grid-cols-2"
          style={{ borderColor: `${accentColor}26` }}
        >
          <DetailSection
            title={t('tasks.automation.details.when')}
            items={configSections.triggers}
            loading={isLoadingDetails}
            error={detailsError}
            emptyLabel={t('tasks.automation.details.none')}
            surface={surface}
            accentColor={accentColor}
          />
          <DetailSection
            title={t('tasks.automation.details.if')}
            items={configSections.conditions}
            loading={isLoadingDetails}
            error={detailsError}
            emptyLabel={t('tasks.automation.details.none')}
            surface={surface}
            accentColor={accentColor}
          />
          <DetailSection
            title={t('tasks.automation.details.then')}
            items={configSections.actions}
            loading={isLoadingDetails}
            error={detailsError}
            emptyLabel={t('tasks.automation.details.none')}
            surface={surface}
            accentColor={accentColor}
          />
          <Panel muted padded={false} className="grid gap-2 p-4">
            <div className="text-xs font-semibold leading-4" style={{ color: accentColor }}>
              {t('tasks.automation.details.diagnostics')}
            </div>
            <dl className={`grid gap-2 text-sm ${surface.textSecondary}`}>
              <div className="flex justify-between gap-4">
                <dt>{t('tasks.automation.details.entityId')}</dt>
                <dd className={`break-all text-right font-mono text-xs ${surface.textMuted}`}>
                  {automation.id}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>{t('tasks.automation.details.state')}</dt>
                <dd>{automation.state}</dd>
              </div>
              {automation.currentRuns !== undefined ? (
                <div className="flex justify-between gap-4">
                  <dt>{t('tasks.automation.details.currentRuns')}</dt>
                  <dd>{automation.currentRuns}</dd>
                </div>
              ) : null}
            </dl>
          </Panel>
        </div>
      ) : null}
    </Panel>
  );
}
