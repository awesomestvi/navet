import { MapPin, Sunrise, Sunset } from 'lucide-react';
import { memo, useId, useState } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { useEntityCardInteractionController } from '@/app/components/shared/entity-card-interaction-controller';
import { getAccentCardShellTokens } from '@/app/components/shared/theme/accent-card-shell-tokens';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getCustomCardTintSurface } from '@/app/components/shared/theme/custom-card-tint-surface';
import { CaptionValue } from '@/app/components/ui/caption-value';
import { CardWrapper } from '@/app/components/ui/card-wrapper';
import { STORAGE_KEYS } from '@/app/constants/storage-keys';
import { useI18n, usePersistedState, useTheme } from '@/app/hooks';
import { settingsSelectors } from '@/app/stores/selectors';
import { useSettingsStore, type WeatherForecastMode } from '@/app/stores/settings-store';
import { formatWeatherConditionLabel, type WeatherCondition, WeatherIcon } from './weather-icon';
import { WeatherSettingsDialog } from './weather-settings-dialog';

// Re-export types
export type { WeatherCondition };
export type ForecastDay = {
  day: string;
  condition: string;
  high: number;
  low: number;
};

interface WeatherCardProps {
  id: string;
  location: string;
  temperature: number;
  condition: WeatherCondition | string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  precipitationUnit: string;
  sunrise: string;
  sunset: string;
  daylight: string;
  rainForecast: string;
  forecast: ForecastDay[];
  forecastMode: WeatherForecastMode;
  highTemp: number;
  lowTemp: number;
  size: CardSize;
  onSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
}

function getWeatherCityName(location: string) {
  return (
    location
      .split(',')
      .map((part) => part.trim())
      .find(Boolean) || location
  );
}

function normalizeWeatherCondition(condition: WeatherCondition | string) {
  return condition.trim().toLowerCase().replace(/_/g, '-');
}

type WeatherBackgroundVariant =
  | 'sunny'
  | 'clear-night'
  | 'cloudy'
  | 'rain'
  | 'snow-day'
  | 'snow-night'
  | 'windy'
  | 'storm'
  | 'fog';

function getWeatherBackgroundVariant(
  condition: WeatherCondition | string
): WeatherBackgroundVariant {
  const normalized = normalizeWeatherCondition(condition);

  switch (normalized) {
    case 'clear':
    case 'sunny':
    case 'fair':
      return 'sunny';
    case 'clear-night':
    case 'night':
    case 'night-clear':
    case 'moon':
    case 'moony':
      return 'clear-night';
    case 'cloudy':
    case 'overcast':
    case 'partly-cloudy':
    case 'partly cloudy':
    case 'partlycloudy':
    case 'partlycloudy-day':
      return 'cloudy';
    case 'partlycloudy-night':
    case 'partly-cloudy-night':
      return 'clear-night';
    case 'rainy':
    case 'rain':
    case 'pouring':
    case 'drizzle':
    case 'lightning-rainy':
    case 'showers':
      return 'rain';
    case 'thunderstorm':
    case 'storm':
    case 'lightning':
    case 'hail':
    case 'exceptional':
      return 'storm';
    case 'windy':
    case 'windy-variant':
    case 'breezy':
      return 'windy';
    case 'fog':
    case 'mist':
    case 'hazy':
      return 'fog';
    case 'snowy':
    case 'snow':
    case 'snowy-rainy':
    case 'blizzard':
      return 'snow-day';
    case 'snow-night':
      return 'snow-night';
    default:
      return 'cloudy';
  }
}

