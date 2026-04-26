import type { CardSize } from '@/app/components/shared/card-size-selector';
import { getWeatherSvgOverlayTransform } from './weather-card-utils';

export function FogOverlaySvg({ size }: { size: CardSize }) {
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
