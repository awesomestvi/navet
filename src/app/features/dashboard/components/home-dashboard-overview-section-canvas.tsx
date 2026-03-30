import { useDraggable, useDroppable } from '@dnd-kit/core';
import { rectSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import { GripVertical, Minus, Plus } from 'lucide-react';
import { memo } from 'react';
import { getDndTransformStyle } from '@/app/components/shared/dnd-transform-style';
import { useI18n } from '@/app/hooks';
import type { DragMeta, DropMeta } from '../hooks/use-home-dashboard-editor';
import { getSectionCardMinColumns, SECTION_LAYOUT_COLUMNS } from '../utils/layout-engine';
import {
  areCardIdsStable,
  getRenderedSectionSpan,
  type HomePresentationSectionProps,
  NOOP_REMOVE_FROM_LAYOUT,
  type SectionCanvasProps,
} from './home-dashboard-overview.shared';
import { CardGrid, EmptyCanvas, HomeContainerDropZone } from './home-dashboard-overview-card-grid';

export const SectionCanvas = memo(function SectionCanvas({
  sectionId,
  title,
  gridCols,
  isActive,
  isPreviewHidden = false,
  activeDragCard,
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
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `home-section-drag-${sectionId}`,
    data: { source: 'section', sectionId, type: 'section' } as DragMeta,
  });
  const { setNodeRef: setDroppableNodeRef } = useDroppable({
    id: `home-section-target-${sectionId}`,
    data: { type: 'section-target', sectionId } satisfies DropMeta,
  });
  const handleOpenAddCard = () => {
    onSelectSection(sectionId);

    if (onOpenAddCardDialog) {
      onOpenAddCardDialog(sectionId);
      return;
    }

    onOpenLibraryForSection(sectionId);
  };

  return (
    <section
      ref={setDraggableNodeRef}
      className={`relative rounded-3xl border p-4 transition-[border-color,box-shadow,background-color] ${
        isActive
          ? `${surface.borderStrong} ${surface.panel}`
          : `${surface.border} ${surface.panelMuted}`
      } ${isPreviewHidden ? 'opacity-0' : isDragging ? 'opacity-60' : ''}`}
      style={{
        ...(isDragging ? undefined : getDndTransformStyle(transform, undefined)),
        boxShadow: isActive
          ? `0 0 0 2px ${accentColor}55, 0 22px 52px -34px ${accentColor}aa`
          : undefined,
      }}
      onPointerDownCapture={() => onSelectSection(sectionId)}
    >
      <div
        ref={setDroppableNodeRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10"
      />
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
                activeDragCard={activeDragCard}
                allCards={allCards}
                cardSizes={cardSizes}
                updateCardSize={updateCardSize}
                isEditMode={isEditMode}
                onUpdateCard={onUpdateCard}
                onRemoveFromLayout={onRemoveFromLayout}
                showHero={showHero}
                onOpenAddCardDialog={handleOpenAddCard}
              />
            ) : (
              <EmptyCanvas
                label="Drop cards here"
                description="Drag device cards or widgets into this section."
                surface={surface}
                compact
                onClick={handleOpenAddCard}
              />
            )}
          </HomeContainerDropZone>
        </div>
      </SortableContext>
    </section>
  );
}, areSectionCanvasPropsEqual);

export const HomePresentationSection = memo(function HomePresentationSection({
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
