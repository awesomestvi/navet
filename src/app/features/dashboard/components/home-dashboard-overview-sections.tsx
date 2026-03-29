import { useDraggable, useDroppable } from '@dnd-kit/core';
import { rectSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import { GripVertical, Minus, Plus, Wand2 } from 'lucide-react';
import { type CSSProperties, memo } from 'react';
import { getDndTransformStyle } from '@/app/components/shared/dnd-transform-style';
import type { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n } from '@/app/hooks';
import type { DeviceWithType } from '@/app/types/device.types';
import type { DragMeta, DropMeta, HomeEditorSection } from '../hooks/use-home-dashboard-editor';
import type { CustomCard } from '../stores/custom-cards-store';
import {
  getRenderedRowLayouts,
  getSectionCardMinColumns,
  getSectionMinBaseWidth,
  SECTION_LAYOUT_COLUMNS,
} from '../utils/layout-engine';
import { DashboardEmptyState } from './dashboard-empty-state';
import {
  areCardIdsStable,
  buildPortraitStackRows,
  buildSectionStacks,
  getPortraitLaneCount,
  getRenderedSectionColumnStart,
  getRenderedSectionSpan,
  getStackMinSpan,
  getStoredSectionSpan,
  type HomePresentationSectionProps,
  NOOP_REMOVE_FROM_LAYOUT,
  SECTION_GRID_GAP_CLASS,
  type SectionCanvasProps,
  splitRowStacksByMinSpan,
} from './home-dashboard-overview.shared';
import { CardGrid, EmptyCanvas } from './home-dashboard-overview-card-grid';

export function SectionCanvasGrid({
  sections,
  sectionGridCols,
  isPortraitHome,
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
  onOpenAddCardDialog,
  onAddSectionBelow,
  onRenameSection,
  onRemoveSection,
  onResizeSection,
  surface,
}: {
  sections: HomeEditorSection[];
  sectionGridCols: number;
  isPortraitHome: boolean;
  activeSectionId: string | null;
  accentColor: string;
  allCards: Map<string, DeviceWithType | CustomCard>;
  cardSizes: Record<string, import('@/app/components/shared/card-size-selector').CardSize>;
  updateCardSize: (
    id: string,
    size: import('@/app/components/shared/card-size-selector').CardSize
  ) => void;
  isEditMode: boolean;
  onUpdateCard?: (cardId: string, data: Record<string, unknown>) => void;
  onRemoveFromLayout: (cardId: string) => void;
  showHero: boolean;
  onSelectSection: (sectionId: string) => void;
  onOpenLibraryForSection: (sectionId: string) => void;
  onOpenAddCardDialog?: (sectionId?: string) => void;
  onAddSectionBelow: (sectionId: string) => void;
  onRenameSection: (sectionId: string, title: string) => void;
  onRemoveSection: (sectionId: string) => void;
  onResizeSection: (
    sectionId: string,
    newW: number,
    minWidthsBySection?: Record<string, number>
  ) => void;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  const sectionStacksByRow = buildSectionStacks(sections);
  const portraitLaneCount = getPortraitLaneCount(sectionGridCols);
  const visibleRows = (
    isPortraitHome
      ? buildPortraitStackRows(sectionStacksByRow, portraitLaneCount)
      : sectionStacksByRow
  ).flatMap((rowStacks) => splitRowStacksByMinSpan(rowStacks, sectionGridCols, cardSizes));
  const portraitLaneCols = Math.max(1, Math.floor(sectionGridCols / portraitLaneCount));
  const minWidthsBySection = Object.fromEntries(
    sections.map((section) => [
      section.id,
      getSectionMinBaseWidth(section.cardIds, cardSizes, sectionGridCols),
    ])
  );

  return (
    <div className="flex flex-col gap-5">
      {visibleRows.map((rowStacks, rowIndex) => {
        const rowMinSpansById = Object.fromEntries(
          rowStacks.map((stack) => [stack[0].id, getStackMinSpan(stack, cardSizes)])
        );
        const rowLayouts = getRenderedRowLayouts(
          rowStacks.map((stack) => ({
            id: stack[0].id,
            x: stack[0].x,
            span: getStoredSectionSpan(stack[0]),
          })),
          sectionGridCols,
          rowMinSpansById
        );

        return (
          <div key={rowIndex} className="space-y-4">
            <div
              className={`grid ${SECTION_GRID_GAP_CLASS}`}
              style={
                isPortraitHome
                  ? ({
                      gridTemplateColumns: `repeat(${portraitLaneCount}, minmax(0, 1fr))`,
                    } as CSSProperties)
                  : ({
                      '--home-section-cols': sectionGridCols,
                      gridTemplateColumns: 'repeat(var(--home-section-cols), minmax(0, 1fr))',
                    } as CSSProperties)
              }
            >
              {rowStacks.map((stack) => {
                const leadSection = stack[0];
                const rowLayout = rowLayouts.get(leadSection.id);
                const renderedSpan = isPortraitHome
                  ? portraitLaneCols
                  : (rowLayout?.span ??
                    getRenderedSectionSpan(getStoredSectionSpan(leadSection), sectionGridCols));
                const renderedColumnStart =
                  rowLayout?.start ??
                  getRenderedSectionColumnStart(
                    leadSection.x,
                    getStoredSectionSpan(leadSection),
                    sectionGridCols
                  );

                return (
                  <div
                    key={leadSection.id}
                    style={
                      isPortraitHome
                        ? undefined
                        : { gridColumn: `${renderedColumnStart} / span ${renderedSpan}` }
                    }
                    className="space-y-4"
                  >
                    {stack.map((section) => (
                      <SectionCanvas
                        key={section.id}
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
                        onOpenAddCardDialog={onOpenAddCardDialog}
                        onRenameSection={onRenameSection}
                        onRemoveSection={onRemoveSection}
                        span={getStoredSectionSpan(section)}
                        layoutCols={sectionGridCols}
                        minWidthsBySection={minWidthsBySection}
                        rowSiblingCount={rowStacks.length}
                        onResizeSection={onResizeSection}
                        surface={surface}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
            <SectionInsertDropZone
              sectionId={
                rowStacks[rowStacks.length - 1]?.[rowStacks[rowStacks.length - 1].length - 1]?.id ??
                ''
              }
              onAddSectionBelow={onAddSectionBelow}
              surface={surface}
            />
          </div>
        );
      })}
    </div>
  );
}

export function HomePresentation({
  flowCards,
  sections,
  gridCols,
  isPortraitHome,
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
  gridCols: number;
  isPortraitHome: boolean;
  allCards: Map<string, DeviceWithType | CustomCard>;
  cardSizes: Record<string, import('@/app/components/shared/card-size-selector').CardSize>;
  updateCardSize: (
    id: string,
    size: import('@/app/components/shared/card-size-selector').CardSize
  ) => void;
  onUpdateCard?: (cardId: string, data: Record<string, unknown>) => void;
  showHero: boolean;
  isSectioned: boolean;
  accentColor: string;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  emptyTitle: string;
  emptyDescription: string;
  onToggleEditMode?: () => void;
}) {
  const sectionGridCols = gridCols;
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
        gridCols={sectionGridCols}
        allCards={allCards}
        cardSizes={cardSizes}
        updateCardSize={updateCardSize}
        isEditMode={false}
        onUpdateCard={onUpdateCard}
        onRemoveFromLayout={NOOP_REMOVE_FROM_LAYOUT}
        showHero={showHero}
        sortable={false}
      />
    );
  }

  const presentationRowStacks = buildSectionStacks(
    sections.filter((section) => section.cardIds.length > 0)
  );
  const portraitLaneCount = getPortraitLaneCount(sectionGridCols);
  const visibleRows = (
    isPortraitHome
      ? buildPortraitStackRows(presentationRowStacks, portraitLaneCount)
      : presentationRowStacks
  ).flatMap((rowStacks) => splitRowStacksByMinSpan(rowStacks, sectionGridCols, cardSizes));
  const portraitLaneCols = Math.max(1, Math.floor(sectionGridCols / portraitLaneCount));

  return (
    <div className="space-y-7 md:space-y-8">
      <div className="flex flex-col gap-6">
        {visibleRows.map((rowStacks, rowIndex) => {
          const rowMinSpansById = Object.fromEntries(
            rowStacks.map((stack) => [stack[0].id, getStackMinSpan(stack, cardSizes)])
          );
          const rowLayouts = getRenderedRowLayouts(
            rowStacks.map((stack) => ({
              id: stack[0].id,
              x: stack[0].x,
              span: getStoredSectionSpan(stack[0]),
            })),
            sectionGridCols,
            rowMinSpansById
          );

          return (
            <div
              key={rowIndex}
              className={`grid ${SECTION_GRID_GAP_CLASS}`}
              style={
                isPortraitHome
                  ? ({
                      gridTemplateColumns: `repeat(${portraitLaneCount}, minmax(0, 1fr))`,
                    } as CSSProperties)
                  : ({
                      '--home-section-cols': sectionGridCols,
                      gridTemplateColumns: 'repeat(var(--home-section-cols), minmax(0, 1fr))',
                    } as CSSProperties)
              }
            >
              {rowStacks.map((stack) => {
                const leadSection = stack[0];
                const rowLayout = rowLayouts.get(leadSection.id);
                const renderedSpan = isPortraitHome
                  ? portraitLaneCols
                  : (rowLayout?.span ??
                    getRenderedSectionSpan(getStoredSectionSpan(leadSection), sectionGridCols));
                const renderedColumnStart =
                  rowLayout?.start ??
                  getRenderedSectionColumnStart(
                    leadSection.x,
                    getStoredSectionSpan(leadSection),
                    sectionGridCols
                  );

                return (
                  <div
                    key={leadSection.id}
                    style={
                      isPortraitHome
                        ? undefined
                        : { gridColumn: `${renderedColumnStart} / span ${renderedSpan}` }
                    }
                    className="space-y-6"
                  >
                    {stack.map((section) => (
                      <HomePresentationSection
                        key={section.id}
                        section={section}
                        renderedSpan={renderedSpan}
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
          gridCols={sectionGridCols}
          allCards={allCards}
          cardSizes={cardSizes}
          updateCardSize={updateCardSize}
          isEditMode={false}
          onUpdateCard={onUpdateCard}
          onRemoveFromLayout={NOOP_REMOVE_FROM_LAYOUT}
          showHero={showHero}
          sortable={false}
        />
      ) : null}
    </div>
  );
}

const SectionCanvas = memo(function SectionCanvas({
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
  onOpenAddCardDialog,
  onRenameSection,
  onRemoveSection,
  span,
  layoutCols,
  minWidthsBySection,
  rowSiblingCount,
  onResizeSection,
  surface,
}: SectionCanvasProps) {
  const { t } = useI18n();
  const renderedSpan = Math.max(1, getRenderedSectionSpan(span, layoutCols));
  const minRenderedWidth = Math.max(
    1,
    ...cardIds.map((cardId) => getSectionCardMinColumns(cardSizes[cardId]))
  );
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `home-section-drag-${sectionId}`,
    data: { source: 'section', sectionId, type: 'section' } as DragMeta,
  });

  return (
    <section
      ref={setNodeRef}
      className={`relative rounded-3xl border p-4 transition-[border-color,box-shadow,background-color] ${
        isActive
          ? `${surface.borderStrong} ${surface.panel}`
          : `${surface.border} ${surface.panelMuted}`
      } ${isDragging ? 'opacity-60' : ''}`}
      style={{
        ...getDndTransformStyle(transform, undefined),
        boxShadow: isActive
          ? `0 0 0 2px ${accentColor}55, 0 22px 52px -34px ${accentColor}aa`
          : undefined,
      }}
    >
      <button
        type="button"
        aria-label={t('dashboard.edit.selectSection', { section: title })}
        className="absolute inset-0 rounded-3xl"
        onClick={() => onSelectSection(sectionId)}
      />
      <div className="relative z-10 mb-4 flex items-center gap-3">
        <button
          type="button"
          aria-label={t('dashboard.edit.moveSection', { section: title })}
          data-dashboard-drag-handle="true"
          className={`cursor-grab rounded-full border p-1.5 transition-colors active:cursor-grabbing ${surface.border} ${surface.textSecondary} ${surface.hoverBg}`}
          onClick={(event) => event.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <input
          type="text"
          value={title}
          onChange={(event) => onRenameSection(sectionId, event.target.value)}
          onFocus={() => onSelectSection(sectionId)}
          onClick={(event) => event.stopPropagation()}
          className={`min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none ${surface.textPrimary}`}
        />
        {rowSiblingCount > 1 ? (
          <>
            <button
              type="button"
              aria-label={t('dashboard.edit.shrinkSection')}
              disabled={renderedSpan <= minRenderedWidth}
              onClick={(event) => {
                event.stopPropagation();
                const nextRenderedWidth = Math.max(minRenderedWidth, renderedSpan - 1);
                onResizeSection(
                  sectionId,
                  Math.floor((nextRenderedWidth / layoutCols) * SECTION_LAYOUT_COLUMNS),
                  minWidthsBySection
                );
              }}
              className={`rounded-full border p-1.5 transition-colors disabled:opacity-30 ${surface.border} ${surface.textSecondary} ${surface.hoverBg}`}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label={t('dashboard.edit.growSection')}
              onClick={(event) => {
                event.stopPropagation();
                const nextRenderedWidth = Math.min(layoutCols, renderedSpan + 1);
                onResizeSection(
                  sectionId,
                  Math.ceil((nextRenderedWidth / layoutCols) * SECTION_LAYOUT_COLUMNS),
                  minWidthsBySection
                );
              }}
              className={`rounded-full border p-1.5 transition-colors disabled:opacity-30 ${surface.border} ${surface.textSecondary} ${surface.hoverBg}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemoveSection(sectionId);
          }}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${surface.border} ${surface.textSecondary} ${surface.hoverBg}`}
        >
          {t('dashboard.edit.removeSection')}
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
                onOpenAddCardDialog={onOpenAddCardDialog}
              />
            ) : (
              <EmptyCanvas
                label="Drop cards here"
                description="Drag device cards or widgets into this section."
                surface={surface}
                compact
                onClick={() => {
                  if (onOpenAddCardDialog) {
                    onOpenAddCardDialog(sectionId);
                    return;
                  }

                  onOpenLibraryForSection(sectionId);
                }}
              />
            )}
          </HomeContainerDropZone>
        </div>
      </SortableContext>
    </section>
  );
}, areSectionCanvasPropsEqual);

function SectionInsertDropZone({
  sectionId,
  onAddSectionBelow,
  surface,
}: {
  sectionId: string;
  onAddSectionBelow: (sectionId: string) => void;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  const { t } = useI18n();
  const { setNodeRef, isOver, active } = useDroppable({
    id: `home-section-insert-${sectionId}`,
    data: { type: 'section-insert', sectionId } satisfies DropMeta,
  });
  const isSectionDrag = active?.data.current?.source === 'section';

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onAddSectionBelow(sectionId)}
      className={`flex w-full items-center justify-center gap-2 rounded-[18px] border border-dashed px-3 py-3 text-sm font-medium transition-colors ${
        isOver && isSectionDrag
          ? `${surface.borderStrong} ${surface.panel}`
          : `${surface.borderStrong} ${surface.textSecondary} ${surface.hoverBg}`
      }`}
    >
      <Plus className="h-4 w-4" />
      <span>
        {isOver && isSectionDrag
          ? t('dashboard.section.moveHere')
          : t('dashboard.section.addBelow')}
      </span>
    </button>
  );
}

const HomePresentationSection = memo(function HomePresentationSection({
  section,
  renderedSpan,
  allCards,
  cardSizes,
  updateCardSize,
  onUpdateCard,
  showHero,
  surface,
}: HomePresentationSectionProps) {
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
        onRemoveFromLayout={NOOP_REMOVE_FROM_LAYOUT}
        showHero={showHero}
        sortable={false}
      />
    </div>
  );
}, areHomePresentationSectionPropsEqual);

function HomeContainerDropZone({
  children,
  sectionId,
  cardIds,
}: {
  children: React.ReactNode;
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
      className={isOver && cardIds.length === 0 ? 'rounded-3xl ring-1 ring-white/20' : undefined}
    >
      {children}
    </div>
  );
}

function areHomePresentationSectionPropsEqual(
  previous: HomePresentationSectionProps,
  next: HomePresentationSectionProps
) {
  return (
    previous.renderedSpan === next.renderedSpan &&
    previous.showHero === next.showHero &&
    previous.updateCardSize === next.updateCardSize &&
    previous.onUpdateCard === next.onUpdateCard &&
    previous.surface === next.surface &&
    previous.section.id === next.section.id &&
    previous.section.title === next.section.title &&
    areCardIdsStable(
      previous.section.cardIds,
      next.section.cardIds,
      previous.allCards,
      next.allCards,
      previous.cardSizes,
      next.cardSizes
    )
  );
}

function areSectionCanvasPropsEqual(previous: SectionCanvasProps, next: SectionCanvasProps) {
  return (
    previous.sectionId === next.sectionId &&
    previous.title === next.title &&
    previous.gridCols === next.gridCols &&
    previous.isActive === next.isActive &&
    previous.accentColor === next.accentColor &&
    previous.updateCardSize === next.updateCardSize &&
    previous.isEditMode === next.isEditMode &&
    previous.onUpdateCard === next.onUpdateCard &&
    previous.onRemoveFromLayout === next.onRemoveFromLayout &&
    previous.showHero === next.showHero &&
    previous.onSelectSection === next.onSelectSection &&
    previous.onOpenLibraryForSection === next.onOpenLibraryForSection &&
    previous.onOpenAddCardDialog === next.onOpenAddCardDialog &&
    previous.onRenameSection === next.onRenameSection &&
    previous.onRemoveSection === next.onRemoveSection &&
    previous.span === next.span &&
    previous.layoutCols === next.layoutCols &&
    previous.rowSiblingCount === next.rowSiblingCount &&
    previous.onResizeSection === next.onResizeSection &&
    previous.surface === next.surface &&
    previous.minWidthsBySection[previous.sectionId] === next.minWidthsBySection[next.sectionId] &&
    areCardIdsStable(
      previous.cardIds,
      next.cardIds,
      previous.allCards,
      next.allCards,
      previous.cardSizes,
      next.cardSizes
    )
  );
}
