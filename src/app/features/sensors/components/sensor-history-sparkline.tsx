import { memo, useId, useMemo } from 'react';
import { useTheme } from '@/app/hooks';
import type { SensorStatisticsPoint } from '../hooks/use-sensor-statistics-history';

interface SensorHistorySparklineProps {
  data: SensorStatisticsPoint[];
  accentColor: string;
  className?: string;
  height?: number;
}

const VIEWBOX_WIDTH = 200;
const PAD_TOP = 8;
const PAD_BOTTOM = 10;

function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) {
    return '';
  }

  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(0, index - 1)];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[Math.min(points.length - 1, index + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
  }

  return path;
}

export const SensorHistorySparkline = memo(function SensorHistorySparkline({
  data,
  accentColor,
  className,
  height = 120,
}: SensorHistorySparklineProps) {
  const { theme } = useTheme();
  const gradientId = useId();

  const chart = useMemo(() => {
    if (data.length < 2) {
      return null;
    }

    const width = VIEWBOX_WIDTH;
    const chartWidth = width;
    const chartHeight = height - PAD_TOP - PAD_BOTTOM;
    const baseline = PAD_TOP + chartHeight;
    const rawMin = Math.min(...data.map((point) => point.value));
    const rawMax = Math.max(...data.map((point) => point.value));
    const valueSpan = Math.max(rawMax - rawMin, Math.max(Math.abs(rawMax) * 0.06, 1));
    const minValue = rawMin - valueSpan * 0.08;
    const maxValue = rawMax + valueSpan * 0.04;
    const xAt = (index: number) =>
      data.length === 1 ? chartWidth / 2 : (index / (data.length - 1)) * chartWidth;
    const yAt = (value: number) =>
      PAD_TOP + (1 - (value - minValue) / Math.max(maxValue - minValue, 1)) * chartHeight;
    const points = data.map((point, index) => ({ x: xAt(index), y: yAt(point.value) }));
    const line = smoothPath(points);
    const area =
      `M ${points[0].x} ${baseline} L ${points[0].x} ${points[0].y}` +
      line.slice(line.indexOf(' ')) +
      ` L ${points[points.length - 1].x} ${baseline} Z`;

    return { area, baseline, line };
  }, [data, height]);

  if (!chart) {
    return null;
  }

  return (
    <div
      data-testid="sensor-history-sparkline"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`}
    >
      <div
        className={`absolute inset-0 ${
          theme === 'light'
            ? 'bg-linear-to-b from-white/0 via-white/6 to-white/22'
            : 'bg-linear-to-b from-transparent via-transparent to-slate-950/28'
        }`}
      />
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${height}`}
        width="100%"
        height="100%"
        className="block h-full w-full opacity-65"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={accentColor}
              stopOpacity={theme === 'light' ? 0.24 : 0.3}
            />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={chart.area} fill={`url(#${gradientId})`} />
        <path
          d={chart.line}
          fill="none"
          stroke={accentColor}
          strokeOpacity={theme === 'light' ? 0.5 : 0.72}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <line
          x1="0"
          x2={VIEWBOX_WIDTH}
          y1={chart.baseline}
          y2={chart.baseline}
          stroke={theme === 'light' ? 'rgba(148,163,184,0.24)' : 'rgba(255,255,255,0.18)'}
          opacity={theme === 'light' ? 0.18 : 0.28}
        />
      </svg>
    </div>
  );
});
