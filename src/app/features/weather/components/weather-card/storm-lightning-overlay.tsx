import { useId } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { getWeatherSvgOverlayTransform } from './weather-card-utils';

export function StormLightningOverlaySvg({ size }: { size: CardSize }) {
  const glowId = useId();
  const haloGradientId = useId();
  const coreGradientId = useId();
  const clipMaskId = useId();
  const clipGradientId = useId();
  const transform =
    size === 'large'
      ? 'translate(6.8 -1.6) scale(0.86)'
      : size === 'medium'
        ? 'translate(0 -4)'
        : 'translate(0.4 -2.8) scale(0.9)';

  return (
    <svg
      className="absolute inset-0 h-full w-full mix-blend-screen"
      viewBox="0 0 100 40"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
      style={{ transform: getWeatherSvgOverlayTransform(size), transformOrigin: 'center top' }}
    >
      <defs>
        <radialGradient id={haloGradientId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd882" stopOpacity="0.42" />
          <stop offset="52%" stopColor="#ffd882" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ffd882" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={coreGradientId} cx="50%" cy="48%" r="50%">
          <stop offset="0%" stopColor="#ffe7aa" stopOpacity="0.5" />
          <stop offset="56%" stopColor="#ffe7aa" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ffe7aa" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={clipGradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="black" />
          <stop offset="74%" stopColor="black" />
          <stop offset="90%" stopColor="#5f5f5f" />
          <stop offset="100%" stopColor="white" />
        </linearGradient>
        <filter id={glowId} x="-120%" y="-120%" width="340%" height="340%">
          <feDropShadow
            in="SourceGraphic"
            dx="0"
            dy="0"
            stdDeviation="1.4"
            floodColor="#ffd67c"
            floodOpacity="0.38"
            result="tightGlow"
          />
          <feDropShadow
            in="SourceGraphic"
            dx="0"
            dy="0"
            stdDeviation="3"
            floodColor="#ffd67c"
            floodOpacity="0.18"
            result="wideGlow"
          />
          <feMerge>
            <feMergeNode in="wideGlow" />
            <feMergeNode in="tightGlow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <mask id={clipMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="40">
          <rect x="0" y="0" width="100" height="40" fill="white" />
          <path
            d="M45.5 0H77.4V11.6C74.6 11.2 72.2 11.5 69.6 12.2C66.8 13 64.4 14.1 61.4 14.4C58.6 14.6 56.1 13.8 53.4 13.1C50.8 12.5 48.2 12.7 45.5 13.6V0Z"
            fill={`url(#${clipGradientId})`}
          />
        </mask>
      </defs>
      <g transform={transform} mask={`url(#${clipMaskId})`}>
        <ellipse
          cx="61"
          cy="12.8"
          rx="15.6"
          ry="9.4"
          fill={`url(#${haloGradientId})`}
          opacity="0.78"
        />
        <ellipse
          cx="60.2"
          cy="13.1"
          rx="8.8"
          ry="5.6"
          fill={`url(#${coreGradientId})`}
          opacity="0.82"
        />
        <path
          d="M64.7 10.4l-4.6 3.9 2.5 0.7-3.3 3.7 2.3 0.8-3.4 5 8.4-6.7-2.8-0.9 3.7-4-2.5-0.7 2.2-3.1Z"
          fill="#ffe4a2"
          filter={`url(#${glowId})`}
          opacity="0.84"
        />
      </g>
    </svg>
  );
}
