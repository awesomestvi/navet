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

const ARRIVAL_KEYFRAMES = `
  @keyframes navet-dashboard-bake-panel {
    0% { opacity: 1; }
    42% { opacity: 1; }
    56% { opacity: 0; }
    100% { opacity: 0; }
  }

  @keyframes navet-dashboard-bake-logo {
    0% { transform: scale(0.9) rotate(-8deg); opacity: 0; filter: blur(5px); }
    14% { transform: scale(1) rotate(0deg); opacity: 1; filter: blur(0); }
    36% { transform: scale(1.04) rotate(0deg); opacity: 1; filter: blur(0); }
    56% { transform: scale(0.98) rotate(0deg); opacity: 0; filter: blur(4px); }
    100% { transform: scale(0.98) rotate(0deg); opacity: 0; filter: blur(4px); }
  }

  @keyframes navet-dashboard-bake-pulse {
    0% { transform: translate(-50%, -50%) scale(0.82); opacity: 0.12; }
    50% { transform: translate(-50%, -50%) scale(1.05); opacity: 0.34; }
    100% { transform: translate(-50%, -50%) scale(1.26); opacity: 0.08; }
  }

  @keyframes navet-dashboard-bake-orbit {
    0% { transform: rotate(0deg) translateX(0); opacity: 0; }
    18% { opacity: 1; }
    100% { transform: rotate(360deg) translateX(0); opacity: 0; }
  }

  @keyframes navet-dashboard-bake-copy {
    0% { opacity: 0; transform: translateY(12px); }
    16% { opacity: 1; transform: translateY(0); }
    48% { opacity: 1; transform: translateY(0); }
    60% { opacity: 0; transform: translateY(-8px); }
    100% { opacity: 0; transform: translateY(-8px); }
  }

  @keyframes navet-dashboard-reveal-ring {
    0% { transform: translate(-50%, -50%) scale(0.68); opacity: 0; }
    18% { opacity: 0.95; }
    66% { opacity: 0.32; }
    100% { transform: translate(-50%, -50%) scale(1.55); opacity: 0; }
  }

  @keyframes navet-dashboard-reveal-glow {
    0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
    24% { opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1.18); opacity: 0.2; }
  }

  @keyframes navet-dashboard-reveal-card {
    0% { transform: translateY(22px) scale(0.96); opacity: 0; }
    62% { transform: translateY(0) scale(1.012); opacity: 1; }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }

  @keyframes navet-dashboard-reveal-line {
    0% { transform: scaleX(0.15); opacity: 0; }
    28% { transform: scaleX(1); opacity: 1; }
    100% { transform: scaleX(1.08); opacity: 0; }
  }

  @keyframes navet-dashboard-reveal-logo {
    0% { transform: scale(0.82); opacity: 0; filter: blur(6px); }
    62% { transform: scale(1.03); opacity: 1; filter: blur(0); }
    100% { transform: scale(1); opacity: 1; filter: blur(0); }
  }

  @keyframes navet-dashboard-exit-shell {
    0% { opacity: 1; }
    100% { opacity: 0; }
  }

  @keyframes navet-dashboard-exit-card {
    0% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
    100% { opacity: 0; transform: translateY(16px) scale(0.985); filter: blur(8px); }
  }
`;

export function DashboardArrivalRevealView({
  controller,
}: {
  controller: DashboardArrivalRevealController;
}) {
  const {
    accentColor,
    backdropColor,
    copy,
    panelBackground,
    panelBackgroundBottom,
    panelShadow,
    phase,
    revealBorderColor,
    revealButtonBackground,
    revealButtonShadow,
    setPhase,
    subtleColor,
    textColor,
  } = controller;

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
            phase === 'exiting' ? 'navet-dashboard-exit-shell 0.9s ease forwards' : undefined,
        }}
      />

      <BakingStage controller={controller} />
      <RevealEffects controller={controller} />

      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div
          className="pointer-events-auto relative w-full max-w-xl overflow-hidden rounded-4xl border px-8 py-10 text-center shadow-2xl backdrop-blur-2xl"
          style={{
            background: `linear-gradient(180deg, ${panelBackground}, ${panelBackgroundBottom})`,
            borderColor: revealBorderColor,
            animation:
              phase === 'revealed'
                ? 'navet-dashboard-reveal-card 1.05s cubic-bezier(0.22, 1, 0.36, 1) forwards'
                : phase === 'exiting'
                  ? 'navet-dashboard-exit-card 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards'
                  : undefined,
            opacity: phase === 'revealed' || phase === 'exiting' ? 1 : 0,
            boxShadow: panelShadow,
          }}
        >
          <div
            className="mx-auto flex min-h-24 w-full max-w-[18rem] items-center justify-center"
            style={{
              animation:
                phase === 'revealed'
                  ? 'navet-dashboard-reveal-logo 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards'
                  : phase === 'exiting'
                    ? 'navet-dashboard-exit-card 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards'
                    : undefined,
              opacity: phase === 'revealed' || phase === 'exiting' ? 1 : 0,
            }}
          >
            <img src="./logo.svg" alt="" className="h-24 w-24" />
          </div>
          <div
            className="mx-auto mt-5 h-px w-28 origin-center"
            style={{
              background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
              animation:
                phase === 'revealed'
                  ? 'navet-dashboard-reveal-line 1.4s ease-out 0.25s forwards'
                  : phase === 'exiting'
                    ? 'navet-dashboard-exit-shell 0.9s ease forwards'
                    : undefined,
              opacity: phase === 'revealed' || phase === 'exiting' ? 1 : 0,
            }}
          />
          <p
            className="mt-6 text-[11px] font-semibold uppercase tracking-[0.38em]"
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

