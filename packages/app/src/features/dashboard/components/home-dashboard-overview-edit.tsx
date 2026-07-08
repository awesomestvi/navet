import { closestCenter, DndContext, DragOverlay } from '@dnd-kit/core';
import { Badge } from '@navet/app/components/primitives';
import { getCardSizeOverlayStyle } from '@navet/app/components/shared/card-size-selector';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import { Columns2, GripVertical } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useCallback, useDeferredValue } from 'react';
import { type DragMeta, useHomeDashboardEditor } from '../hooks/use-home-dashboard-editor';
import { DashboardEditActions } from './dashboard-edit-actions';
import { DashboardHeroSection } from './dashboard-hero-section';
import {
  type HomeDashboardOverviewProps,
  useHomeLayoutViewport,
} from './home-dashboard-overview.shared';
import { EmptyCanvas, FlowCanvas, SectionCanvasGrid } from './home-dashboard-overview-content';

export default function HomeDashboardOverviewEdit({
  deviceMap,
  cardSizes,
  updateCardSize,
  isEditMode,
  hiddenEntityCount,
  allCustomCards,
  homeLayout,
  removeHomeCard,
  moveHomeCard,
  addHomeSectionBelow,
  moveHomeSection,
  moveHomeColumn,
  renameHomeSection,
  removeHomeSection,
  resizeHomeSection,
  onOpenAddCardDialog,
  onUpdateCard,
  infoBadgeStrip,
}: HomeDashboardOverviewProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const { effectiveCols: sectionGridCols, isPortrait: isPortraitHome } = useHomeLayoutViewport();
  const surface = getThemeSurfaceTokens(theme);
  const deferredDeviceMap = useDeferredValue(deviceMap);
  const deferredAllCustomCards = useDeferredValue(allCustomCards);
  const {
    allCards,
    flowCards,
    sectionCards,
    activeSectionId,
    setActiveSectionId,
    activeDragCard,
    setActiveDragCard,
    activeDragSection,
    setActiveDragSection,
    activeDragColumn,
    setActiveDragColumn,
    activeDragSize,
    sensors,
    handleDragOver,
    handleDragEnd,
    summaryItems,
  } = useHomeDashboardEditor({
    deviceMap: deferredDeviceMap,
    allCustomCards: deferredAllCustomCards,
    homeLayout,
    cardSizes,
    hiddenEntityCount,
    moveHomeCard,
    moveHomeSection,
    moveHomeColumn,
  });

  const handleDragStart = useCallback(
    (event: Parameters<NonNullable<ComponentProps<typeof DndContext>['onDragStart']>>[0]) => {
      const dragMeta = event.active.data.current as DragMeta | undefined;
      if (dragMeta?.source === 'column') {
        setActiveDragCard(null);
        setActiveDragSection(null);
        setActiveDragColumn(dragMeta.sectionId);
        return;
      }

      if (dragMeta?.source === 'section') {
        setActiveDragCard(null);
        setActiveDragColumn(null);
        setActiveDragSection(dragMeta.sectionId);
        return;
      }

      setActiveDragCard(dragMeta && 'cardId' in dragMeta ? dragMeta.cardId : null);
      setActiveDragSection(null);
      setActiveDragColumn(null);
    },
    [setActiveDragCard, setActiveDragColumn, setActiveDragSection]
  );

  const selectSection = useCallback(
    (sectionId: string) => {
      setActiveSectionId(sectionId);
    },
    [setActiveSectionId]
  );
  const hasCards =
    flowCards.length > 0 || sectionCards.some((section) => section.cardIds.length > 0);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-3 lg:gap-4">
        {!hasCards ? (
          <DashboardHeroSection
            accentColor={accentColor}
            surface={surface}
            title={t('dashboard.homePersonal.title')}
            description={t('dashboard.homePersonal.description')}
            actions={null}
            aside={
              <div className="flex flex-wrap gap-2 xl:justify-end">
                {summaryItems.slice(0, 1).map((item) => (
                  <Badge key={item.label} tone="neutral">
                    {item.value} {item.label}
                  </Badge>
                ))}
              </div>
            }
          />
        ) : null}

        <DashboardEditActions isEditMode={isEditMode} onRemoveFromLayout={removeHomeCard}>
          <div className="space-y-3 md:space-y-3">
            <div className="min-w-0">{infoBadgeStrip}</div>
            {homeLayout.mode === 'sectioned' ? (
              homeLayout.sections.length > 0 ? (
                <SectionCanvasGrid
                  sections={sectionCards}
                  sectionGridCols={sectionGridCols}
                  activeSectionId={activeSectionId}
                  activeDragColumn={activeDragColumn}
                  activeDragSection={activeDragSection}
                  activeDragCard={activeDragCard}
                  accentColor={accentColor}
                  allCards={allCards}
                  cardSizes={cardSizes}
                  updateCardSize={updateCardSize}
                  isEditMode={isEditMode}
                  onUpdateCard={onUpdateCard}
                  onRemoveFromLayout={removeHomeCard}
                  showHero={homeLayout.showHero}
                  onSelectSection={selectSection}
                  onOpenLibraryForSection={selectSection}
                  onOpenAddCardDialog={onOpenAddCardDialog}
                  onAddSectionBelow={addHomeSectionBelow}
                  onRenameSection={renameHomeSection}
                  onRemoveSection={removeHomeSection}
                  onResizeSection={resizeHomeSection}
                  isPortraitHome={isPortraitHome}
                  surface={surface}
                />
              ) : (
                <EmptyCanvas
                  label={t('dashboard.homePersonal.noSections')}
                  description={t('dashboard.homePersonal.noSectionsDescription')}
                  surface={surface}
                />
              )
            ) : (
              <FlowCanvas
                cardIds={flowCards}
                gridCols={sectionGridCols}
                activeDragCard={activeDragCard}
                allCards={allCards}
                cardSizes={cardSizes}
                updateCardSize={updateCardSize}
                isEditMode={isEditMode}
                onUpdateCard={onUpdateCard}
                onRemoveFromLayout={removeHomeCard}
                showHero={homeLayout.showHero}
                surface={surface}
                onOpenAddCardDialog={onOpenAddCardDialog}
              />
            )}
          </div>
        </DashboardEditActions>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDragColumn ? (
          <div className="w-70 rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl">
            <div className="flex items-center gap-3 text-white/80">
              <Columns2 className="h-5 w-5" />
              <div className="text-sm font-semibold">Move column</div>
            </div>
          </div>
        ) : activeDragSection ? (
          <div className="w-70 rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl">
            <div className="flex items-center gap-3 text-white/80">
              <GripVertical className="h-5 w-5" />
              <div className="text-sm font-semibold">Move section</div>
            </div>
          </div>
        ) : activeDragCard && activeDragSize ? (
          <div
            className="flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl"
            style={getCardSizeOverlayStyle(activeDragSize)}
          >
            <GripVertical className="h-5 w-5 text-white/76" />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
