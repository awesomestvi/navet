import { useCallback, useState } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import type { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useBreakpointCols } from '@/app/hooks/use-breakpoint-cols';
import { useViewportResize } from '@/app/hooks/use-viewport-resize';
import type { DeviceWithType } from '@/app/types/device.types';
import { getLogicalViewportWidth, getVisibleViewportSize } from '@/app/utils/viewport';
import type {
  HomeDashboardLayoutState,
  HomeDashboardSectionSpan,
} from '../hooks/use-home-dashboard-layout';
import type { CustomCard } from '../stores/custom-cards-store';
import { getSectionCardMinColumns, SECTION_LAYOUT_COLUMNS } from '../utils/layout-engine';

export interface HomeDashboardOverviewProps {
  deviceMap: Map<string, DeviceWithType>;
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  isEditMode: boolean;
  hiddenEntityCount: number;
  allCustomCards: CustomCard[];
  homeLayout: HomeDashboardLayoutState;
  removeHomeCard: (cardId: string) => void;
  moveHomeCard: (activeId: string, overId: string | null, sectionId?: string) => void;
  setHomeLayoutMode: (mode: HomeDashboardLayoutState['mode']) => void;
  addHomeSection: () => string;
  addHomeColumnSection: (targetSectionId?: string) => string;
  addHomeSectionBelow: (targetSectionId: string) => string;
  moveHomeSection: (sourceId: string, targetId: string) => void;
  renameHomeSection: (sectionId: string, title: string) => void;
  removeHomeSection: (sectionId: string) => void;
  resizeHomeSection: (
    sectionId: string,
    newW: number,
    minWidthsBySection?: Record<string, number>
  ) => void;
  onOpenAddCardDialog?: (targetSectionId?: string) => void;
  onUpdateCard?: (cardId: string, data: Record<string, unknown>) => void;
  onToggleEditMode?: () => void;
}

export type HomePresentationSectionProps = {
  section: {
    id: string;
    title: string;
    cardIds: string[];
  };
  renderedSpan: number;
  allCards: Map<string, DeviceWithType | CustomCard>;
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  onUpdateCard?: (cardId: string, data: Record<string, unknown>) => void;
  showHero: boolean;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
};

export type CardGridProps = {
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
  onOpenAddCardDialog?: (sectionId?: string) => void;
  sortable?: boolean;
};

export type SectionCanvasProps = {
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
  onOpenAddCardDialog?: (sectionId?: string) => void;
  onRenameSection: (sectionId: string, title: string) => void;
  onRemoveSection: (sectionId: string) => void;
  span: number;
  layoutCols: number;
  minWidthsBySection: Record<string, number>;
  rowSiblingCount: number;
  onResizeSection: (
    sectionId: string,
    newW: number,
    minWidthsBySection?: Record<string, number>
  ) => void;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
};

export const SECTION_GRID_GAP_CLASS = 'gap-x-6 md:gap-x-7 lg:gap-x-8';
export const NOOP_REMOVE_FROM_LAYOUT = () => {};

const PORTRAIT_HOME_MAX_COLS = 4;
const PORTRAIT_HOME_RELAXED_COLS = 6;
const MIN_HOME_CARD_TRACK_WIDTH = 176;

export function isCustomCard(entry: DeviceWithType | CustomCard): entry is CustomCard {
  return 'createdAt' in entry;
}

export function getRenderedSectionSpan(span: HomeDashboardSectionSpan, cols: number): number {
  const normalizedSpan = Math.max(1, span);
  if (cols === SECTION_LAYOUT_COLUMNS) {
    return Math.min(normalizedSpan, cols);
  }

  return Math.min(cols, Math.max(1, Math.round((normalizedSpan / SECTION_LAYOUT_COLUMNS) * cols)));
}

export function getStoredSectionSpan(item: { span?: number; w?: number }) {
  return Math.max(1, item.w ?? item.span ?? 1);
}

export function getCardGridGapPx(cols: number) {
  if (cols >= 6) {
    return 16;
  }

  if (cols >= 4) {
    return 12;
  }

  return 8;
}

export function getStackMinSpan<T extends { cardIds: string[] }>(
  stack: T[],
  cardSizes: Record<string, CardSize>
) {
  return Math.max(
    1,
    ...stack.flatMap((section) =>
      section.cardIds.map((cardId) => getSectionCardMinColumns(cardSizes[cardId]))
    )
  );
}

