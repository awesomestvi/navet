import { getPublicAssetUrl } from '@navet/app/utils/public-assets';
import { RevealBackground } from './dashboard-arrival-reveal-background';
import { BakingStage } from './dashboard-arrival-reveal-baking-stage';
import { RevealEffects } from './dashboard-arrival-reveal-effects';
import { ARRIVAL_KEYFRAMES } from './dashboard-arrival-reveal-keyframes';
import type { DashboardArrivalRevealController } from './use-dashboard-arrival-reveal';

export type ArrivalVariant = 'all' | 'blank' | 'import';
export type ArrivalPhase = 'baking' | 'revealed' | 'exiting';
export type ArrivalField =
  | 'bakingKicker'
  | 'bakingHeading'
  | 'bakingBody'
  | 'revealKicker'
  | 'revealHeading'
  | 'revealBody';

export function DashboardArrivalRevealView({
  controller,
}: {
  controller: DashboardArrivalRevealController;
}) {
  const {
    accentColor,
    backdropColor,
    copy,
    effectsQuality,
    phase,
    revealButtonBackground,
    revealButtonShadow,
    setPhase,
    subtleColor,
    textColor,
    theme,
  } = controller;
  const reducedEffectsEnabled = effectsQuality === 'low';
  const revealCardAnimation = reducedEffectsEnabled
    ? undefined
    : phase === 'revealed'
      ? 'navet-dashboard-reveal-card 1.05s cubic-bezier(0.22, 1, 0.36, 1) forwards'
      : phase === 'exiting'
        ? 'navet-dashboard-exit-card 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards'
        : undefined;
  const revealLogoAnimation = reducedEffectsEnabled
    ? undefined
    : phase === 'revealed'
      ? 'navet-dashboard-reveal-logo 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards'
      : phase === 'exiting'
        ? 'navet-dashboard-exit-card 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards'
        : undefined;
  const revealLineAnimation = reducedEffectsEnabled
    ? undefined
    : phase === 'revealed'
      ? 'navet-dashboard-reveal-line 1.4s ease-out 0.25s forwards'
      : phase === 'exiting'
        ? 'navet-dashboard-exit-shell 0.9s ease forwards'
        : undefined;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={phase === 'baking' ? copy.bakingHeading : copy.revealHeading}
      className="pointer-events-none fixed inset-0 z-90 overflow-hidden"
      style={{ background: backdropColor }}
    >
      <style>{ARRIVAL_KEYFRAMES}</style>

      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 38%, ${accentColor}18 0%, transparent 42%), ${backdropColor}`,
          animation:
            !reducedEffectsEnabled && phase === 'exiting'
              ? 'navet-dashboard-exit-shell 0.9s ease forwards'
              : undefined,
        }}
      />

      {phase !== 'baking' && (
        <RevealBackground accentColor={accentColor} effectsQuality={effectsQuality} theme={theme} />
      )}

      <BakingStage controller={controller} />

      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div
          className="pointer-events-auto relative w-full max-w-xl px-8 py-10 text-center"
          style={{
            animation: revealCardAnimation,
            opacity: phase === 'revealed' || phase === 'exiting' ? 1 : 0,
          }}
        >
          <div
            className="mx-auto flex min-h-24 w-full max-w-[18rem] items-center justify-center"
            style={{
              animation: revealLogoAnimation,
              opacity: phase === 'revealed' || phase === 'exiting' ? 1 : 0,
            }}
          >
            <div className="relative flex h-24 w-24 items-center justify-center">
              <RevealEffects controller={controller} />
              <img src={getPublicAssetUrl('logo.svg')} alt="" className="relative z-10 h-24 w-24" />
            </div>
          </div>
          <div
            className="mx-auto mt-5 h-px w-28 origin-center"
            style={{
              background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
              animation: revealLineAnimation,
              opacity: phase === 'revealed' || phase === 'exiting' ? 1 : 0,
            }}
          />
          <p
            className="mt-6 text-xs font-semibold uppercase tracking-[0.24em]"
            style={{ color: subtleColor }}
          >
            {copy.revealKicker}
          </p>
          <h2
            className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl"
            style={{ color: textColor }}
          >
            {copy.revealHeading}
          </h2>
          <p
            className="mx-auto mt-4 max-w-md text-sm leading-relaxed md:text-base"
            style={{ color: subtleColor }}
          >
            {copy.revealBody}
          </p>
          <button
            type="button"
            onClick={() => setPhase('exiting')}
            className="mt-8 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: revealButtonBackground,
              boxShadow: revealButtonShadow,
            }}
          >
            {copy.enter}
          </button>
        </div>
      </div>
    </div>
  );
}
