import { closestCenter, DndContext, DragOverlay } from '@dnd-kit/core';
import { Columns2, GripVertical, LayoutPanelTop, LayoutTemplate, Plus, Rows3 } from 'lucide-react';
import { memo, useDeferredValue } from 'react';
import { cardSizeOverlayClass } from '@/app/components/shared/card-size-selector';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import { type DragMeta, useHomeDashboardEditor } from '../hooks/use-home-dashboard-editor';
import { DashboardEditActions } from './dashboard-edit-actions';
import { DashboardHeroSection } from './dashboard-hero-section';
import {
  type HomeDashboardOverviewProps,
  useHomeLayoutViewport,
} from './home-dashboard-overview.shared';
import {
  EmptyCanvas,
  FlowCanvas,
  HomePresentation,
  ModeChip,
  SectionCanvasGrid,
} from './home-dashboard-overview-content';

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
  });

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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(event) => {
        const dragMeta = event.active.data.current as DragMeta | undefined;
        if (dragMeta?.source === 'section') {
          setActiveDragCard(null);
          setActiveDragSection(dragMeta.sectionId);
          return;
        }

        setActiveDragCard(dragMeta && 'cardId' in dragMeta ? dragMeta.cardId : null);
        setActiveDragSection(null);
      }}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6 md:space-y-8">
        <DashboardHeroSection
          accentColor={accentColor}
          surface={surface}
          eyebrow={
            <div
              className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${surface.textMuted}`}
            >
              {t('dashboard.homePersonal.eyebrow')}
            </div>
          }
          title={t('dashboard.homePersonal.title')}
          description={t('dashboard.homePersonal.description')}
          actions={
            onOpenAddCardDialog ? (
              <button
                type="button"
                onClick={() =>
                  onOpenAddCardDialog(
                    homeLayout.mode === 'sectioned'
                      ? (activeSectionId ?? homeLayout.sections[0]?.id)
                      : undefined
                  )
                }
                className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium text-white transition-colors"
                style={{
                  borderColor: `${accentColor}66`,
                  backgroundColor: accentColor,
                  boxShadow: `0 14px 28px -18px ${accentColor}`,
                }}
              >
                <Plus className="h-4 w-4" />
                <span>{t('dashboard.roomNav.addCard')}</span>
              </button>
            ) : null
          }
          aside={
            <div className="flex flex-wrap gap-2 xl:justify-end">
              {summaryItems.map((item) => (
                <div
                  key={item.label}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 ${surface.border} ${surface.panelMuted}`}
                >
                  <span className={`text-xs uppercase tracking-[0.16em] ${surface.textMuted}`}>
                    {item.label}
                  </span>
                  <span className={`text-sm font-semibold ${surface.textPrimary}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          }
        />

        <div>
          <DashboardEditActions isEditMode={isEditMode} onRemoveFromLayout={removeHomeCard}>
            <section
              className={`rounded-[28px] border p-5 md:p-6 ${surface.border} ${surface.panel} ${surface.cardShadow}`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className={`text-xl font-semibold ${surface.textPrimary}`}>
                    {t('dashboard.homePersonal.canvasTitle')}
                  </h2>
                  <p className={`mt-1 text-sm ${surface.textSecondary}`}>
                    {homeLayout.mode === 'sectioned'
                      ? t('dashboard.homePersonal.canvasSectioned')
                      : t('dashboard.homePersonal.canvasFlow')}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {homeLayout.mode === 'sectioned' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => addHomeSection()}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${surface.border} ${surface.hoverBg}`}
                      >
                        <Rows3 className="h-4 w-4" />
                        <span className={surface.textPrimary}>
                          {t('dashboard.homePersonal.addRow')}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addHomeColumnSection()}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${surface.border} ${surface.hoverBg}`}
                      >
                        <Columns2 className="h-4 w-4" />
                        <span className={surface.textPrimary}>
                          {t('dashboard.homePersonal.addColumn')}
                        </span>
                      </button>
                      <div className="hidden h-8 self-center w-px rounded-full bg-white/24 md:block" />
                    </>
                  ) : null}
                  <div className="hidden items-center gap-2 md:flex">
                    <ModeChip
                      active={homeLayout.mode === 'sectioned'}
                      icon={<LayoutPanelTop className="h-4 w-4" />}
                      label={t('dashboard.homePersonal.mode.sectioned')}
                      onClick={() => setHomeLayoutMode('sectioned')}
                      surface={surface}
                      accentColor={accentColor}
                    />
                    <ModeChip
                      active={homeLayout.mode === 'flow'}
                      icon={<LayoutTemplate className="h-4 w-4" />}
                      label={t('dashboard.homePersonal.mode.flow')}
                      onClick={() => setHomeLayoutMode('flow')}
                      surface={surface}
                      accentColor={accentColor}
                    />
                  </div>
                  <div className="md:hidden">
                    <ModeChip
                      active
                      icon={
                        homeLayout.mode === 'sectioned' ? (
                          <LayoutPanelTop className="h-4 w-4" />
                        ) : (
                          <LayoutTemplate className="h-4 w-4" />
                        )
                      }
                      label={
                        homeLayout.mode === 'sectioned'
                          ? t('dashboard.homePersonal.mode.flow')
                          : t('dashboard.homePersonal.mode.sectioned')
                      }
                      onClick={() => {
                        if (homeLayout.mode === 'sectioned') {
                          setHomeLayoutMode('flow');
                          return;
                        }

                        setHomeLayoutMode('sectioned');
                      }}
                      surface={surface}
                      accentColor={accentColor}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                {homeLayout.mode === 'sectioned' ? (
                  homeLayout.sections.length > 0 ? (
                    <SectionCanvasGrid
                      sections={sectionCards}
                      sectionGridCols={sectionGridCols}
                      activeSectionId={activeSectionId}
                      accentColor={accentColor}
                      allCards={allCards}
                      cardSizes={cardSizes}
                      updateCardSize={updateCardSize}
                      isEditMode={isEditMode}
                      onUpdateCard={onUpdateCard}
                      onRemoveFromLayout={removeHomeCard}
                      showHero={homeLayout.showHero}
                      onSelectSection={setActiveSectionId}
                      onOpenLibraryForSection={(sectionId) => {
                        setActiveSectionId(sectionId);
                      }}
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
            </section>
          </DashboardEditActions>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDragSection ? (
          <div className="w-70 rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl">
            <div className="flex items-center gap-3 text-white/80">
              <GripVertical className="h-5 w-5" />
              <div className="text-sm font-semibold">{t('dashboard.section.moveDragLabel')}</div>
            </div>
          </div>
        ) : activeDragCard && activeDragSize ? (
          <div
            className={`flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl ${
              cardSizeOverlayClass[activeDragSize]
            }`}
          >
            <GripVertical className="h-5 w-5 text-white/60" />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
});
