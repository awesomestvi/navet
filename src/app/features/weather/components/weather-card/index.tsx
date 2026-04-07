import { MapPin, Sunrise, Sunset } from 'lucide-react';
import { memo, useState } from 'react';
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
    case 'snow-day':
      return {
        primary: 'rgba(255,255,255,0.98)',
        secondary: 'rgba(255,255,255,0.84)',
        textShadow: '0 1px 10px rgba(83, 38, 12, 0.18)',
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

function CloudOverlaySvg() {
  return (
    <svg
      className="absolute inset-0 h-full w-full text-white"
      viewBox="0 0 100 40"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path
        d="M-4 11.8c0-5 4.1-9.1 9.1-9.1 2.1 0 4.1.8 5.6 2 2.2-2.9 5.7-4.7 9.7-4.7 6.5 0 11.9 5.1 12.2 11.5h1c4.6 0 8.3 3.7 8.3 8.3S38.2 28 33.6 28H6.2C0.6 28-4 23.4-4 17.8c0-2.2.7-4.3 2-6Z"
        fill="currentColor"
        opacity="0.2"
      />
      <path
        d="M56 9.6c0-4.4 3.6-8 8-8 1.8 0 3.4.5 4.8 1.5 2-2.4 5-3.9 8.3-3.9 5.9 0 10.8 4.8 10.8 10.6h.9c4.4 0 8 3.6 8 8S93.2 26 88.8 26H64c-4.4 0-8-3.5-8-7.9 0-2 .7-3.8 1.8-5.4Z"
        fill="currentColor"
        opacity="0.14"
      />
      <path
        d="M-3 26.8c0-3.9 3.2-7.1 7.1-7.1 1.4 0 2.8.4 3.9 1.1 1.6-2.4 4.4-3.9 7.4-3.9 4.8 0 8.7 3.8 8.7 8.6h.7c3.5 0 6.3 2.8 6.3 6.3s-2.8 6.3-6.3 6.3H6.6c-5.3 0-9.6-4.3-9.6-9.6 0-.6.1-1.2.2-1.7Z"
        fill="currentColor"
        opacity="0.1"
      />
      <path
        d="M74 24.9c0-3.5 2.9-6.4 6.4-6.4 1.4 0 2.7.4 3.8 1.2 1.5-2.1 3.9-3.5 6.6-3.5 4.3 0 7.9 3.4 8.1 7.7h.7c3.2 0 5.8 2.6 5.8 5.8s-2.6 5.8-5.8 5.8H80.3c-3.5 0-6.3-2.8-6.3-6.3 0-1.6.6-3.1 1.6-4.3Z"
        fill="currentColor"
        opacity="0.08"
      />
    </svg>
  );
}

function FogOverlaySvg() {
  return (
    <svg
      className="absolute inset-0 h-full w-full text-white"
      viewBox="0 0 100 40"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path
        d="M0 7.8c9 .6 18 .6 27 0 9-.6 18-.6 27 0 9 .6 18 .6 27 0 6-.4 12-.8 19-1.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.12"
      />
      <path
        d="M-2 12.8c10 .5 20 .4 30-.2 10-.7 20-.8 30-.2 10 .6 20 .7 30 .2 4-.2 8-.4 12-.7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.1"
      />
      <path
        d="M4 18.4c8 .4 16 .3 24-.1 8-.6 16-.7 24-.1 8 .6 16 .7 24 .1 8-.5 16-.6 24-.2"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        fill="none"
        opacity="0.08"
      />
      <path
        d="M0 28.6c9 .6 18 .5 27-.1 9-.6 18-.7 27-.1 9 .6 18 .7 27 .1 6-.4 12-.8 19-1.1"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        fill="none"
        opacity="0.09"
      />
      <path
        d="M2 33.3c10 .5 20 .4 30-.2 10-.7 20-.8 30-.2 10 .6 20 .7 30 .2 3-.1 6-.3 9-.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
        opacity="0.06"
      />
    </svg>
  );
}

function WindOverlaySvg() {
  return (
    <svg
      className="absolute inset-0 h-full w-full text-white"
      viewBox="0 0 100 40"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path
        d="M-6 8.5C8 3 18 2 32 6.8c10 3.4 20 3.9 31 .9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity="0.2"
      />
      <path
        d="M6 12.6c12-4.2 24-4.6 36-1.1 9.8 2.8 19.5 2.6 28.6-.7"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
        opacity="0.16"
      />
      <path
        d="M48 9.4c9-3.1 18.4-2.8 27.4.9 6.2 2.5 12.3 2.8 18.6.9"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.13"
      />
      <path
        d="M-8 27.4c12-3.5 24.2-3.3 36.2.6 11 3.5 21.4 4.1 32.6 1.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.19"
      />
      <path
        d="M18 31.2c9.8-2.8 19.8-2.5 29.6 1 8.2 2.9 16.1 3.2 24.2 1"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.14"
      />
      <path
        d="M56 34.7c7-2 14.1-1.8 21 0.7 4.7 1.7 9.2 2 13.9.7"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        fill="none"
        opacity="0.1"
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
        <CloudOverlaySvg />
      </>
    );
  }

  if (variant === 'rain') {
    return (
      <>
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#34396d_0%,#2f3463_46%,#262d56_100%)]" />
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 40"
          aria-hidden="true"
          preserveAspectRatio="none"
        >
          <path
            d="M9 19.8c0-3.8 3.1-6.9 6.9-6.9 1.4 0 2.8.4 3.9 1.2 1.7-3 5-5 8.6-5 5.4 0 9.8 4.3 10.1 9.7h.8c3.8 0 6.8 3 6.8 6.8s-3 6.8-6.8 6.8H17.2c-4.6 0-8.4-3.8-8.4-8.4 0-1.5.4-2.9 1.2-4.2Z"
            fill="rgba(255,255,255,0.21)"
          />
          <path
            d="M30 16.2c0-3.3 2.7-6 6-6 1.3 0 2.5.4 3.5 1 1.6-2.9 4.7-4.8 8.2-4.8 5.2 0 9.5 4.2 9.5 9.4h.8c3.8 0 6.8 3 6.8 6.8s-3 6.8-6.8 6.8H37.1c-4 0-7.2-3.2-7.2-7.2 0-2.2 1-4.3 2.5-5.8Z"
            fill="rgba(255,255,255,0.3)"
          />
          <path
            d="M65 14.3c0-2.6 2.1-4.7 4.7-4.7.9 0 1.8.2 2.6.7 1.2-2.1 3.5-3.5 6.1-3.5 4 0 7.2 3.2 7.2 7.1h.7c2.8 0 5.2 2.3 5.2 5.1 0 2.8-2.4 5.2-5.2 5.2H70.8c-3.2 0-5.8-2.6-5.8-5.8 0-1.5.6-2.9 1.6-4.1Z"
            fill="rgba(255,255,255,0.16)"
          />
          <path
            d="M60 22.4l-2.3 7.7M68 23l-2.2 7.8M76 22.2l-2.2 7.8M84 23l-2.2 7.8M92 22.4l-2.2 7.7"
            stroke="rgba(206,223,255,0.7)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </>
    );
  }

  if (variant === 'storm') {
    return (
      <>
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#2d315d_0%,#282d53_52%,#1f2648_100%)]" />
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 40"
          aria-hidden="true"
          preserveAspectRatio="none"
        >
          <path
            d="M12 21.8c0-4.5 3.6-8.2 8.2-8.2 1.6 0 3.2.5 4.6 1.4 2-3.5 5.8-5.8 10.1-5.8 6.4 0 11.7 5.2 11.9 11.6 1.1-.4 2.3-.7 3.6-.7 5.2 0 9.5 4.2 9.5 9.5S55.6 39 50.4 39H22.2c-5.7 0-10.2-4.6-10.2-10.2 0-2.5.9-4.9 2.4-6.9Z"
            fill="rgba(255,255,255,0.2)"
          />
          <path
            d="M26 18.8c0-3.5 2.8-6.4 6.4-6.4 1.3 0 2.5.4 3.5 1 1.5-2.8 4.5-4.7 7.8-4.7 5 0 9 4 9 9h.8c3.7 0 6.8 3 6.8 6.8 0 3.7-3.1 6.8-6.8 6.8H33.6c-4.2 0-7.6-3.4-7.6-7.6 0-1.8.6-3.5 1.8-4.9Z"
            fill="rgba(255,255,255,0.28)"
          />
          <path d="M58 13l-6 11h5l-3 9 12-15h-6l4-5Z" fill="rgba(255,208,108,0.95)" />
          <path
            d="M72 22l-2.6 8M79 22.6l-2.5 8M86 21.6l-2.5 8M93 22.2l-2.4 8"
            stroke="rgba(206,223,255,0.68)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </>
    );
  }

  if (variant === 'windy') {
    return (
      <>
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#4ca0e8_0%,#3f8fd7_50%,#2f79be_100%)]" />
        <WindOverlaySvg />
      </>
    );
  }

  if (variant === 'fog') {
    return (
      <>
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#7ea2be_0%,#6f96b4_52%,#628aa8_100%)]" />
        <FogOverlaySvg />
      </>
    );
  }

  if (variant === 'snow-night') {
    return (
      <>
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#1f2d57_0%,#223764_48%,#1c2f58_100%)]" />
        <div
          className={`absolute rounded-full bg-[#f7e8ae]/86 ${
            isLarge ? 'right-[10%] top-[4%] h-16 w-16' : 'right-[10%] top-[-2%] h-12 w-12'
          }`}
        />
        <div
          className={`absolute rounded-[100%] bg-white/16 ${
            isLarge
              ? 'left-[-8%] bottom-[-4%] h-24 w-[70%]'
              : 'left-[-10%] bottom-[-10%] h-14 w-[72%]'
          }`}
        />
        <div
          className={`absolute rounded-[100%] bg-white/12 ${
            isLarge ? 'left-[22%] bottom-[8%] h-18 w-[50%]' : 'left-[20%] bottom-[2%] h-12 w-[54%]'
          }`}
        />
        <div className="absolute left-[12%] top-[22%] h-2 w-2 rounded-full bg-white/80" />
        <div className="absolute left-[24%] top-[34%] h-1.5 w-1.5 rounded-full bg-white/72" />
        <div className="absolute left-[38%] top-[24%] h-2 w-2 rounded-[35%] bg-white/76" />
        <div className="absolute left-[56%] top-[30%] h-2.5 w-2.5 rounded-full bg-white/78" />
        <div className="absolute left-[70%] top-[18%] h-1.5 w-1.5 rounded-full bg-white/70" />
        <div className="absolute left-[80%] top-[34%] h-3 w-3 rounded-[35%] bg-white/78" />
      </>
    );
  }

  if (variant === 'snow-day') {
    return (
      <>
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#f6a24d_0%,#f7b160_50%,#f8ca90_100%)]" />
        <div
          className={`absolute rounded-[100%] bg-white/20 ${
            isLarge
              ? 'left-[-8%] bottom-[-4%] h-28 w-[72%]'
              : 'left-[-10%] bottom-[-10%] h-16 w-[72%]'
          }`}
        />
        <div
          className={`absolute rounded-[100%] bg-white/15 ${
            isLarge ? 'left-[26%] bottom-[7%] h-20 w-[54%]' : 'left-[22%] bottom-[2%] h-14 w-[56%]'
          }`}
        />
        <div
          className={`absolute rounded-[100%] bg-white/10 ${
            isLarge ? 'left-[4%] bottom-[18%] h-14 w-[48%]' : 'left-[0%] bottom-[14%] h-10 w-[52%]'
          }`}
        />
        <div className="absolute left-[12%] top-[18%] h-2.5 w-2.5 rounded-full bg-white/78" />
        <div className="absolute left-[22%] top-[30%] h-1.5 w-1.5 rounded-full bg-white/70" />
        <div className="absolute left-[36%] top-[20%] h-2 w-2 rounded-[35%] bg-white/72" />
        <div className="absolute left-[54%] top-[28%] h-2.5 w-2.5 rounded-full bg-white/74" />
        <div className="absolute left-[68%] top-[16%] h-1.5 w-1.5 rounded-full bg-white/70" />
        <div className="absolute left-[78%] top-[32%] h-3 w-3 rounded-[35%] bg-white/76" />
        <div className="absolute left-[84%] top-[22%] h-2 w-2 rounded-full bg-white/68" />
        <div className="absolute left-[62%] top-[40%] h-1.5 w-1.5 rounded-full bg-white/64" />
      </>
    );
  }

  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(120deg,#438ddf_0%,#4289dc_52%,#3d85d9_100%)]" />
      <div
        className={`absolute rounded-full bg-sky-100/18 ${
          isLarge ? 'left-[4%] top-[-2%] h-28 w-40' : 'left-[2%] top-[-16%] h-20 w-28'
        }`}
      />
      <div
        className={`absolute rounded-[999px] bg-sky-100/18 ${
          isLarge ? 'left-[-2%] top-[12%] h-20 w-[58%]' : 'left-[-4%] top-[10%] h-14 w-[60%]'
        }`}
      />
      <div
        className={`absolute rounded-[999px] bg-sky-100/14 ${
          isLarge ? 'left-[24%] top-[18%] h-16 w-[54%]' : 'left-[22%] top-[16%] h-12 w-[56%]'
        }`}
      />
      <div
        className={`absolute rounded-[999px] bg-sky-50/12 ${
          isLarge ? 'right-[-6%] top-[22%] h-16 w-[48%]' : 'right-[-8%] top-[18%] h-12 w-[52%]'
        }`}
      />
      <div
        className={`absolute bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent)] ${
          isLarge ? 'inset-x-0 top-[18%] h-[18%]' : 'inset-x-0 top-[14%] h-[16%]'
        }`}
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
