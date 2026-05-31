import type { CSSProperties, SVGProps } from 'react';

interface WeatherSunTimesProps {
  sunrise: string;
  sunset: string;
  daylight: string;
  textPrimary?: string;
  textSecondary: string;
  textShadow?: string;
  titleStyle: CSSProperties;
  subtitleStyle: CSSProperties;
  iconStyleSecondary: CSSProperties;
}

function SunriseIcon({ className, style }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 16.5h18" stroke="#FDE68A" strokeLinecap="round" strokeWidth="1.8" />
      <path
        d="M6.5 16.2a5.5 5.5 0 0 1 11 0"
        fill="#FDBA74"
        stroke="#F97316"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
      <path
        d="M12 4.5v4M7 7.2l2.2 2.2M17 7.2l-2.2 2.2M12 4.5l-2 2M12 4.5l2 2"
        stroke="#FEF3C7"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
      <path d="M5 19h14" stroke="#93C5FD" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function SunsetIcon({ className, style }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 16.5h18" stroke="#FDBA74" strokeLinecap="round" strokeWidth="1.8" />
      <path
        d="M6.5 16.2a5.5 5.5 0 0 1 11 0"
        fill="#FB923C"
        stroke="#EA580C"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
      <path
        d="M12 9V5M7 7.2l2.2 2.2M17 7.2l-2.2 2.2M12 9l-2-2M12 9l2-2"
        stroke="#FED7AA"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
      <path d="M5 19h14" stroke="#C4B5FD" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

export function WeatherSunTimes({
  sunrise,
  sunset,
  daylight,
  textSecondary,
  titleStyle,
  subtitleStyle,
  iconStyleSecondary,
}: WeatherSunTimesProps) {
  return (
    <div className="my-5 flex items-center justify-between px-1">
      <div className="flex items-center gap-2">
        <SunriseIcon className="h-5 w-5" style={iconStyleSecondary} />
        <span className="text-sm font-medium" style={titleStyle}>
          {sunrise}
        </span>
      </div>
      <div className="mx-3 flex min-w-0 flex-1 items-center">
        <div className="flex-1 border-t border-dashed" style={{ borderColor: textSecondary }} />
      </div>
      <div className="shrink-0 text-sm" style={subtitleStyle}>
        {daylight}
      </div>
      <div className="mx-3 flex min-w-0 flex-1 items-center">
        <div className="flex-1 border-t border-dashed" style={{ borderColor: textSecondary }} />
      </div>
      <div className="flex items-center gap-2">
        <SunsetIcon className="h-5 w-5" style={iconStyleSecondary} />
        <span className="text-sm font-medium" style={titleStyle}>
          {sunset}
        </span>
      </div>
    </div>
  );
}
