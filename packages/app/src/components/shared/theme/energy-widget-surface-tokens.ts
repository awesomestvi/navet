import type { ThemeType } from '@navet/app/hooks/use-theme';
import type { CSSProperties } from 'react';

export interface EnergyNowWidgetSurfaceTokens {
  // Gradient backgrounds
  solarHighlightGradient: string;
  gridFlowGradient: string;
  batteryFlowGradient: string;

  // Threshold line
  thresholdLineColor: string;
  thresholdLineStyle: CSSProperties;

  // Text colors for states
  importTextColor: string;
  exportTextColor: string;
  solarTextColor: string;

  // Icon colors
  solarIconColor: string;
  gridIconColor: string;
  batteryIconColor: string;

  // Card surfaces
  cardBackground: string;
  cardBorder: string;
  cardShadow: string;
}

export function getEnergyNowWidgetSurfaceTokens(
  theme: ThemeType,
  accentColor?: string
): EnergyNowWidgetSurfaceTokens {
  const effectiveAccent = accentColor ?? '#f59e0b';

  // Flow gradients
  const solarHighlightGradient =
    theme === 'light'
      ? `radial-gradient(circle at 50% 100%, ${effectiveAccent}16 0%, transparent 55%)`
      : `radial-gradient(circle at 50% 100%, ${effectiveAccent}26 0%, transparent 55%)`;

  const gridFlowGradient =
    theme === 'light'
      ? 'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.03) 100%)'
      : 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)';

  const batteryFlowGradient =
    theme === 'light'
      ? 'linear-gradient(180deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%)'
      : 'linear-gradient(180deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.08) 100%)';

  // Threshold line (separates import/export)
  const thresholdLineColor = theme === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)';
  const thresholdLineStyle: CSSProperties = {
    borderTop: `1px dashed ${thresholdLineColor}`,
  };

  // Text colors for energy flow states
  if (theme === 'light') {
    return {
      solarHighlightGradient,
      gridFlowGradient,
      batteryFlowGradient,
      thresholdLineColor,
      thresholdLineStyle,
      importTextColor: 'text-emerald-600',
      exportTextColor: 'text-amber-600',
      solarTextColor: 'text-orange-600',
      solarIconColor: '#f97316',
      gridIconColor: '#059669',
      batteryIconColor: '#10b981',
      cardBackground: 'bg-white/70',
      cardBorder: 'border-gray-200/50',
      cardShadow: 'shadow-[0_4px_12px_-8px_rgba(15,23,42,0.15)]',
    };
  }

  if (theme === 'black') {
    return {
      solarHighlightGradient,
      gridFlowGradient,
      batteryFlowGradient,
      thresholdLineColor,
      thresholdLineStyle,
      importTextColor: 'text-emerald-400',
      exportTextColor: 'text-amber-400',
      solarTextColor: 'text-orange-300',
      solarIconColor: '#fbbf24',
      gridIconColor: '#34d399',
      batteryIconColor: '#6ee7b7',
      cardBackground: 'bg-black/50',
      cardBorder: 'border-white/10',
      cardShadow: '',
    };
  }

  if (theme === 'glass') {
    return {
      solarHighlightGradient,
      gridFlowGradient,
      batteryFlowGradient,
      thresholdLineColor,
      thresholdLineStyle,
      importTextColor: 'text-emerald-300',
      exportTextColor: 'text-amber-300',
      solarTextColor: 'text-orange-200',
      solarIconColor: '#fcd34d',
      gridIconColor: '#6ee7b7',
      batteryIconColor: '#a7f3d0',
      cardBackground: 'bg-slate-950/60',
      cardBorder: 'border-white/12',
      cardShadow: 'shadow-[0_8px_24px_-16px_rgba(2,8,20,0.6)]',
    };
  }

  // Dark theme
  return {
    solarHighlightGradient,
    gridFlowGradient,
    batteryFlowGradient,
    thresholdLineColor,
    thresholdLineStyle,
    importTextColor: 'text-emerald-400',
    exportTextColor: 'text-amber-400',
    solarTextColor: 'text-orange-300',
    solarIconColor: '#fbbf24',
    gridIconColor: '#34d399',
    batteryIconColor: '#6ee7b7',
    cardBackground: 'bg-zinc-900/80',
    cardBorder: 'border-white/8',
    cardShadow: 'shadow-[0_8px_20px_-12px_rgba(0,0,0,0.5)]',
  };
}

export interface EnergyInsightSurfaceTokens {
  criticalColor: string;
  warningColor: string;
  infoColor: string;
}

export function getEnergyInsightSurfaceTokens(theme: ThemeType): EnergyInsightSurfaceTokens {
  if (theme === 'light') {
    return {
      criticalColor: 'text-red-600',
      warningColor: 'text-orange-600',
      infoColor: 'text-sky-700',
    };
  }

  if (theme === 'black') {
    return {
      criticalColor: 'text-red-300',
      warningColor: 'text-orange-300',
      infoColor: 'text-sky-300',
    };
  }

  if (theme === 'glass') {
    return {
      criticalColor: 'text-red-300',
      warningColor: 'text-orange-300',
      infoColor: 'text-sky-200',
    };
  }

  // Dark theme
  return {
    criticalColor: 'text-red-400',
    warningColor: 'text-orange-400',
    infoColor: 'text-sky-300',
  };
}

export interface EnergyChartSurfaceTokens {
  axisLineColor: string;
  axisLabelColor: string;
  gridLineColor: string;
  chartBackground: string;
}

export function getEnergyChartSurfaceTokens(theme: ThemeType): EnergyChartSurfaceTokens {
  if (theme === 'light') {
    return {
      axisLineColor: 'border-slate-300/70',
      axisLabelColor: 'text-slate-600',
      gridLineColor: 'rgba(15,23,42,0.06)',
      chartBackground: 'rgba(255,255,255,0.5)',
    };
  }

  return {
    axisLineColor: 'border-white/6',
    axisLabelColor: 'text-white/76',
    gridLineColor: 'rgba(255,255,255,0.04)',
    chartBackground: 'rgba(255,255,255,0.03)',
  };
}
