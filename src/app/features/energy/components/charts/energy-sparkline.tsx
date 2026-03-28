import { memo, useCallback, useId, useState } from 'react';
import { useTheme } from '@/app/hooks';
import { getEnergyChartTokens } from './energy-chart-tokens';

export interface EnergySparklinePoint {
  value: number;
  timestampMs?: number;
  endTimestampMs?: number;
  minValue?: number;
  maxValue?: number;
}

interface EnergySparklineProps {
  data: EnergySparklinePoint[];
  accentColor: string;
  /** Height in viewBox units — controls aspect ratio (default 40) */
  height?: number;
}

const VB_W = 200;
const PAD_X = 2;
const PAD_Y = 3;

/** Compute a smooth cubic bezier path through points using Catmull-Rom → cubic bezier conversion */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

export const EnergySparkline = memo(function EnergySparkline({
  data,
  accentColor,
  height = 40,
}: EnergySparklineProps) {
  const { theme } = useTheme();
  const id = useId();
  const tokens = getEnergyChartTokens(theme, accentColor);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const updateHoverIndex = useCallback(
    (clientX: number, rect: DOMRect) => {
      const relativeX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const nextIndex = Math.round((relativeX / Math.max(rect.width, 1)) * (data.length - 1));
      setHoverIndex(Math.max(0, Math.min(data.length - 1, nextIndex)));
    },
    [data.length]
  );

  if (data.length < 2) return null;

  const chartW = VB_W - PAD_X * 2;
  const chartH = height - PAD_Y * 2;
  const baseline = PAD_Y + chartH;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const xAt = (i: number) => PAD_X + (i / (data.length - 1)) * chartW;
  const yAt = (v: number) => PAD_Y + (1 - v / maxVal) * chartH;

  const pts = data.map((d, i) => ({ x: xAt(i), y: yAt(d.value) }));
  const line = smoothPath(pts);
  const activeIndex = hoverIndex;
  const activePoint = activeIndex === null ? null : data[activeIndex];
  const activeCoords = activeIndex === null ? null : pts[activeIndex];

  const formatTooltipTimestamp = (timestampMs?: number) => {
    if (!timestampMs || Number.isNaN(timestampMs)) {
      return null;
    }

    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(timestampMs));
  };

  const tooltipTimestamp = formatTooltipTimestamp(activePoint?.timestampMs);
  const tooltipLeftPercent =
    activeCoords === null ? null : Math.max(18, Math.min(82, (activeCoords.x / VB_W) * 100));

  // Closed area path
  const area =
    `M ${pts[0].x} ${baseline} L ${pts[0].x} ${pts[0].y}` +
    line.slice(line.indexOf(' ')) +
    ` L ${pts[pts.length - 1].x} ${baseline} Z`;

  return (
    <div className="relative">
      {activePoint && tooltipTimestamp && tooltipLeftPercent !== null ? (
        <div
          className="pointer-events-none absolute top-0 z-10 w-max max-w-[220px] -translate-x-1/2 rounded-xl border border-white/10 bg-neutral-950/92 px-3 py-2 text-left shadow-2xl backdrop-blur-md"
          style={{ left: `${tooltipLeftPercent}%` }}
        >
          <div className="text-[11px] text-white/85">{tooltipTimestamp}</div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-white/75">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tokens.accent }} />
            <span>Use: {Math.round(activePoint.value)} W</span>
          </div>
        </div>
      ) : null}

      <svg
        viewBox={`0 0 ${VB_W} ${height}`}
        className="w-full"
        role="img"
        aria-label="Power sparkline"
        preserveAspectRatio="none"
        onMouseLeave={() => setHoverIndex(null)}
        onMouseMove={(event) => {
          updateHoverIndex(event.clientX, event.currentTarget.getBoundingClientRect());
        }}
        onTouchStart={(event) => {
          const touch = event.touches[0];
          if (!touch) return;
          updateHoverIndex(touch.clientX, event.currentTarget.getBoundingClientRect());
        }}
        onTouchMove={(event) => {
          const touch = event.touches[0];
          if (!touch) return;
          updateHoverIndex(touch.clientX, event.currentTarget.getBoundingClientRect());
        }}
      >
        <defs>
          <linearGradient id={`${id}-sg`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tokens.accent} stopOpacity="0.28" />
            <stop offset="100%" stopColor={tokens.accent} stopOpacity="0.03" />
          </linearGradient>
        </defs>

        <line
          x1={PAD_X}
          y1={baseline}
          x2={VB_W - PAD_X}
          y2={baseline}
          stroke={tokens.grid}
          strokeWidth="1"
        />

        <path d={area} fill={`url(#${id}-sg)`} />
        <path
          d={line}
          fill="none"
          stroke={tokens.accent}
          strokeWidth="0.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {hoverIndex !== null && activeCoords ? (
          <line
            x1={activeCoords.x}
            y1={PAD_Y}
            x2={activeCoords.x}
            y2={baseline}
            stroke={tokens.accent}
            strokeOpacity="0.45"
            strokeDasharray="2 2"
            strokeWidth="1"
          />
        ) : null}
        {activeCoords ? (
          <circle cx={activeCoords.x} cy={activeCoords.y} r="4" fill={tokens.accentGlow} />
        ) : null}
        {activeCoords ? (
          <circle cx={activeCoords.x} cy={activeCoords.y} r="2.2" fill={tokens.accent} />
        ) : null}
      </svg>
    </div>
  );
});
