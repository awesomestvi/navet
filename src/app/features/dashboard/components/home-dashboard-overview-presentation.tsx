import { Wand2 } from 'lucide-react';
import { type CSSProperties, useMemo } from 'react';
import { DashboardEmptyState } from '@/app/components/patterns/dashboard-empty-state';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import type { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import type { DeviceWithType } from '@/app/types/device.types';
import type { HomeEditorSection } from '../hooks/use-home-dashboard-editor';
import type { CustomCard } from '../stores/custom-cards-store';
import { getRenderedRowLayouts } from '../utils/layout-engine';
import {
  buildPortraitStackRows,
  buildSectionStacks,
  getPortraitLaneCount,
  getRenderedSectionColumnStart,
  getRenderedSectionSpan,
  getStackMinSpan,
  getStoredSectionSpan,
  SECTION_GRID_GAP_CLASS,
  splitRowStacksByMinSpan,
} from './home-dashboard-overview.shared';
import { PresentationCardGrid } from './home-dashboard-overview-presentation-grid';

interface HomePresentationProps {
  flowCards: string[];
  sections: HomeEditorSection[];
  gridCols: number;
  isPortraitHome: boolean;
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
}: HomePresentationProps) {
  const hasCards = flowCards.length > 0 || sections.some((section) => section.cardIds.length > 0);
  const nonEmptySections = useMemo(
    () => sections.filter((section) => section.cardIds.length > 0),
    [sections]
  );
  const presentationRowStacks = useMemo(
    () => buildSectionStacks(nonEmptySections),
    [nonEmptySections]
  );
  const portraitLaneCount = useMemo(() => getPortraitLaneCount(gridCols), [gridCols]);
  const visibleRows = useMemo(
    () =>
      (isPortraitHome
        ? buildPortraitStackRows(presentationRowStacks, portraitLaneCount)
        : presentationRowStacks
      ).flatMap((rowStacks) => splitRowStacksByMinSpan(rowStacks, gridCols, cardSizes)),
    [cardSizes, gridCols, isPortraitHome, portraitLaneCount, presentationRowStacks]
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
          gridCols,
          rowMinSpansById
        );

        return { rowLayouts, rowStacks };
      }),
    [cardSizes, gridCols, visibleRows]
  );
  const portraitLaneCols = Math.max(1, Math.floor(gridCols / portraitLaneCount));
  const presentationRowGridStyle = useMemo(
    () =>
      isPortraitHome
        ? ({
            gridTemplateColumns: `repeat(${portraitLaneCount}, minmax(0, 1fr))`,
          } as CSSProperties)
        : ({
            '--home-section-cols': gridCols,
            gridTemplateColumns: 'repeat(var(--home-section-cols), minmax(0, 1fr))',
          } as CSSProperties),
    [gridCols, isPortraitHome, portraitLaneCount]
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
      <PresentationCardGrid
        cardIds={flowCards}
        gridCols={gridCols}
        allCards={allCards}
        cardSizes={cardSizes}
        updateCardSize={updateCardSize}
        onUpdateCard={onUpdateCard}
        showHero={showHero}
      />
    );
  }

  return (
    <div className="space-y-7 md:space-y-8">
      <div className="flex flex-col gap-6">
        {presentationRowLayouts.map(({ rowLayouts, rowStacks }, rowIndex) => (
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
                  getRenderedSectionSpan(getStoredSectionSpan(leadSection), gridCols));
              const renderedColumnStart =
                rowLayout?.start ??
                getRenderedSectionColumnStart(
                  leadSection.x,
                  getStoredSectionSpan(leadSection),
                  gridCols
                );

              return (
                <div
                  key={leadSection.id}
                  style={
                    isPortraitHome
                      ? undefined
                      : { gridColumn: `${renderedColumnStart} / span ${renderedSpan}` }
                  }
                >
                  {stack.map((section) => (
                    <div key={section.id}>
                      <div className="mb-3 flex items-center gap-3">
                        <h2 className={`text-lg font-semibold md:text-xl ${surface.textPrimary}`}>
                          {section.title}
                        </h2>
                        <div className={`h-px flex-1 ${surface.borderStrong}`} />
                      </div>
                      <PresentationCardGrid
                        cardIds={section.cardIds}
                        gridCols={renderedSpan}
                        allCards={allCards}
                        cardSizes={cardSizes}
                        updateCardSize={updateCardSize}
                        onUpdateCard={onUpdateCard}
                        showHero={showHero}
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
