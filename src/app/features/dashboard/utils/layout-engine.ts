import type { CardSize } from '@/app/components/shared/card-size-selector';

export interface GridItemLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SectionLayoutItem extends GridItemLayout {
  id: string;
  title: string;
}

export const SECTION_LAYOUT_COLUMNS = 12;
export const SECTION_MIN_WIDTH = 1;
export const SECTION_MAX_PER_ROW = 4;

export function clampWidth(width: number, maxColumns = SECTION_LAYOUT_COLUMNS) {
  return Math.min(maxColumns, Math.max(SECTION_MIN_WIDTH, Math.round(width)));
}

export function sortSectionLayout<T extends Pick<SectionLayoutItem, 'x' | 'y'>>(items: T[]) {
  return [...items].sort((left, right) => left.y - right.y || left.x - right.x);
}

export function buildBalancedWidths(count: number, width = SECTION_LAYOUT_COLUMNS): number[] {
  if (count <= 1) {
    return [width];
  }

  const leftCount = Math.floor(count / 2);
  const rightCount = count - leftCount;
  const leftWidth = Math.ceil(width / 2);
  const rightWidth = Math.floor(width / 2);

  return [
    ...buildBalancedWidths(leftCount, leftWidth),
    ...buildBalancedWidths(rightCount, rightWidth),
  ].sort((left, right) => right - left);
}

export function layoutRow<T extends Pick<SectionLayoutItem, 'id' | 'title' | 'w' | 'h'>>(
  items: T[],
  y: number
): SectionLayoutItem[] {
  let x = 0;

  return items.map((item) => {
    const next: SectionLayoutItem = {
      id: item.id,
      title: item.title,
      x,
      y,
      w: clampWidth(item.w),
      h: Math.max(1, Math.round(item.h)),
    };
    x += next.w;
    return next;
  });
}

export function rebalanceRow<T extends Pick<SectionLayoutItem, 'id' | 'title'>>(
  items: T[],
  y: number
): SectionLayoutItem[] {
  const widths = buildBalancedWidths(items.length);
  return layoutRow(
    items.map((item, index) => ({ ...item, w: widths[index] ?? SECTION_MIN_WIDTH, h: 1 })),
    y
  );
}

export function groupRows(items: SectionLayoutItem[]) {
  const rows = new Map<number, SectionLayoutItem[]>();

  for (const item of sortSectionLayout(items)) {
    const row = rows.get(item.y);
    if (row) {
      row.push(item);
    } else {
      rows.set(item.y, [item]);
    }
  }

  return rows;
}

export function compactRows(items: SectionLayoutItem[]) {
  const entries = [...groupRows(items).entries()].sort((left, right) => left[0] - right[0]);
  return entries.flatMap(([_, row], index) =>
    layoutRow(
      row.map((item) => ({ ...item, h: 1 })),
      index
    )
  );
}

export function replaceRow(items: SectionLayoutItem[], y: number, nextRow: SectionLayoutItem[]) {
  return sortSectionLayout([...items.filter((item) => item.y !== y), ...nextRow]);
}

export function shiftRowsAtOrBelow(items: SectionLayoutItem[], startY: number, amount: number) {
  return items.map((item) => (item.y >= startY ? { ...item, y: item.y + amount } : item));
}

export function getBottomRow(items: SectionLayoutItem[]) {
  return items.reduce((maxY, item) => Math.max(maxY, item.y), -1) + 1;
}

export function insertSectionRow(
  items: SectionLayoutItem[],
  nextSection: Pick<SectionLayoutItem, 'id' | 'title'>,
  targetY?: number
) {
  if (items.length === 0) {
    return [
      {
        ...nextSection,
        x: 0,
        y: 0,
        w: SECTION_LAYOUT_COLUMNS,
        h: 1,
      },
    ];
  }

  const rowY = targetY ?? Math.max(...items.map((item) => item.y));
  const rows = groupRows(items);
  const targetRow = [...(rows.get(rowY) ?? [])].sort((left, right) => left.x - right.x);

  if (targetRow.length >= SECTION_MAX_PER_ROW) {
    return sortSectionLayout([
      ...shiftRowsAtOrBelow(items, rowY + 1, 1),
      {
        ...nextSection,
        x: 0,
        y: rowY + 1,
        w: SECTION_LAYOUT_COLUMNS,
        h: 1,
      },
    ]);
  }

  return replaceRow(items, rowY, rebalanceRow([...targetRow, nextSection], rowY));
}

