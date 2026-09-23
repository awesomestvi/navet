import { LoadingSpinner } from '@navet/app/components/primitives/loading-spinner';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { getHousePulse } from '@navet/app/features/chores/chore-dashboard-selectors';
import { useChoreWorkspaceStore } from '@navet/app/features/chores/chore-workspace-store';
import { useChoreWorkspaceSync } from '@navet/app/features/chores/use-chore-workspace-sync';
import { buildHomeStatusSummaryItems } from '@navet/app/features/sensors/components/home-status-summary-model';
import {
  SummaryBar,
  SummaryBarStack,
} from '@navet/app/features/sensors/components/info-badge-strip';
import { useAccentColor, useI18n, useThemeMode } from '@navet/app/hooks';
import { useSettingsStore } from '@navet/app/stores';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { lazy, memo, Suspense, useMemo } from 'react';
import { useHomeEnergySummary } from '../hooks/use-home-energy-summary';
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
  useChoreWorkspaceSync(choresEnabled);
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

const HomePresentationView = memo(function HomePresentationView({
  deviceMap,
  cardSizes,
  updateCardSize,
  allCustomCards,
  homeLayout,
  onUpdateCard,
  onToggleEditMode,
  densePerformanceMode = false,
  infoBadgeStrip,
}: HomeDashboardOverviewProps) {
  const { t } = useI18n();
  const theme = useThemeMode();
  const accentColor = useAccentColor();
  const { effectiveCols: sectionGridCols, isPortrait: isPortraitHome } = useHomeLayoutViewport();
  const surface = getThemeSurfaceTokens(theme);
  const { allCards, flowCards, sectionCards } = useHomeOverviewCollections({
    deviceMap,
    allCustomCards,
    homeLayout,
  });
  return (
    <SummaryBarStack>
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
});

export const HomeDashboardOverview = memo(function HomeDashboardOverview(
  props: HomeDashboardOverviewProps
) {
  const { t } = useI18n();
  const showHomeSummaryBar = useSettingsStore(settingsSelectors.showHomeSummaryBar);
  const infoBadgeStrip =
    showHomeSummaryBar && props.onNavigateSection ? (
      <HomeStatusSummary
        summaryDeviceMap={props.summaryDeviceMap}
        routineCount={props.routineCount}
        securityAlertCount={props.securityAlertCount}
        onNavigateSection={props.onNavigateSection}
      />
    ) : null;

  if (!props.isEditMode) {
    return <HomePresentationView {...props} infoBadgeStrip={infoBadgeStrip} />;
  }

  return (
    <Suspense fallback={<LoadingSpinner message={t('common.loading')} />}>
      <HomeDashboardOverviewEdit {...props} infoBadgeStrip={infoBadgeStrip} />
    </Suspense>
  );
});
