import { LoadingSpinner } from '@navet/app/components/primitives/loading-spinner';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { buildHomeStatusSummaryItems } from '@navet/app/features/sensors/components/home-status-summary-model';
import { InfoBadgeStrip } from '@navet/app/features/sensors/components/info-badge-strip';
import { useAccentColor, useI18n, useThemeMode } from '@navet/app/hooks';
import { useSettingsStore } from '@navet/app/stores';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { lazy, memo, Suspense, useMemo } from 'react';
import { useHomeEnergySummary } from '../hooks/use-home-energy-summary';
import {
  buildHomeOverviewCollections,
  type HomeDashboardOverviewProps,
  useHomeLayoutViewport,
} from './home-dashboard-overview.shared';
import { HomePresentation } from './home-dashboard-overview-presentation';

const HomeDashboardOverviewEdit = lazy(() => import('./home-dashboard-overview-edit'));

export const HomeDashboardOverview = memo(function HomeDashboardOverview({
  deviceMap,
  cardSizes,
  updateCardSize,
  isEditMode,
  hiddenEntityCount,
  allCustomCards,
  homeLayout,
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
  onOpenAddCardDialog,
  onUpdateCard,
  onToggleEditMode,
  onNavigateSection,
  routineCount,
}: HomeDashboardOverviewProps) {
  const { t } = useI18n();
  const theme = useThemeMode();
  const accentColor = useAccentColor();
  const showHomeSummaryBar = useSettingsStore(settingsSelectors.showHomeSummaryBar);
  const temperatureUnit = useSettingsStore(settingsSelectors.temperatureUnit);
  const energySummary = useHomeEnergySummary();
  const { effectiveCols: sectionGridCols, isPortrait: isPortraitHome } = useHomeLayoutViewport();
  const surface = getThemeSurfaceTokens(theme);
  const { allCards, flowCards, sectionCards } = useMemo(
    () =>
      buildHomeOverviewCollections({
        deviceMap,
        allCustomCards,
        homeLayout,
      }),
    [allCustomCards, deviceMap, homeLayout]
  );
  const statusSummaryItems = useMemo(
    () =>
      buildHomeStatusSummaryItems(deviceMap, {
        gridImportTodayKWh: energySummary.gridImportTodayKWh,
        routineCount,
        temperatureUnit,
      }),
    [deviceMap, energySummary.gridImportTodayKWh, routineCount, temperatureUnit]
  );
  const infoBadgeStrip =
    showHomeSummaryBar && onNavigateSection ? (
      <InfoBadgeStrip items={statusSummaryItems} onNavigate={onNavigateSection} />
    ) : null;

  if (!isEditMode) {
    return (
      <div className="space-y-3 lg:space-y-4">
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
          onToggleEditMode={onToggleEditMode}
        />
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingSpinner message={t('common.loading')} />}>
      <HomeDashboardOverviewEdit
        deviceMap={deviceMap}
        cardSizes={cardSizes}
        updateCardSize={updateCardSize}
        isEditMode={isEditMode}
        hiddenEntityCount={hiddenEntityCount}
        allCustomCards={allCustomCards}
        homeLayout={homeLayout}
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
        onOpenAddCardDialog={onOpenAddCardDialog}
        onUpdateCard={onUpdateCard}
        onToggleEditMode={onToggleEditMode}
        infoBadgeStrip={infoBadgeStrip}
      />
    </Suspense>
  );
});
