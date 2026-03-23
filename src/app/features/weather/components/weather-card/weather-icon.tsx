import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  type LucideIcon,
  Sun,
} from 'lucide-react';

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
}

export function getWeatherIconComponent(condition: WeatherCondition | string): LucideIcon {
  switch (condition.toLowerCase()) {
    case 'clear':
    case 'sunny':
      return Sun;
    case 'cloudy':
    case 'overcast':
      return Cloud;
    case 'partly cloudy':
      return Cloud;
    case 'rainy':
    case 'rain':
      return CloudRain;
    case 'snowy':
    case 'snow':
      return CloudSnow;
    case 'drizzle':
      return CloudDrizzle;
    case 'fog':
    case 'mist':
      return CloudFog;
    case 'thunderstorm':
    case 'storm':
      return CloudLightning;
    default:
      return Cloud;
  }
}

/**
 * Weather Icon Component
 * Returns appropriate icon based on weather condition
 */
export const WeatherIcon = ({ condition, className = 'w-6 h-6' }: WeatherIconProps) => {
  const IconComponent = getWeatherIconComponent(condition);
  const iconProps = { className: `${className} text-cyan-300` };
  return <IconComponent {...iconProps} />;
};
