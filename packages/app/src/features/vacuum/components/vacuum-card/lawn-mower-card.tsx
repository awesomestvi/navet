import { cn } from '@navet/app/components/ui/utils';
import { getPublicAssetUrl } from '@navet/app/utils/public-assets';
import { memo, useId } from 'react';
import {
  isMonochromeVacuumIllustrationState,
  resolveVacuumIllustrationSurface,
  SharedVacuumCardShell,
  type SharedVacuumCardState,
  useVacuumCardState,
  type VacuumCardProps,
} from './vacuum-card.shared';

function LawnMowerGrass({ moving, light }: { moving: boolean; light: boolean }) {
  const fadeId = useId();
  const maskId = useId();
  const grassColor = light ? '#4d7c0f' : '#a3e635';

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      x="0"
      y="0"
      width="100"
      height="130"
      overflow="hidden"
      data-testid="lawn-mower-grass"
    >
      <defs>
        <linearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0" />
          <stop offset="0.15" stopColor="white" />
          <stop offset="0.8" stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id={maskId}>
          <rect width="100" height="130" fill={`url(#${fadeId})`} />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        {/* Cut lanes run along the direction of travel; only the grass texture moves. */}
        <rect x="22" width="56" height="130" rx="8" fill={grassColor} fillOpacity="0.1" />
        <path
          d="M 22 80 H 39 V 130 H 22 Z M 61 80 H 78 V 130 H 61 Z"
          fill={grassColor}
          fillOpacity="0.22"
        />
        <g
          className="navet-mower-grass-scroll"
          data-testid="lawn-mower-grass-motion"
          style={{ animation: moving ? 'navet-mower-grass-pass 1200ms linear infinite' : 'none' }}
        >
          {[-14, 0, 14, 28, 42, 56, 70, 84, 98, 112, 126].map((y) => (
            <g key={y} transform={`translate(0 ${y})`}>
              <path
                d="M 30 2 V 4 M 48 8 V 10 M 69 4 V 6"
                stroke={grassColor}
                strokeOpacity="0.3"
                strokeLinecap="round"
              />
              {/* Separate curved blades avoid a shared point that reads as an arrow. */}
              <path
                d="M 11 10 Q 12 7 10 4 M 14 8 Q 16 5 15 1 M 17 12 Q 17 9 19 7 M 83 6 Q 82 3 84 1 M 86 12 Q 88 8 87 5 M 90 9 Q 89 6 91 4"
                stroke={grassColor}
                strokeOpacity="0.45"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
            </g>
          ))}
        </g>
      </g>
    </svg>
  );
}

function LawnMowerVisual({ state }: { state: SharedVacuumCardState }) {
  const { titleColor, subtitleColor } = state.illustrationPalette;
  const surface = resolveVacuumIllustrationSurface({
    theme: state.theme,
    displayState: state.displayState,
    titleColor,
  });
  const lightInk =
    state.theme === 'light' && !isMonochromeVacuumIllustrationState(state.displayState);
  const hardwareColor = lightInk ? '#d4d4d8' : titleColor;
  const wheelsMoving =
    (state.displayState === 'cleaning' || state.displayState === 'returning') &&
    state.motionLevel !== 'low';
  const isDocked =
    state.displayState === 'docked' ||
    state.displayState === 'charging' ||
    state.displayState === 'charging-complete';

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 100 130"
      fill="none"
      className={cn(
        'pointer-events-none absolute right-0 top-0 h-[7.54rem] w-[5.8rem]',
        state.isUnavailable && 'opacity-45 grayscale-[0.25]'
      )}
      data-testid="lawn-mower-surface"
    >
      <style>{`
        @keyframes navet-mower-wheel-roll {
          to { transform: translateY(-7px); }
        }
        @keyframes navet-mower-grass-pass {
          to { transform: translateY(14px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .navet-mower-grass-scroll,
          .navet-mower-wheel-treads { animation: none !important; }
        }
      `}</style>
      {state.displayState === 'cleaning' ? (
        <LawnMowerGrass moving={wheelsMoving} light={state.theme === 'light'} />
      ) : null}
      {isDocked ? (
        <g data-testid="lawn-mower-dock" stroke={subtitleColor} strokeOpacity="0.4">
          <path d="M 24 24 V 8 Q 24 5 28 5 H 72 Q 76 5 76 8 V 24" />
          <path d="M 36 7 V 15 M 64 7 V 15" strokeWidth="3" strokeLinecap="round" />
        </g>
      ) : null}
      {/* Rear drive wheels sit outside the deck; narrow front casters tuck underneath. */}
      <g fill="#18181b" stroke={subtitleColor} strokeWidth="1.5">
        <rect x="19" y="24" width="10" height="20" rx="4" />
        <rect x="71" y="24" width="10" height="20" rx="4" />
        <rect x="9" y="61" width="15" height="32" rx="5" />
        <rect x="76" y="61" width="15" height="32" rx="5" />
      </g>
      {[11, 78].map((x) => (
        <svg
          aria-hidden="true"
          focusable="false"
          key={x}
          x={x}
          y="64"
          width="11"
          height="26"
          overflow="hidden"
        >
          <g
            className="navet-mower-wheel-treads"
            data-testid="lawn-mower-wheel-treads"
            stroke="#a1a1aa"
            strokeOpacity="0.65"
            strokeWidth="2"
            strokeLinecap="round"
            style={{
              animation: wheelsMoving ? 'navet-mower-wheel-roll 600ms linear infinite' : 'none',
            }}
          >
            <path d="M 1 -4 H 10 M 1 3 H 10 M 1 10 H 10 M 1 17 H 10 M 1 24 H 10 M 1 31 H 10" />
          </g>
        </svg>
      ))}
      <path
        d="M 37 17 Q 50 13 63 17 Q 71 20 73 30 L 81 72 Q 84 92 70 96 H 30 Q 16 92 19 72 L 27 30 Q 29 20 37 17 Z"
        fill={surface.baseColor}
        stroke={hardwareColor}
        strokeOpacity="0.7"
        strokeWidth="1.5"
      />
      {/* A broad impact bumper wraps the nose, with a recessed hood inside. */}
      <path
        d="M 28 39 L 32 28 Q 35 21 50 21 Q 65 21 68 28 L 72 39"
        stroke={hardwareColor}
        strokeOpacity="0.65"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M 35 39 Q 50 34 65 39 L 71 68 Q 73 77 65 79 H 35 Q 27 77 29 68 Z"
        fill={hardwareColor}
        fillOpacity="0.07"
        stroke={hardwareColor}
        strokeOpacity="0.25"
      />
      <rect x="42" y="27" width="16" height="5" rx="2.5" fill={hardwareColor} fillOpacity="0.5" />
      <image href={getPublicAssetUrl('logo.svg')} x="43" y="46" width="14" height="14" />
      <g stroke={hardwareColor} strokeOpacity="0.35" strokeWidth="1.5" strokeLinecap="round">
        <path d="M 36 68 H 44 M 36 72 H 44 M 56 68 H 64 M 56 72 H 64" />
        <path d="M 32 87 Q 50 91 68 87" />
      </g>
    </svg>
  );
}

export const LawnMowerCard = memo(function LawnMowerCard(props: VacuumCardProps) {
  const state = useVacuumCardState(props, { entityVariant: 'lawn-mower' });

  return <SharedVacuumCardShell state={state} compactVisual={<LawnMowerVisual state={state} />} />;
});
