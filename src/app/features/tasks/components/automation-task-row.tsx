import type { HassEntities } from 'home-assistant-js-websocket';
import { ChevronDown, ChevronUp, Play } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { shallow } from 'zustand/shallow';
import { Badge, Button, IconButton, Panel, Switch, Tag } from '@/app/components/primitives';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import {
  useAccentColor,
  useHomeAssistant,
  useI18n,
  useServiceActionHandler,
  useThemeMode,
} from '@/app/hooks';
import { dispatchEntityAction } from '@/app/services/integration-action.service';
import { integrationTaskService } from '@/app/services/integration-task.service';
import type { IntegrationStore } from '@/app/stores/integration-store';
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
      <div className="text-[11px] font-semibold uppercase" style={{ color: accentColor }}>
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
  const selectDetailEntities = useCallback(
    (state: IntegrationStore): HassEntities | null => {
      const snapshot = integrationTaskService.selectTaskRuntimeSnapshot(state);
      if (!snapshot.entities || detailEntityIds.length === 0) {
        return null;
      }

      const detailEntities: HassEntities = {};
      for (const entityId of detailEntityIds) {
        const entity = snapshot.entities[entityId];
        if (entity) {
          detailEntities[entityId] = entity;
        }
      }
      return detailEntities;
    },
    [detailEntityIds]
  );
  const detailEntities = useHomeAssistant(selectDetailEntities, shallow);

  const lastTriggeredLabel = useMemo(() => {
    if (!automation.lastTriggered) {
      return t('tasks.automation.noRecentRun');
    }

    const parsed = new Date(automation.lastTriggered);
    if (Number.isNaN(parsed.getTime())) {
      return t('tasks.automation.noRecentRun');
    }

    return t('tasks.automation.lastTriggered', {
      time: formatDateTime(parsed, { dateStyle: 'medium', timeStyle: 'short' }),
    });
  }, [automation.lastTriggered, formatDateTime, t]);

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
      () =>
        dispatchEntityAction({
          entityId: automation.id,
          domain: 'automation',
          service: 'trigger',
        }),
      t('tasks.automation.triggerFailed', { name: automation.name })
    ).finally(() => {
      setIsTriggering(false);
    });
  };

  const handleEnabledChange = (nextEnabled: boolean) => {
    setIsUpdatingEnabled(true);
    void runAction(
      () =>
        dispatchEntityAction({
          entityId: automation.id,
          domain: 'automation',
          service: nextEnabled ? 'turn_on' : 'turn_off',
        }),
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
      .getAutomationConfig(automation.id)
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

  return (
    <Panel
      as="article"
      muted
      padded={false}
      className={`grid gap-4 p-4 md:p-5 ${shouldReduceMotion ? '' : 'transition-shadow duration-200'}`}
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`truncate text-base font-semibold ${surface.textPrimary}`}>
              {automation.name}
            </h3>
            <Badge tone={automation.enabled ? 'accent' : 'neutral'}>
              {automation.enabled ? t('tasks.automation.enabled') : t('tasks.automation.disabled')}
            </Badge>
          </div>
          <p className={`mt-2 line-clamp-2 text-sm leading-6 ${surface.textSecondary}`}>
            {configSections.overview ?? t('tasks.automation.details.noDescription')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Tag>{automation.room}</Tag>
            <Tag>{lastTriggeredLabel}</Tag>
            {automation.mode ? <Tag>{automation.mode}</Tag> : null}
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
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
            <div className="text-[11px] font-semibold uppercase" style={{ color: accentColor }}>
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
