import {
  type CardSize,
  getDashboardCardGridSpan,
} from '@navet/app/components/shared/card-size-selector';

export interface DashboardGridLayoutItem {
  id: string;
  size: CardSize;
}

export interface DashboardGridPlacement {
  column: number;
  row: number;
}

function canPlace(
  occupied: boolean[][],
  column: number,
  row: number,
  width: number,
  height: number
) {
  for (let y = row; y < row + height; y += 1) {
    for (let x = column; x < column + width; x += 1) {
      if (occupied[y]?.[x]) return false;
    }
  }

  return true;
}

function countEmptySegments(row: boolean[], columnCount: number) {
  let segments = 0;
  let insideEmptySegment = false;

  for (let column = 0; column < columnCount; column += 1) {
    const isEmpty = !row[column];
    if (isEmpty && !insideEmptySegment) segments += 1;
    insideEmptySegment = isEmpty;
  }

  return segments;
}

function getFragmentationScore(
  occupied: boolean[][],
  column: number,
  row: number,
  width: number,
  height: number,
  columnCount: number
) {
  let score = 0;

  for (let y = row; y < row + height; y += 1) {
    const nextRow = Array.from({ length: columnCount }, (_, x) => occupied[y]?.[x] ?? false);
    for (let x = column; x < column + width; x += 1) nextRow[x] = true;
    score += Math.max(0, countEmptySegments(nextRow, columnCount) - 1);
  }

  return score;
}

/**
 * Produces stable explicit positions for the automatic room grid.
 *
 * Items retain their source priority. When an item can fit in several places on the same earliest
 * row, the least-fragmenting position wins. This keeps tall cards against an occupied edge instead
 * of splitting the following row into narrow holes that no standard card can use.
 */
export function packDashboardGridItems(
  items: DashboardGridLayoutItem[],
  columnCount: number
): Map<string, DashboardGridPlacement> {
  const safeColumnCount = Math.max(1, Math.round(columnCount));
  const occupied: boolean[][] = [];
  const placements = new Map<string, DashboardGridPlacement>();

  for (const item of items) {
    const span = getDashboardCardGridSpan(item.size);
    const width = Math.min(safeColumnCount, span.cols);
    const height = Math.max(1, span.rows);
    let row = 0;

    while (true) {
      const candidates: Array<{ column: number; score: number }> = [];

      for (let column = 0; column <= safeColumnCount - width; column += 1) {
        if (!canPlace(occupied, column, row, width, height)) continue;
        candidates.push({
          column,
          score: getFragmentationScore(occupied, column, row, width, height, safeColumnCount),
        });
      }

      if (candidates.length > 0) {
        candidates.sort((left, right) => left.score - right.score || left.column - right.column);
        const column = candidates[0]?.column ?? 0;

        for (let y = row; y < row + height; y += 1) {
          occupied[y] ??= Array.from({ length: safeColumnCount }, () => false);
          for (let x = column; x < column + width; x += 1) occupied[y][x] = true;
        }

        placements.set(item.id, { column: column + 1, row: row + 1 });
        break;
      }

      row += 1;
    }
  }

  return placements;
}
