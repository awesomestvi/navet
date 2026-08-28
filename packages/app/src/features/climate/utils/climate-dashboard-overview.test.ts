import type { DeviceWithType } from '@navet/app/types/device.types';
import { describe, expect, it } from 'vitest';
import { buildClimateDashboardOverview } from './climate-dashboard-overview';

function climateDevice(overrides: Partial<Extract<DeviceWithType, { type: 'climate' }>> = {}) {
  return {
    id: 'climate.living_room',
    type: 'climate',
    name: 'Living room',
    room: 'Living room',
    size: 'medium',
    temperature: 21,
    currentTemperature: 21,
    temperatureUnit: 'celsius',
    mode: 'heat',
    ...overrides,
  } satisfies Extract<DeviceWithType, { type: 'climate' }>;
}

describe('buildClimateDashboardOverview', () => {
  it('treats incomplete climate records as inactive instead of throwing', () => {
    const device = climateDevice({ mode: undefined as never });

    const result = buildClimateDashboardOverview([device], 'celsius');

    expect(result.activeControlCount).toBe(0);
  });

  it('keeps normal active climate calm and summarizes the whole-home temperature', () => {
    const model = buildClimateDashboardOverview([climateDevice({ action: 'heating' })], 'celsius');

    expect(model.attentionItems).toEqual([]);
    expect(model.temperatureRange).toBe('21°');
    expect(model.comfortableRoomCount).toBe(1);
    expect(model.comparableRoomCount).toBe(1);
    expect(model.activeControlCount).toBe(1);
    expect(model.summaryItems.map((item) => item.id)).toEqual([
      'climate-overall',
      'climate-temperature-range',
      'climate-active-controls',
    ]);
    expect(model.summaryItems.every((item) => item.tone === 'neutral')).toBe(true);
  });

  it('does not infer active HVAC action from the configured mode alone', () => {
    expect(buildClimateDashboardOverview([climateDevice()], 'celsius').activeControlCount).toBe(0);
  });

  it('keeps an off zone current reading without treating its configured target as active', () => {
    const model = buildClimateDashboardOverview(
      [climateDevice({ currentTemperature: 17, temperature: 21, mode: 'off' })],
      'celsius'
    );

    expect(model.attentionItems).toEqual([]);
    expect(model.temperatureRange).toBe('17°');
    expect(model.comfortableRoomCount).toBe(0);
    expect(model.comparableRoomCount).toBe(0);
    expect(model.summaryItems.every((item) => item.tone === 'neutral')).toBe(true);
  });

  it('does not infer numeric air-quality danger without provider severity', () => {
    const sensor = {
      id: 'sensor.office_co2',
      type: 'sensors',
      name: 'Office CO2',
      room: 'Office',
      size: 'small',
      value: '1450',
      unit: 'ppm',
      deviceClass: 'carbon_dioxide',
      status: 'measurement',
    } satisfies Extract<DeviceWithType, { type: 'sensors' }>;

    expect(buildClimateDashboardOverview([sensor], 'celsius').attentionItems).toEqual([]);
  });

  it('promotes explicit provider-critical environmental state', () => {
    const sensor = {
      id: 'sensor.air_quality',
      type: 'sensors',
      name: 'Air quality',
      room: 'Nursery',
      size: 'small',
      value: 'Poor',
      unit: '',
      deviceClass: 'air_quality',
      status: 'active',
      securitySeverity: 'critical',
    } satisfies Extract<DeviceWithType, { type: 'sensors' }>;

    const model = buildClimateDashboardOverview([sensor], 'celsius');

    expect(model.attentionItems[0]).toMatchObject({
      priority: 'critical',
      kind: 'provider',
    });
    expect(model.summaryItems[0]).toMatchObject({ priority: 'critical', tone: 'danger' });
  });

  it('summarizes comparable humidity readings and ignores non-ambient temperatures', () => {
    const devices: DeviceWithType[] = [
      {
        id: 'sensor.living_humidity',
        type: 'sensors',
        name: 'Living humidity',
        room: 'Living room',
        size: 'small',
        value: '44',
        unit: '%',
        deviceClass: 'humidity',
      },
      {
        id: 'sensor.bedroom_humidity',
        type: 'sensors',
        name: 'Bedroom humidity',
        room: 'Bedroom',
        size: 'small',
        value: '48',
        unit: '%',
        deviceClass: 'humidity',
      },
      {
        id: 'sensor.boiler_supply_temperature',
        type: 'sensors',
        name: 'Boiler supply temperature',
        room: 'Utility',
        size: 'small',
        value: '68',
        unit: '°C',
        deviceClass: 'temperature',
      },
    ];

    const model = buildClimateDashboardOverview(devices, 'celsius');

    expect(model.averageHumidity).toBe(46);
    expect(model.temperatureRange).toBeNull();
    expect(model.summaryItems).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'climate-humidity', value: '46%' })])
    );
  });

  it('includes normalized outdoor temperature when a weather source is available', () => {
    const weather = {
      id: 'weather.home',
      type: 'weather',
      name: 'Home weather',
      room: 'Outside',
      size: 'medium',
      temperature: 8,
      temperatureUnit: 'celsius',
      feelsLikeTemperature: 6,
      feelsLikeTemperatureUnit: 'celsius',
      location: 'Home',
      condition: 'cloudy',
      humidity: 74,
      windSpeed: 3,
      pressure: 1012,
      precipitation: 0,
      precipitationUnit: 'mm',
      sunrise: '',
      sunset: '',
      daylight: '',
      rainForecast: '',
      highTemp: 10,
      lowTemp: 4,
      forecastMode: 'hourly',
      forecast: [],
    } satisfies Extract<DeviceWithType, { type: 'weather' }>;

    const model = buildClimateDashboardOverview([weather], 'fahrenheit');

    expect(model.outdoorTemperature).toBe('46.4°');
    expect(model.outdoorFeelsLike).toBe('42.8°');
    expect(model.summaryItems).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'climate-outdoor', value: '46.4°' })])
    );
  });
});
