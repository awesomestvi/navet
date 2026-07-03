import {
  DashboardEmptyState,
  DashboardHeroSection,
  SectionCard,
} from '@navet/app/components/patterns';
import { Badge, InteractivePill, MessageBar, Panel } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { HabitInsightsPanel } from '@navet/app/features/habits/components/habit-insights-panel';
import { useI18n, useTheme } from '@navet/app/hooks';
import { isProductionEnvironment } from '@navet/app/utils/environment';
import { AlertTriangle, Bot, ClipboardList, Power, PowerOff, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAutomationDashboardController } from '../hooks/use-automation-dashboard-controller';
import { AutomationTaskRow } from './automation-task-row';
import { QuickActionGrid } from './quick-action-grid';

type AutomationVisibilityFilter = 'all' | 'active' | 'disabled' | 'recent' | 'attention';
type RoutineView = 'automations' | 'scripts';

const automationFilterPillClassName =
  'h-7 shrink-0 whitespace-nowrap px-2 text-xs md:h-7 md:gap-1 md:px-2.5 md:text-xs [&>svg]:h-3 [&>svg]:w-3 [&>svg]:md:h-3.5 [&>svg]:md:w-3.5';
const routineViewPillClassName =
  'shrink-0 whitespace-nowrap md:h-9 md:gap-1.5 md:px-3.5 md:text-sm [&>svg]:md:h-4 [&>svg]:md:w-4';