function getWeatherTextTreatment(
  condition: WeatherCondition | string,
  hasCustomTint: boolean,
  fallback: { titleColor: string; subtitleColor: string }
) {
  if (hasCustomTint) {
    return {
      primary: fallback.titleColor,
      secondary: fallback.subtitleColor,
      textShadow: 'none',
    };
  }

  const variant = getWeatherBackgroundVariant(condition);

  switch (variant) {
    case 'sunny':
      return {
        primary: 'rgba(255,255,255,0.98)',
        secondary: 'rgba(255,255,255,0.84)',
        textShadow: '0 1px 10px rgba(83, 38, 12, 0.18)',
      };
    case 'snow-day':
      return {
        primary: 'rgba(255,255,255,0.98)',
        secondary: 'rgba(232,239,255,0.82)',
        textShadow: '0 1px 12px rgba(18, 26, 48, 0.28)',
      };
    case 'cloudy':
    case 'windy':
    case 'fog':
      return {
        primary: 'rgba(255,255,255,0.98)',
        secondary: 'rgba(255,255,255,0.82)',
        textShadow: '0 1px 10px rgba(17, 41, 78, 0.18)',
      };
    case 'rain':
    case 'storm':
    case 'clear-night':
    case 'snow-night':
      return {
        primary: 'rgba(255,255,255,0.99)',
        secondary: 'rgba(255,255,255,0.78)',
        textShadow: '0 1px 12px rgba(5, 10, 32, 0.32)',
      };
    default:
      return {
        primary: fallback.titleColor,
        secondary: fallback.subtitleColor,
        textShadow: 'none',
      };
  }
}

function getWeatherSvgOverlayTransform(size: CardSize) {
  if (size === 'large') {
    return 'translateY(-8%)';
  }

  if (size === 'medium') {
    return 'translateY(-4%)';
  }

  return 'translateY(0)';
}

function getWindOverlayTransform(size: CardSize) {
  if (size === 'large') {
    return 'translateY(1%) scaleY(0.62)';
  }

  return getWeatherSvgOverlayTransform(size);
}

interface PassageWaveOverlaySvgProps {
  size: CardSize;
  layerOneColor: string;
  layerTwoColor: string;
  layerThreeColor: string;
  rimColor?: string;
  className?: string;
}

function PassageWaveOverlaySvg({
  size,
  layerOneColor,
  layerTwoColor,
  layerThreeColor,
  rimColor,
  className = '',
}: PassageWaveOverlaySvgProps) {
  const cloudTransform =
    size === 'large'
      ? 'translateY(-24%) scaleY(1)'
      : size === 'medium'
        ? 'translateY(-24%) scaleY(0.94)'
        : 'translateY(-23%) scaleY(0.88)';

  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ transform: cloudTransform, transformOrigin: 'center top' }}
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 1600 900"
        aria-hidden="true"
        preserveAspectRatio="xMidYMin slice"
      >
        <g transform="translate(0 780) scale(1 -1)">
          <path
            d="M0 346C98 302 192 282 312 290C418 298 514 334 630 348C742 362 844 356 962 322C1086 286 1196 260 1324 274C1422 286 1522 328 1600 362V580H0V346Z"
            fill={layerOneColor}
          />
          <path
            d="M0 416C74 378 150 358 252 376C344 394 410 442 504 472C590 500 674 506 766 490C862 474 944 428 1048 406C1152 384 1256 396 1358 440C1432 472 1514 502 1600 518V700H0V416Z"
            fill={layerTwoColor}
          />
          <path
            d="M0 510C60 476 128 460 208 482C298 506 372 554 464 586C554 616 648 628 746 616C852 604 940 560 1044 520C1146 480 1252 462 1362 490C1442 510 1526 550 1600 576V780H0V510Z"
            fill={layerThreeColor}
          />
          {rimColor ? (
            <path
              d="M0 616C0 616 400 582 798 592C1200 602 1600 616 1600 616V664H0V616Z"
              fill={rimColor}
            />
          ) : null}
        </g>
      </svg>
    </div>
  );
}

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

