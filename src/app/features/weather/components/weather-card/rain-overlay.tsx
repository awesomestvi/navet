import type { CardSize } from '@/app/components/shared/card-size-selector';
import { getWeatherSvgOverlayTransform } from './weather-card-utils';

type RainOverlayIntensity = 'rain' | 'storm';
type RainOverlayDepth = 'far' | 'mid' | 'near';

interface RainDropSettings {
  lengthMin: number;
  lengthMax: number;
  slant: number;
  strokeMin: number;
  strokeMax: number;
  opacityMin: number;
  opacityMax: number;
}

function getRainDropSettings(
  intensity: RainOverlayIntensity,
  depth: RainOverlayDepth
): RainDropSettings {
  if (depth === 'near') {
    return intensity === 'storm'
      ? {
          lengthMin: 0.95,
          lengthMax: 1.8,
          slant: 0.3,
          strokeMin: 0.18,
          strokeMax: 0.28,
          opacityMin: 0.24,
          opacityMax: 0.52,
        }
      : {
          lengthMin: 0.82,
          lengthMax: 1.55,
          slant: 0.3,
          strokeMin: 0.14,
          strokeMax: 0.24,
          opacityMin: 0.16,
          opacityMax: 0.38,
        };
  }

  if (depth === 'mid') {
    return intensity === 'storm'
      ? {
          lengthMin: 0.72,
          lengthMax: 1.3,
          slant: 0.3,
          strokeMin: 0.13,
          strokeMax: 0.22,
          opacityMin: 0.16,
          opacityMax: 0.34,
        }
      : {
          lengthMin: 0.58,
          lengthMax: 1.04,
          slant: 0.3,
          strokeMin: 0.11,
          strokeMax: 0.18,
          opacityMin: 0.11,
          opacityMax: 0.26,
        };
  }

  return intensity === 'storm'
    ? {
        lengthMin: 0.44,
        lengthMax: 0.84,
        slant: 0.3,
        strokeMin: 0.08,
        strokeMax: 0.14,
        opacityMin: 0.08,
        opacityMax: 0.18,
      }
    : {
        lengthMin: 0.38,
        lengthMax: 0.68,
        slant: 0.3,
        strokeMin: 0.06,
        strokeMax: 0.11,
        opacityMin: 0.06,
        opacityMax: 0.14,
      };
}

function buildDeterministicRaindrops(
  seed: number,
  count: number,
  intensity: RainOverlayIntensity,
  depth: RainOverlayDepth
) {
  let state = seed >>> 0;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const settings = getRainDropSettings(intensity, depth);

  return Array.from({ length: count }, () => {
    const x = -6 + next() * 112;
    const y = -10 + next() * 58;
    const length = settings.lengthMin + next() * (settings.lengthMax - settings.lengthMin);
    const strokeWidth = settings.strokeMin + next() * (settings.strokeMax - settings.strokeMin);
    const opacity = settings.opacityMin + next() * (settings.opacityMax - settings.opacityMin);
    const drift = length * settings.slant;

    return {
      x1: x,
      y1: y,
      x2: x - drift,
      y2: y + length,
      strokeWidth,
      opacity,
    };
  });
}

interface RainOverlaySvgProps {
  size: CardSize;
  intensity?: RainOverlayIntensity;
}

export function RainOverlaySvg({ size, intensity = 'rain' }: RainOverlaySvgProps) {
  const densityMultiplier = 4;
  const farBaseCount =
    intensity === 'storm'
      ? size === 'large'
        ? 212
        : size === 'medium'
          ? 172
          : 132
      : size === 'large'
        ? 184
        : size === 'medium'
          ? 148
          : 114;
  const midBaseCount =
    intensity === 'storm'
      ? size === 'large'
        ? 164
        : size === 'medium'
          ? 132
          : 100
      : size === 'large'
        ? 136
        : size === 'medium'
          ? 108
          : 82;
  const nearBaseCount =
    intensity === 'storm'
      ? size === 'large'
        ? 120
        : size === 'medium'
          ? 92
          : 70
      : size === 'large'
        ? 94
        : size === 'medium'
          ? 72
          : 54;
  const farCount = farBaseCount * densityMultiplier;
  const midCount = midBaseCount * densityMultiplier;
  const nearCount = nearBaseCount * densityMultiplier;
  const farDrops = buildDeterministicRaindrops(
    intensity === 'storm' ? 8127 : 4127,
    farCount,
    intensity,
    'far'
  );
  const midDrops = buildDeterministicRaindrops(
    intensity === 'storm' ? 12457 : 6847,
    midCount,
    intensity,
    'mid'
  );
  const nearDrops = buildDeterministicRaindrops(
    intensity === 'storm' ? 17291 : 9311,
    nearCount,
    intensity,
    'near'
  );

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 100 40"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
      style={{ transform: getWeatherSvgOverlayTransform(size), transformOrigin: 'center top' }}
    >
      {farDrops.map((drop, index) => (
        <line
          key={`${intensity}-far-${index}`}
          x1={drop.x1}
          y1={drop.y1}
          x2={drop.x2}
          y2={drop.y2}
          stroke="rgba(170,200,239,0.84)"
          strokeWidth={drop.strokeWidth}
          strokeLinecap="round"
          opacity={drop.opacity}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {midDrops.map((drop, index) => (
        <line
          key={`${intensity}-mid-${index}`}
          x1={drop.x1}
          y1={drop.y1}
          x2={drop.x2}
          y2={drop.y2}
          stroke="rgba(198,223,248,0.9)"
          strokeWidth={drop.strokeWidth}
          strokeLinecap="round"
          opacity={drop.opacity}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {nearDrops.map((drop, index) => (
        <line
          key={`${intensity}-near-${index}`}
          x1={drop.x1}
          y1={drop.y1}
          x2={drop.x2}
          y2={drop.y2}
          stroke="rgba(233,244,255,0.96)"
          strokeWidth={drop.strokeWidth}
          strokeLinecap="round"
          opacity={drop.opacity}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