function AutomationSummaryCard({
  label,
  value,
  tone = 'neutral',
  icon: Icon,
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'accent' | 'warning';
  icon: typeof Bot;
}) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const isWarning = tone === 'warning' && value > 0;
  const isAccent = tone === 'accent';

  return (
    <Panel
      muted
      padded={false}
      className="min-h-[5.75rem] p-4"
      style={{
        borderColor: isWarning
          ? 'rgba(245, 158, 11, 0.52)'
          : isAccent
            ? `${accentColor}4a`
            : undefined,
        boxShadow: isWarning ? '0 18px 44px -34px rgba(245, 158, 11, 0.72)' : undefined,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-semibold leading-4 ${surface.textMuted}`}>{label}</p>
          <p
            className={`mt-1.5 text-3xl font-semibold leading-none tracking-tight ${surface.textPrimary}`}
          >
            {value}
          </p>
        </div>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border"
          style={{
            backgroundColor: isWarning ? 'rgba(245, 158, 11, 0.14)' : `${accentColor}14`,
            borderColor: isWarning ? 'rgba(245, 158, 11, 0.32)' : `${accentColor}2e`,
            color: isWarning ? '#f59e0b' : accentColor,
          }}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
    </Panel>
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
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const habitsVisible = !isProductionEnvironment();
  const surface = getThemeSurfaceTokens(theme);
  const controller = useAutomationDashboardController();
  const [routineView, setRoutineView] = useState<RoutineView>('automations');
  const [automationFilter, setAutomationFilter] = useState<AutomationVisibilityFilter>('all');
  const [automationRoomFilter, setAutomationRoomFilter] = useState<string>('all');
  const totalTasks = controller.automations.length + controller.quickActions.length;
  const visibleAutomations = useMemo(() => {
    const filteredByState =
      automationFilter === 'active'
        ? controller.enabledAutomations
        : automationFilter === 'disabled'
          ? controller.disabledAutomations
          : automationFilter === 'recent'
            ? controller.recentlyTriggeredAutomations
            : automationFilter === 'attention'
              ? controller.attentionAutomations
              : controller.automations;

    if (automationRoomFilter !== 'all') {
      return filteredByState.filter((automation) => automation.room === automationRoomFilter);
    }

    return filteredByState;
  }, [
    automationFilter,
    automationRoomFilter,
    controller.attentionAutomations,
    controller.automations,
    controller.disabledAutomations,
    controller.enabledAutomations,
    controller.recentlyTriggeredAutomations,
  ]);
  const showRoomFilters = controller.automationRooms.length >= 2;
  const filteredEmptyMessage =
    automationFilter === 'attention'
      ? t('tasks.automation.empty.noAttention')
      : automationFilter === 'recent'
        ? t('tasks.automation.empty.noRecent')
        : t('tasks.automation.empty.filtered');

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
          title={t('sections.tasks.title')}
          description={t('tasks.dashboard.sourceNote')}
        />

        <section
          className="grid grid-cols-2 gap-3 md:grid-cols-5"
          aria-label={t('tasks.summary.title')}
        >
          <AutomationSummaryCard
            icon={Bot}
            label={t('tasks.summary.total')}
            value={controller.automationSummary.total}
          />
          <AutomationSummaryCard
            icon={Power}
            label={t('tasks.summary.active')}
            value={controller.automationSummary.active}
            tone="accent"
          />
          <AutomationSummaryCard
            icon={PowerOff}
            label={t('tasks.summary.disabled')}
            value={controller.automationSummary.disabled}
          />
          <AutomationSummaryCard
            icon={Sparkles}
            label={t('tasks.summary.recent')}
            value={controller.automationSummary.recent}
            tone="accent"
          />
          <AutomationSummaryCard
            icon={AlertTriangle}
            label={t('tasks.summary.attention')}
            value={controller.automationSummary.attention}
            tone="warning"
          />
        </section>

        <SectionCard
          title={t('sections.tasks.title')}
          description={t('sections.tasks.description')}
          contentClassName="px-4 py-5 md:px-8 md:py-8"
          padding="none"
        >
          <div className="space-y-4">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
              <InteractivePill
                active={routineView === 'automations'}
                aria-pressed={routineView === 'automations'}
                className={routineViewPillClassName}
                icon={Bot}
                intent="navigation"
                size="small"
                onClick={() => setRoutineView('automations')}
              >
                <span className="inline-flex items-center gap-2">
                  {t('sections.tasks.automations.title')}
                  <Badge tone="neutral" size="small">
                    {controller.automations.length}
                  </Badge>
                </span>
              </InteractivePill>
              <InteractivePill
                active={routineView === 'scripts'}
                aria-pressed={routineView === 'scripts'}
                className={routineViewPillClassName}
                icon={Sparkles}
                intent="navigation"
                size="small"
                onClick={() => setRoutineView('scripts')}
              >
                <span className="inline-flex items-center gap-2">
                  {t('tasks.quickActions.title')}
                  <Badge tone="neutral" size="small">
                    {controller.quickActions.length}
                  </Badge>
                </span>
              </InteractivePill>
            </div>

            {routineView === 'automations' ? (
              <>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
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
                    {t('tasks.filters.active')}
                  </InteractivePill>
                  <InteractivePill
                    active={automationFilter === 'disabled'}
                    aria-pressed={automationFilter === 'disabled'}
                    className={automationFilterPillClassName}
                    icon={PowerOff}
                    intent="navigation"
                    size="compact"
                    onClick={() => toggleAutomationFilter('disabled')}
                  >
                    {t('tasks.filters.disabled')}
                  </InteractivePill>
                  <InteractivePill
                    active={automationFilter === 'recent'}
                    aria-pressed={automationFilter === 'recent'}
                    className={automationFilterPillClassName}
                    icon={Sparkles}
                    intent="navigation"
                    size="compact"
                    onClick={() => toggleAutomationFilter('recent')}
                  >
                    {t('tasks.filters.recent')}
                  </InteractivePill>
                  <InteractivePill
                    active={automationFilter === 'attention'}
                    aria-pressed={automationFilter === 'attention'}
                    className={automationFilterPillClassName}
                    icon={AlertTriangle}
                    intent="navigation"
                    size="compact"
                    onClick={() => toggleAutomationFilter('attention')}
                  >
                    {t('tasks.filters.attention')}
                  </InteractivePill>
                </div>

                {showRoomFilters ? (
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
                    <InteractivePill
                      active={automationRoomFilter === 'all'}
                      aria-pressed={automationRoomFilter === 'all'}
                      className={automationFilterPillClassName}
                      intent="navigation"
                      size="compact"
                      onClick={() => setAutomationRoomFilter('all')}
                    >
                      {t('tasks.filters.allRooms')}
                    </InteractivePill>
                    {controller.automationRooms.map((room) => (
                      <InteractivePill
                        key={room}
                        active={automationRoomFilter === room}
                        aria-pressed={automationRoomFilter === room}
                        className={automationFilterPillClassName}
                        intent="navigation"
                        size="compact"
                        onClick={() =>
                          setAutomationRoomFilter((current) => (current === room ? 'all' : room))
                        }
                      >
                        {room}
                      </InteractivePill>
                    ))}
                  </div>
                ) : null}

                {visibleAutomations.length > 0 ? (
                  <div className="grid gap-3">
                    {visibleAutomations.map((automation) => (
                      <AutomationTaskRow
                        key={automation.id}
                        automation={automation}
                        shouldReduceMotion={controller.shouldReduceMotion}
                      />
                    ))}
                  </div>
                ) : (
                  <Panel muted padded={false} className="p-5 text-sm leading-6">
                    <p className={surface.textSecondary}>{filteredEmptyMessage}</p>
                  </Panel>
                )}
              </>
            ) : controller.quickActions.length > 0 ? (
              <QuickActionGrid
                actions={controller.quickActions}
                shouldReduceMotion={controller.shouldReduceMotion}
              />
            ) : (
              <Panel muted padded={false} className="p-5 text-sm leading-6">
                <p className={surface.textSecondary}>{t('tasks.quickActions.empty')}</p>
              </Panel>
            )}
          </div>
        </SectionCard>

        {habitsVisible ? <HabitInsightsPanel /> : null}
      </div>
    </div>
  );
}
