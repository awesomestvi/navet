import type { CSSProperties } from 'react';

export type CardSize =
  | 'tiny'
  | 'extra-small'
  | 'small'
  | 'medium'
  | 'medium-vertical'
  | 'large'
  | 'extra-large';

/**
 * Navet compares card footprints in logical viewport px, not screenshot px.
 * On a 3x phone screenshot, a 168 logical px small tile will appear around 504 physical px.
 */
export const PHONE_SMALL_CARD_TARGET_WIDTH_PX = 168;
export const PHONE_SMALL_CARD_TARGET_HEIGHT_PX = 168;
const PHONE_GRID_GAP_PX = 8;
const TABLET_AND_DESKTOP_TRACK_WIDTH_PX = 176;

export interface DashboardCardGridMetrics {
  logicalColumns: number;
  gapPx: number;
  trackWidthPx: number;
  microCardMinWidthPx: number;
  rowHeightPx: number;
}

export interface DashboardCardFootprint {
  widthPx: number;
  heightPx: number;
}

const CARD_SIZE_RENDERED_SPANS: Record<CardSize, { cols: number; rows: number }> = {
  tiny: { cols: 1, rows: 1 },
  'extra-small': { cols: 2, rows: 1 },
  small: { cols: 2, rows: 2 },
  medium: { cols: 4, rows: 2 },
  'medium-vertical': { cols: 2, rows: 4 },
  large: { cols: 4, rows: 4 },
  'extra-large': { cols: 6, rows: 4 },
};

export function getDashboardCardGridGapPx(logicalColumns: number) {
  if (logicalColumns >= 6) {
    return 16;
  }

  if (logicalColumns >= 4) {
    return 12;
  }

  return PHONE_GRID_GAP_PX;
}

export function getDashboardCardGridMetrics(logicalColumns: number): DashboardCardGridMetrics {
  const gapPx = getDashboardCardGridGapPx(logicalColumns);
  const trackWidthPx =
    logicalColumns <= 2 ? PHONE_SMALL_CARD_TARGET_WIDTH_PX : TABLET_AND_DESKTOP_TRACK_WIDTH_PX;
  const microCardMinWidthPx = Math.max(80, Math.round((trackWidthPx - gapPx) / 2));

  return {
    logicalColumns,
    gapPx,
    trackWidthPx,
    microCardMinWidthPx,
    rowHeightPx: microCardMinWidthPx,
  };
}

export function getDashboardCardFootprint(
  size: CardSize,
  logicalColumns = 2
): DashboardCardFootprint {
  const metrics = getDashboardCardGridMetrics(logicalColumns);
  const spans = CARD_SIZE_RENDERED_SPANS[size];

  return {
    widthPx: spans.cols * metrics.microCardMinWidthPx + Math.max(0, spans.cols - 1) * metrics.gapPx,
    heightPx: spans.rows * metrics.rowHeightPx + Math.max(0, spans.rows - 1) * metrics.gapPx,
  };
}

export function getCardSizeOverlayStyle(size: CardSize, logicalColumns = 2): CSSProperties {
  const { widthPx, heightPx } = getDashboardCardFootprint(size, logicalColumns);

  return {
    width: `${widthPx}px`,
    height: `${heightPx}px`,
  };
}

export function getCardGridAutoRowsStyle(logicalColumns: number): CSSProperties {
  return {
    gridAutoRows: `${getDashboardCardGridMetrics(logicalColumns).rowHeightPx}px`,
  };
}

/**
 * Standard shell padding for card sizes that share the common dashboard card rhythm.
 * Cards with intentionally custom layouts can still opt out.
 */
export function getStandardCardPadding(_size: CardSize) {
  return 'p-3';
}
