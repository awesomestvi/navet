import { memo, useCallback, useId, useMemo, useState } from 'react';
import { useI18n, useTheme } from '@/app/hooks';
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
  className?: string;
  showYAxisMarks?: boolean;
  padX?: number;
}

const VB_W = 200;
const PAD_TOP = 2;
const PAD_BOTTOM = 0;

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

function roundYAxisMark(value: number): number {
  const step = value >= 1000 ? 1000 : 100;
  return Math.max(step, Math.round(value / step) * step);
}

export const EnergySparkline = memo(function EnergySparkline({
  data,
  accentColor,
  height = 40,
  className,
  showYAxisMarks = false,
  padX = 1,
}: EnergySparklineProps) {
  const { locale, t } = useI18n();
  const { theme } = useTheme();
  const id = useId();
  const tokens = getEnergyChartTokens(theme, accentColor);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const axisLineClassName = theme === 'light' ? 'border-slate-300/70' : 'border-white/6';
  const axisLabelClassName = theme === 'light' ? 'text-slate-500' : 'text-white/35';
  const tooltipClassName =
    theme === 'light'
      ? `border ${tokens.surface.border} ${tokens.surface.panel} shadow-[0_18px_38px_-24px_rgba(15,23,42,0.22)]`
      : `border ${tokens.surface.border} ${tokens.surface.panel} shadow-2xl`;
  const updateHoverIndex = useCallback(
    (clientX: number, rect: DOMRect) => {
      const relativeX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const nextIndex = Math.round((relativeX / Math.max(rect.width, 1)) * (data.length - 1));
      setHoverIndex(Math.max(0, Math.min(data.length - 1, nextIndex)));
    },
    [data.length]
  );

  const tooltipDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
    [locale]
  );

  const { baseline, line, pts, chartHeight, minVal, maxVal } = useMemo(() => {
    if (data.length < 2) {
      const chartH = height - PAD_TOP - PAD_BOTTOM;
      return {
        baseline: PAD_TOP + chartH,
        line: '',
        pts: [] as { x: number; y: number }[],
        chartHeight: chartH,
        minVal: 0,
        maxVal: 0,
      };
    }

    const chartW = VB_W - padX * 2;
    const chartH = height - PAD_TOP - PAD_BOTTOM;
    const nextBaseline = PAD_TOP + chartH;
    const rawMin = Math.min(...data.map((d) => d.value));
    const rawMax = Math.max(...data.map((d) => d.value), 1);
    const valueRange = Math.max(rawMax - rawMin, Math.max(rawMax * 0.04, 1));
    const nextMinVal = rawMin;
    const nextMaxVal = rawMax + valueRange * 0.04;
    const xAt = (i: number) => padX + (i / (data.length - 1)) * chartW;
    const yAt = (v: number) =>
      PAD_TOP + (1 - (v - nextMinVal) / Math.max(nextMaxVal - nextMinVal, 1)) * chartH;
    const nextPoints = data.map((d, i) => ({ x: xAt(i), y: yAt(d.value) }));

    return {
      baseline: nextBaseline,
      line: smoothPath(nextPoints),
      pts: nextPoints,
      chartHeight: chartH,
      minVal: nextMinVal,
      maxVal: nextMaxVal,
    };
  }, [data, height, padX]);

  const activeIndex = hoverIndex;
  const activePoint = activeIndex === null ? null : data[activeIndex];
  const activeCoords = activeIndex === null ? null : pts[activeIndex];

  const formatTooltipTimestamp = useCallback(
    (timestampMs?: number) => {
      if (!timestampMs || Number.isNaN(timestampMs)) {
        return null;
      }

      return tooltipDateFormatter.format(new Date(timestampMs));
    },
    [tooltipDateFormatter]
  );

  const tooltipTimestamp = formatTooltipTimestamp(activePoint?.timestampMs);
  const tooltipLeftPercent =
    activeCoords === null ? null : Math.max(18, Math.min(82, (activeCoords.x / VB_W) * 100));
  const tooltipTopPercent =
    activeCoords === null ? null : Math.max(14, Math.min(84, (activeCoords.y / height) * 100));
  const yAxisMarks = useMemo(() => {
    if (!showYAxisMarks) {
      return [];
    }

    const span = Math.max(maxVal - minVal, 1);
    const values = [maxVal, minVal + span * 0.5];
    return values.map((value) => {
      const roundedValue = roundYAxisMark(value);
      const y = PAD_TOP + (1 - (value - minVal) / span) * chartHeight;
      return {
        key: value,
        label: new Intl.NumberFormat(locale, {
          maximumFractionDigits: 0,
        }).format(roundedValue),
        topPercent: (y / height) * 100,
      };
    });
  }, [chartHeight, height, locale, maxVal, minVal, showYAxisMarks]);

  if (data.length < 2) {
    return null;
  }

  // Closed area path
  const area =
    `M ${pts[0].x} ${baseline} L ${pts[0].x} ${pts[0].y}` +
    line.slice(line.indexOf(' ')) +
    ` L ${pts[pts.length - 1].x} ${baseline} Z`;

  return (
    <div className="relative h-full">
      {yAxisMarks.map((mark) => (
        <div
          key={`y-mark-${mark.key}`}
          className="pointer-events-none absolute inset-x-0 z-0"
          style={{ top: `${mark.topPercent}%` }}
        >
          <div className="relative -translate-y-1/2">
            <div className={`border-t border-dashed ${axisLineClassName}`} />
            <div
              className={`absolute top-1/2 right-2 -translate-y-1/2 text-[10px] font-medium ${axisLabelClassName}`}
            >
              {mark.label}
            </div>
          </div>
        </div>
      ))}

      {activePoint &&
      tooltipTimestamp &&
      tooltipLeftPercent !== null &&
      tooltipTopPercent !== null ? (
        <div className="pointer-events-none absolute inset-0 z-20">
          <div
            className="absolute"
            style={{
              left: `${tooltipLeftPercent}%`,
              top: `${tooltipTopPercent}%`,
              transform: 'translate(-50%, calc(-100% - 10px))',
            }}
          >
            <div
              className={`w-max max-w-55 rounded-xl px-3 py-2 text-left backdrop-blur-md ${tooltipClassName}`}
            >
              <div className={`text-[11px] ${tokens.surface.textSecondary}`}>
                {tooltipTimestamp}
              </div>
              <div
                className={`mt-1 flex items-center gap-2 text-[11px] ${tokens.surface.textPrimary}`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tokens.accent }} />
                <span>
                  {t('charts.powerSparkline.useLabel', { value: Math.round(activePoint.value) })}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <svg
        viewBox={`0 0 ${VB_W} ${height}`}
        width="100%"
        height="100%"
        className={`block ${className ?? 'w-full'}`}
        role="img"
        aria-label={t('charts.powerSparkline.ariaLabel')}
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

        <path d={area} fill={`url(#${id}-sg)`} />
        <path
          d={line}
          fill="none"
          stroke={tokens.accent}
          strokeWidth="1.1"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {hoverIndex !== null && activeCoords ? (
          <line
            x1={activeCoords.x}
            y1={PAD_TOP}
            x2={activeCoords.x}
            y2={PAD_TOP + chartHeight}
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
