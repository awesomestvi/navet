import { memo, useCallback, useId, useState } from 'react';
import { useI18n, useTheme } from '@/app/hooks';
import { getEnergyChartTokens } from './energy-chart-tokens';

export interface EnergyAreaPoint {
  x: string;
  y: number;
}

interface EnergyAreaChartProps {
  data: EnergyAreaPoint[];
  yMax?: number;
  yTicks?: number[];
  /** Unit suffix shown on y-axis labels e.g. "%" or "kW" */
  yUnit?: string;
  accentColor: string;
}

const VB_W = 400;
const VB_H = 96;
const PAD = { top: 8, right: 6, bottom: 22, left: 32 };

export const EnergyAreaChart = memo(function EnergyAreaChart({
  data,
  yMax = 100,
  yTicks = [0, 25, 50, 75, 100],
  yUnit = '%',
  accentColor,
}: EnergyAreaChartProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const id = useId();
  const tokens = getEnergyChartTokens(theme, accentColor);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const tooltipClassName =
    theme === 'light'
      ? `border ${tokens.surface.border} ${tokens.surface.panel} text-slate-900 shadow-[0_18px_38px_-24px_rgba(15,23,42,0.22)]`
      : `border ${tokens.surface.border} ${tokens.surface.panel} ${tokens.surface.textPrimary} shadow-2xl`;
  const cW = VB_W - PAD.left - PAD.right;
  const cH = VB_H - PAD.top - PAD.bottom;
  const baseline = PAD.top + cH;

  const xAt = (i: number) => (data.length < 2 ? PAD.left : PAD.left + (i / (data.length - 1)) * cW);
  const yAt = (v: number) => PAD.top + (1 - Math.min(1, v / yMax)) * cH;

  const pts = data.map((d, i) => ({ x: xAt(i), y: yAt(d.y) }));
  const activePoint = activeIndex === null ? null : data[activeIndex];
  const activeCoords = activeIndex === null ? null : pts[activeIndex];
  const tooltipLeftPercent =
    activeCoords === null ? null : Math.max(14, Math.min(86, (activeCoords.x / VB_W) * 100));
  const updateActiveIndex = useCallback(
    (clientX: number, rect: DOMRect) => {
      const relativeX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const nextIndex = Math.round((relativeX / Math.max(rect.width, 1)) * (data.length - 1));
      setActiveIndex(Math.max(0, Math.min(data.length - 1, nextIndex)));
    },
    [data.length]
  );

  // Step-style filled area
  let area = `M ${pts[0].x} ${baseline} L ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    area += ` H ${pts[i].x} V ${pts[i].y}`;
  }
  area += ` H ${pts[pts.length - 1].x} V ${baseline} Z`;

  // Step-style stroke line
  let line = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    line += ` H ${pts[i].x} V ${pts[i].y}`;
  }

  return (
    <div className="relative">
      {activePoint && tooltipLeftPercent !== null ? (
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-0 w-full">
          <div
            className="w-full"
            style={{ transform: `translate3d(${tooltipLeftPercent}%, 0, 0)` }}
          >
            <div
              className={`-translate-x-1/2 w-max max-w-[180px] rounded-xl px-3 py-2 text-left text-xs backdrop-blur-md ${tooltipClassName}`}
            >
              <div className={tokens.surface.textSecondary}>{activePoint.x}</div>
              <div className={`mt-1 ${tokens.surface.textPrimary}`}>
                {activePoint.y}
                {yUnit}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-28 w-full"
        role="img"
        aria-label={t('charts.area.ariaLabel')}
        onMouseLeave={() => setActiveIndex(null)}
        onMouseMove={(event) => {
          updateActiveIndex(event.clientX, event.currentTarget.getBoundingClientRect());
        }}
        onTouchStart={(event) => {
          const touch = event.touches[0];
          if (!touch) return;
          updateActiveIndex(touch.clientX, event.currentTarget.getBoundingClientRect());
        }}
        onTouchMove={(event) => {
          const touch = event.touches[0];
          if (!touch) return;
          updateActiveIndex(touch.clientX, event.currentTarget.getBoundingClientRect());
        }}
      >
        <defs>
          <linearGradient id={`${id}-ag`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tokens.accent} stopOpacity="0.26" />
            <stop offset="100%" stopColor={tokens.accent} stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {yTicks.map((v) => {
          const y = yAt(v);
          return (
            <g key={v}>
              <line
                x1={PAD.left}
                y1={y}
                x2={VB_W - PAD.right}
                y2={y}
                stroke={v === 0 ? tokens.gridStrong : tokens.grid}
                strokeWidth="1"
              />
              <text
                x={PAD.left - 5}
                y={y + 3.5}
                textAnchor="end"
                fontSize="10"
                fill={tokens.labelSubtle}
              >
                {v}
                {yUnit}
              </text>
            </g>
          );
        })}

        <path d={area} fill={`url(#${id}-ag)`} />
        <path
          d={line}
          fill="none"
          stroke={tokens.accent}
          strokeWidth="0.6"
          strokeLinejoin="miter"
        />
        {activeCoords ? (
          <>
            <line
              x1={activeCoords.x}
              y1={PAD.top}
              x2={activeCoords.x}
              y2={baseline}
              stroke={tokens.accent}
              strokeOpacity="0.45"
              strokeDasharray="2 2"
              strokeWidth="1"
            />
            <circle cx={activeCoords.x} cy={activeCoords.y} r="3.5" fill={tokens.accentGlow} />
            <circle cx={activeCoords.x} cy={activeCoords.y} r="2" fill={tokens.accent} />
          </>
        ) : null}
        {data.map((d, i) => (
          <text
            key={`${d.x}-${i}`}
            x={xAt(i)}
            y={VB_H - 7}
            textAnchor="middle"
            fontSize="9"
            fill={tokens.labelMuted}
          >
            {d.x}
          </text>
        ))}
      </svg>
    </div>
  );
});
