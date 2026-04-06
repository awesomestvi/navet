import { Wand2 } from 'lucide-react';
import { type CSSProperties, useMemo } from 'react';
import { DashboardEmptyState } from '@/app/components/patterns/dashboard-empty-state';
import type { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import type { DeviceWithType } from '@/app/types/device.types';
import type { HomeEditorSection } from '../hooks/use-home-dashboard-editor';
import type { CustomCard } from '../stores/custom-cards-store';
import { getRenderedRowLayouts, getSectionMinBaseWidth } from '../utils/layout-engine';
import {
  buildPortraitStackRows,
  buildSectionStacks,
  getPortraitLaneCount,
  getRenderedSectionColumnStart,
  getRenderedSectionSpan,
  getStackMinSpan,
  getStoredSectionSpan,
  NOOP_REMOVE_FROM_LAYOUT,
  SECTION_GRID_GAP_CLASS,
  splitRowStacksByMinSpan,
} from './home-dashboard-overview.shared';
import { CardGrid } from './home-dashboard-overview-card-grid';
import { ColumnCanvas, SectionInsertDropZone } from './home-dashboard-overview-column-canvas';
import { HomePresentationSection, SectionCanvas } from './home-dashboard-overview-section-canvas';

export function SectionCanvasGrid({
  sections,
  sectionGridCols,
  isPortraitHome,
  activeSectionId,
  activeDragColumn,
  activeDragSection,
  activeDragCard,
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
  activeDragColumn: string | null;
  activeDragSection: string | null;
  activeDragCard: string | null;
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
  const sectionStacksByRow = useMemo(() => buildSectionStacks(sections), [sections]);
  const portraitLaneCount = useMemo(() => getPortraitLaneCount(sectionGridCols), [sectionGridCols]);
  const visibleRows = useMemo(
    () =>
      (isPortraitHome
        ? buildPortraitStackRows(sectionStacksByRow, portraitLaneCount)
        : sectionStacksByRow
      ).flatMap((rowStacks) => splitRowStacksByMinSpan(rowStacks, sectionGridCols, cardSizes)),
    [cardSizes, isPortraitHome, portraitLaneCount, sectionGridCols, sectionStacksByRow]
  );
  const portraitLaneCols = Math.max(1, Math.floor(sectionGridCols / portraitLaneCount));
  const rowGridStyle = useMemo(
    () =>
      isPortraitHome
        ? ({
            gridTemplateColumns: `repeat(${portraitLaneCount}, minmax(0, 1fr))`,
          } as CSSProperties)
        : ({
            '--home-section-cols': sectionGridCols,
            gridTemplateColumns: 'repeat(var(--home-section-cols), minmax(0, 1fr))',
          } as CSSProperties),
    [isPortraitHome, portraitLaneCount, sectionGridCols]
  );
  const minWidthsBySection = useMemo(
    () =>
      Object.fromEntries(
        sections.map((section) => [
          section.id,
          getSectionMinBaseWidth(section.cardIds, cardSizes, sectionGridCols),
        ])
      ),
    [cardSizes, sectionGridCols, sections]
  );
  const visibleRowLayouts = useMemo(
    () =>
      visibleRows.map((rowStacks) => {
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

        return { rowLayouts, rowStacks };
      }),
    [cardSizes, sectionGridCols, visibleRows]
  );

  return (
    <div className="flex flex-col gap-5">
      {visibleRowLayouts.map(({ rowLayouts, rowStacks }, rowIndex) => {
        return (
          <div key={rowIndex} className="space-y-4">
            <div className={`grid items-start ${SECTION_GRID_GAP_CLASS}`} style={rowGridStyle}>
              {rowStacks.map((stack, columnIndex) => {
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
                    className="relative self-stretch"
                    style={
                      isPortraitHome
                        ? undefined
                        : { gridColumn: `${renderedColumnStart} / span ${renderedSpan}` }
                    }
                  >
                    {columnIndex > 0 ? (
                      <div
                        aria-hidden="true"
                        className={`pointer-events-none absolute bottom-1 -left-3 top-0 z-10 w-px border-l border-dashed md:-left-3.5 lg:-left-4 ${surface.borderStrong}`}
                      />
                    ) : null}
                    <ColumnCanvas
                      columnId={leadSection.id}
                      columnTitle={`Column ${columnIndex + 1}`}
                      isPreviewHidden={activeDragColumn === leadSection.id}
                      accentColor={accentColor}
                      surface={surface}
                    >
                      {stack.map((section) => (
                        <SectionCanvas
                          key={section.id}
                          sectionId={section.id}
                          title={section.title}
                          gridCols={renderedSpan}
                          isActive={activeSectionId === section.id}
                          isPreviewHidden={activeDragSection === section.id}
                          activeDragCard={activeDragCard}
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
                      <SectionInsertDropZone
                        sectionId={stack[stack.length - 1]?.id ?? leadSection.id}
                        onAddSectionBelow={onAddSectionBelow}
                        surface={surface}
                      />
                    </ColumnCanvas>
                  </div>
                );
              })}
            </div>
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
  const nonEmptySections = useMemo(
    () => sections.filter((section) => section.cardIds.length > 0),
    [sections]
  );
  const presentationRowStacks = useMemo(
    () => buildSectionStacks(nonEmptySections),
    [nonEmptySections]
  );
  const portraitLaneCount = useMemo(() => getPortraitLaneCount(sectionGridCols), [sectionGridCols]);
  const visibleRows = useMemo(
    () =>
      (isPortraitHome
        ? buildPortraitStackRows(presentationRowStacks, portraitLaneCount)
        : presentationRowStacks
      ).flatMap((rowStacks) => splitRowStacksByMinSpan(rowStacks, sectionGridCols, cardSizes)),
    [cardSizes, isPortraitHome, portraitLaneCount, presentationRowStacks, sectionGridCols]
  );
  const presentationRowLayouts = useMemo(
    () =>
      visibleRows.map((rowStacks) => {
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

        return { rowLayouts, rowStacks };
      }),
    [cardSizes, sectionGridCols, visibleRows]
  );
  const portraitLaneCols = Math.max(1, Math.floor(sectionGridCols / portraitLaneCount));
  const presentationRowGridStyle = useMemo(
    () =>
      isPortraitHome
        ? ({
            gridTemplateColumns: `repeat(${portraitLaneCount}, minmax(0, 1fr))`,
          } as CSSProperties)
        : ({
            '--home-section-cols': sectionGridCols,
            gridTemplateColumns: 'repeat(var(--home-section-cols), minmax(0, 1fr))',
          } as CSSProperties),
    [isPortraitHome, portraitLaneCount, sectionGridCols]
  );

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

  return (
    <div className="space-y-7 md:space-y-8">
      <div className="flex flex-col gap-6">
        {presentationRowLayouts.map(({ rowLayouts, rowStacks }, rowIndex) => {
          return (
            <div
              key={rowIndex}
              className={`grid ${SECTION_GRID_GAP_CLASS}`}
              style={presentationRowGridStyle}
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