export function splitRowStacksByMinSpan<T extends { cardIds: string[] }>(
  rowStacks: T[][],
  cols: number,
  cardSizes: Record<string, CardSize>
) {
  const rows: T[][][] = [];
  let currentRow: T[][] = [];
  let currentWidth = 0;

  for (const stack of rowStacks) {
    const stackMinSpan = Math.min(cols, getStackMinSpan(stack, cardSizes));

    if (currentRow.length > 0 && currentWidth + stackMinSpan > cols) {
      rows.push(currentRow);
      currentRow = [];
      currentWidth = 0;
    }

    currentRow.push(stack);
    currentWidth += stackMinSpan;
  }

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return rows;
}

function areStringArraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function areCardIdsStable(
  cardIds: string[],
  nextCardIds: string[],
  allCards: Map<string, DeviceWithType | CustomCard>,
  nextAllCards: Map<string, DeviceWithType | CustomCard>,
  cardSizes: Record<string, CardSize>,
  nextCardSizes: Record<string, CardSize>
) {
  return (
    areStringArraysEqual(cardIds, nextCardIds) &&
    cardIds.every(
      (cardId) =>
        allCards.get(cardId) === nextAllCards.get(cardId) &&
        cardSizes[cardId] === nextCardSizes[cardId]
    )
  );
}

export function getRenderedSectionColumnStart(
  x: number,
  span: HomeDashboardSectionSpan,
  cols: number
): number {
  const renderedSpan = getRenderedSectionSpan(span, cols);
  const renderedX =
    cols === SECTION_LAYOUT_COLUMNS
      ? x
      : Math.max(0, Math.round((Math.max(0, x) / SECTION_LAYOUT_COLUMNS) * cols));

  return Math.min(cols - renderedSpan + 1, renderedX + 1);
}

function groupSectionRows<T extends { x: number; y: number }>(items: T[]): Map<number, T[]> {
  const rows = new Map<number, T[]>();
  for (const item of [...items].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const row = rows.get(item.y);
    if (row) {
      row.push(item);
    } else {
      rows.set(item.y, [item]);
    }
  }
  return rows;
}

export function buildSectionStacks<
  T extends { id: string; x: number; y: number; span?: number; w?: number },
>(items: T[]) {
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
              getStoredSectionSpan(candidate) === getStoredSectionSpan(item)
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

export function buildPortraitStackRows<T>(rows: T[][], laneCount: number): T[][] {
  const flattened = rows.flat();
  const portraitRows: T[][] = [];
  const normalizedLaneCount = Math.max(1, laneCount);

  for (let index = 0; index < flattened.length; index += normalizedLaneCount) {
    portraitRows.push(flattened.slice(index, index + normalizedLaneCount));
  }

  return portraitRows;
}

export function getPortraitLaneCount(sectionGridCols: number) {
  if (sectionGridCols <= 3) {
    return 1;
  }

  if (sectionGridCols >= 6) {
    return 3;
  }

  return 2;
}

export function getCardGridTargetWidth(renderedGridCols: number, gridGapPx: number) {
  const microCardMinWidth = Math.max(80, Math.round((MIN_HOME_CARD_TRACK_WIDTH - gridGapPx) / 2));
  return {
    microCardMinWidth,
    targetGridWidth:
      renderedGridCols * microCardMinWidth + Math.max(0, renderedGridCols - 1) * gridGapPx,
  };
}

function getHomeEffectiveCols(cols: number) {
  const { width: viewportWidth, height: viewportHeight } = getVisibleViewportSize();
  const logicalViewportWidth = getLogicalViewportWidth();
  const isPortraitCanvas = viewportHeight > viewportWidth * 1.15;

  if (!isPortraitCanvas) {
    return cols;
  }

  const portraitMaxCols =
    logicalViewportWidth >= 1280 ? PORTRAIT_HOME_RELAXED_COLS : PORTRAIT_HOME_MAX_COLS;

  return Math.min(cols, portraitMaxCols);
}

function isPortraitHomeCanvas() {
  const { width: viewportWidth, height: viewportHeight } = getVisibleViewportSize();
  return viewportHeight > viewportWidth * 1.15;
}

export function useHomeLayoutViewport() {
  const breakpointCols = useBreakpointCols();
  const [viewportState, setViewportState] = useState(() => ({
    effectiveCols: getHomeEffectiveCols(breakpointCols),
    isPortrait: isPortraitHomeCanvas(),
  }));

  const syncViewportState = useCallback(() => {
    const nextState = {
      effectiveCols: getHomeEffectiveCols(breakpointCols),
      isPortrait: isPortraitHomeCanvas(),
    };

    setViewportState((previous) =>
      previous.effectiveCols === nextState.effectiveCols &&
      previous.isPortrait === nextState.isPortrait
        ? previous
        : nextState
    );
  }, [breakpointCols]);

  useViewportResize(syncViewportState);

  return viewportState;
}
