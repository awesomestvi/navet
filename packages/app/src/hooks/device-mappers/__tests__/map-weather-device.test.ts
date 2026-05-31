import type { TranslateFn } from '@navet/app/i18n';
import {
  weatherEntityFactory,
  weatherEntityFixtures,
} from '@navet/app/test/fixtures/home-assistant/entities/weather';
import { weatherIntegrationFixtures } from '@navet/app/test/fixtures/home-assistant/integrations/weather';
import { describe, expect, it } from 'vitest';
import { mapWeatherDevice } from '../map-weather-device';

const t: TranslateFn = (key, values) => {
  if (key === 'weather.today') return 'Today';
  if (key === 'weather.dayFallback') return `Day ${values?.day}`;
  if (key === 'weather.rainTomorrow') return `${values?.chance}% tomorrow`;
  if (key === 'weather.precipitationTomorrow') return `${values?.amount} ${values?.unit} tomorrow`;
  return key;
};

describe('mapWeatherDevice', () => {
  it('formats hourly forecast labels with the selected 12-hour preference', () => {
    const device = mapWeatherDevice(
      weatherEntityFixtures.normal.entity_id,
      weatherIntegrationFixtures.weather,
      'Met.no Home Weather',
      'Home',
      {
        locale: 'en-US',
        t,
        use24HourTime: false,
        weatherForecastMode: 'hourly',
        storedForecasts: {
          daily: [],
          hourly: [{ datetime: '2026-05-17T13:00:00.000Z', temperature: 21 }],
        },
      }
    );

    expect(device.forecast[0]?.day).toMatch(/[AP]M$/);
  });

  it('formats hourly forecast labels with the selected 24-hour preference', () => {
    const device = mapWeatherDevice(
      weatherEntityFixtures.normal.entity_id,
      weatherIntegrationFixtures.weather,
      'Met.no Home Weather',
      'Home',
      {
        locale: 'en-US',
        t,
        use24HourTime: true,
        weatherForecastMode: 'hourly',
        storedForecasts: {
          daily: [],
          hourly: [{ datetime: '2026-05-17T13:00:00.000Z', temperature: 21 }],
        },
      }
    );

    expect(device.forecast[0]?.day).toMatch(/^\d{1,2}$/);
    expect(device.forecast[0]?.day).not.toMatch(/[AP]M$/);
  });

  it('preserves Fahrenheit weather and forecast units', () => {
    const entity = weatherEntityFactory({
      temperature: 72,
      apparent_temperature: 75,
      unit_of_measurement: '°F',
    });

    const device = mapWeatherDevice(entity.entity_id, entity, 'Home', 'Home', {
      locale: 'en-US',
      t,
      use24HourTime: false,
      weatherForecastMode: 'weekly',
      storedForecasts: {
        daily: [
          {
            datetime: '2026-05-17T13:00:00.000Z',
            temperature: 80,
            templow: 65,
            temperature_unit: '°F',
            condition: 'sunny',
          },
        ],
        hourly: [],
      },
    });

    expect(device.temperatureUnit).toBe('fahrenheit');
    expect(device.feelsLikeTemperatureUnit).toBe('fahrenheit');
    expect(device.highTempUnit).toBe('fahrenheit');
    expect(device.lowTempUnit).toBe('fahrenheit');
    expect(device.forecast[0]).toEqual(
      expect.objectContaining({
        high: 80,
        highUnit: 'fahrenheit',
        low: 65,
        lowUnit: 'fahrenheit',
      })
    );
  });

  it('uses the explicit weather location attribute before generic config location names', () => {
    const entity = weatherEntityFactory({ location: 'Solna' });

    const device = mapWeatherDevice(entity.entity_id, entity, 'Stockholm', 'Home', {
      locale: 'en-US',
      t,
      use24HourTime: true,
      weatherForecastMode: 'weekly',
      config: { location_name: 'Home' },
    });

    expect(device.location).toBe('Solna');
  });

  it('falls back safely when optional forecast fields are missing', () => {
    const entity = weatherEntityFactory({
      forecast: [{ datetime: '2026-05-17T13:00:00.000Z', condition: 'rainy' }],
      temperature: undefined,
      apparent_temperature: undefined,
    });

    const device = mapWeatherDevice(entity.entity_id, entity, 'Home', 'Home', {
      locale: 'en-US',
      t,
      use24HourTime: true,
      weatherForecastMode: 'weekly',
    });

    expect(device.forecast[0]).toEqual(
      expect.objectContaining({
        condition: 'rainy',
        high: 0,
        low: 0,
      })
    );
  });
});
