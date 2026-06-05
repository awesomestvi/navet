import {
  getCardGridAutoRowsStyle,
  getDashboardCardGridGapPx,
  getDashboardCardGridMetrics,
  getDashboardGridColumnCount,
} from '@navet/app/components/shared/card-size-selector';
import { type CSSProperties, useMemo } from 'react';
import { useAutoScaledGridMeasurements } from './use-auto-scaled-grid-measurements';

export function useFitDashboardGrid(logicalColumns: number, enabled = true) {
  const renderedGridCols = getDashboardGridColumnCount(logicalColumns);
  const gridGapPx = getDashboardCardGridGapPx(logicalColumns);
  const { microCardMinWidthPx } = getDashboardCardGridMetrics(logicalColumns);
  const targetGridWidth =
    renderedGridCols * microCardMinWidthPx + Math.max(0, renderedGridCols - 1) * gridGapPx;

  const { outerRef, innerRef, outerWidth, contentHeight } =
    useAutoScaledGridMeasurements(targetGridWidth);

  const autoScale =
    !enabled || renderedGridCols <= 1 || outerWidth <= 0
      ? 1
      : Math.min(1, outerWidth / targetGridWidth);
  const isAutoScaled = enabled && autoScale < 0.999;

  const outerContainerStyle = useMemo(
    () =>
      isAutoScaled && contentHeight > 0
        ? ({ height: contentHeight * autoScale } as CSSProperties)
        : undefined,
    [autoScale, contentHeight, isAutoScaled]
  );
  const innerContainerStyle = useMemo(
    () =>
      ({
        ...(isAutoScaled
          ? {
              width: `${targetGridWidth}px`,
            }
          : {}),
        ...(isAutoScaled
          ? {
              transform: `scale(${autoScale})`,
            }
          : {}),
      }) as CSSProperties,
    [autoScale, isAutoScaled, targetGridWidth]
  );
  const gridStyle = useMemo(
    () =>
      ({
        ...getCardGridAutoRowsStyle(logicalColumns),
        gridTemplateColumns: `repeat(${renderedGridCols}, minmax(${microCardMinWidthPx}px, 1fr))`,
      }) as CSSProperties,
    [logicalColumns, microCardMinWidthPx, renderedGridCols]
  );

  return {
    gridStyle,
    innerContainerStyle,
    innerRef,
    isAutoScaled,
    outerContainerStyle,
    outerRef,
    renderedGridCols,
  };
}
