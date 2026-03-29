import { memo } from 'react';
import { useI18n, useTheme } from '@/app/hooks';
import { getEnergyChartTokens } from './energy-chart-tokens';

interface EnergyGaugeProps {
  /** 0–100 */
  value: number;
  accentColor: string;
  /** Main text in the center of the arc */
  label?: string;
  /** Smaller text below the main label */
  sublabel?: string;
}

// Semi-circle: center (100, 90), radius 64
const CX = 100;
const CY = 90;
const R = 64;
const TRACK_W = 9;
const SEMI_CIRC = Math.PI * R; // ≈ 245

const ARC_D = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

export const EnergyGauge = memo(function EnergyGauge({
  value,
  accentColor,
  label,
  sublabel,
}: EnergyGaugeProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const tokens = getEnergyChartTokens(theme, accentColor);
  const filled = Math.min(1, Math.max(0, value / 100)) * SEMI_CIRC;

  return (
    <svg
      viewBox="0 0 200 110"
      className="h-44 w-full"
      role="img"
      aria-label={label ?? t('charts.gauge.ariaLabel')}
    >
      <path
        d={ARC_D}
        fill="none"
        stroke={tokens.track}
        strokeWidth={TRACK_W}
        strokeLinecap="round"
      />
      <path
        d={ARC_D}
        fill="none"
        stroke={tokens.accent}
        strokeWidth={TRACK_W}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${SEMI_CIRC}`}
      />
      {label && (
        <text
          x={CX}
          y={CY - 6}
          textAnchor="middle"
          fontSize="22"
          fontWeight="700"
          fill={tokens.label}
        >
          {label}
        </text>
      )}
      {sublabel && (
        <text x={CX} y={CY + 10} textAnchor="middle" fontSize="10" fill={tokens.labelMuted}>
          {sublabel}
        </text>
      )}
      <text x={CX - R + 2} y={CY + 16} fontSize="8.5" fill={tokens.labelSubtle}>
        0
      </text>
      <text x={CX + R - 2} y={CY + 16} textAnchor="end" fontSize="8.5" fill={tokens.labelSubtle}>
        100
      </text>
    </svg>
  );
});
