import type { EffectsQuality } from '@navet/app/stores/settings-store';
import { AMBIENT_LAYERS } from './dashboard-arrival-reveal-ambient-layers';
import type { DashboardArrivalRevealController } from './use-dashboard-arrival-reveal';

interface RevealBackgroundProps {
  accentColor: string;
  effectsQuality: EffectsQuality;
  theme: DashboardArrivalRevealController['theme'];
}

export function RevealBackground({ accentColor, effectsQuality, theme }: RevealBackgroundProps) {
  const showFullAmbient = effectsQuality === 'high';
  const showHaloMotion = effectsQuality !== 'low';
  const isLight = theme === 'light';
  const gridLine = isLight ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.06)';
  const gridGlow = isLight ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.04)';
  const softHighlight = isLight ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.07)';
  const secondaryHighlight = isLight ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.05)';
  const verticalWash = isLight ? 'rgba(15,23,42,0.02)' : 'rgba(255,255,255,0.03)';
  const lowerWash = isLight ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.04)';
  const secondaryBloom = isLight ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.12)';

  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background: [
            `radial-gradient(circle at 50% 36%, ${accentColor}26 0%, ${accentColor}12 18%, transparent 42%)`,
            `radial-gradient(circle at 20% 18%, ${softHighlight} 0%, transparent 30%)`,
            `radial-gradient(circle at 78% 20%, ${secondaryHighlight} 0%, transparent 26%)`,
            `linear-gradient(180deg, ${verticalWash} 0%, rgba(255,255,255,0) 38%, ${lowerWash} 100%)`,
          ].join(', '),
        }}
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            `linear-gradient(${gridLine} 1px, transparent 1px)`,
            `linear-gradient(90deg, ${gridLine} 1px, transparent 1px)`,
          ].join(', '),
          backgroundPosition: 'center center',
          backgroundSize: showFullAmbient ? '160px 160px' : '220px 220px',
          maskImage:
            'radial-gradient(circle at 50% 38%, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 48%, transparent 78%)',
          WebkitMaskImage:
            'radial-gradient(circle at 50% 38%, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 48%, transparent 78%)',
          boxShadow: `inset 0 0 140px ${gridGlow}`,
          opacity: showFullAmbient ? (isLight ? 0.22 : 0.18) : isLight ? 0.14 : 0.1,
          animation: showFullAmbient
            ? 'navet-arrival-grid-float 16s ease-in-out infinite'
            : undefined,
        }}
      />

      <div
        className="pointer-events-none absolute left-1/2 top-[38%] h-[42rem] w-[42rem] rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, ${accentColor}26 0%, ${accentColor}10 36%, transparent 70%)`,
          transform: 'translate(-50%, -50%)',
          animation: showHaloMotion ? 'navet-arrival-halo 12s ease-in-out infinite' : undefined,
        }}
      />

      {showFullAmbient &&
        AMBIENT_LAYERS.map((layer) => (
          <div
            key={`${layer.left}-${layer.top}`}
            className="pointer-events-none absolute rounded-full blur-3xl"
            style={{
              left: layer.left,
              top: layer.top,
              width: `${layer.size}rem`,
              height: `${layer.size}rem`,
              background: `radial-gradient(circle, ${accentColor}${layer.opacity} 0%, transparent 68%)`,
              animation: layer.animation,
            }}
          />
        ))}

      <div
        className="pointer-events-none absolute -right-[12%] bottom-[-12%] h-[34rem] w-[28rem]"
        style={{
          background: `radial-gradient(circle at 40% 40%, ${secondaryBloom} 0%, ${accentColor}10 24%, transparent 72%)`,
          filter: 'blur(26px)',
          opacity: effectsQuality === 'high' ? (isLight ? 0.62 : 0.75) : isLight ? 0.34 : 0.42,
          animation:
            effectsQuality === 'high'
              ? 'navet-arrival-ambient-drift-reverse 18s ease-in-out infinite alternate'
              : undefined,
        }}
      />
    </>
  );
}
