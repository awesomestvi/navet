import { useTheme } from '@navet/app/hooks';
import { memo, useId, useMemo } from 'react';
import { getChartSurfaceTokens } from './chart-surface-tokens';

export interface TrendSparklinePoint {
  value: number;
}

interface TrendSparklineProps {
  data: TrendSparklinePoint[];
  accentColor: string;
  ariaLabel: string;
  className?: string;
  fillOpacity?: number;
  height?: number;
  padX?: number;
  showYAxisMarks?: boolean;
  strokeWidth?: number;
}

const VIEWBOX_WIDTH = 200;
const PAD_TOP = 2;

function getSmoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(0, index - 1)];
    const current = points[index];
    const next = points[index + 1];
    const following = points[Math.min(points.length - 1, index + 2)];
    const firstControlX = current.x + (next.x - previous.x) / 6;
    const firstControlY = current.y + (next.y - previous.y) / 6;
    const secondControlX = next.x - (following.x - current.x) / 6;
    const secondControlY = next.y - (following.y - current.y) / 6;
    path += ` C ${firstControlX} ${firstControlY} ${secondControlX} ${secondControlY} ${next.x} ${next.y}`;
  }
  return path;
}

export const TrendSparkline = memo(function TrendSparkline({
  data,
  accentColor,
  ariaLabel,
  className,
  fillOpacity = 0.24,
  height = 72,
  padX = 0,
  showYAxisMarks = false,
  strokeWidth = 1.5,
}: TrendSparklineProps) {
  const { theme } = useTheme();
  const gradientId = useId();
  const chartSurface = getChartSurfaceTokens(theme);
  const chart = useMemo(() => {
    if (data.length < 2) return null;

    const width = VIEWBOX_WIDTH - padX * 2;
    const chartHeight = height - PAD_TOP;
    let minimum = data[0].value;
    let maximum = data[0].value;
    for (const point of data) {
      minimum = Math.min(minimum, point.value);
      maximum = Math.max(maximum, point.value);
    }
    const range = Math.max(maximum - minimum, Math.max(Math.abs(maximum) * 0.04, 1));
    const paddedMaximum = maximum + range * 0.08;
    const points = data.map((point, index) => ({
      x: padX + (index / (data.length - 1)) * width,
      y:
        PAD_TOP +
        (1 - (point.value - minimum) / Math.max(paddedMaximum - minimum, 1)) * chartHeight,
    }));
    const line = getSmoothPath(points);
    const baseline = PAD_TOP + chartHeight;
    const area =
      `M ${points[0].x} ${baseline} L ${points[0].x} ${points[0].y}` +
      line.slice(line.indexOf(' ')) +
      ` L ${points[points.length - 1].x} ${baseline} Z`;
    const span = Math.max(paddedMaximum - minimum, 1);
    const referenceLineTopPercents = [paddedMaximum, minimum + span * 0.5].map((value) => {
      const y = PAD_TOP + (1 - (value - minimum) / span) * chartHeight;
      return (y / height) * 100;
    });

    return { area, line, referenceLineTopPercents };
  }, [data, height, padX]);

  if (!chart) return null;

  return (
    <div className="relative h-full w-full">
      {showYAxisMarks
        ? chart.referenceLineTopPercents.map((topPercent) => (
            <div
              key={topPercent}
              data-chart-reference-line="true"
              className={`pointer-events-none absolute inset-x-0 z-0 border-t border-dashed ${chartSurface.axisLineColor}`}
              style={{ top: `${topPercent}%` }}
            />
          ))
        : null}
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${height}`}
        width="100%"
        height="100%"
        className={`relative z-10 ${className ?? ''}`.trim()}
        role="img"
        aria-label={ariaLabel}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity={fillOpacity} />
            <stop offset="100%" stopColor={accentColor} stopOpacity={fillOpacity * 0.08} />
          </linearGradient>
        </defs>
        <path d={chart.area} fill={`url(#${gradientId})`} />
        <path
          d={chart.line}
          fill="none"
          stroke={accentColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
});
