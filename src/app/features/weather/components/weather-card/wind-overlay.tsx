import type { CardSize } from '@/app/components/shared/card-size-selector';
import { getWindOverlayTransform } from './weather-card-utils';

export function WindOverlaySvg({ size }: { size: CardSize }) {
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
