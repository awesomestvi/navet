import type { CardSize } from '@/app/components/shared/card-size-selector';
import { getWeatherSvgOverlayTransform } from './weather-card-utils';

type SnowflakeDepth = 'far' | 'near';
type SnowOverlayTone = 'day' | 'night';

function getSnowflakeOverlayCanvas(size: CardSize) {
  return size === 'medium' ? { width: 100, height: 48 } : { width: 100, height: 100 };
}

function polarPoint(length: number, angleDegrees: number) {
  const radians = (angleDegrees * Math.PI) / 180;
  return {
    x: Math.cos(radians) * length,
    y: Math.sin(radians) * length,
  };
}

function formatSvgValue(value: number) {
  return value.toFixed(2);
}

function buildSnowflakePath(radius: number, branchRatio: number) {
  const axisAngles = [-90, -30, 30];
  const armAngles = [-90, -30, 30, 90, 150, -150];
  const segments: string[] = [];

  for (const angle of axisAngles) {
    const start = polarPoint(radius, angle + 180);
    const end = polarPoint(radius, angle);
    segments.push(
      `M ${formatSvgValue(start.x)} ${formatSvgValue(start.y)} L ${formatSvgValue(end.x)} ${formatSvgValue(end.y)}`
    );
  }

  if (radius >= 0.7) {
    const anchorDistance = radius * 0.62;
    const branchLength = radius * branchRatio;

    for (const angle of armAngles) {
      const anchor = polarPoint(anchorDistance, angle);
      const branchOne = polarPoint(branchLength, angle + 36);
      const branchTwo = polarPoint(branchLength, angle - 36);
      segments.push(
        `M ${formatSvgValue(anchor.x)} ${formatSvgValue(anchor.y)} L ${formatSvgValue(anchor.x + branchOne.x)} ${formatSvgValue(anchor.y + branchOne.y)}`
      );
      segments.push(
        `M ${formatSvgValue(anchor.x)} ${formatSvgValue(anchor.y)} L ${formatSvgValue(anchor.x + branchTwo.x)} ${formatSvgValue(anchor.y + branchTwo.y)}`
      );
    }
  }

  return segments.join(' ');
}

function buildDeterministicSnowflakes(
  seed: number,
  count: number,
  size: CardSize,
  depth: SnowflakeDepth
) {
  let state = seed >>> 0;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const canvas = getSnowflakeOverlayCanvas(size);

  const isNear = depth === 'near';
  const radiusRange = isNear ? [1.02, 2.16] : [0.54, 1.08];
  const strokeRange = isNear ? [0.14, 0.22] : [0.08, 0.14];
  const opacityRange = isNear ? [0.54, 0.9] : [0.22, 0.54];
  const branchRange = isNear ? [0.28, 0.42] : [0.22, 0.34];
  const yInset = canvas.height * 0.18;
  const yTravel = canvas.height * 0.58;

  return Array.from({ length: count }, () => ({
    x: 4 + next() * 92,
    y: yInset + next() * yTravel,
    radius: radiusRange[0] + next() * (radiusRange[1] - radiusRange[0]),
    rotation: next() * 60,
    opacity: opacityRange[0] + next() * (opacityRange[1] - opacityRange[0]),
    strokeWidth: strokeRange[0] + next() * (strokeRange[1] - strokeRange[0]),
    branchRatio: branchRange[0] + next() * (branchRange[1] - branchRange[0]),
  }));
}

export function SnowflakeOverlaySvg({ size, tone }: { size: CardSize; tone: SnowOverlayTone }) {
  const canvas = getSnowflakeOverlayCanvas(size);
  const farCount = size === 'large' ? 24 : size === 'medium' ? 14 : 18;
  const nearCount = size === 'large' ? 12 : size === 'medium' ? 7 : 9;
  const farFlakes = buildDeterministicSnowflakes(
    tone === 'night' ? 4811 : 2617,
    farCount,
    size,
    'far'
  );
  const nearFlakes = buildDeterministicSnowflakes(
    tone === 'night' ? 9133 : 5179,
    nearCount,
    size,
    'near'
  );
  const farStroke = tone === 'night' ? 'rgba(216,231,255,0.72)' : 'rgba(243,248,255,0.7)';
  const nearStroke = tone === 'night' ? 'rgba(247,250,255,0.92)' : 'rgba(255,255,255,0.9)';

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox={`0 0 ${canvas.width} ${canvas.height}`}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
      style={{ transform: getWeatherSvgOverlayTransform(size), transformOrigin: 'center top' }}
    >
      {farFlakes.map((flake, index) => (
        <g
          key={`snow-far-${index}`}
          transform={`translate(${formatSvgValue(flake.x)} ${formatSvgValue(flake.y)}) rotate(${formatSvgValue(flake.rotation)})`}
          opacity={flake.opacity}
        >
          <path
            d={buildSnowflakePath(flake.radius, flake.branchRatio)}
            fill="none"
            stroke={farStroke}
            strokeWidth={flake.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
      {nearFlakes.map((flake, index) => (
        <g
          key={`snow-near-${index}`}
          transform={`translate(${formatSvgValue(flake.x)} ${formatSvgValue(flake.y)}) rotate(${formatSvgValue(flake.rotation)})`}
          opacity={flake.opacity}
        >
          <path
            d={buildSnowflakePath(flake.radius, flake.branchRatio)}
            fill="none"
            stroke={nearStroke}
            strokeWidth={flake.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
    </svg>
  );
}
