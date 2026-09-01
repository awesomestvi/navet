import { AttentionBand, type AttentionBandItem } from '@navet/app/components/patterns';
import { LoadingSpinner } from '@navet/app/components/primitives/loading-spinner';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { getHousePulse } from '@navet/app/features/chores/chore-dashboard-selectors';
import { useChoreWorkspaceStore } from '@navet/app/features/chores/chore-workspace-store';
import { useChoreWorkspaceSync } from '@navet/app/features/chores/use-chore-workspace-sync';
import { useNavetAiStore } from '@navet/app/features/navet-ai/navet-ai-store';
import { useProviderNotificationSnapshot } from '@navet/app/features/notifications/components/notifications/use-provider-notification-snapshot';
import { buildHomeStatusSummaryItems } from '@navet/app/features/sensors/components/home-status-summary-model';
import {
  SummaryBar,
  SummaryBarStack,
} from '@navet/app/features/sensors/components/info-badge-strip';
import { useAccentColor, useI18n, useThemeMode } from '@navet/app/hooks';
import { useSettingsStore } from '@navet/app/stores';
import { settingsSelectors } from '@navet/app/stores/selectors';
import {
  BatteryWarning,
  CalendarClock,
  CircleAlert,
  ClipboardCheck,
  CloudLightning,
  Gauge,
  ShieldAlert,
} from 'lucide-react';
import { lazy, memo, Suspense, useMemo } from 'react';
import { buildHomePriorityEntries } from '../home-priorities';
import { useHomeEnergySummary } from '../hooks/use-home-energy-summary';
import { useHomePriorities } from '../hooks/use-home-priorities';
import {
  type HomeDashboardOverviewProps,
  useHomeLayoutViewport,
  useHomeOverviewCollections,
} from './home-dashboard-overview.shared';
import { HomePresentation } from './home-dashboard-overview-presentation';

const HomeDashboardOverviewEdit = lazy(() => import('./home-dashboard-overview-edit'));

type HomeStatusSummaryProps = Pick<
  HomeDashboardOverviewProps,
  'onNavigateSection' | 'routineCount' | 'securityAlertCount' | 'summaryDeviceMap'
>;

const HomeStatusSummary = memo(function HomeStatusSummary({
  onNavigateSection,
  routineCount,
  securityAlertCount,
  summaryDeviceMap,
}: HomeStatusSummaryProps) {
  const { t } = useI18n();
  const temperatureUnit = useSettingsStore(settingsSelectors.temperatureUnit);
  const advancedCustomizationEnabled = useSettingsStore(
    settingsSelectors.advancedCustomizationEnabled
  );
  const customSummaryPills = useSettingsStore(settingsSelectors.customSummaryPills);
  const choresEnabled = useSettingsStore(settingsSelectors.choresEnabled);
  const energySummary = useHomeEnergySummary();
  const choreWorkspace = useChoreWorkspaceStore((state) => state.data);
  const choreSummary = useMemo(
    () => (choresEnabled && choreWorkspace ? getHousePulse(choreWorkspace) : undefined),
    [choreWorkspace, choresEnabled]
  );
  const statusSummaryItems = useMemo(
    () =>
      buildHomeStatusSummaryItems(
        summaryDeviceMap,
        {
          gridImportTodayKWh: energySummary.gridImportTodayKWh,
          routineCount,
          securityAlertCount,
          pendingChoreCount: choreSummary?.remaining,
          overdueChoreCount: choreSummary?.overdue,
          temperatureUnit,
          customSummaryPills: advancedCustomizationEnabled ? customSummaryPills : [],
        },
        t
      ),
    [
      advancedCustomizationEnabled,
      customSummaryPills,
      energySummary.gridImportTodayKWh,
      choreSummary,
      routineCount,
      securityAlertCount,
      summaryDeviceMap,
      t,
      temperatureUnit,
    ]
  );

  return onNavigateSection ? (
    <SummaryBar items={statusSummaryItems} onNavigate={onNavigateSection} />
  ) : null;
});