function BakingStage({ controller }: { controller: DashboardArrivalRevealController }) {
  const { accentColor, copy, phase, subtleColor, textColor } = controller;

  return (
    <div
      className="absolute inset-0"
      style={{
        animation: phase === 'baking' ? 'navet-dashboard-bake-panel 6.2s ease forwards' : undefined,
        opacity: phase === 'baking' ? 1 : 0,
      }}
    >
      <div
        className="absolute left-1/2 top-[42%] h-88 w-88 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, ${accentColor}2f 0%, ${accentColor}10 55%, transparent 76%)`,
          animation: 'navet-dashboard-bake-pulse 2.4s ease-in-out infinite',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className="relative flex w-full max-w-lg flex-col items-center text-center">
          <div className="relative h-40 w-40">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="absolute left-1/2 top-1/2 h-3.5 w-3.5 rounded-full"
                style={{
                  backgroundColor: accentColor,
                  boxShadow: `0 0 24px ${accentColor}88`,
                  transformOrigin: `0 ${index === 1 ? 56 : 46}px`,
                  animation:
                    phase === 'baking'
                      ? `navet-dashboard-bake-orbit 2.6s linear ${index * 0.32}s infinite`
                      : undefined,
                }}
              />
            ))}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                animation:
                  phase === 'baking'
                    ? 'navet-dashboard-bake-logo 6.2s cubic-bezier(0.22, 1, 0.36, 1) forwards'
                    : undefined,
              }}
            >
              <img src="./logo.svg" alt="" className="h-24 w-24" />
            </div>
          </div>
          <p
            className="mt-8 text-[11px] font-semibold uppercase tracking-[0.42em]"
            style={{
              color: subtleColor,
              animation:
                phase === 'baking' ? 'navet-dashboard-bake-copy 6.2s ease forwards' : undefined,
            }}
          >
            {copy.bakingKicker}
          </p>
          <h2
            className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl"
            style={{
              color: textColor,
              animation:
                phase === 'baking' ? 'navet-dashboard-bake-copy 6.2s ease forwards' : undefined,
            }}
          >
            {copy.bakingHeading}
          </h2>
          <p
            className="mt-4 max-w-md text-sm leading-relaxed md:text-base"
            style={{
              color: subtleColor,
              animation:
                phase === 'baking' ? 'navet-dashboard-bake-copy 6.2s ease forwards' : undefined,
            }}
          >
            {copy.bakingBody}
          </p>
        </div>
      </div>
    </div>
  );
}

function RevealEffects({ controller }: { controller: DashboardArrivalRevealController }) {
  const { accentColor, phase } = controller;

  if (phase === 'baking') {
    return null;
  }

  return (
    <>
      {[0, 0.24, 0.48].map((delay, index) => (
        <div
          key={delay}
          className="absolute left-1/2 top-[40%] rounded-full border"
          style={{
            width: `${15 + index * 4}rem`,
            height: `${15 + index * 4}rem`,
            borderColor: `${accentColor}${index === 0 ? '88' : '44'}`,
            transform: 'translate(-50%, -50%)',
            animation:
              phase === 'revealed'
                ? `navet-dashboard-reveal-ring 3.8s ease-out ${delay}s forwards`
                : 'navet-dashboard-exit-shell 0.9s ease forwards',
          }}
        />
      ))}

      <div
        className="absolute left-1/2 top-[40%] h-96 w-96 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, ${accentColor}40 0%, ${accentColor}08 56%, transparent 74%)`,
          transform: 'translate(-50%, -50%)',
          animation:
            phase === 'revealed'
              ? 'navet-dashboard-reveal-glow 3.5s ease-out forwards'
              : 'navet-dashboard-exit-shell 0.9s ease forwards',
        }}
      />
    </>
  );
}
