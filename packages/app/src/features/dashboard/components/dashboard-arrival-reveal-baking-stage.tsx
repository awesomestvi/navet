import { getPublicAssetUrl } from '@navet/app/utils/public-assets';
import type { DashboardArrivalRevealController } from './use-dashboard-arrival-reveal';

interface BakingStageProps {
  controller: DashboardArrivalRevealController;
}

export function BakingStage({ controller }: BakingStageProps) {
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
              <img src={getPublicAssetUrl('logo.svg')} alt="" className="h-24 w-24" />
            </div>
          </div>
          <p
            className="mt-8 text-xs font-semibold uppercase tracking-[0.24em]"
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