export const HomeDashboardOverview = memo(function HomeDashboardOverview({
  deviceMap,
  summaryDeviceMap,
  cardSizes,
  updateCardSize,
  isEditMode,
  hiddenEntityCount,
  allCustomCards,
  homeLayout,
  canRedoHomeLayout,
  canUndoHomeLayout,
  removeHomeCard,
  moveHomeCard,
  setHomeLayoutMode,
  addHomeSection,
  addHomeColumnSection,
  addHomeSectionBelow,
  moveHomeSection,
  moveHomeColumn,
  renameHomeSection,
  removeHomeSection,
  resizeHomeSection,
  redoHomeLayout,
  undoHomeLayout,
  onOpenAddCardDialog,
  onApplyDashboardPack,
  onUpdateCard,
  onToggleEditMode,
  onNavigateSection,
  routineCount,
  securityAlertCount,
  densePerformanceMode = false,
}: HomeDashboardOverviewProps) {
  const { t } = useI18n();
  const theme = useThemeMode();
  const accentColor = useAccentColor();
  const showHomeSummaryBar = useSettingsStore(settingsSelectors.showHomeSummaryBar);
  const choresEnabled = useSettingsStore(settingsSelectors.choresEnabled);
  const choreWorkspace = useChoreWorkspaceStore((state) => state.data);
  const aiState = useNavetAiStore((state) => state.state);
  const { repairIssues } = useProviderNotificationSnapshot();
  useChoreWorkspaceSync(choresEnabled);
  const { effectiveCols: sectionGridCols, isPortrait: isPortraitHome } = useHomeLayoutViewport();
  const surface = getThemeSurfaceTokens(theme);
  const { allCards, flowCards, sectionCards } = useHomeOverviewCollections({
    deviceMap,
    allCustomCards,
    homeLayout,
  });
  const energyEvidence = useMemo(() => {
    if (aiState?.settings.learningEnabled !== true) return null;
    const insight = aiState.insights.find(
      (item) =>
        item.detectorId === 'energy_spike' && Date.parse(item.createdAt) > Date.now() - 86_400_000
    );
    return insight ? { observedAt: insight.createdAt } : null;
  }, [aiState]);
  const priorityEntries = useMemo(
    () =>
      buildHomePriorityEntries({
        devices: [...deviceMap.values()],
        choreWorkspace,
        choresEnabled,
        repairIssues,
        showCalendarTitles: aiState?.settings.privateDetails?.calendarTitles,
        learningEnabled: aiState?.settings.learningEnabled,
        energyHigherThanUsual: energyEvidence,
      }),
    [
      aiState?.settings.learningEnabled,
      aiState?.settings.privateDetails?.calendarTitles,
      choreWorkspace,
      choresEnabled,
      deviceMap,
      energyEvidence,
      repairIssues,
    ]
  );
  const { entries: visiblePriorityEntries, addFeedback: addPriorityFeedback } =
    useHomePriorities(priorityEntries);
  const entryById = useMemo(
    () => new Map(visiblePriorityEntries.map((entry) => [entry.candidate.id, entry])),
    [visiblePriorityEntries]
  );
  const attentionItems = useMemo<AttentionBandItem[]>(
    () =>
      visiblePriorityEntries.map((entry) => {
        const icon =
          entry.candidate.source === 'security'
            ? ShieldAlert
            : entry.candidate.source === 'chores'
              ? ClipboardCheck
              : entry.candidate.source === 'weather'
                ? CloudLightning
                : entry.candidate.source === 'calendar'
                  ? CalendarClock
                  : entry.candidate.source === 'energy'
                    ? Gauge
                    : entry.candidate.reasonCode === 'battery_critical'
                      ? BatteryWarning
                      : CircleAlert;
        return {
          id: entry.candidate.id,
          title:
            entry.presentation.title ??
            (entry.presentation.titleKey ? t(entry.presentation.titleKey) : ''),
          detail: entry.presentation.detail,
          priority: entry.candidate.priority,
          icon,
          actionLabel: t('common.open'),
          secondaryActions:
            entry.candidate.priority === 'critical'
              ? undefined
              : [
                  { id: 'dismissed', label: t('habits.actions.dismiss') },
                  { id: 'snoozed', label: t('habits.actions.remindLater') },
                  { id: 'show_fewer', label: t('navetAi.feedback.hideSimilar') },
                ],
        };
      }),
    [t, visiblePriorityEntries]
  );
  const attentionBand = onNavigateSection ? (
    <AttentionBand
      items={attentionItems}
      maxVisibleItems={3}
      ariaLabel={t('priorities.ariaLabel')}
      onSelect={(item) => {
        const entry = entryById.get(item.id);
        if (entry) onNavigateSection(entry.candidate.sourceReference.section);
      }}
      onAction={(item, actionId) => {
        const entry = entryById.get(item.id);
        if (
          entry &&
          (actionId === 'dismissed' || actionId === 'snoozed' || actionId === 'show_fewer')
        ) {
          addPriorityFeedback(entry, actionId);
        }
      }}
    />
  ) : null;
  const infoBadgeStrip =
    showHomeSummaryBar && onNavigateSection ? (
      <HomeStatusSummary
        summaryDeviceMap={summaryDeviceMap}
        routineCount={routineCount}
        securityAlertCount={securityAlertCount}
        onNavigateSection={onNavigateSection}
      />
    ) : null;
  const presentation = (
    <SummaryBarStack>
      {attentionBand}
      {infoBadgeStrip}
      <HomePresentation
        flowCards={flowCards}
        sections={sectionCards}
        allCards={allCards}
        cardSizes={cardSizes}
        updateCardSize={updateCardSize}
        onUpdateCard={onUpdateCard}
        showHero={homeLayout.showHero}
        isSectioned={homeLayout.mode === 'sectioned'}
        gridCols={sectionGridCols}
        isPortraitHome={isPortraitHome}
        accentColor={accentColor}
        surface={surface}
        emptyTitle={t('dashboard.homeOverview.emptyTitle')}
        emptyDescription={t('dashboard.homeOverview.emptyDescription')}
        densePerformanceMode={densePerformanceMode}
        onToggleEditMode={onToggleEditMode}
      />
    </SummaryBarStack>
  );

  if (!isEditMode) {
    return presentation;
  }

  return (
    <Suspense fallback={<LoadingSpinner message={t('common.loading')} />}>
      <HomeDashboardOverviewEdit
        deviceMap={deviceMap}
        summaryDeviceMap={summaryDeviceMap}
        cardSizes={cardSizes}
        updateCardSize={updateCardSize}
        isEditMode={isEditMode}
        hiddenEntityCount={hiddenEntityCount}
        allCustomCards={allCustomCards}
        homeLayout={homeLayout}
        canRedoHomeLayout={canRedoHomeLayout}
        canUndoHomeLayout={canUndoHomeLayout}
        removeHomeCard={removeHomeCard}
        moveHomeCard={moveHomeCard}
        setHomeLayoutMode={setHomeLayoutMode}
        addHomeSection={addHomeSection}
        addHomeColumnSection={addHomeColumnSection}
        addHomeSectionBelow={addHomeSectionBelow}
        moveHomeSection={moveHomeSection}
        moveHomeColumn={moveHomeColumn}
        renameHomeSection={renameHomeSection}
        removeHomeSection={removeHomeSection}
        resizeHomeSection={resizeHomeSection}
        redoHomeLayout={redoHomeLayout}
        undoHomeLayout={undoHomeLayout}
        onOpenAddCardDialog={onOpenAddCardDialog}
        onApplyDashboardPack={onApplyDashboardPack}
        onUpdateCard={onUpdateCard}
        onToggleEditMode={onToggleEditMode}
        infoBadgeStrip={infoBadgeStrip}
      />
    </Suspense>
  );
});
