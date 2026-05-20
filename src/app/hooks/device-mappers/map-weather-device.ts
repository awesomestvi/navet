import type { HassEntity } from 'home-assistant-js-websocket';
import type { TranslateFn } from '../../i18n';
import type { WeatherDevice } from '../../types/device.types';
import {
  formatClock,
  formatDaylight,
  formatMetricNumber,
  parseNumberish,
  parseRoundedNumberish,
} from '../ha-entity-utils';

type WeatherForecastEntry = Record<string, unknown>;

interface WeatherContext {
  locale: string;
  t: TranslateFn;
  use24HourTime: boolean;
  sunEntity?: HassEntity;
  config?: Record<string, unknown> | null;
  weatherForecastMode: 'weekly' | 'hourly';
  storedForecasts?: { daily: WeatherForecastEntry[]; hourly: WeatherForecastEntry[] };
}

export function mapWeatherDevice(
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string,
  context: WeatherContext
): WeatherDevice {
  const { sunEntity, config, weatherForecastMode, storedForecasts, locale, t, use24HourTime } =
    context;

  const sunEntitySunrise = sunEntity?.attributes?.next_rising;
  const sunEntitySunset = sunEntity?.attributes?.next_setting;

  const fallbackDailyForecast = Array.isArray(entity.attributes?.forecast)
    ? (entity.attributes.forecast as WeatherForecastEntry[])
    : [];
  const dailyForecastSource =
    storedForecasts?.daily && storedForecasts.daily.length > 0
      ? storedForecasts.daily
      : fallbackDailyForecast;
  const hourlyForecastSource =
    storedForecasts?.hourly && storedForecasts.hourly.length > 0 ? storedForecasts.hourly : [];
  const selectedForecastSource =
    weatherForecastMode === 'hourly' && hourlyForecastSource.length > 0
      ? hourlyForecastSource
      : dailyForecastSource;
  const effectiveForecastMode =
    weatherForecastMode === 'hourly' && hourlyForecastSource.length > 0 ? 'hourly' : 'weekly';

  const hourlyFormatter = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    hour12: !use24HourTime,
  });
  const weeklyFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });

  const forecast = selectedForecastSource
    .slice(0, 7)
    .map((entry: Record<string, unknown>, index) => {
      const forecastDate =
        typeof entry.datetime === 'string'
          ? new Date(entry.datetime)
          : typeof entry.datetime === 'number'
            ? new Date(entry.datetime)
            : null;
      const dayLabel =
        forecastDate && !Number.isNaN(forecastDate.getTime())
          ? effectiveForecastMode === 'hourly'
            ? hourlyFormatter.format(forecastDate)
            : index === 0
              ? t('weather.today')
              : weeklyFormatter.format(forecastDate)
          : effectiveForecastMode === 'hourly'
            ? `+${index + 1}h`
            : index === 0
              ? t('weather.today')
              : t('weather.dayFallback', { day: index + 1 });
      const forecastTemperature =
        parseRoundedNumberish(entry.temperature) ??
        parseRoundedNumberish(entry.native_temperature) ??
        0;

      return {
        day: dayLabel,
        condition: (typeof entry.condition === 'string' && entry.condition) || entity.state,
        high: forecastTemperature,
        low:
          effectiveForecastMode === 'hourly'
            ? forecastTemperature
            : (parseRoundedNumberish(entry.templow) ?? 0),
      };
    });

  const highTemp =
    parseRoundedNumberish(dailyForecastSource[0]?.temperature) ??
    parseRoundedNumberish(entity.attributes?.temperature) ??
    parseRoundedNumberish(entity.attributes?.native_temperature) ??
    0;
  const lowTemp = parseRoundedNumberish(dailyForecastSource[0]?.templow) ?? highTemp;
  const precipitationUnit =
    (typeof entity.attributes?.precipitation_unit === 'string' &&
      entity.attributes.precipitation_unit) ||
    '%';
  const precipitationValue =
    parseNumberish(entity.attributes?.precipitation_probability) ??
    parseNumberish(entity.attributes?.precipitation) ??
    0;
  const tomorrowForecast = dailyForecastSource[1] as Record<string, unknown> | undefined;
  const tomorrowPrecipitationProbability = tomorrowForecast
    ? parseNumberish(tomorrowForecast.precipitation_probability)
    : null;
  const tomorrowPrecipitationAmount = tomorrowForecast
    ? parseNumberish(tomorrowForecast.precipitation)
    : null;

  const sunriseSource = sunEntitySunrise ?? entity.attributes?.sunrise;
  const sunsetSource = sunEntitySunset ?? entity.attributes?.sunset;
  const configLocationName =
    config &&
    typeof config === 'object' &&
    'location_name' in config &&
    typeof config.location_name === 'string'
      ? config.location_name
      : '';
  const weatherLocation =
    (typeof entity.attributes?.location === 'string' && entity.attributes.location) ||
    (typeof entity.attributes?.city === 'string' && entity.attributes.city) ||
    (typeof entity.attributes?.place === 'string' && entity.attributes.place) ||
    name ||
    room ||
    configLocationName ||
    entityId;

  return {
    id: entityId,
    name,
    room,
    size: 'large',
    location: weatherLocation,
    temperature:
      parseRoundedNumberish(entity.attributes?.temperature) ??
      parseRoundedNumberish(entity.attributes?.native_temperature) ??
      0,
    feelsLikeTemperature:
      parseRoundedNumberish(entity.attributes?.apparent_temperature) ??
      parseRoundedNumberish(entity.attributes?.native_apparent_temperature) ??
      undefined,
    condition: entity.state,
    humidity: parseNumberish(entity.attributes?.humidity) ?? 0,
    windSpeed:
      parseNumberish(entity.attributes?.wind_speed) ??
      parseNumberish(entity.attributes?.native_wind_speed) ??
      0,
    windSpeedUnit:
      (typeof entity.attributes?.wind_speed_unit === 'string' &&
        entity.attributes.wind_speed_unit) ||
      (typeof entity.attributes?.native_wind_speed_unit === 'string' &&
        entity.attributes.native_wind_speed_unit) ||
      'km/h',
    windGustSpeed:
      parseNumberish(entity.attributes?.wind_gust_speed) ??
      parseNumberish(entity.attributes?.native_wind_gust_speed) ??
      parseNumberish(entity.attributes?.wind_gust) ??
      undefined,
    pressure:
      parseNumberish(entity.attributes?.pressure) ??
      parseNumberish(entity.attributes?.native_pressure) ??
      0,
    pressureUnit:
      (typeof entity.attributes?.pressure_unit === 'string' && entity.attributes.pressure_unit) ||
      (typeof entity.attributes?.native_pressure_unit === 'string' &&
        entity.attributes.native_pressure_unit) ||
      'hPa',
    uvIndex:
      parseNumberish(entity.attributes?.uv_index) ??
      parseNumberish(entity.attributes?.uv) ??
      undefined,
    cloudCoverage:
      parseNumberish(entity.attributes?.cloud_coverage) ??
      parseNumberish(entity.attributes?.cloudiness) ??
      parseNumberish(entity.attributes?.clouds) ??
      undefined,
    precipitation: precipitationValue,
    precipitationUnit,
    sunrise: formatClock(sunriseSource, locale, use24HourTime),
    sunset: formatClock(sunsetSource, locale, use24HourTime),
    daylight: formatDaylight(sunriseSource, sunsetSource),
    rainForecast:
      tomorrowPrecipitationProbability !== null
        ? t('weather.rainTomorrow', {
            chance: Math.round(tomorrowPrecipitationProbability),
          })
        : tomorrowPrecipitationAmount !== null
          ? t('weather.precipitationTomorrow', {
              amount: formatMetricNumber(tomorrowPrecipitationAmount),
              unit: precipitationUnit,
            })
          : '',
    highTemp,
    lowTemp,
    forecastMode: effectiveForecastMode,
    forecast,
  };
}
