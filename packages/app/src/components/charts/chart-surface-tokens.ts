import type { ThemeType } from '@navet/app/hooks/use-theme';

export interface ChartSurfaceTokens {
  axisLineColor: string;
  axisLabelColor: string;
  gridLineColor: string;
  chartBackground: string;
}

export function getChartSurfaceTokens(theme: ThemeType): ChartSurfaceTokens {
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
