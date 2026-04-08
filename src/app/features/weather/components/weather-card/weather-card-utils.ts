import type { CardSize } from '@/app/components/shared/card-size-selector';
import type { WeatherCondition } from './weather-icon';

export function getWeatherCityName(location: string) {
  return (
    location
      .split(',')
      .map((part) => part.trim())
      .find(Boolean) || location
  );
}

export function normalizeWeatherCondition(condition: WeatherCondition | string) {
  return condition.trim().toLowerCase().replace(/_/g, '-');
}

export type WeatherBackgroundVariant =
  | 'sunny'
  | 'clear-night'
  | 'cloudy'
  | 'rain'
  | 'snow-day'
  | 'snow-night'
  | 'windy'
  | 'storm'
  | 'fog';

export function getWeatherBackgroundVariant(
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

export function getWeatherTextTreatment(
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

export function getWeatherSvgOverlayTransform(size: CardSize) {
  if (size === 'large') {
    return 'translateY(-8%)';
  }

  if (size === 'medium') {
    return 'translateY(-4%)';
  }

  return 'translateY(0)';
}

export function getWindOverlayTransform(size: CardSize) {
  if (size === 'large') {
    return 'translateY(1%) scaleY(0.62)';
  }

  return getWeatherSvgOverlayTransform(size);
}
