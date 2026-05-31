import type { ThemeType } from '@navet/app/hooks/use-theme';
import type { CSSProperties } from 'react';

export interface CoverCardSurfaceTokens {
  // Card container
  cardBackground: string;
  cardBorder: string;
  cardShadow: string;

  // Position display
  positionTextColor: string;
  positionSubtextColor: string;
  percentageColor: string;

  // Control surfaces
  controlButtonBg: string;
  controlButtonBorder: string;
  controlButtonShadow: string;
  controlIconColor: string;
  controlButtonDisabledOpacity: number;

  // Slider surfaces
  sliderTrackBg: string;
  sliderFillBg: string;
  sliderThumbBg: string;
  sliderThumbBorder: string;
  sliderThumbShadow: string;

  // Tilt control
  tiltIndicatorColor: string;
  tiltTrackBg: string;

  // Cover state colors
  openColor: string;
  closedColor: string;
  movingColor: string;
}

export function getCoverCardSurfaceTokens(
  theme: ThemeType,
  position?: number // 0-100, where 0=closed, 100=open
): CoverCardSurfaceTokens {
  const isOpen = position !== undefined && position > 0;

  // Control button surfaces
  const controlButtonBg = theme === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.08)';

  const controlButtonBorder = theme === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.1)';

  const controlButtonShadow =
    theme === 'light'
      ? '0 8px 16px -12px rgba(15,23,42,0.2), inset 0 1px 0 rgba(255,255,255,0.8)'
      : 'inset 0 1px 0 rgba(255,255,255,0.06)';

  const controlIconColor = theme === 'light' ? '!text-slate-800' : '!text-white/90';
  const controlButtonDisabledOpacity = 0.4;

  // Slider surfaces
  const sliderTrackBg = theme === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)';

  const sliderFillBg = theme === 'light' ? 'rgba(16,185,129,0.6)' : 'rgba(16,185,129,0.7)';

  const sliderThumbBg = theme === 'light' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)';

  const sliderThumbBorder = theme === 'light' ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.2)';

  const sliderThumbShadow =
    theme === 'light' ? '0 2px 8px rgba(15,23,42,0.2)' : '0 2px 8px rgba(0,0,0,0.4)';

  // Tilt indicator
  const tiltIndicatorColor = theme === 'light' ? 'rgba(16,185,129,0.6)' : 'rgba(16,185,129,0.7)';

  const tiltTrackBg = theme === 'light' ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.06)';

  // State colors
  const openColor = theme === 'light' ? 'text-emerald-600' : 'text-emerald-400';
  const closedColor = theme === 'light' ? 'text-slate-600' : 'text-slate-400';
  const movingColor = theme === 'light' ? 'text-amber-600' : 'text-amber-400';

  // Card container
  if (theme === 'light') {
    return {
      cardBackground: 'bg-white/70',
      cardBorder: 'border-slate-200/80',
      cardShadow: 'shadow-[0_8px_24px_-16px_rgba(15,23,42,0.2)]',
      positionTextColor: 'text-slate-900',
      positionSubtextColor: 'text-slate-600',
      percentageColor: isOpen ? openColor : closedColor,
      controlButtonBg,
      controlButtonBorder,
      controlButtonShadow,
      controlIconColor,
      controlButtonDisabledOpacity,
      sliderTrackBg,
      sliderFillBg,
      sliderThumbBg,
      sliderThumbBorder,
      sliderThumbShadow,
      tiltIndicatorColor,
      tiltTrackBg,
      openColor,
      closedColor,
      movingColor,
    };
  }

  if (theme === 'black') {
    return {
      cardBackground: 'bg-black/60',
      cardBorder: 'border-white/10',
      cardShadow: '',
      positionTextColor: 'text-white',
      positionSubtextColor: 'text-white/80',
      percentageColor: isOpen ? openColor : closedColor,
      controlButtonBg,
      controlButtonBorder,
      controlButtonShadow,
      controlIconColor,
      controlButtonDisabledOpacity,
      sliderTrackBg,
      sliderFillBg,
      sliderThumbBg,
      sliderThumbBorder,
      sliderThumbShadow,
      tiltIndicatorColor,
      tiltTrackBg,
      openColor,
      closedColor,
      movingColor,
    };
  }

  if (theme === 'glass') {
    return {
      cardBackground: 'bg-slate-950/70',
      cardBorder: 'border-white/14',
      cardShadow: 'shadow-[0_12px_32px_-20px_rgba(2,8,20,0.7)]',
      positionTextColor: 'text-white',
      positionSubtextColor: 'text-white/84',
      percentageColor: isOpen ? openColor : closedColor,
      controlButtonBg,
      controlButtonBorder,
      controlButtonShadow,
      controlIconColor,
      controlButtonDisabledOpacity,
      sliderTrackBg,
      sliderFillBg,
      sliderThumbBg,
      sliderThumbBorder,
      sliderThumbShadow,
      tiltIndicatorColor,
      tiltTrackBg,
      openColor,
      closedColor,
      movingColor,
    };
  }

  // Dark theme
  return {
    cardBackground: 'bg-zinc-900/80',
    cardBorder: 'border-white/8',
    cardShadow: 'shadow-[0_8px_20px_-12px_rgba(0,0,0,0.5)]',
    positionTextColor: 'text-white',
    positionSubtextColor: 'text-white/80',
    percentageColor: isOpen ? openColor : closedColor,
    controlButtonBg,
    controlButtonBorder,
    controlButtonShadow,
    controlIconColor,
    controlButtonDisabledOpacity,
    sliderTrackBg,
    sliderFillBg,
    sliderThumbBg,
    sliderThumbBorder,
    sliderThumbShadow,
    tiltIndicatorColor,
    tiltTrackBg,
    openColor,
    closedColor,
    movingColor,
  };
}

export interface CoverPositionControlSurfaceTokens {
  trackClassName: string;
  fillClassName: string;
  thumbClassName: string;
  thumbStyle?: CSSProperties;
}

export function getCoverPositionControlSurfaceTokens(
  theme: ThemeType
): CoverPositionControlSurfaceTokens {
  const trackClassName = theme === 'light' ? 'bg-slate-200/80' : 'bg-white/8';

  const fillClassName = theme === 'light' ? 'bg-emerald-500/60' : 'bg-emerald-400/70';

  const thumbClassName =
    theme === 'light' ? 'bg-white border-slate-300/80' : 'bg-white/15 border-white/20';

  const thumbStyle: CSSProperties | undefined =
    theme === 'light'
      ? {
          boxShadow: '0 2px 8px rgba(15,23,42,0.2)',
        }
      : {
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
        };

  return {
    trackClassName,
    fillClassName,
    thumbClassName,
    thumbStyle,
  };
}
