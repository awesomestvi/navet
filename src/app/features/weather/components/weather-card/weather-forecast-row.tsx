import type { CSSProperties } from 'react';
import { formatTemperatureValue, type TemperatureUnit } from '@/app/utils/temperature';
import type { ForecastDay } from './index';
import { WeatherIcon } from './weather-icon';

interface WeatherForecastRowProps {
  forecast: ForecastDay[];
  temperatureUnit: TemperatureUnit;
  showHourlyForecast: boolean;
  isSmall: boolean;
  isMedium: boolean;
  textPrimary: string;
  textSecondary: string;
  textShadow?: string;
  titleStyle: CSSProperties;
  subtitleStyle: CSSProperties;
}

export function WeatherForecastRow({
  forecast,
  temperatureUnit,
  showHourlyForecast,
  isSmall,
  isMedium,
  textPrimary,
  textSecondary,
  textShadow,
  titleStyle,
  subtitleStyle,
}: WeatherForecastRowProps) {
  const compactForecastDayTextClassName = isSmall ? 'text-xs' : 'text-sm';
  const compactForecastIconClassName = isSmall
    ? 'mx-auto mb-1 h-5 w-5'
    : isMedium
      ? 'mx-auto mb-0.5 h-5 w-5'
      : 'mx-auto mb-1 h-6 w-6';
  const compactForecastValueClassName = isSmall ? 'text-xs leading-none' : 'text-sm leading-none';
  const compactForecastDayClassName = isSmall ? 'mb-1' : isMedium ? 'mb-0.5' : 'mb-1';
  const weeklyValueClassName =
    isSmall || isMedium
      ? `flex items-center justify-center ${isSmall ? 'gap-1' : 'gap-1.5'}`
      : 'flex flex-col items-center justify-center gap-0.5';

  return (
    <div className={`flex w-full items-start justify-between ${isSmall ? 'gap-1' : 'gap-2'}`}>
      {forecast.map((day) => (
        <div key={day.day} className="min-w-0 text-center">
          <div
            className={`${compactForecastDayClassName} ${compactForecastDayTextClassName}`}
            style={{ color: textSecondary, textShadow }}
          >
            {day.day}
          </div>
          <WeatherIcon
            condition={day.condition}
            className={compactForecastIconClassName}
            style={{ color: textPrimary }}
          />
          {showHourlyForecast ? (
            <div className={`${compactForecastValueClassName} font-medium`} style={titleStyle}>
              {formatTemperatureValue(day.high, temperatureUnit)}°
            </div>
          ) : (
            <div className={`${weeklyValueClassName} ${compactForecastValueClassName}`}>
              <span className="font-medium" style={titleStyle}>
                {formatTemperatureValue(day.high, temperatureUnit)}°
              </span>
              <span style={subtitleStyle}>{formatTemperatureValue(day.low, temperatureUnit)}°</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