function RainOverlaySvg({ size, intensity = 'rain' }: RainOverlaySvgProps) {
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

interface StormLightningOverlaySvgProps {
  size: CardSize;
}

function StormLightningOverlaySvg({ size }: StormLightningOverlaySvgProps) {
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

interface SnowflakeOverlaySvgProps {
  size: CardSize;
  tone: SnowOverlayTone;
}

function SnowflakeOverlaySvg({ size, tone }: SnowflakeOverlaySvgProps) {
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

function FogOverlaySvg({ size }: { size: CardSize }) {
  return (
    <svg
      className="absolute inset-0 h-full w-full text-white"
      viewBox="0 0 100 40"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
      style={{ transform: getWeatherSvgOverlayTransform(size), transformOrigin: 'center top' }}
    >
      <path
        d="M-8 7.8C3.4 5.7 15 5.1 26.2 5.9C38 6.8 47.7 9.4 59.4 9.2C71.1 9.1 81.2 6.4 91.8 4.8C97.6 3.9 103.6 3.5 110 3.8V12.7C98.4 13.4 87.2 15.4 75.6 16C61.5 16.8 49 14.9 35.4 14.2C21.1 13.5 7.2 14.3-8 16.4V7.8Z"
        fill="currentColor"
        opacity="0.14"
      />
      <path
        d="M-10 14.8C0.3 13.2 10.3 12.9 20.4 13.7C31.2 14.6 40.1 17 50.8 17.3C62 17.7 71.8 15.8 82.4 14.2C91.5 12.8 100.7 12.1 110 12.6V22.6C98.5 22.9 87.7 24.5 76.5 25.2C63.2 26 51.3 24.7 38.4 24C23.4 23.2 8 23.7-10 25.7V14.8Z"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M-6 22.4C5.4 20.9 16.2 20.8 27 21.8C37.6 22.8 46.4 25.1 56.8 25.4C67.8 25.8 77.3 24.4 87.4 22.8C95 21.6 102.5 21 110 21.3V31.1C101.4 31.7 93.2 33.2 84.5 33.8C73.2 34.6 63.2 33.5 52.4 32.7C39 31.8 25.8 32.1 11.7 33C5.9 33.4 0 33.9-6 34.8V22.4Z"
        fill="currentColor"
        opacity="0.16"
      />
      <path
        d="M8 11.7c8.4.8 16.7.7 25-.2 7.4-.8 14.8-.8 22.3-.1 7.7.8 15.2 1 22.8.4 4.1-.3 8.2-.8 12.5-1.4"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        fill="none"
        opacity="0.08"
      />
      <path
        d="M2 27.2c9 .7 18 .6 27-.3 8.2-.8 16.4-.8 24.6-.1 8.5.8 16.7 1 25 .3 5.4-.4 10.8-1.1 16.4-1.9"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        fill="none"
        opacity="0.07"
      />
    </svg>
  );
}

function WindOverlaySvg({ size }: { size: CardSize }) {
  return (
    <svg
      className="absolute inset-0 h-full w-full text-white"
      viewBox="0 0 100 40"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
      style={{ transform: getWindOverlayTransform(size), transformOrigin: 'center top' }}
    >
      <path
        d="M-8 8.2C2 6 10.6 4.9 19.8 5.2C28.2 5.5 34.8 7.1 41.2 7.2C46.8 7.3 51.8 6.2 57 4.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.18"
      />
      <path
        d="M56.8 4.6c3.2-1.1 6.2-.9 8.5.6c2.4 1.6 2.9 4.3 1.2 6.4c-1.5 2-4.4 2.9-7.8 2.5"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        fill="none"
        opacity="0.16"
      />
      <path
        d="M-10 14.2C1.4 11.6 11.7 10.4 22.4 10.8C32.9 11.2 41 13.6 49.6 13.8C57.8 14 64.5 12.2 71.8 9.6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        fill="none"
        opacity="0.22"
      />
      <path
        d="M71.2 9.7c3.5-1.1 6.8-.8 9.4.9c2.5 1.7 2.9 4.8 1 7.2c-1.8 2.4-5.1 3.5-9 3.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.18"
      />
      <path
        d="M6.2 21.4C15.4 19 24 18.2 32.8 18.8C40.2 19.3 46.5 21 53.4 21.2C59.8 21.4 65.6 20.2 71.8 18.2"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        fill="none"
        opacity="0.16"
      />
      <path
        d="M72 18.1c2.9-.9 5.7-.6 7.8.8c2.2 1.5 2.5 4 0.9 6c-1.5 1.9-4.2 2.7-7.3 2.4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.13"
      />
      <path
        d="M-6 29.4C5.8 26.4 17.2 25.4 28.4 26.2C39 27 47.8 29.8 57.6 30C66.8 30.2 74.6 28.2 83.2 25"
        stroke="currentColor"
        strokeWidth="1.95"
        strokeLinecap="round"
        fill="none"
        opacity="0.2"
      />
      <path
        d="M83 25c3-1 5.8-.8 8 .6c2.1 1.4 2.5 3.7 1 5.6c-1.4 1.8-3.9 2.6-6.9 2.3"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        fill="none"
        opacity="0.15"
      />
      <path
        d="M18.4 35.4c8.8-2 17.2-2.2 25.2-.3c5.8 1.4 11.4 1.8 17.4.8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.11"
      />
    </svg>
  );
}

function WeatherBackground({
  condition,
  hasCustomTint,
  size,
}: {
  condition: WeatherCondition | string;
  hasCustomTint: boolean;
  size: CardSize;
}) {
  const variant = getWeatherBackgroundVariant(condition);
  const isLarge = size === 'large';

  if (hasCustomTint) {
    return null;
  }

  if (variant === 'sunny') {
    return (
      <>
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#ea6d61_0%,#ef8758_48%,#f4a54d_100%)]" />
        <div
          className={`absolute rounded-full bg-[#ffd364]/90 ${
            isLarge ? 'right-[-8%] top-[-10%] h-56 w-56' : 'right-[-18%] top-[-28%] h-40 w-40'
          }`}
        />
        <div
          className={`absolute rounded-full border border-[#ffd975]/38 ${
            isLarge ? 'right-[-2%] top-[-4%] h-44 w-44' : 'right-[-10%] top-[-18%] h-32 w-32'
          }`}
        />
        <div
          className={`absolute rounded-full border border-[#ffd975]/22 ${
            isLarge ? 'right-[-12%] top-[-14%] h-64 w-64' : 'right-[-22%] top-[-34%] h-48 w-48'
          }`}
        />
        <div
          className={`absolute bg-[linear-gradient(180deg,rgba(255,208,97,0.14),transparent)] ${
            isLarge ? 'right-[18%] top-0 h-full w-[18%]' : 'right-[24%] top-0 h-full w-[12%]'
          }`}
        />
      </>
    );
  }

  if (variant === 'clear-night') {
    return (
      <>
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#223f83_0%,#284786_46%,#263e73_100%)]" />
        <div
          className={`absolute rounded-full bg-[#f6e39b]/92 ${
            isLarge ? 'right-[10%] top-[6%] h-20 w-20' : 'right-[10%] top-[0%] h-14 w-14'
          }`}
        />
        <div
          className={`absolute rounded-full border border-[#f2dda1]/18 ${
            isLarge ? 'right-[4%] top-[-2%] h-32 w-32' : 'right-[2%] top-[-12%] h-24 w-24'
          }`}
        />
        <div
          className={`absolute rounded-full border border-[#7386cc]/14 ${
            isLarge ? 'right-[-2%] top-[-8%] h-44 w-44' : 'right-[-8%] top-[-20%] h-32 w-32'
          }`}
        />
      </>
    );
  }

  if (variant === 'cloudy') {
    return (
      <>
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#4b95e4_0%,#4288d4_52%,#3474bc_100%)]" />
        <PassageWaveOverlaySvg
          size={size}
          layerOneColor="rgba(207,231,255,0.28)"
          layerTwoColor="rgba(174,212,246,0.20)"
          layerThreeColor="rgba(140,190,235,0.18)"
          rimColor="rgba(224,241,255,0.12)"
          className="opacity-95"
        />
      </>
    );
  }

  if (variant === 'rain') {
    return (
      <>
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#34396d_0%,#2f3463_46%,#262d56_100%)]" />
        <PassageWaveOverlaySvg
          size={size}
          layerOneColor="rgba(142,162,210,0.16)"
          layerTwoColor="rgba(102,122,176,0.16)"
          layerThreeColor="rgba(67,86,136,0.22)"
          rimColor="rgba(196,214,255,0.08)"
          className="opacity-90"
        />
        <RainOverlaySvg size={size} intensity="rain" />
      </>
    );
  }

  if (variant === 'storm') {
    return (
      <>
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#2d315d_0%,#282d53_52%,#1f2648_100%)]" />
        <StormLightningOverlaySvg size={size} />
        <PassageWaveOverlaySvg
          size={size}
          layerOneColor="rgba(130,145,196,0.16)"
          layerTwoColor="rgba(88,104,160,0.18)"
          layerThreeColor="rgba(50,66,118,0.24)"
          rimColor="rgba(188,204,255,0.06)"
          className="opacity-88"
        />
        <PassageWaveOverlaySvg
          size={size}
          layerOneColor="rgba(89,104,154,0.16)"
          layerTwoColor="rgba(58,71,120,0.22)"
          layerThreeColor="rgba(30,40,82,0.28)"
          rimColor="rgba(128,146,208,0.05)"
          className="opacity-92"
        />
        <RainOverlaySvg size={size} intensity="storm" />
      </>
    );
  }

  if (variant === 'windy') {
    return (
      <>
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#4ca0e8_0%,#3f8fd7_50%,#2f79be_100%)]" />
        <WindOverlaySvg size={size} />
      </>
    );
  }

  if (variant === 'fog') {
    return (
      <>
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#7ea2be_0%,#6f96b4_52%,#628aa8_100%)]" />
        <PassageWaveOverlaySvg
          size={size}
          layerOneColor="rgba(235,243,252,0.18)"
          layerTwoColor="rgba(215,230,245,0.14)"
          layerThreeColor="rgba(182,205,228,0.12)"
          rimColor="rgba(255,255,255,0.08)"
          className="opacity-80"
        />
        <FogOverlaySvg size={size} />
      </>
    );
  }

  if (variant === 'snow-night') {
    return (
      <>
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#1f2d57_0%,#223764_48%,#1c2f58_100%)]" />
        <PassageWaveOverlaySvg
          size={size}
          layerOneColor="rgba(116,138,192,0.14)"
          layerTwoColor="rgba(79,104,160,0.14)"
          layerThreeColor="rgba(42,63,110,0.20)"
          rimColor="rgba(208,224,255,0.06)"
          className="opacity-85"
        />
        <div
          className={`absolute rounded-full bg-[#f7e8ae]/86 ${
            isLarge ? 'right-[10%] top-[4%] h-16 w-16' : 'right-[10%] top-[-2%] h-12 w-12'
          }`}
        />
        <SnowflakeOverlaySvg size={size} tone="night" />
      </>
    );
  }

  if (variant === 'snow-day') {
    return (
      <>
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#66779c_0%,#566582_50%,#44506b_100%)]" />
        <PassageWaveOverlaySvg
          size={size}
          layerOneColor="rgba(220,230,245,0.16)"
          layerTwoColor="rgba(184,201,222,0.14)"
          layerThreeColor="rgba(129,149,179,0.18)"
          rimColor="rgba(238,244,255,0.08)"
          className="opacity-90"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_34%,rgba(255,255,255,0.03)_66%,transparent)]" />
        <SnowflakeOverlaySvg size={size} tone="day" />
      </>
    );
  }

  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(120deg,#438ddf_0%,#4289dc_52%,#3d85d9_100%)]" />
      <PassageWaveOverlaySvg
        size={size}
        layerOneColor="rgba(207,231,255,0.28)"
        layerTwoColor="rgba(174,212,246,0.20)"
        layerThreeColor="rgba(140,190,235,0.18)"
        rimColor="rgba(224,241,255,0.12)"
        className="opacity-95"
      />
    </>
  );
}

/**
 * Premium Weather Card Component
 * High-quality design inspired by modern weather apps
 */
export const WeatherCard = memo(function WeatherCard({
  id: _id,
  location,
  temperature,
  condition,
  humidity,
  windSpeed,
  precipitation,
  precipitationUnit,
  sunrise,
  sunset,
  daylight,
  rainForecast,
  forecast,
  forecastMode: effectiveForecastMode,
  highTemp,
  lowTemp,
  size,
  onSizeChange: _onSizeChange,
  isEditMode: _isEditMode,
}: WeatherCardProps) {
  const { theme, accentColor } = useTheme();
  const { t } = useI18n();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [weatherTintColors, setWeatherTintColors] = usePersistedState<Record<string, string>>(
    STORAGE_KEYS.weatherCardTintColors,
    {}
  );
  const selectedForecastMode = useSettingsStore(settingsSelectors.weatherForecastMode);
  const updateSettings = useSettingsStore(settingsSelectors.updateSettings);
  const cardShell = getCardShellSurfaceTokens(theme);
  const tintColor = weatherTintColors[_id];
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const hasCustomTint = Boolean(tintSurface.panelStyle);
  const weatherTintStyle = hasCustomTint
    ? {
        borderColor: tintSurface.panelStyle?.borderColor,
        boxShadow: tintSurface.panelStyle?.boxShadow,
      }
    : undefined;
  const textTokens = getCardReadableTextTokens({
    theme,
    tone: 'blue',
    accentColor,
    baseColor: tintColor,
  });
  const isGlass = theme === 'glass';
  const shell = getAccentCardShellTokens(theme, 'blue');
  const weatherShellClassName = hasCustomTint
    ? 'border'
    : theme === 'light'
      ? 'border-gray-200'
      : theme === 'glass'
        ? 'border-white/10'
        : theme === 'black'
          ? 'border-white/16'
          : 'border-sky-700/70';
  const isSmall = size === 'small';
  const isMedium = size === 'medium';
  const isLarge = size === 'large';
  const usesDetailedLayout = isMedium || isLarge;
  const visibleForecast = isSmall ? forecast.slice(0, 4) : forecast.slice(0, 7);
  const precipitationValue = `${precipitation}${precipitationUnit ? ` ${precipitationUnit}` : ''}`;
  const summaryLabel = formatWeatherConditionLabel(condition);
  const cityName = getWeatherCityName(location);
  const headerIconClassName = isSmall || usesDetailedLayout ? 'h-11 w-11' : 'h-10 w-10';
  const weatherTextTreatment = getWeatherTextTreatment(condition, hasCustomTint, textTokens);

  // Theme-aware colors
  const textPrimary = weatherTextTreatment.primary;
  const textSecondary = weatherTextTreatment.secondary;
  const dashedBorder =
    theme === 'light' ? 'border-gray-300' : isGlass ? 'border-white/18' : 'border-slate-600';
  const showHourlyForecast = effectiveForecastMode === 'hourly';
  const interaction = useEntityCardInteractionController({
    ariaLabel: cityName,
    isEditMode: _isEditMode,
    onOpenControls: () => setIsSettingsOpen(true),
    onOpenSettings: () => setIsSettingsOpen(true),
  });
  const setTintColor = (nextTintColor?: string) => {
    setWeatherTintColors((current) => {
      if (!nextTintColor) {
        const { [_id]: _removedTintColor, ...rest } = current;
        return rest;
      }

      return {
        ...current,
        [_id]: nextTintColor,
      };
    });
  };

  return (
    <>
      <CardWrapper
        className={`${cardShell.backdropClassName} ${weatherShellClassName} ${
          isSmall || usesDetailedLayout ? 'p-5' : 'p-4.5'
        } ${!_isEditMode ? 'cursor-pointer' : ''}`}
        style={weatherTintStyle}
        lightOverlayClassName={
          hasCustomTint
            ? (tintSurface.overlayClassName ?? 'bg-transparent')
            : shell.overlayClassName || undefined
        }
        interactionProps={interaction.cardProps}
      >
        <WeatherBackground condition={condition} hasCustomTint={hasCustomTint} size={size} />

        {hasCustomTint ? (
          tintSurface.glowStyle ? (
            <div className="absolute inset-0" style={tintSurface.glowStyle} />
          ) : null
        ) : (
          <div className={`absolute inset-0 ${shell.glowClassName} opacity-55`} />
        )}

        <div className="relative z-2 flex h-full flex-col">
          <div
            className={`flex items-start justify-between gap-3 ${isMedium || isSmall ? 'mb-2' : 'mb-3'}`}
          >
            <div className="min-w-0">
              <div className="inline-flex min-w-0 items-center gap-2">
                <MapPin
                  className={`${isMedium || isSmall ? 'mt-0 h-3.5 w-3.5' : 'mt-0.5 h-4 w-4'} shrink-0`}
                  style={{ color: textSecondary }}
                />
                <div
                  className={`truncate ${
                    isMedium || isSmall ? 'text-[13px]' : 'text-[15px]'
                  } font-semibold tracking-[-0.03em]`}
                  style={{ color: textPrimary, textShadow: weatherTextTreatment.textShadow }}
                >
                  {cityName}
                </div>
              </div>

              {isMedium || isSmall ? (
                <div className="mt-1.5">
                  <div
                    className="mb-1 text-3xl font-bold leading-none"
                    style={{ color: textPrimary, textShadow: weatherTextTreatment.textShadow }}
                  >
                    {temperature}°C
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: textSecondary, textShadow: weatherTextTreatment.textShadow }}
                  >
                    H:{highTemp}° L:{lowTemp}°
                  </div>
                </div>
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              <WeatherIcon
                condition={condition}
                className={`${headerIconClassName} ml-auto shrink-0`}
                style={{ color: textPrimary }}
              />
              <div
                className="mt-1 text-[12px] font-medium leading-tight"
                style={{ color: textSecondary, textShadow: weatherTextTreatment.textShadow }}
              >
                {summaryLabel}
              </div>
            </div>
          </div>

          {isSmall || isMedium ? (
            <div className="flex h-full flex-col">
              {visibleForecast.length > 0 ? (
                <div className="mt-auto flex w-full items-start justify-between">
                  {visibleForecast.map((day, index) => (
                    <div key={index} className="min-w-0 text-center">
                      <div className="mb-1 text-[11px]" style={{ color: textSecondary }}>
                        {day.day}
                      </div>
                      <WeatherIcon
                        condition={day.condition}
                        className="mx-auto mb-1 h-6 w-6"
                        style={{ color: textPrimary }}
                      />
                      {showHourlyForecast ? (
                        <div
                          className="text-[11px] font-medium leading-none"
                          style={{
                            color: textPrimary,
                            textShadow: weatherTextTreatment.textShadow,
                          }}
                        >
                          {day.high}°
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-[11px] leading-none">
                          <span
                            className="font-medium"
                            style={{
                              color: textPrimary,
                              textShadow: weatherTextTreatment.textShadow,
                            }}
                          >
                            {day.high}°
                          </span>
                          <span
                            style={{
                              color: textSecondary,
                              textShadow: weatherTextTreatment.textShadow,
                            }}
                          >
                            {day.low}°
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-auto">
              {/* Main Section: Temperature + Details */}
              <div className="mb-3 flex items-end justify-between">
                {/* Temperature with rain forecast below */}
                <div className="shrink-0">
                  <div
                    className="mb-1 text-3xl font-bold leading-none"
                    style={{ color: textPrimary, textShadow: weatherTextTreatment.textShadow }}
                  >
                    {temperature}°C
                  </div>
                  <div
                    className="mb-0.5 text-xs"
                    style={{ color: textSecondary, textShadow: weatherTextTreatment.textShadow }}
                  >
                    H:{highTemp}° L:{lowTemp}°
                  </div>
                  {rainForecast ? (
                    <div
                      className="text-xs"
                      style={{ color: textSecondary, textShadow: weatherTextTreatment.textShadow }}
                    >
                      {rainForecast}
                    </div>
                  ) : null}
                </div>

                <div className="shrink-0 space-y-0.5">
                  <CaptionValue
                    caption={t('weather.precipitation')}
                    value={precipitationValue}
                    align="right"
                    captionStyle={{
                      color: textSecondary,
                      textShadow: weatherTextTreatment.textShadow,
                    }}
                    valueStyle={{ color: textPrimary, textShadow: weatherTextTreatment.textShadow }}
                  />
                  <CaptionValue
                    caption={t('weather.humidity')}
                    value={`${humidity}%`}
                    align="right"
                    captionStyle={{
                      color: textSecondary,
                      textShadow: weatherTextTreatment.textShadow,
                    }}
                    valueStyle={{ color: textPrimary, textShadow: weatherTextTreatment.textShadow }}
                  />
                  <CaptionValue
                    caption={t('weather.wind')}
                    value={`${windSpeed} km/h`}
                    align="right"
                    captionStyle={{
                      color: textSecondary,
                      textShadow: weatherTextTreatment.textShadow,
                    }}
                    valueStyle={{ color: textPrimary, textShadow: weatherTextTreatment.textShadow }}
                  />
                </div>
              </div>

              <div className="my-8 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Sunrise className="h-4 w-4 text-orange-400" />
                  <span className="text-xs font-medium" style={{ color: textPrimary }}>
                    {sunrise}
                  </span>
                </div>
                <div className="mx-4 flex flex-1 items-center">
                  <div className={`flex-1 border-t border-dashed ${dashedBorder}`} />
                </div>
                <div
                  className="mx-2 text-xs"
                  style={{ color: textSecondary, textShadow: weatherTextTreatment.textShadow }}
                >
                  {daylight}
                </div>
                <div className="mx-4 flex flex-1 items-center">
                  <div className={`flex-1 border-t border-dashed ${dashedBorder}`} />
                </div>
                <div className="flex items-center gap-2">
                  <Sunset className="h-4 w-4 text-orange-400" />
                  <span
                    className="text-xs font-medium"
                    style={{ color: textPrimary, textShadow: weatherTextTreatment.textShadow }}
                  >
                    {sunset}
                  </span>
                </div>
              </div>

              {visibleForecast.length > 0 && (
                <div className="flex justify-between gap-3">
                  {visibleForecast.map((day, index) => (
                    <div key={index} className="min-w-0 text-center">
                      <div
                        className="mb-2 text-xs"
                        style={{
                          color: textSecondary,
                          textShadow: weatherTextTreatment.textShadow,
                        }}
                      >
                        {day.day}
                      </div>
                      <WeatherIcon
                        condition={day.condition}
                        className="mx-auto mb-2 h-8 w-8"
                        style={{ color: textPrimary }}
                      />
                      {showHourlyForecast ? (
                        <div
                          className="text-xs font-medium"
                          style={{
                            color: textPrimary,
                            textShadow: weatherTextTreatment.textShadow,
                          }}
                        >
                          {day.high}°
                        </div>
                      ) : (
                        <>
                          <div
                            className="mb-1 text-xs font-medium"
                            style={{
                              color: textPrimary,
                              textShadow: weatherTextTreatment.textShadow,
                            }}
                          >
                            {day.high}°
                          </div>
                          <div
                            className="text-xs"
                            style={{
                              color: textSecondary,
                              textShadow: weatherTextTreatment.textShadow,
                            }}
                          >
                            {day.low}°
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardWrapper>

      {isSettingsOpen ? (
        <WeatherSettingsDialog
          entityId={_id}
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          theme={theme}
          title={cityName}
          location={location}
          forecastMode={selectedForecastMode}
          onForecastModeChange={(mode) => updateSettings({ weatherForecastMode: mode })}
          tintColor={tintColor}
          onTintColorChange={setTintColor}
        />
      ) : null}
    </>
  );
});
