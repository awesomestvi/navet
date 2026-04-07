import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  type LucideIcon,
  Moon,
  Sun,
  Wind,
} from 'lucide-react';
import type { CSSProperties } from 'react';

export type WeatherCondition =
  | 'Clear'
  | 'Cloudy'
  | 'Rainy'
  | 'Snowy'
  | 'Drizzle'
  | 'Fog'
  | 'Thunderstorm'
  | 'Partly Cloudy'
  | 'Sunny';

interface WeatherIconProps {
  condition: WeatherCondition | string;
  className?: string;
  style?: CSSProperties;
}

function normalizeWeatherCondition(condition: WeatherCondition | string) {
  return condition.trim().toLowerCase().replace(/_/g, '-');
}

export function formatWeatherConditionLabel(condition: WeatherCondition | string) {
  const normalized = normalizeWeatherCondition(condition);

  switch (normalized) {
    case 'clear-night':
    case 'night-clear':
    case 'night':
    case 'moony':
      return 'Clear night';
    case 'partlycloudy':
    case 'partly-cloudy':
    case 'partly cloudy':
      return 'Partly cloudy';
    case 'partlycloudy-night':
    case 'partly-cloudy-night':
      return 'Partly cloudy night';
    case 'lightning-rainy':
      return 'Thunderstorms';
    case 'snowy-rainy':
      return 'Sleet';
    case 'snow-night':
      return 'Snowy night';
    case 'windy-variant':
      return 'Windy';
    default:
      return normalized.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
  }
}

export function getWeatherIconComponent(condition: WeatherCondition | string): LucideIcon {
  switch (normalizeWeatherCondition(condition)) {
    case 'clear':
    case 'sunny':
    case 'fair':
      return Sun;
    case 'clear-night':
    case 'night-clear':
    case 'night':
    case 'moony':
      return Moon;
    case 'cloudy':
    case 'overcast':
      return Cloud;
    case 'fog':
    case 'mist':
    case 'hazy':
      return CloudFog;
    case 'partly cloudy':
    case 'partlycloudy':
    case 'partly-cloudy':
    case 'partlycloudy-day':
      return CloudSun;
    case 'partlycloudy-night':
    case 'partly-cloudy-night':
      return Moon;
    case 'rainy':
    case 'rain':
    case 'pouring':
    case 'showers':
      return CloudRain;
    case 'snowy':
    case 'snow':
    case 'snowy-rainy':
    case 'snow-night':
    case 'blizzard':
      return CloudSnow;
    case 'drizzle':
      return CloudDrizzle;
    case 'thunderstorm':
    case 'storm':
    case 'lightning':
    case 'lightning-rainy':
    case 'hail':
    case 'exceptional':
      return CloudLightning;
    case 'windy':
    case 'windy-variant':
    case 'breezy':
      return Wind;
    default:
      return Cloud;
  }
}

/**
 * Weather Icon Component
 * Returns appropriate icon based on weather condition
 */
export const WeatherIcon = ({ condition, className = 'w-6 h-6', style }: WeatherIconProps) => {
  const IconComponent = getWeatherIconComponent(condition);
  const hasExplicitColor = /\btext-[^\s]+\b/.test(className);
  const iconProps = {
    className: `${className}${hasExplicitColor ? '' : ' text-cyan-300'}`,
    style,
  };
  return <IconComponent {...iconProps} />;
};
