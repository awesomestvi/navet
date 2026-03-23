import { closestCenter, DndContext, DragOverlay, useDroppable } from '@dnd-kit/core';
import { rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import {
  ChevronLeft,
  ChevronRight,
  Columns2,
  EyeOff,
  GripVertical,
  LayoutPanelTop,
  LayoutTemplate,
  Plus,
  Rows3,
  Search,
  Wand2,
  X,
} from 'lucide-react';
import { type CSSProperties, memo, type ReactNode, useEffect, useRef, useState } from 'react';
import { type CardSize, getCardSpanClass } from '@/app/components/shared/card-size-selector';
import { getDndTransformStyle } from '@/app/components/shared/dnd-transform-style';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import { useBreakpointCols } from '@/app/hooks/use-breakpoint-cols';
import type { DeviceWithType } from '@/app/types/device.types';
import {
  type DragMeta,
  type DropMeta,
  type HomeEditorSection,
  type LibraryCard,
  useHomeDashboardEditor,
} from '../hooks/use-home-dashboard-editor';
import type {
  HomeDashboardLayoutState,
  HomeDashboardSectionSpan,
} from '../hooks/use-home-dashboard-layout';
import { useLibraryPanel } from '../hooks/use-library-panel';
import type { CustomCard } from '../stores/custom-cards-store';
import { DashboardCardItem } from './dashboard-card-item';
import { DashboardEditActions } from './dashboard-edit-actions';
import { DashboardEmptyState } from './dashboard-empty-state';
import { DashboardHeroSection } from './dashboard-hero-section';

interface HomeDashboardOverviewProps {
  deviceMap: Map<string, DeviceWithType>;
  availableDeviceMap: Map<string, DeviceWithType>;
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  isEditMode: boolean;
  hiddenEntityCount: number;
  allCustomCards: CustomCard[];
  homeLayout: HomeDashboardLayoutState;
  addHomeCard: (cardId: string, sectionId?: string) => void;
  removeHomeCard: (cardId: string) => void;
  moveHomeCard: (activeId: string, overId: string | null, sectionId?: string) => void;
  setHomeLayoutMode: (mode: HomeDashboardLayoutState['mode']) => void;
  addHomeSection: () => string;
  addHomeColumnSection: (targetSectionId?: string) => string;
  addHomeSectionBelow: (targetSectionId: string) => string;
  renameHomeSection: (sectionId: string, title: string) => void;
  removeHomeSection: (sectionId: string) => void;
  onOpenAddCardDialog?: (targetSectionId?: string) => void;
  onUpdateCard?: (cardId: string, data: Record<string, unknown>) => void;
  onToggleEditMode?: () => void;
  onShowEntity: (entityId: string) => void;
}

const overlayClass: Record<CardSize, string> = {
  'extra-small': 'w-[190px] h-[87px]',
  small: 'w-[190px] h-[190px]',
  medium: 'w-[396px] h-[190px]',
  large: 'w-[396px] h-[396px]',
  hero: 'w-full h-[277px]',
};

const LIBRARY_LIST_HEIGHT = 360; // 6 rows × 60px
const LIBRARY_ROW_HEIGHT = 60; // ~44px row (text + py-2) + 8px gap (gap-2 slot)
const LIBRARY_LIST_OVERSCAN = 1;
const SECTION_LAYOUT_BASE_COLS = 12;
const SECTION_GRID_GAP_CLASS = 'gap-2 md:gap-3 lg:gap-4';

function isCustomCard(entry: DeviceWithType | CustomCard): entry is CustomCard {
  return 'createdAt' in entry;
}

function getRenderedSectionSpan(span: HomeDashboardSectionSpan, cols: number): number {
  const normalizedSpan = Math.max(1, span);
  if (cols === SECTION_LAYOUT_BASE_COLS) {
    return Math.min(normalizedSpan, cols);
  }

  return Math.min(
    cols,
    Math.max(1, Math.round((normalizedSpan / SECTION_LAYOUT_BASE_COLS) * cols))
  );
}

function getRenderedSectionColumnStart(
  x: number,
  span: HomeDashboardSectionSpan,
  cols: number
): number {
  const renderedSpan = getRenderedSectionSpan(span, cols);
  const renderedX =
    cols === SECTION_LAYOUT_BASE_COLS
      ? x
      : Math.max(0, Math.round((Math.max(0, x) / SECTION_LAYOUT_BASE_COLS) * cols));

  return Math.min(cols - renderedSpan + 1, renderedX + 1);
}

function groupSectionRows<T extends { x: number; y: number }>(items: T[]): Map<number, T[]> {
  const rows = new Map<number, T[]>();
  for (const item of [...items].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const row = rows.get(item.y);
    if (row) row.push(item);
    else rows.set(item.y, [item]);
  }
  return rows;
}

function buildSectionStacks<T extends { id: string; x: number; y: number; span: number }>(
  items: T[]
) {
  const rows = groupSectionRows(items);
  const sortedYs = [...rows.keys()].sort((a, b) => a - b);
  const consumedIds = new Set<string>();

  return sortedYs.map((y) => {
    const rowItems = rows.get(y) ?? [];

    return rowItems
      .filter((item) => !consumedIds.has(item.id))
      .map((item) => {
        const stack = [item];
        consumedIds.add(item.id);

        let nextY = y + 1;
        while (true) {
          const nextRowItems = rows.get(nextY) ?? [];
          const nextItem = nextRowItems.find(
            (candidate) =>
              !consumedIds.has(candidate.id) &&
              candidate.x === item.x &&
              candidate.span === item.span
          );

          if (!nextItem) {
            break;
          }

          stack.push(nextItem);
          consumedIds.add(nextItem.id);
          nextY += 1;
        }

        return stack;
      });
  });
}

export const HomeDashboardOverview = memo(function HomeDashboardOverview({
  deviceMap,
  availableDeviceMap,
  cardSizes,
  updateCardSize,
  isEditMode,
  hiddenEntityCount,
  allCustomCards,
  homeLayout,
  addHomeCard,
  removeHomeCard,
  moveHomeCard,
  setHomeLayoutMode,
  addHomeSection,
  addHomeColumnSection,
  addHomeSectionBelow,
  renameHomeSection,
  removeHomeSection,
  onOpenAddCardDialog,
  onUpdateCard,
  onToggleEditMode,
  onShowEntity,
}: HomeDashboardOverviewProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const sectionGridCols = useBreakpointCols();
  const surface = getThemeSurfaceTokens(theme);
  const {
    libraryPanelRef,
    isLibraryVisible,
    isLibraryCollapsed,
    libraryPosition,
    handleStartLibraryDrag,
    toggleLibraryVisibility,
    expandLibrary,
    collapseLibraryToDock,
  } = useLibraryPanel();

  const {
    allCards,
    flowCards,
    sectionCards,
    activeSectionId,
    setActiveSectionId,
    activeDragCard,
    setActiveDragCard,
    activeDragSize,
    sensors,
    handleDragOver,
    handleDragEnd,
    libraryCards,
    libraryQuery,
    setLibraryQuery,
    filteredLibraryCards,
    handleAddFromLibrary,
    summaryItems,
  } = useHomeDashboardEditor({
    deviceMap,
    availableDeviceMap,
    allCustomCards,
    homeLayout,
    cardSizes,
    hiddenEntityCount,
    addHomeCard,
    moveHomeCard,
    addHomeSection,
    onShowEntity,
  });

  const primaryButtonStyle = {
    background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
    boxShadow: `0 20px 44px -24px ${accentColor}88`,
  };

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
        setActiveDragCard(dragMeta?.cardId ?? null);
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
            <>
              {libraryCards.length > 0 ? (
                <button
                  type="button"
                  onClick={toggleLibraryVisibility}
                  className={
                    isLibraryVisible
                      ? `inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${surface.border} ${surface.hoverBg}`
                      : 'inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold text-white'
                  }
                  style={isLibraryVisible ? undefined : primaryButtonStyle}
                >
                  {isLibraryVisible ? <EyeOff className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  <span className={isLibraryVisible ? surface.textPrimary : undefined}>
                    {!isLibraryVisible ? 'Show card library' : 'Hide card library'}
                  </span>
                </button>
              ) : null}
              {onOpenAddCardDialog ? (
                <button
                  type="button"
                  onClick={() =>
                    onOpenAddCardDialog(
                      homeLayout.mode === 'sectioned'
                        ? (activeSectionId ?? homeLayout.sections[0]?.id)
                        : undefined
                    )
                  }
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${surface.border} ${surface.hoverBg}`}
                >
                  <Plus className="h-4 w-4" />
                  <span className={surface.textPrimary}>Add Custom Widget</span>
                </button>
              ) : null}
            </>
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
          <DashboardEditActions
            isEditMode={isEditMode}
            onRemoveFromLayout={removeHomeCard}
            onSizeChange={updateCardSize}
          >
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
                        <span className={surface.textPrimary}>Add row</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addHomeColumnSection()}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${surface.border} ${surface.hoverBg}`}
                      >
                        <Columns2 className="h-4 w-4" />
                        <span className={surface.textPrimary}>Add column</span>
                      </button>
                      <div className="hidden h-8 self-center w-px rounded-full bg-white/24 md:block" />
                    </>
                  ) : null}
                  <ModeChip
                    active={homeLayout.mode === 'flow'}
                    icon={<LayoutPanelTop className="h-4 w-4" />}
                    label={t('dashboard.homePersonal.mode.flow')}
                    onClick={() => setHomeLayoutMode('flow')}
                    surface={surface}
                    accentColor={accentColor}
                  />
                  <ModeChip
                    active={homeLayout.mode === 'sectioned'}
                    icon={<LayoutTemplate className="h-4 w-4" />}
                    label={t('dashboard.homePersonal.mode.sectioned')}
                    onClick={() => {
                      setHomeLayoutMode('sectioned');
                      if (homeLayout.sections.length === 0) {
                        addHomeSection();
                      }
                    }}
                    surface={surface}
                    accentColor={accentColor}
                  />
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
                        expandLibrary();
                      }}
                      onAddSectionBelow={addHomeSectionBelow}
                      onRenameSection={renameHomeSection}
                      onRemoveSection={removeHomeSection}
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
                    allCards={allCards}
                    cardSizes={cardSizes}
                    updateCardSize={updateCardSize}
                    isEditMode={isEditMode}
                    onUpdateCard={onUpdateCard}
                    onRemoveFromLayout={removeHomeCard}
                    showHero={homeLayout.showHero}
                    surface={surface}
                  />
                )}
              </div>
            </section>
          </DashboardEditActions>
        </div>
      </div>

      {isLibraryVisible && isLibraryCollapsed ? (
        <button
          type="button"
          onClick={expandLibrary}
          className={`fixed z-40 flex items-center gap-2 rounded-l-2xl border px-3 py-3 ${surface.border} ${surface.panel} ${surface.cardShadow}`}
          style={{
            right: 0,
            top: `${libraryPosition.y + 12}px`,
          }}
          aria-label="Show card library"
        >
          <ChevronLeft className={`h-4 w-4 ${surface.textPrimary}`} />
          <span className={`text-sm font-medium ${surface.textPrimary}`}>
            {t('dashboard.homePersonal.libraryTitle')}
          </span>
        </button>
      ) : null}

      {isLibraryVisible && !isLibraryCollapsed ? (
        <aside
          ref={libraryPanelRef}
          className={`fixed left-0 top-0 z-40 w-[360px] cursor-grab rounded-[28px] border p-5 active:cursor-grabbing md:p-6 ${surface.border} ${surface.panel} ${surface.cardShadow}`}
          onPointerDown={(event) => {
            const target = event.target as HTMLElement;
            if (
              target.closest(
                'button, input, textarea, select, a, [role="button"], [data-library-interactive="true"]'
              )
            ) {
              return;
            }

            handleStartLibraryDrag(event);
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={`text-xl font-semibold ${surface.textPrimary}`}>
                {t('dashboard.homePersonal.libraryTitle')}
              </h2>
              <p className={`mt-1 text-sm ${surface.textSecondary}`}>
                {t('dashboard.homePersonal.libraryDescription')}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={collapseLibraryToDock}
                className={`rounded-full border p-2 ${surface.border} ${surface.hoverBg}`}
                aria-label="Put away card library"
              >
                <ChevronRight className={`h-4 w-4 ${surface.textPrimary}`} />
              </button>
              <button
                type="button"
                onClick={toggleLibraryVisibility}
                className={`rounded-full border p-2 ${surface.border} ${surface.hoverBg}`}
                aria-label="Close card library"
              >
                <X className={`h-4 w-4 ${surface.textPrimary}`} />
              </button>
            </div>
          </div>

          <div
            data-library-interactive="true"
            className={`mt-4 flex items-center gap-2 rounded-[18px] border px-3 py-3 ${surface.border} ${surface.panelMuted}`}
          >
            <Search className={`h-4 w-4 shrink-0 ${surface.textMuted}`} />
            <input
              type="text"
              value={libraryQuery}
              onChange={(event) => setLibraryQuery(event.target.value)}
              placeholder={t('dashboard.addEntity.searchPlaceholder')}
              className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${surface.textPrimary}`}
              style={{ caretColor: accentColor }}
            />
          </div>

          <LibraryList
            key={filteredLibraryCards.map((card) => card.id).join('|')}
            cards={filteredLibraryCards}
            surface={surface}
            emptyText={t('dashboard.homePersonal.libraryEmptyDescription')}
            onAdd={handleAddFromLibrary}
          />
        </aside>
      ) : null}

      <DragOverlay dropAnimation={null}>
        {activeDragCard && activeDragSize ? (
          <div
            className={`flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl ${
              overlayClass[
                !homeLayout.showHero && activeDragSize === 'hero' ? 'large' : activeDragSize
              ]
            }`}
          >
            <GripVertical className="h-5 w-5 text-white/60" />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
});

function SectionCanvas({
  sectionId,
  title,
  gridCols,
  isActive,
  accentColor,
  cardIds,
  allCards,
  cardSizes,
  updateCardSize,
  isEditMode,
  onUpdateCard,
  onRemoveFromLayout,
  showHero,
  onSelectSection,
  onOpenLibraryForSection,
  onRenameSection,
  onRemoveSection,
  surface,
}: {
  sectionId: string;
  title: string;
  gridCols: number;
  isActive: boolean;
  accentColor: string;
  cardIds: string[];
  allCards: Map<string, DeviceWithType | CustomCard>;
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  isEditMode: boolean;
  onUpdateCard?: (cardId: string, data: Record<string, unknown>) => void;
  onRemoveFromLayout: (cardId: string) => void;
  showHero: boolean;
  onSelectSection: (sectionId: string) => void;
  onOpenLibraryForSection: (sectionId: string) => void;
  onRenameSection: (sectionId: string, title: string) => void;
  onRemoveSection: (sectionId: string) => void;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  return (
    <section
      className={`relative rounded-[24px] border p-4 transition-[border-color,box-shadow,background-color] ${
        isActive
          ? `${surface.borderStrong} ${surface.panel}`
          : `${surface.border} ${surface.panelMuted}`
      }`}
      style={{
        boxShadow: isActive
          ? `0 0 0 2px ${accentColor}55, 0 22px 52px -34px ${accentColor}aa`
          : undefined,
      }}
    >
      <button
        type="button"
        aria-label={`Select ${title || 'section'}`}
        className="absolute inset-0 rounded-[24px]"
        onClick={() => onSelectSection(sectionId)}
      />
      <div className="relative z-10 mb-4 flex items-center gap-3">
        <input
          type="text"
          value={title}
          onChange={(event) => onRenameSection(sectionId, event.target.value)}
          onFocus={() => onSelectSection(sectionId)}
          className={`min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none ${surface.textPrimary}`}
        />
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemoveSection(sectionId);
          }}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${surface.border} ${surface.textSecondary} ${surface.hoverBg}`}
        >
          Remove
        </button>
      </div>

      <SortableContext
        items={cardIds.map((cardId) => `home-card-${cardId}`)}
        strategy={rectSortingStrategy}
      >
        <div className="relative z-10">
          <HomeContainerDropZone sectionId={sectionId} cardIds={cardIds}>
            {cardIds.length > 0 ? (
              <CardGrid
                cardIds={cardIds}
                sectionId={sectionId}
                gridCols={gridCols}
                allCards={allCards}
                cardSizes={cardSizes}
                updateCardSize={updateCardSize}
                isEditMode={isEditMode}
                onUpdateCard={onUpdateCard}
                onRemoveFromLayout={onRemoveFromLayout}
                showHero={showHero}
              />
            ) : (
              <EmptyCanvas
                label="Drop cards here"
                description="Drag device cards or widgets into this section."
                surface={surface}
                compact
                onClick={() => onOpenLibraryForSection(sectionId)}
              />
            )}
          </HomeContainerDropZone>
        </div>
      </SortableContext>
    </section>
  );
}

function SectionCanvasGrid({
  sections,
  sectionGridCols,
  activeSectionId,
  accentColor,
  allCards,
  cardSizes,
  updateCardSize,
  isEditMode,
  onUpdateCard,
  onRemoveFromLayout,
  showHero,
  onSelectSection,
  onOpenLibraryForSection,
  onAddSectionBelow,
  onRenameSection,
  onRemoveSection,
  surface,
}: {
  sections: HomeEditorSection[];
  sectionGridCols: number;
  activeSectionId: string | null;
  accentColor: string;
  allCards: Map<string, DeviceWithType | CustomCard>;
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  isEditMode: boolean;
  onUpdateCard?: (cardId: string, data: Record<string, unknown>) => void;
  onRemoveFromLayout: (cardId: string) => void;
  showHero: boolean;
  onSelectSection: (sectionId: string) => void;
  onOpenLibraryForSection: (sectionId: string) => void;
  onAddSectionBelow: (sectionId: string) => void;
  onRenameSection: (sectionId: string, title: string) => void;
  onRemoveSection: (sectionId: string) => void;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  const sectionStacksByRow = buildSectionStacks(sections);

  return (
    <div className="flex flex-col gap-5">
      {sectionStacksByRow.map((rowStacks, rowIndex) => {
        return (
          <div
            key={rowIndex}
            className={`grid ${SECTION_GRID_GAP_CLASS}`}
            style={
              {
                '--home-section-cols': sectionGridCols,
                gridTemplateColumns: 'repeat(var(--home-section-cols), minmax(0, 1fr))',
              } as CSSProperties
            }
          >
            {rowStacks.map((stack) => {
              const leadSection = stack[0];
              const renderedSpan = getRenderedSectionSpan(leadSection.span, sectionGridCols);
              const renderedColumnStart = getRenderedSectionColumnStart(
                leadSection.x,
                leadSection.span,
                sectionGridCols
              );
              return (
                <div
                  key={leadSection.id}
                  style={{ gridColumn: `${renderedColumnStart} / span ${renderedSpan}` }}
                >
                  <div className="space-y-3">
                    {stack.map((section) => (
                      <div key={section.id} className="space-y-3">
                        <SectionCanvas
                          sectionId={section.id}
                          title={section.title}
                          gridCols={renderedSpan}
                          isActive={activeSectionId === section.id}
                          accentColor={accentColor}
                          cardIds={section.cardIds}
                          allCards={allCards}
                          cardSizes={cardSizes}
                          updateCardSize={updateCardSize}
                          isEditMode={isEditMode}
                          onUpdateCard={onUpdateCard}
                          onRemoveFromLayout={onRemoveFromLayout}
                          showHero={showHero}
                          onSelectSection={onSelectSection}
                          onOpenLibraryForSection={onOpenLibraryForSection}
                          onRenameSection={onRenameSection}
                          onRemoveSection={onRemoveSection}
                          surface={surface}
                        />
                        <button
                          type="button"
                          onClick={() => onAddSectionBelow(section.id)}
                          className={`flex w-full items-center justify-center gap-2 rounded-[18px] border border-dashed px-3 py-3 text-sm font-medium transition-colors ${surface.borderStrong} ${surface.textSecondary} ${surface.hoverBg}`}
                        >
                          <Plus className="h-4 w-4" />
                          <span>Add section</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function FlowCanvas({
  cardIds,
  allCards,
  cardSizes,
  updateCardSize,
  isEditMode,
  onUpdateCard,
  onRemoveFromLayout,
  showHero,
  surface,
}: {
  cardIds: string[];
  allCards: Map<string, DeviceWithType | CustomCard>;
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  isEditMode: boolean;
  onUpdateCard?: (cardId: string, data: Record<string, unknown>) => void;
  onRemoveFromLayout: (cardId: string) => void;
  showHero: boolean;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  return (
    <SortableContext
      items={cardIds.map((cardId) => `home-card-${cardId}`)}
      strategy={rectSortingStrategy}
    >
      <HomeContainerDropZone cardIds={cardIds}>
        {cardIds.length > 0 ? (
          <CardGrid
            cardIds={cardIds}
            allCards={allCards}
            cardSizes={cardSizes}
            updateCardSize={updateCardSize}
            isEditMode={isEditMode}
            onUpdateCard={onUpdateCard}
            onRemoveFromLayout={onRemoveFromLayout}
            showHero={showHero}
          />
        ) : (
          <EmptyCanvas
            label="Start with an empty canvas"
            description="Drag cards in from the library and keep only what belongs on your home view."
            surface={surface}
          />
        )}
      </HomeContainerDropZone>
    </SortableContext>
  );
}

function HomePresentationSection({
  section,
  sectionGridCols,
  allCards,
  cardSizes,
  updateCardSize,
  onUpdateCard,
  showHero,
  surface,
}: {
  section: {
    id: string;
    title: string;
    span: HomeDashboardSectionSpan;
    cardIds: string[];
  };
  sectionGridCols: number;
  allCards: Map<string, DeviceWithType | CustomCard>;
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  onUpdateCard?: (cardId: string, data: Record<string, unknown>) => void;
  showHero: boolean;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  const renderedSpan = getRenderedSectionSpan(section.span, sectionGridCols);

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <h2 className={`text-lg font-semibold md:text-xl ${surface.textPrimary}`}>
          {section.title}
        </h2>
        <div className={`h-px flex-1 ${surface.borderStrong}`} />
      </div>
      <CardGrid
        cardIds={section.cardIds}
        gridCols={renderedSpan}
        allCards={allCards}
        cardSizes={cardSizes}
        updateCardSize={updateCardSize}
        isEditMode={false}
        onUpdateCard={onUpdateCard}
        onRemoveFromLayout={() => {}}
        showHero={showHero}
        sortable={false}
      />
    </div>
  );
}

function MeasuredPresentationSection({
  section,
  sectionGridCols,
  allCards,
  cardSizes,
  updateCardSize,
  onUpdateCard,
  showHero,
  surface,
}: {
  section: HomeEditorSection;
  sectionGridCols: number;
  allCards: Map<string, DeviceWithType | CustomCard>;
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  onUpdateCard?: (cardId: string, data: Record<string, unknown>) => void;
  showHero: boolean;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  const renderedSpan = getRenderedSectionSpan(section.span, sectionGridCols);
  const renderedColumnStart = getRenderedSectionColumnStart(
    section.x,
    section.span,
    sectionGridCols
  );

  return (
    <div style={{ gridColumn: `${renderedColumnStart} / span ${renderedSpan}` }}>
      <HomePresentationSection
        section={section}
        sectionGridCols={sectionGridCols}
        allCards={allCards}
        cardSizes={cardSizes}
        updateCardSize={updateCardSize}
        onUpdateCard={onUpdateCard}
        showHero={showHero}
        surface={surface}
      />
    </div>
  );
}

function CardGrid({
  cardIds,
  sectionId,
  gridCols,
  allCards,
  cardSizes,
  updateCardSize,
  isEditMode,
  onUpdateCard,
  onRemoveFromLayout,
  showHero,
  sortable = true,
}: {
  cardIds: string[];
  sectionId?: string;
  gridCols?: number;
  allCards: Map<string, DeviceWithType | CustomCard>;
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  isEditMode: boolean;
  onUpdateCard?: (cardId: string, data: Record<string, unknown>) => void;
  onRemoveFromLayout: (cardId: string) => void;
  showHero: boolean;
  sortable?: boolean;
}) {
  const breakpointCols = useBreakpointCols();
  const renderedGridCols = Math.max(1, Math.min(gridCols ?? breakpointCols, breakpointCols));

  return (
    <div
      className="grid w-full grid-flow-row-dense auto-rows-[87px] gap-2 md:gap-3 lg:gap-4"
      style={
        {
          '--home-card-cols': renderedGridCols,
          gridTemplateColumns: 'repeat(var(--home-card-cols), minmax(0, 1fr))',
        } as CSSProperties
      }
    >
      {cardIds.map((cardId) => {
        const entry = allCards.get(cardId);
        if (!entry) {
          return null;
        }

        const storedSize = cardSizes[cardId] ?? entry.size;
        const size = !showHero && storedSize === 'hero' ? 'large' : storedSize;
        const spanClass =
          !isCustomCard(entry) && entry.type === 'media' && size === 'large'
            ? 'col-span-1 row-span-4'
            : getCardSpanClass(size);

        return (
          <HomeCardSlot
            key={cardId}
            sortable={sortable}
            cardId={cardId}
            sectionId={sectionId}
            className={spanClass}
            content={
              !isCustomCard(entry) ? (
                <DashboardCardItem
                  id={cardId}
                  device={entry}
                  size={size}
                  isEditMode={isEditMode}
                  handleSizeChange={updateCardSize}
                  onRemoveFromLayout={onRemoveFromLayout}
                  allowHeroSizes={showHero}
                />
              ) : (
                <DashboardCardItem
                  id={cardId}
                  card={entry}
                  size={size}
                  isEditMode={isEditMode}
                  handleSizeChange={updateCardSize}
                  onUpdateCard={onUpdateCard}
                  onRemoveFromLayout={onRemoveFromLayout}
                  allowHeroSizes={showHero}
                />
              )
            }
          />
        );
      })}
    </div>
  );
}

function HomePresentation({
  flowCards,
  sections,
  allCards,
  cardSizes,
  updateCardSize,
  onUpdateCard,
  showHero,
  isSectioned,
  accentColor,
  surface,
  emptyTitle,
  emptyDescription,
  onToggleEditMode,
}: {
  flowCards: string[];
  sections: HomeEditorSection[];
  allCards: Map<string, DeviceWithType | CustomCard>;
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  onUpdateCard?: (cardId: string, data: Record<string, unknown>) => void;
  showHero: boolean;
  isSectioned: boolean;
  accentColor: string;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  emptyTitle: string;
  emptyDescription: string;
  onToggleEditMode?: () => void;
}) {
  const sectionGridCols = useBreakpointCols();
  const hasCards = flowCards.length > 0 || sections.some((section) => section.cardIds.length > 0);

  if (!hasCards) {
    return (
      <div className="py-4">
        <DashboardEmptyState
          title={emptyTitle}
          description={emptyDescription}
          surface={surface}
          accentColor={accentColor}
          actionLabel="Edit dashboard"
          onAction={onToggleEditMode}
          actionIcon={Wand2}
          className="mx-auto max-w-3xl"
        />
      </div>
    );
  }

  if (!isSectioned) {
    return (
      <CardGrid
        cardIds={flowCards}
        allCards={allCards}
        cardSizes={cardSizes}
        updateCardSize={updateCardSize}
        isEditMode={false}
        onUpdateCard={onUpdateCard}
        onRemoveFromLayout={() => {}}
        showHero={showHero}
        sortable={false}
      />
    );
  }

  const presentationRowStacks = buildSectionStacks(
    sections.filter((section) => section.cardIds.length > 0)
  );

  return (
    <div className="space-y-7 md:space-y-8">
      <div className="flex flex-col gap-6">
        {presentationRowStacks.map((rowStacks, rowIndex) => {
          return (
            <div
              key={rowIndex}
              className={`grid ${SECTION_GRID_GAP_CLASS}`}
              style={
                {
                  '--home-section-cols': sectionGridCols,
                  gridTemplateColumns: 'repeat(var(--home-section-cols), minmax(0, 1fr))',
                } as CSSProperties
              }
            >
              {rowStacks.map((stack) => {
                const leadSection = stack[0];
                const renderedSpan = getRenderedSectionSpan(leadSection.span, sectionGridCols);
                const renderedColumnStart = getRenderedSectionColumnStart(
                  leadSection.x,
                  leadSection.span,
                  sectionGridCols
                );

                return (
                  <div
                    key={leadSection.id}
                    style={{ gridColumn: `${renderedColumnStart} / span ${renderedSpan}` }}
                    className="space-y-6"
                  >
                    {stack.map((section) => (
                      <MeasuredPresentationSection
                        key={section.id}
                        section={section}
                        sectionGridCols={sectionGridCols}
                        allCards={allCards}
                        cardSizes={cardSizes}
                        updateCardSize={updateCardSize}
                        onUpdateCard={onUpdateCard}
                        showHero={showHero}
                        surface={surface}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {flowCards.length > 0 ? (
        <CardGrid
          cardIds={flowCards}
          allCards={allCards}
          cardSizes={cardSizes}
          updateCardSize={updateCardSize}
          isEditMode={false}
          onUpdateCard={onUpdateCard}
          onRemoveFromLayout={() => {}}
          showHero={showHero}
          sortable={false}
        />
      ) : null}
    </div>
  );
}

function HomeContainerDropZone({
  children,
  sectionId,
  cardIds,
}: {
  children: ReactNode;
  sectionId?: string;
  cardIds: string[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: sectionId ? `home-container-${sectionId}` : 'home-container-flow',
    data: { type: 'container', sectionId } satisfies DropMeta,
  });

  return (
    <div
      ref={setNodeRef}
      className={isOver && cardIds.length === 0 ? 'rounded-[24px] ring-1 ring-white/20' : undefined}
    >
      {children}
    </div>
  );
}

function SortableHomeCard({
  cardId,
  sectionId,
  className,
  children,
}: {
  cardId: string;
  sectionId?: string;
  className: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `home-card-${cardId}`,
    data: { source: 'home', cardId, sectionId, type: 'card' } as DragMeta & DropMeta,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={getDndTransformStyle(transform, transition)}
      className={`${className} relative h-full cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-40' : ''}`}
      data-card-id={cardId}
    >
      {children}
    </div>
  );
}

function HomeCardSlot({
  sortable,
  cardId,
  sectionId,
  className,
  content,
}: {
  sortable: boolean;
  cardId: string;
  sectionId?: string;
  className: string;
  content: ReactNode;
}) {
  if (!sortable) {
    return content;
  }

  return (
    <SortableHomeCard cardId={cardId} sectionId={sectionId} className={className}>
      {content}
    </SortableHomeCard>
  );
}

const LibraryCardRow = memo(function LibraryCardRow({
  card,
  surface,
  onAdd,
}: {
  card: LibraryCard;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  onAdd: () => void;
}) {
  return (
    <div
      data-library-interactive="true"
      className={`flex w-full items-center gap-2 rounded-[16px] border px-2.5 py-2 text-left ${surface.border} ${surface.panelMuted}`}
    >
      <GripVertical className={`h-3.5 w-3.5 shrink-0 ${surface.textMuted}`} />
      <div className="min-w-0 flex-1">
        <div className={`truncate text-sm font-medium ${surface.textPrimary}`}>{card.title}</div>
        <div className={`truncate text-xs ${surface.textSecondary}`}>
          {card.meta} · {card.subtitle}
        </div>
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onAdd();
        }}
        className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${surface.border} ${surface.textPrimary} ${surface.hoverBg}`}
      >
        Add
      </button>
    </div>
  );
});

const LibraryList = memo(function LibraryList({
  cards,
  surface,
  emptyText,
  onAdd,
}: {
  cards: LibraryCard[];
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  emptyText: string;
  onAdd: (cardId: string) => void;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const visibleCount = Math.ceil(LIBRARY_LIST_HEIGHT / LIBRARY_ROW_HEIGHT);
  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / LIBRARY_ROW_HEIGHT) - LIBRARY_LIST_OVERSCAN
  );
  const endIndex = Math.min(cards.length, startIndex + visibleCount + LIBRARY_LIST_OVERSCAN * 2);
  const virtualCards = cards.slice(startIndex, endIndex);
  const topOffset = startIndex * LIBRARY_ROW_HEIGHT;
  const totalHeight = cards.length * LIBRARY_ROW_HEIGHT;

  return (
    <div
      ref={listRef}
      data-library-interactive="true"
      className="mt-3 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ height: `${LIBRARY_LIST_HEIGHT}px` }}
      onScroll={(event) => {
        const next = event.currentTarget.scrollTop;
        if (rafRef.current !== null) return;
        rafRef.current = window.requestAnimationFrame(() => {
          rafRef.current = null;
          setScrollTop(next);
        });
      }}
    >
      {cards.length > 0 ? (
        <div className="relative" style={{ height: totalHeight }}>
          <div
            className="absolute inset-x-0 top-0 flex flex-col gap-2"
            style={{ transform: `translateY(${topOffset}px)` }}
          >
            {virtualCards.map((card) => (
              <LibraryCardRow
                key={card.id}
                card={card}
                surface={surface}
                onAdd={() => onAdd(card.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div
          className={`rounded-[18px] border border-dashed p-4 text-sm ${surface.borderStrong} ${surface.textSecondary}`}
        >
          {emptyText}
        </div>
      )}
    </div>
  );
});

function ModeChip({
  active,
  icon,
  label,
  onClick,
  surface,
  accentColor,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  accentColor: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${surface.border} ${surface.hoverBg}`}
      style={
        active
          ? {
              borderColor: `${accentColor}55`,
              backgroundColor: `${accentColor}12`,
            }
          : undefined
      }
    >
      {icon}
      <span className={surface.textPrimary}>{label}</span>
    </button>
  );
}

function EmptyCanvas({
  label,
  description,
  surface,
  compact = false,
  onClick,
}: {
  label: string;
  description: string;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  compact?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <div
      className={`relative overflow-hidden rounded-[20px] border-2 border-dashed text-center ${
        compact ? 'min-h-[180px] px-5 py-6' : 'min-h-[220px] px-5 py-8'
      } ${surface.panelMuted}`}
      style={{
        borderColor: 'rgba(255,255,255,0.16)',
        background:
          'radial-gradient(circle at top left, rgba(159,176,255,0.1), transparent 34%), radial-gradient(circle at bottom right, rgba(159,176,255,0.06), transparent 28%)',
      }}
    >
      <div className="relative mx-auto flex max-w-lg flex-col items-center justify-center">
        <div
          className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${surface.textMuted}`}
        >
          Empty section
        </div>
        <h3 className={`mt-2 text-base font-semibold tracking-tight ${surface.textPrimary}`}>
          {label}
        </h3>
        <p className={`mt-2 max-w-md text-sm leading-6 ${surface.textSecondary}`}>{description}</p>
        <div
          className={`mt-4 text-[11px] font-medium uppercase tracking-[0.16em] ${surface.textMuted}`}
        >
          Drag cards here or click to open the library
        </div>
      </div>
    </div>
  );

  if (!onClick) {
    return content;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-left transition-transform hover:scale-[1.01]"
    >
      {content}
    </button>
  );
}
