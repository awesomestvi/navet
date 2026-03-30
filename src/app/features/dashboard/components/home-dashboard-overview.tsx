import { lazy, memo, Suspense, useMemo } from 'react';
import { LoadingSpinner } from '@/app/components/shared/loading-spinner';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import type { DeviceWithType } from '@/app/types/device.types';
import type { CustomCard } from '../stores/custom-cards-store';
import {
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
}: HomeDashboardOverviewProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const { effectiveCols: sectionGridCols, isPortrait: isPortraitHome } = useHomeLayoutViewport();
  const surface = getThemeSurfaceTokens(theme);
  const { allCards, flowCards, sectionCards } = useMemo(() => {
    const cards = new Map<string, DeviceWithType | CustomCard>();
    for (const [id, device] of deviceMap) {
      cards.set(id, device);
    }

    for (const card of allCustomCards) {
      cards.set(card.id, card);
    }

    const sectionIdSet = new Set(homeLayout.sections.map((section) => section.id));
    const selectedIds = homeLayout.cardIds.filter((id) => cards.has(id));
    const groupedCards = new Map<string, string[]>();

    for (const id of selectedIds) {
      const sectionId = homeLayout.cardSectionAssignments[id];
      if (!sectionId || !sectionIdSet.has(sectionId)) {
        continue;
      }

      const existing = groupedCards.get(sectionId);
      if (existing) {
        existing.push(id);
      } else {
        groupedCards.set(sectionId, [id]);
      }
    }

    return {
      allCards: cards,
      flowCards:
        homeLayout.mode !== 'sectioned'
          ? selectedIds
          : selectedIds.filter((id) => {
              const assignedSectionId = homeLayout.cardSectionAssignments[id];
              return !assignedSectionId || !sectionIdSet.has(assignedSectionId);
            }),
      sectionCards: homeLayout.sections.map((section) => ({
        ...section,
        cardIds: groupedCards.get(section.id) ?? [],
      })),
    };
  }, [
    allCustomCards,
    deviceMap,
    homeLayout.cardIds,
    homeLayout.cardSectionAssignments,
    homeLayout.mode,
    homeLayout.sections,
  ]);

  if (!isEditMode) {
    return (
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
      />
    </Suspense>
  );
});
