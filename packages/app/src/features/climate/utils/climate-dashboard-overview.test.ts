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
    const model = buildClimateDashboardOverview([climateDevice()], 'celsius');

    expect(model.attentionItems).toEqual([]);
    expect(model.temperatureRange).toBe('21°');
    expect(model.activeControlCount).toBe(1);
    expect(model.summaryItems.map((item) => item.id)).toEqual([
      'climate-temperature-range',
      'climate-active-controls',
    ]);
  });

  it('surfaces an off zone that is materially outside its configured target', () => {
    const model = buildClimateDashboardOverview(
      [climateDevice({ currentTemperature: 17, temperature: 21, mode: 'off' })],
      'celsius'
    );

    expect(model.attentionItems).toMatchObject([
      {
        deviceId: 'climate.living_room',
        kind: 'temperature',
        priority: 'attention',
      },
    ]);
    expect(model.summaryItems[0]).toMatchObject({ priority: 'attention', tone: 'warning' });
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

    expect(buildClimateDashboardOverview([sensor], 'celsius').attentionItems[0]).toMatchObject({
      priority: 'critical',
      kind: 'provider',
    });
  });
});
