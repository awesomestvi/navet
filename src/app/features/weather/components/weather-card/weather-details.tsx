import type { CSSProperties } from 'react';
import { CaptionValue } from '@/app/components/ui/caption-value';
import { useI18n } from '@/app/hooks';
import { formatMetricNumber } from '@/app/hooks/ha-entity-utils';
import type { WeatherMetricId } from '@/app/stores/settings-store';
import {
  formatTemperatureFromSourceUnit,
  formatTemperatureValueFromSourceUnit,
  type TemperatureUnit,
} from '@/app/utils/temperature';

interface WeatherDetailsProps {
  temperature: number;
  temperatureUnit?: TemperatureUnit;
  highTemp: number;
  highTempUnit?: TemperatureUnit;
  lowTemp: number;
  lowTempUnit?: TemperatureUnit;
  feelsLikeTemperature?: number;
  feelsLikeTemperatureUnit?: TemperatureUnit;
  displayTemperatureUnit: TemperatureUnit;
  rainForecast?: string;
  precipitation: number;
  precipitationUnit: string;
  humidity: number;
  windSpeed: number;
  windSpeedUnit?: string;
  windGustSpeed?: number;
  pressure?: number;
  pressureUnit?: string;
  uvIndex?: number;
  cloudCoverage?: number;
  selectedMetricIds: WeatherMetricId[];
  textPrimary: string;
  textSecondary: string;
  textShadow?: string;
  titleStyle: CSSProperties;
  subtitleStyle: CSSProperties;
}

export function WeatherDetails({
  temperature,
  temperatureUnit,
  highTemp,
  highTempUnit,
  lowTemp,
  lowTempUnit,
  feelsLikeTemperature,
  feelsLikeTemperatureUnit,
  displayTemperatureUnit,
  rainForecast,
  precipitation,
  precipitationUnit,
  humidity,
  windSpeed,
  windSpeedUnit = 'km/h',
  windGustSpeed,
  pressure,
  pressureUnit = 'hPa',
  uvIndex,
  cloudCoverage,
  selectedMetricIds,
  textPrimary,
  textSecondary,
  textShadow,
  titleStyle,
  subtitleStyle,
}: WeatherDetailsProps) {
  const { t } = useI18n();
  const precipitationValue = `${precipitation}${precipitationUnit ? ` ${precipitationUnit}` : ''}`;
  const metricsById: Partial<Record<WeatherMetricId, { caption: string; value: string }>> = {
    precipitation: {
      caption: t('weather.precipitation'),
      value: precipitationValue,
    },
    humidity: {
      caption: t('weather.humidity'),
      value: `${humidity}%`,
    },
    wind: {
      caption: t('weather.wind'),
      value: `${windSpeed} ${windSpeedUnit}`,
    },
    feelsLike:
      typeof feelsLikeTemperature === 'number'
        ? {
            caption: t('weather.metric.feelsLike'),
            value: formatTemperatureFromSourceUnit(
              feelsLikeTemperature,
              feelsLikeTemperatureUnit,
              displayTemperatureUnit
            ),
          }
        : undefined,
    windGust:
      typeof windGustSpeed === 'number'
        ? {
            caption: t('weather.windGust'),
            value: `${formatMetricNumber(windGustSpeed)} ${windSpeedUnit}`,
          }
        : undefined,
    pressure:
      typeof pressure === 'number' && pressure > 0
        ? {
            caption: t('weather.pressure'),
            value: `${formatMetricNumber(pressure)} ${pressureUnit}`,
          }
        : undefined,
    uvIndex:
      typeof uvIndex === 'number'
        ? {
            caption: t('weather.uvIndex'),
            value: formatMetricNumber(uvIndex),
          }
        : undefined,
    cloudCover:
      typeof cloudCoverage === 'number'
        ? {
            caption: t('weather.cloudCover'),
            value: `${Math.round(cloudCoverage)}%`,
          }
        : undefined,
  };
  const visibleMetrics = selectedMetricIds
    .map((metricId) => metricsById[metricId])
    .filter((metric): metric is { caption: string; value: string } => Boolean(metric))
    .slice(0, 5);

  return (
    <div className="flex w-full items-end justify-between gap-4">
      <div className="min-w-0 shrink-0">
        <div className="mb-1 text-3xl font-bold leading-none" style={titleStyle}>
          {formatTemperatureFromSourceUnit(temperature, temperatureUnit, displayTemperatureUnit)}
        </div>
        <div className="mb-0.5 text-sm" style={subtitleStyle}>
          H:{formatTemperatureValueFromSourceUnit(highTemp, highTempUnit, displayTemperatureUnit)}°
          L:{formatTemperatureValueFromSourceUnit(lowTemp, lowTempUnit, displayTemperatureUnit)}°
        </div>
        {rainForecast ? (
          <div className="text-sm" style={subtitleStyle}>
            {rainForecast}
          </div>
        ) : null}
      </div>

      <div className="shrink-0 space-y-0.5 text-right">
        {visibleMetrics.map((metric) => (
          <CaptionValue
            key={metric.caption}
            caption={metric.caption}
            value={metric.value}
            align="right"
            captionStyle={{
              color: textSecondary,
              textShadow,
            }}
            valueStyle={{
              color: textPrimary,
              textShadow,
            }}
          />
        ))}
      </div>
    </div>
  );
}
