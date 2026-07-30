import { LoadingSpinner } from '@navet/app/components/primitives/loading-spinner';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
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
  const energySummary = useHomeEnergySummary();
  const statusSummaryItems = useMemo(
    () =>
      buildHomeStatusSummaryItems(
        summaryDeviceMap,
        {
          gridImportTodayKWh: energySummary.gridImportTodayKWh,
          routineCount,
          securityAlertCount,
          temperatureUnit,
          customSummaryPills: advancedCustomizationEnabled ? customSummaryPills : [],
        },
        t
      ),
    [
      advancedCustomizationEnabled,
      customSummaryPills,
      energySummary.gridImportTodayKWh,
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
  const { effectiveCols: sectionGridCols, isPortrait: isPortraitHome } = useHomeLayoutViewport();
  const surface = getThemeSurfaceTokens(theme);
  const { allCards, flowCards, sectionCards } = useHomeOverviewCollections({
    deviceMap,
    allCustomCards,
    homeLayout,
  });
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