export function insertSectionBelow(
  items: SectionLayoutItem[],
  targetId: string,
  nextId: string,
  nextTitle: string
) {
  const target = items.find((item) => item.id === targetId);
  if (!target) {
    return items;
  }

  return sortSectionLayout([
    ...shiftRowsAtOrBelow(items, target.y + 1, 1),
    {
      id: nextId,
      title: nextTitle,
      x: target.x,
      y: target.y + 1,
      w: target.w,
      h: target.h,
    },
  ]);
}

export function removeSectionFromLayout(items: SectionLayoutItem[], sectionId: string) {
  const target = items.find((item) => item.id === sectionId);
  if (!target) {
    return items;
  }

  let nextItems = items.filter((item) => item.id !== sectionId);
  const sameRow = items.filter((item) => item.y === target.y);

  if (sameRow.length > 1) {
    const remainingRow = nextItems
      .filter((item) => item.y === target.y)
      .map((item) => ({ id: item.id, title: item.title }));
    nextItems = replaceRow(nextItems, target.y, rebalanceRow(remainingRow, target.y));
  }

  return compactRows(nextItems);
}

export function translateGridUnits(value: number, fromColumns: number, toColumns: number) {
  if (fromColumns === toColumns) {
    return value;
  }

  return Math.round((value / fromColumns) * toColumns);
}

// --- Section rendering helpers ---

export function getSectionCardMinColumns(size: CardSize | undefined): number {
  switch (size) {
    case 'medium':
    case 'large':
      return 2;
    default:
      return 1;
  }
}

export function getSectionMinBaseWidth(
  cardIds: string[],
  cardSizes: Record<string, CardSize>,
  layoutCols: number
): number {
  const minRenderedWidth = Math.max(
    1,
    ...cardIds.map((cardId) => getSectionCardMinColumns(cardSizes[cardId]))
  );
  return Math.max(1, Math.ceil((minRenderedWidth / layoutCols) * SECTION_LAYOUT_COLUMNS));
}

export function getRenderedRowLayouts<T extends { id: string; x: number; span: number }>(
  items: T[],
  cols: number
): Map<string, { start: number; span: number }> {
  const sortedItems = [...items].sort((left, right) => left.x - right.x);

  if (sortedItems.length === 0) {
    return new Map();
  }

  if (cols === SECTION_LAYOUT_COLUMNS) {
    return new Map(
      sortedItems.map((item) => [
        item.id,
        {
          start: Math.max(1, item.x + 1),
          span: Math.min(cols, Math.max(1, item.span)),
        },
      ])
    );
  }

  const exactSpans = sortedItems.map(
    (item) => (Math.max(1, item.span) / SECTION_LAYOUT_COLUMNS) * cols
  );
  const renderedSpans = exactSpans.map((span) => Math.max(1, Math.floor(span)));
  let assignedCols = renderedSpans.reduce((total, span) => total + span, 0);

  if (assignedCols < cols) {
    const candidates = exactSpans
      .map((span, index) => ({
        index,
        remainder: span - Math.floor(span),
        x: sortedItems[index]?.x ?? 0,
      }))
      .sort((left, right) => right.remainder - left.remainder || right.x - left.x);

    let candidateIndex = 0;
    while (assignedCols < cols && candidates.length > 0) {
      const candidate = candidates[candidateIndex % candidates.length];
      renderedSpans[candidate.index] += 1;
      assignedCols += 1;
      candidateIndex += 1;
    }
  } else if (assignedCols > cols) {
    const candidates = exactSpans
      .map((span, index) => ({
        index,
        remainder: span - Math.floor(span),
        x: sortedItems[index]?.x ?? 0,
      }))
      .sort((left, right) => left.remainder - right.remainder || left.x - right.x);

    let candidateIndex = 0;
    while (assignedCols > cols && candidates.length > 0) {
      const candidate = candidates[candidateIndex % candidates.length];
      if (renderedSpans[candidate.index] > 1) {
        renderedSpans[candidate.index] -= 1;
        assignedCols -= 1;
      }
      candidateIndex += 1;
      if (candidateIndex > candidates.length * cols) {
        break;
      }
    }
  }

  let start = 1;
  return new Map(
    sortedItems.map((item, index) => {
      const layout = {
        start,
        span: renderedSpans[index] ?? 1,
      };
      start += layout.span;
      return [item.id, layout];
    })
  );
}
