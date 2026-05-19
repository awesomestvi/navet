import type { HassEntity } from 'home-assistant-js-websocket';
import { describe, expect, it } from 'vitest';
import type { TranslateFn } from '@/app/i18n';
import { mapWeatherDevice } from '../map-weather-device';

function createWeatherEntity(attributes: Record<string, unknown> = {}): HassEntity {
  return {
    entity_id: 'weather.home',
    state: 'sunny',
    attributes,
    last_changed: '2026-05-17T00:00:00.000Z',
    last_updated: '2026-05-17T00:00:00.000Z',
    context: { id: 'ctx', parent_id: null, user_id: null },
  } as HassEntity;
}

const t: TranslateFn = (key, values) => {
  if (key === 'weather.today') return 'Today';
  if (key === 'weather.dayFallback') return `Day ${values?.day}`;
  if (key === 'weather.rainTomorrow') return `${values?.chance}% tomorrow`;
  if (key === 'weather.precipitationTomorrow') return `${values?.amount} ${values?.unit} tomorrow`;
  return key;
};

describe('mapWeatherDevice', () => {
  it('formats hourly forecast labels with the selected 12-hour preference', () => {
    const device = mapWeatherDevice('weather.home', createWeatherEntity(), 'Home', 'Home', {
      locale: 'en-US',
      t,
      use24HourTime: false,
      weatherForecastMode: 'hourly',
      storedForecasts: {
        daily: [],
        hourly: [{ datetime: '2026-05-17T13:00:00.000Z', temperature: 21 }],
      },
    });

    expect(device.forecast[0]?.day).toMatch(/[AP]M$/);
  });

  it('formats hourly forecast labels with the selected 24-hour preference', () => {
    const device = mapWeatherDevice('weather.home', createWeatherEntity(), 'Home', 'Home', {
      locale: 'en-US',
      t,
      use24HourTime: true,
      weatherForecastMode: 'hourly',
      storedForecasts: {
        daily: [],
        hourly: [{ datetime: '2026-05-17T13:00:00.000Z', temperature: 21 }],
      },
    });

    expect(device.forecast[0]?.day).toMatch(/^\d{1,2}$/);
    expect(device.forecast[0]?.day).not.toMatch(/[AP]M$/);
  });
});
