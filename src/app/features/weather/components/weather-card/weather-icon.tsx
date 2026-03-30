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
      return 'Clear night';
    case 'partlycloudy':
    case 'partly-cloudy':
    case 'partly cloudy':
      return 'Partly cloudy';
    case 'lightning-rainy':
      return 'Thunderstorms';
    case 'snowy-rainy':
      return 'Sleet';
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
      return Sun;
    case 'clear-night':
      return Moon;
    case 'cloudy':
    case 'overcast':
      return Cloud;
    case 'partly cloudy':
    case 'partlycloudy':
    case 'partly-cloudy':
      return CloudSun;
    case 'rainy':
    case 'rain':
    case 'pouring':
      return CloudRain;
    case 'snowy':
    case 'snow':
    case 'snowy-rainy':
      return CloudSnow;
    case 'drizzle':
      return CloudDrizzle;
    case 'fog':
    case 'mist':
      return CloudFog;
    case 'thunderstorm':
    case 'storm':
    case 'lightning':
    case 'lightning-rainy':
      return CloudLightning;
    case 'windy':
    case 'windy-variant':
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
