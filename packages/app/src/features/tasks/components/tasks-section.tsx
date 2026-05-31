import {
  DashboardEmptyState,
  DashboardHeroSection,
  SectionCard,
} from '@navet/app/components/patterns';
import { Badge, InteractivePill, MessageBar, Panel } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { HabitInsightsPanel } from '@navet/app/features/habits/components/habit-insights-panel';
import { useI18n, useTheme } from '@navet/app/hooks';
import { Bot, ClipboardList, Clock3, type LucideIcon, Power, PowerOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useAutomationDashboardController } from '../hooks/use-automation-dashboard-controller';
import { AutomationTaskRow } from './automation-task-row';
import { QuickActionGrid } from './quick-action-grid';

type AutomationVisibilityFilter = 'all' | 'active' | 'inactive';

const automationFilterPillClassName =
  'shrink-0 whitespace-nowrap md:h-9 md:gap-1.5 md:px-3.5 md:text-sm [&>svg]:md:h-4 [&>svg]:md:w-4';

function AutomationHeroStatBadge({
  active = false,
  accentColor,
  children,
  icon: Icon,
}: {
  active?: boolean;
  accentColor: string;
  children: ReactNode;
  icon: LucideIcon;
}) {
  return (
    <span
      className="inline-flex h-[26px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-semibold leading-none"
      style={{
        backgroundColor: active ? `${accentColor}12` : 'rgba(255,255,255,0.04)',
        borderColor: active ? `${accentColor}48` : 'rgba(255,255,255,0.1)',
        color: active ? '#ffffff' : undefined,
      }}
    >
      <Icon
        className="h-3.5 w-3.5 shrink-0"
        style={{ color: active ? accentColor : undefined }}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}

function TasksLoadingState() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div
      className="h-full min-w-0 overflow-x-hidden overflow-y-auto"
      role="status"
      aria-label="Loading routines"
    >
      <div className="mx-auto min-w-0 max-w-6xl space-y-4 pb-24 md:space-y-5 md:pb-0">
        <Panel padded={false} className="grid gap-4 p-4 md:gap-5 md:p-7">
          <div className={`h-6 w-28 rounded-full ${surface.panelMuted}`} />
          <div className={`h-10 w-64 max-w-full rounded-2xl ${surface.panelMuted}`} />
          <div className={`h-5 w-full max-w-xl rounded-full ${surface.panelMuted}`} />
        </Panel>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <Panel key={item} muted padded={false} className="min-h-[10rem] p-4">
              <div className={`h-10 w-10 rounded-2xl ${surface.panel}`} />
              <div className={`mt-6 h-6 w-36 rounded-full ${surface.panel}`} />
              <div className={`mt-3 h-4 w-full rounded-full ${surface.panel}`} />
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TasksSection() {
  const { formatDateTime, t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const controller = useAutomationDashboardController();
  const [automationFilter, setAutomationFilter] = useState<AutomationVisibilityFilter>('all');
  const totalTasks = controller.automations.length + controller.quickActions.length;
  const latestRunLabel = controller.latestAutomation?.lastTriggered
    ? formatDateTime(new Date(controller.latestAutomation.lastTriggered), {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : t('tasks.hero.noAutomationRun');
  const visibleAutomations = useMemo(() => {
    if (automationFilter === 'active') {
      return controller.enabledAutomations;
    }

    if (automationFilter === 'inactive') {
      return controller.disabledAutomations;
    }

    return controller.automations;
  }, [
    automationFilter,
    controller.automations,
    controller.disabledAutomations,
    controller.enabledAutomations,
  ]);

  const toggleAutomationFilter = (filter: Exclude<AutomationVisibilityFilter, 'all'>) => {
    setAutomationFilter((current) => (current === filter ? 'all' : filter));
  };

  if (controller.isLoading) {
    return <TasksLoadingState />;
  }

  if (totalTasks === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <DashboardEmptyState
          icon={ClipboardList}
          title={t('sections.tasks.emptyTitle')}
          description={t('sections.tasks.emptyDescription')}
          className="w-full max-w-md"
        />
      </div>
    );
  }

  return (
    <div className="h-full min-w-0 overflow-x-hidden overflow-y-auto">
      <div className="mx-auto min-w-0 max-w-6xl space-y-4 md:space-y-5">
        {controller.hasError ? (
          <MessageBar tone="warning" title={t('tasks.dashboard.partialErrorTitle')}>
            {t('tasks.dashboard.partialErrorDescription')}
          </MessageBar>
        ) : null}

        <DashboardHeroSection
          accentColor={accentColor}
          surface={surface}
          eyebrow={
            <div
              className={`text-[11px] font-semibold uppercase tracking-[0.18em] md:text-xs md:tracking-[0.2em] ${surface.textMuted}`}
            >
              {t('tasks.dashboard.eyebrow')}
            </div>
          }
          title={t('sections.tasks.automations.title')}
          description={t('tasks.dashboard.sourceNote')}
          actionsClassName="hidden md:flex"
          actions={
            <>
              <AutomationHeroStatBadge accentColor={accentColor} icon={Bot}>
                {controller.automations.length} {t('sections.tasks.automations.plural')}
              </AutomationHeroStatBadge>
              <AutomationHeroStatBadge active accentColor={accentColor} icon={Power}>
                {controller.enabledAutomations.length} {t('tasks.hero.active')}
              </AutomationHeroStatBadge>
              <AutomationHeroStatBadge accentColor={accentColor} icon={PowerOff}>
                {controller.disabledAutomations.length} {t('tasks.filters.disabled')}
              </AutomationHeroStatBadge>
            </>
          }
          aside={
            <Panel muted padded={false} className="p-4">
              <div className="flex items-start gap-3">
                <Clock3 className={`mt-0.5 h-4 w-4 ${surface.textSecondary}`} aria-hidden="true" />
                <div className="min-w-0">
                  <p className={`text-xs font-semibold uppercase ${surface.textMuted}`}>
                    {t('tasks.hero.latestRun')}
                  </p>
                  <p className={`mt-1 truncate text-sm font-semibold ${surface.textPrimary}`}>
                    {controller.latestAutomation?.name ?? t('tasks.hero.noRecentRun')}
                  </p>
                  <p className={`mt-1 text-sm ${surface.textSecondary}`}>{latestRunLabel}</p>
                </div>
              </div>
            </Panel>
          }
        />

        {controller.quickActions.length > 0 ? (
          <SectionCard
            title={t('tasks.quickActions.title')}
            description={t('tasks.quickActions.description')}
            action={
              <Badge tone="accent">
                {controller.quickActions.length}{' '}
                {controller.quickActions.length === 1
                  ? t('tasks.quickActions.singular')
                  : t('tasks.quickActions.plural')}
              </Badge>
            }
            contentClassName="px-4 py-5 md:px-8 md:py-8"
            padding="none"
          >
            <QuickActionGrid
              actions={controller.quickActions}
              shouldReduceMotion={controller.shouldReduceMotion}
            />
          </SectionCard>
        ) : null}

        <HabitInsightsPanel />

        <SectionCard
          title={t('sections.tasks.automations.title')}
          description={t('sections.tasks.description')}
          action={
            <Badge tone="accent">
              {controller.automations.length}{' '}
              {controller.automations.length === 1
                ? t('sections.tasks.automations.singular')
                : t('sections.tasks.automations.plural')}
            </Badge>
          }
          contentClassName="px-4 py-5 md:px-8 md:py-8"
          padding="none"
        >
          <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
            <InteractivePill
              active={automationFilter === 'all'}
              aria-pressed={automationFilter === 'all'}
              className={automationFilterPillClassName}
              icon={Bot}
              intent="navigation"
              size="compact"
              onClick={() => setAutomationFilter('all')}
            >
              {t('tasks.filters.all')}
            </InteractivePill>
            <InteractivePill
              active={automationFilter === 'active'}
              aria-pressed={automationFilter === 'active'}
              className={automationFilterPillClassName}
              icon={Power}
              intent="navigation"
              size="compact"
              onClick={() => toggleAutomationFilter('active')}
            >
              {t('tasks.hero.active')}
            </InteractivePill>
            <InteractivePill
              active={automationFilter === 'inactive'}
              aria-pressed={automationFilter === 'inactive'}
              className={automationFilterPillClassName}
              icon={PowerOff}
              intent="navigation"
              size="compact"
              onClick={() => toggleAutomationFilter('inactive')}
            >
              {t('tasks.filters.disabled')}
            </InteractivePill>
          </div>

          <div className="space-y-3">
            {visibleAutomations.map((automation) => (
              <AutomationTaskRow
                key={automation.id}
                automation={automation}
                shouldReduceMotion={controller.shouldReduceMotion}
              />
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
