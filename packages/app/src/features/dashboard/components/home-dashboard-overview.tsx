import { LoadingSpinner } from '@navet/app/components/primitives/loading-spinner';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { buildHomeStatusSummaryItems } from '@navet/app/features/sensors/components/home-status-summary-model';
import { SummaryBar } from '@navet/app/features/sensors/components/info-badge-strip';
import { useAccentColor, useI18n, useThemeMode } from '@navet/app/hooks';
import { useSettingsStore } from '@navet/app/stores';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { lazy, memo, Suspense, useEffect, useMemo, useState } from 'react';
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
  summaryDeviceMap,
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
  securityAlertCount,
  densePerformanceMode = false,
}: HomeDashboardOverviewProps) {
  const { t } = useI18n();
  const theme = useThemeMode();
  const accentColor = useAccentColor();
  const showHomeSummaryBar = useSettingsStore(settingsSelectors.showHomeSummaryBar);
  const temperatureUnit = useSettingsStore(settingsSelectors.temperatureUnit);
  const advancedCustomizationEnabled = useSettingsStore(
    settingsSelectors.advancedCustomizationEnabled
  );
  const customSummaryPills = useSettingsStore(settingsSelectors.customSummaryPills);
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
      buildHomeStatusSummaryItems(summaryDeviceMap, {
        gridImportTodayKWh: energySummary.gridImportTodayKWh,
        routineCount,
        securityAlertCount,
        temperatureUnit,
        customSummaryPills: advancedCustomizationEnabled ? customSummaryPills : [],
      }),
    [
      advancedCustomizationEnabled,
      customSummaryPills,
      summaryDeviceMap,
      energySummary.gridImportTodayKWh,
      routineCount,
      securityAlertCount,
      temperatureUnit,
    ]
  );
  const infoBadgeStrip =
    showHomeSummaryBar && onNavigateSection ? (
      <SummaryBar items={statusSummaryItems} onNavigate={onNavigateSection} />
    ) : null;
  const [hasActivatedEditMode, setHasActivatedEditMode] = useState(isEditMode);

  useEffect(() => {
    if (isEditMode) {
      setHasActivatedEditMode(true);
    }
  }, [isEditMode]);

  const presentation = (
    <div
      className={`space-y-3 md:space-y-3${isEditMode ? ' hidden' : ''}`}
      aria-hidden={isEditMode}
    >
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
    </div>
  );

  if (!isEditMode) {
    return (
      <>
        {presentation}
        {hasActivatedEditMode ? (
          <div className="hidden" aria-hidden="true">
            <Suspense fallback={null}>
              <HomeDashboardOverviewEdit
                deviceMap={deviceMap}
                summaryDeviceMap={summaryDeviceMap}
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
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      {presentation}
      <div aria-hidden={false}>
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
      </div>
    </>
  );
});
