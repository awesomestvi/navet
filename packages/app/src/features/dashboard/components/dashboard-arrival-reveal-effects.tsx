import type { DashboardArrivalRevealController } from './use-dashboard-arrival-reveal';

interface RevealEffectsProps {
  controller: DashboardArrivalRevealController;
}

export function RevealEffects({ controller }: RevealEffectsProps) {
  const { accentColor, phase } = controller;

  if (phase === 'baking') {
    return null;
  }

  return (
    <>
      {[0, 0.24, 0.48].map((delay, index) => (
        <div
          key={delay}
          className="absolute left-1/2 top-1/2 rounded-full border"
          style={{
            width: `${15 + index * 4}rem`,
            height: `${15 + index * 4}rem`,
            borderColor: `${accentColor}${index === 0 ? '88' : '44'}`,
            transform: 'translate(-50%, -50%) scale(0.68)',
            opacity: 0,
            animation:
              phase === 'revealed'
                ? `navet-dashboard-reveal-ring 4.6s ease-out ${delay}s backwards infinite`
                : 'navet-dashboard-exit-shell 0.9s ease forwards',
          }}
        />
      ))}

      <div
        className="absolute left-1/2 top-1/2 h-96 w-96 rounded-full blur-3xl"
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
