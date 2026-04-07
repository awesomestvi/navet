import type { ReactNode } from 'react';
import { navetTypographyTokens } from '@/app/components/system/tokens/foundations';
import type { ThemeType } from '@/app/hooks/use-theme';

type CardMetricSize = 'sm' | 'lg' | 'xl';

const sizeTokens: Record<CardMetricSize, string> = {
  sm: navetTypographyTokens.cardMetricSm,
  lg: navetTypographyTokens.cardMetricLg,
  xl: navetTypographyTokens.cardMetricXl,
};

interface CardMetricProps {
  /** The primary metric value — a number, percentage, temperature, etc. */
  value: ReactNode;
  /** Optional secondary label rendered below the value. */
  label?: ReactNode;
  /** Typography scale. Defaults to 'sm' (small + medium cards). */
  size?: CardMetricSize;
  /** When true the value is rendered in accentClassName; when false it's muted. */
  isActive: boolean;
  /** Tailwind text-color class applied when isActive is true (e.g. openColors.accent). */
  accentClassName: string;
  /** Used to derive the inactive muted color. */
  theme: ThemeType;
  /** Optional Tailwind class(es) for the label. Falls back to a muted secondary color. */
  labelClassName?: string;
  className?: string;
}

/**
 * CardMetric — reusable card metric display (big number + optional label).
 *
 * Handles typography token selection and active/inactive color switching so
 * individual cards don't need to hardcode these decisions.
 */
export function CardMetric({
  value,
  label,
  size = 'sm',
  isActive,
  accentClassName,
  theme,
  labelClassName,
  className = '',
}: CardMetricProps) {
  const inactiveClassName = theme === 'light' ? 'text-slate-400' : 'text-white/40';
  const valueClassName = `${sizeTokens[size]} ${isActive ? accentClassName : inactiveClassName}`;
  const resolvedLabelClassName =
    labelClassName ?? (theme === 'light' ? 'text-slate-500' : 'text-white/50');

  return (
    <div className={className}>
      <div className={valueClassName}>{value}</div>
      {label !== undefined && (
        <div className={`mt-1 ${navetTypographyTokens.helper} ${resolvedLabelClassName}`}>
          {label}
        </div>
      )}
    </div>
  );
}
