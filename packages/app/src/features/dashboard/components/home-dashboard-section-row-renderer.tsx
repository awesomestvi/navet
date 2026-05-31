import type { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { type CSSProperties, useMemo } from 'react';
import type { HomeEditorSection } from '../hooks/use-home-dashboard-editor';
import type { CustomCard } from '../stores/custom-cards-store';
import {
  buildPortraitStackRows,
  buildSectionStacks,
  getPortraitLaneCount,
  getRenderedRowLayouts,
  getRenderedSectionColumnStart,
  getRenderedSectionSpan,
  getSectionMinBaseWidth,
  getStackMinSpan,
  getStoredSectionSpan,
  SECTION_GRID_GAP_CLASS,
  splitRowStacksByMinSpan,
} from './home-dashboard-overview.shared';
import { ColumnCanvas, SectionInsertDropZone } from './home-dashboard-overview-column-canvas';
import { SectionCanvas } from './home-dashboard-overview-section-canvas';

interface SectionRowRendererProps {
  sections: HomeEditorSection[];
  sectionGridCols: number;
  isPortraitHome: boolean;
  activeSectionId: string | null;
  activeDragColumn: string | null;
  activeDragSection: string | null;
  activeDragCard: string | null;
  accentColor: string;
  allCards: Map<string, DeviceWithType | CustomCard>;
  cardSizes: Record<string, import('@navet/app/components/shared/card-size-selector').CardSize>;
  updateCardSize: (
    id: string,
    size: import('@navet/app/components/shared/card-size-selector').CardSize
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
  renderMode: 'edit' | 'presentation';
}

export function SectionRowRenderer({
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
  renderMode,
}: SectionRowRendererProps) {
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

  const isEditModeRender = renderMode === 'edit';

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {visibleRowLayouts.map(({ rowLayouts, rowStacks }, rowIndex) => {
        return (
          <div key={rowIndex} className={isEditModeRender ? 'space-y-4' : 'space-y-5 md:space-y-6'}>
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
                    className={isEditModeRender ? 'relative self-stretch' : 'space-y-6'}
                    style={
                      isPortraitHome
                        ? undefined
                        : { gridColumn: `${renderedColumnStart} / span ${renderedSpan}` }
                    }
                  >
                    {isEditModeRender && columnIndex > 0 ? (
                      <div
                        aria-hidden="true"
                        className={`pointer-events-none absolute bottom-1 -left-3 top-0 z-10 w-px border-l border-dashed md:-left-3.5 lg:-left-4 ${surface.borderStrong}`}
                      />
                    ) : null}
                    {isEditModeRender ? (
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
                    ) : (
                      stack.map((section) => (
                        <SectionCanvas
                          key={section.id}
                          sectionId={section.id}
                          title={section.title}
                          gridCols={renderedSpan}
                          isActive={false}
                          isPreviewHidden={false}
                          activeDragCard={null}
                          accentColor={accentColor}
                          cardIds={section.cardIds}
                          allCards={allCards}
                          cardSizes={cardSizes}
                          updateCardSize={updateCardSize}
                          isEditMode={false}
                          onRemoveFromLayout={onRemoveFromLayout}
                          showHero={showHero}
                          onSelectSection={() => {}}
                          onOpenLibraryForSection={() => {}}
                          onOpenAddCardDialog={undefined}
                          onRenameSection={() => {}}
                          onRemoveSection={() => {}}
                          span={getStoredSectionSpan(section)}
                          layoutCols={sectionGridCols}
                          minWidthsBySection={minWidthsBySection}
                          rowSiblingCount={rowStacks.length}
                          onResizeSection={onResizeSection}
                          surface={surface}
                        />
                      ))
                    )}
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
