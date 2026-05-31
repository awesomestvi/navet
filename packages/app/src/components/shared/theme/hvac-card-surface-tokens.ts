import type { ThemeType } from '@navet/app/hooks/use-theme';

export interface HVACCardSurfaceTokens {
  // Card container
  cardBackground: string;
  cardBorder: string;
  cardShadow: string;

  // Temperature display
  tempTextColor: string;
  tempSubtextColor: string;
  targetTempColor: string;

  // Mode indicators
  modeActiveBg: string;
  modeActiveBorder: string;
  modeInactiveBg: string;
  modeInactiveBorder: string;
  modeTextColor: string;
  modeTextMutedColor: string;

  // Gauge surfaces
  gaugeArcBg: string;
  gaugeTickColor: string;
  gaugeGlowColor: string;

  // Control buttons
  controlButtonBg: string;
  controlButtonBorder: string;
  controlButtonShadow: string;
  controlIconColor: string;

  // HVAC state colors
  heatingColor: string;
  coolingColor: string;
  fanColor: string;
  idleColor: string;
}

export function getHVACCardSurfaceTokens(
  theme: ThemeType,
  mode?: 'heat' | 'cool' | 'heat_cool' | 'fan_only' | 'off'
): HVACCardSurfaceTokens {
  // Determine primary color based on mode
  const isHeating = mode === 'heat';
  const isCooling = mode === 'cool';
  const isFanOnly = mode === 'fan_only';

  const heatingColor = theme === 'light' ? 'text-orange-600' : 'text-orange-400';
  const coolingColor = theme === 'light' ? 'text-cyan-600' : 'text-cyan-400';
  const fanColor = theme === 'light' ? 'text-emerald-600' : 'text-emerald-400';
  const idleColor = theme === 'light' ? 'text-slate-600' : 'text-slate-400';

  const primaryColor = isHeating
    ? heatingColor
    : isCooling
      ? coolingColor
      : isFanOnly
        ? fanColor
        : idleColor;

  // Mode button surfaces
  const modeActiveBg =
    theme === 'light' ? 'bg-white/80' : theme === 'glass' ? 'bg-white/10' : 'bg-white/8';

  const modeActiveBorder =
    theme === 'light'
      ? 'border-slate-300/80'
      : theme === 'glass'
        ? 'border-white/20'
        : 'border-white/12';

  const modeInactiveBg =
    theme === 'light' ? 'bg-slate-100/60' : theme === 'glass' ? 'bg-white/5' : 'bg-white/4';

  const modeInactiveBorder =
    theme === 'light'
      ? 'border-slate-200/60'
      : theme === 'glass'
        ? 'border-white/10'
        : 'border-white/6';

  const modeTextColor = theme === 'light' ? 'text-slate-900' : 'text-white';
  const modeTextMutedColor = theme === 'light' ? 'text-slate-600' : 'text-white/70';

  // Control button surfaces
  const controlButtonBg = theme === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.08)';

  const controlButtonBorder = theme === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.1)';

  const controlButtonShadow =
    theme === 'light'
      ? '0 8px 16px -12px rgba(15,23,42,0.2), inset 0 1px 0 rgba(255,255,255,0.8)'
      : 'inset 0 1px 0 rgba(255,255,255,0.06)';

  const controlIconColor = theme === 'light' ? '!text-slate-800' : '!text-white/90';

  // Gauge surfaces
  const gaugeArcBg = theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)';

  const gaugeTickColor = theme === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)';

  const gaugeGlowColor = isHeating
    ? theme === 'light'
      ? 'rgba(249,115,22,0.3)'
      : 'rgba(249,115,22,0.4)'
    : isCooling
      ? theme === 'light'
        ? 'rgba(8,145,178,0.3)'
        : 'rgba(8,145,178,0.4)'
      : theme === 'light'
        ? 'rgba(16,185,129,0.3)'
        : 'rgba(16,185,129,0.4)';

  // Card container
  if (theme === 'light') {
    return {
      cardBackground: 'bg-white/70',
      cardBorder: 'border-slate-200/80',
      cardShadow: 'shadow-[0_8px_24px_-16px_rgba(15,23,42,0.2)]',
      tempTextColor: 'text-slate-900',
      tempSubtextColor: 'text-slate-600',
      targetTempColor: primaryColor,
      modeActiveBg,
      modeActiveBorder,
      modeInactiveBg,
      modeInactiveBorder,
      modeTextColor,
      modeTextMutedColor,
      gaugeArcBg,
      gaugeTickColor,
      gaugeGlowColor,
      controlButtonBg,
      controlButtonBorder,
      controlButtonShadow,
      controlIconColor,
      heatingColor,
      coolingColor,
      fanColor,
      idleColor,
    };
  }

  if (theme === 'black') {
    return {
      cardBackground: 'bg-black/60',
      cardBorder: 'border-white/10',
      cardShadow: '',
      tempTextColor: 'text-white',
      tempSubtextColor: 'text-white/80',
      targetTempColor: primaryColor,
      modeActiveBg,
      modeActiveBorder,
      modeInactiveBg,
      modeInactiveBorder,
      modeTextColor,
      modeTextMutedColor,
      gaugeArcBg,
      gaugeTickColor,
      gaugeGlowColor,
      controlButtonBg,
      controlButtonBorder,
      controlButtonShadow,
      controlIconColor,
      heatingColor,
      coolingColor,
      fanColor,
      idleColor,
    };
  }

  if (theme === 'glass') {
    return {
      cardBackground: 'bg-slate-950/70',
      cardBorder: 'border-white/14',
      cardShadow: 'shadow-[0_12px_32px_-20px_rgba(2,8,20,0.7)]',
      tempTextColor: 'text-white',
      tempSubtextColor: 'text-white/84',
      targetTempColor: primaryColor,
      modeActiveBg,
      modeActiveBorder,
      modeInactiveBg,
      modeInactiveBorder,
      modeTextColor,
      modeTextMutedColor,
      gaugeArcBg,
      gaugeTickColor,
      gaugeGlowColor,
      controlButtonBg,
      controlButtonBorder,
      controlButtonShadow,
      controlIconColor,
      heatingColor,
      coolingColor,
      fanColor,
      idleColor,
    };
  }

  // Dark theme
  return {
    cardBackground: 'bg-zinc-900/80',
    cardBorder: 'border-white/8',
    cardShadow: 'shadow-[0_8px_20px_-12px_rgba(0,0,0,0.5)]',
    tempTextColor: 'text-white',
    tempSubtextColor: 'text-white/80',
    targetTempColor: primaryColor,
    modeActiveBg,
    modeActiveBorder,
    modeInactiveBg,
    modeInactiveBorder,
    modeTextColor,
    modeTextMutedColor,
    gaugeArcBg,
    gaugeTickColor,
    gaugeGlowColor,
    controlButtonBg,
    controlButtonBorder,
    controlButtonShadow,
    controlIconColor,
    heatingColor,
    coolingColor,
    fanColor,
    idleColor,
  };
}

export interface HVACGaugeSurfaceTokens {
  arcBackground: string;
  tickColor: string;
  arcInnerStroke: string;
  glowBandColor?: string;
}

export function getHVACGaugeSurfaceTokens(
  theme: ThemeType,
  primaryBandColor?: string
): HVACGaugeSurfaceTokens {
  const arcBackground = theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)';

  const tickColor = theme === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)';

  const arcInnerStroke = theme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.3)';

  const glowBandColor = primaryBandColor
    ? theme === 'light'
      ? `${primaryBandColor}44`
      : `${primaryBandColor}66`
    : undefined;

  return {
    arcBackground,
    tickColor,
    arcInnerStroke,
    glowBandColor,
  };
}
