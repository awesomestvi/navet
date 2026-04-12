import { memo, useCallback, useId, useState } from 'react';
import { useI18n, useTheme } from '@/app/hooks';
import { getEnergyChartTokens } from './energy-chart-tokens';

export interface EnergyBarDatum {
  label: string;
  value: number;
  unit?: string;
  /** Show warning indicator and stripe overlay on this bar */
  alert?: boolean;
}

interface EnergyBarChartProps {
  data: EnergyBarDatum[];
  accentColor: string;
}

const VB_W = 400;
const VB_H = 120;
const PAD_TOP = 18;
const PAD_BOT = 24;

export const EnergyBarChart = memo(function EnergyBarChart({
  data,
  accentColor,
}: EnergyBarChartProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const id = useId();
  const tokens = getEnergyChartTokens(theme, accentColor);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chartH = VB_H - PAD_TOP - PAD_BOT;
  const step = VB_W / data.length;
  const barW = step * 0.6;
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const activeBar = activeIndex === null ? null : data[activeIndex];
  const tooltipLeftPercent =
    activeIndex === null
      ? null
      : Math.max(12, Math.min(88, ((activeIndex * step + step / 2) / VB_W) * 100));
  const updateActiveIndex = useCallback(
    (clientX: number, rect: DOMRect) => {
      const relativeX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const nextIndex = Math.floor((relativeX / Math.max(rect.width, 1)) * data.length);
      setActiveIndex(Math.max(0, Math.min(data.length - 1, nextIndex)));
    },
    [data.length]
  );

  return (
    <div className="relative">
      {activeBar && tooltipLeftPercent !== null ? (
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-0 w-full">
          <div
            className="w-full"
            style={{ transform: `translate3d(${tooltipLeftPercent}%, 0, 0)` }}
          >
            <div className="-translate-x-1/2 w-max max-w-[180px] rounded-xl border border-white/10 bg-neutral-950/92 px-3 py-2 text-left text-[11px] text-white shadow-2xl backdrop-blur-md">
              <div className="text-white/85">{activeBar.label}</div>
              <div className="mt-1 text-white/75">
                {activeBar.value}
                {activeBar.unit ?? ''}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-40 w-full"
        role="img"
        aria-label={t('charts.bar.ariaLabel')}
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
          {data.map((d, i) => {
            const c = d.alert ? tokens.warn : tokens.accent;
            return (
              <linearGradient key={i} id={`${id}-g${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity="0.7" />
                <stop offset="100%" stopColor={c} stopOpacity="0.14" />
              </linearGradient>
            );
          })}
          <pattern
            id={`${id}-stripe`}
            patternUnits="userSpaceOnUse"
            width="6"
            height="6"
            patternTransform="rotate(45)"
          >
            <rect width="3" height="6" fill={tokens.trackStrong} />
          </pattern>
        </defs>

        <line
          x1="0"
          y1={PAD_TOP + chartH}
          x2={VB_W}
          y2={PAD_TOP + chartH}
          stroke={tokens.grid}
          strokeWidth="0.4"
        />

        {data.map((d, i) => {
          const barH = Math.max(6, (d.value / maxValue) * chartH);
          const x = i * step + (step - barW) / 2;
          const y = PAD_TOP + chartH - barH;
          const cx = x + barW / 2;

          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx="8"
                fill={`url(#${id}-g${i})`}
                opacity={activeIndex === null || activeIndex === i ? 1 : 0.72}
              />
              {d.alert && (
                <rect x={x} y={y} width={barW} height={barH} rx="8" fill={`url(#${id}-stripe)`} />
              )}
              <text
                x={cx}
                y={y - 7}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill={tokens.label}
              >
                {d.value}
                {d.unit ?? ''}
              </text>
              {d.alert && barH > 36 && (
                <g transform={`translate(${cx}, ${y + barH - 20})`}>
                  <polygon
                    points="0,-8 7.5,4.5 -7.5,4.5"
                    fill="none"
                    stroke={tokens.warn}
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="0"
                    y1="-4"
                    x2="0"
                    y2="1"
                    stroke={tokens.warn}
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                  <circle cx="0" cy="3.2" r="0.9" fill={tokens.warn} />
                </g>
              )}
              <text x={cx} y={VB_H - 7} textAnchor="middle" fontSize="10" fill={tokens.labelMuted}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
});
