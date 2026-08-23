import type { EnergySeriesPoint } from '@navet/app/features/energy/types/energy.types';
import { useI18n, useTheme } from '@navet/app/hooks';
import { memo, useCallback, useState } from 'react';
import { getEnergyChartTokens } from './energy-chart-tokens';

interface EnergyHistoryBarChartProps {
  accentColor: string;
  data: EnergySeriesPoint[];
  ariaLabel?: string;
  className?: string;
  selectionDetailsId?: string;
  selectedIndex?: number | null;
  onSelectedIndexChange?: (index: number | null) => void;
}

export const EnergyHistoryBarChart = memo(function EnergyHistoryBarChart({
  accentColor,
  data,
  ariaLabel,
  className,
  selectionDetailsId,
  selectedIndex = null,
  onSelectedIndexChange,
}: EnergyHistoryBarChartProps) {
  const { locale, t } = useI18n();
  const { theme } = useTheme();
  const tokens = getEnergyChartTokens(theme, accentColor);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [keyboardIndex, setKeyboardIndex] = useState<number | null>(null);
  const maxValue = Math.max(...data.map((point) => point.secondaryValue ?? point.value), 0.01);
  const committedIndex = selectedIndex ?? keyboardIndex;
  const committedPoint = committedIndex === null ? null : data[committedIndex];
  const displayedIndex = activeIndex ?? committedIndex;
  const activePoint = displayedIndex === null ? null : data[displayedIndex];
  const activeLeftPercent =
    displayedIndex === null ? null : ((displayedIndex + 0.5) / Math.max(data.length, 1)) * 100;
  const tooltipLeftPercent =
    activeLeftPercent === null ? null : Math.max(10, Math.min(90, activeLeftPercent));
  const compactBars = data.length > 14;
  const labelStride = compactBars ? Math.ceil(data.length / 7) : 1;
  const tooltipClassName =
    theme === 'light'
      ? `border ${tokens.surface.border} ${tokens.surface.panel} text-slate-900 shadow-[0_18px_38px_-24px_rgba(15,23,42,0.22)]`
      : `border ${tokens.surface.border} ${tokens.surface.panel} ${tokens.surface.textPrimary} shadow-2xl`;

  const updateActiveIndex = useCallback(
    (clientX: number, rect: DOMRect) => {
      const relativeX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const nextIndex = Math.floor((relativeX / Math.max(rect.width, 1)) * data.length);
      setActiveIndex(Math.max(0, Math.min(data.length - 1, nextIndex)));
    },
    [data.length]
  );

  return (
    <div
      className={`relative isolate h-full min-h-20 overflow-visible ${className ?? ''}`}
      data-testid="energy-history-bars"
      role="slider"
      aria-label={ariaLabel ?? t('charts.bar.ariaLabel')}
      aria-controls={committedPoint ? selectionDetailsId : undefined}
      aria-valuemin={0}
      aria-valuemax={Math.max(0, data.length - 1)}
      aria-valuenow={committedIndex ?? 0}
      aria-valuetext={
        committedPoint
          ? committedPoint.hasData === false
            ? `${committedPoint.label}, No data`
            : `${committedPoint.label}, ${committedPoint.secondaryValue ?? committedPoint.value} kWh`
          : 'No period selected'
      }
      tabIndex={0}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const relativeX = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
        const index = Math.max(
          0,
          Math.min(data.length - 1, Math.floor((relativeX / Math.max(rect.width, 1)) * data.length))
        );
        const nextIndex = index === committedIndex ? null : index;
        if (onSelectedIndexChange) onSelectedIndexChange(nextIndex);
        else setKeyboardIndex(nextIndex);
      }}
      onKeyDown={(event) => {
        if (data.length === 0) return;
        if (event.key === 'Escape') {
          if (onSelectedIndexChange) onSelectedIndexChange(null);
          else setKeyboardIndex(null);
          return;
        }
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const current = committedIndex ?? (direction > 0 ? -1 : data.length);
        const nextIndex = Math.max(0, Math.min(data.length - 1, current + direction));
        if (onSelectedIndexChange) onSelectedIndexChange(nextIndex);
        else setKeyboardIndex(nextIndex);
      }}
      onMouseLeave={() => setActiveIndex(null)}
      onMouseMove={(event) => {
        updateActiveIndex(event.clientX, event.currentTarget.getBoundingClientRect());
      }}
      onTouchEnd={() => setActiveIndex(null)}
      onTouchMove={(event) => {
        const touch = event.touches[0];
        if (!touch) return;
        updateActiveIndex(touch.clientX, event.currentTarget.getBoundingClientRect());
      }}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        if (!touch) return;
        updateActiveIndex(touch.clientX, event.currentTarget.getBoundingClientRect());
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-6 bottom-6" aria-hidden="true">
        {[25, 50, 75].map((position) => (
          <div
            key={position}
            className="absolute inset-x-0 border-t border-dashed"
            style={{ top: `${position}%`, borderColor: tokens.grid }}
          />
        ))}
      </div>

      <div
        className="absolute inset-x-0 top-6 bottom-6 grid items-end"
        style={{
          gridTemplateColumns: `repeat(${data.length}, minmax(0, 64px))`,
          gap: compactBars ? '2px' : '4px',
          justifyContent: 'space-evenly',
        }}
        aria-hidden="true"
      >
        {data.map((point, index) => {
          const barValue = point.secondaryValue ?? point.value;
          const height = barValue > 0 ? Math.max(3, (Math.max(0, barValue) / maxValue) * 100) : 0;
          const isActive = displayedIndex === index;
          const showValue = point.hasData !== false && (!compactBars || isActive);
          const showLabel = index % labelStride === 0 || index === data.length - 1;
          const valueLabel = `${barValue.toLocaleString(locale, {
            maximumFractionDigits: barValue >= 10 ? 0 : barValue >= 1 ? 1 : 2,
          })}kWh`;
          const periodLabel =
            data.length <= 7 && point.timestampMs
              ? new Date(point.timestampMs).toLocaleDateString(locale, { weekday: 'short' })
              : point.label;

          return (
            <div
              key={`${point.timestampMs ?? point.label}-${index}`}
              className="relative h-full min-w-0 px-[8%]"
            >
              <div
                className="absolute inset-x-0 bottom-0 rounded-t-[4px] transition-[height,opacity,filter] duration-150"
                style={{
                  height: `${height}%`,
                  minHeight: barValue > 0 ? 3 : 0,
                  background: `linear-gradient(180deg, ${accentColor}e6 0%, ${accentColor}8f 58%, ${accentColor}38 100%)`,
                  boxShadow: isActive ? `0 0 18px ${accentColor}42` : undefined,
                  opacity: displayedIndex === null || isActive ? 1 : 0.5,
                }}
              />
              {showValue ? (
                <span
                  className={`absolute inset-x-0 z-10 whitespace-nowrap text-center text-xs font-semibold tabular-nums ${tokens.surface.textPrimary}`}
                  style={{ bottom: `calc(${height}% + 0.35rem)` }}
                >
                  {valueLabel}
                </span>
              ) : null}
              {showLabel ? (
                <span
                  className={`absolute inset-x-0 top-[calc(100%+0.35rem)] whitespace-nowrap text-xs ${
                    compactBars && index === 0
                      ? 'text-left'
                      : compactBars && index === data.length - 1
                        ? 'text-right'
                        : 'text-center'
                  } ${tokens.surface.textSecondary}`}
                >
                  {periodLabel}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {activePoint && activeLeftPercent !== null && tooltipLeftPercent !== null ? (
        <>
          <div
            className="pointer-events-none absolute bottom-0 top-0 z-10 w-px border-l border-dashed"
            style={{ left: `${activeLeftPercent}%`, borderColor: `${accentColor}70` }}
          />
          <div
            className={`pointer-events-none absolute bottom-[calc(100%+0.5rem)] z-20 w-max max-w-44 -translate-x-1/2 rounded-xl px-3 py-2 text-left text-xs backdrop-blur-md ${tooltipClassName}`}
            style={{ left: `${tooltipLeftPercent}%` }}
          >
            <div className={tokens.surface.textSecondary}>{activePoint.label}</div>
            <div className={`mt-1 font-semibold tabular-nums ${tokens.surface.textPrimary}`}>
              {activePoint.hasData === false
                ? 'No data'
                : `${(activePoint.secondaryValue ?? activePoint.value).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                    minimumFractionDigits: 1,
                  })} kWh`}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
});
