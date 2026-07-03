import type { DeviceWithType } from '@navet/app/types/device.types';
import { Shield } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import {
  buildHomeStatusSummaryItems,
  buildRoomStatusSummaryItems,
} from '../home-status-summary-model';

function device(overrides: Partial<DeviceWithType> & Pick<DeviceWithType, 'id' | 'type'>) {
  return {
    name: overrides.id,
    room: 'Living Room',
    size: 'small',
    ...overrides,
  } as DeviceWithType;
}

describe('home status summary model', () => {
  it('summarizes sections in sidebar order', () => {
    const items = buildHomeStatusSummaryItems(
      new Map(
        [
          device({
            id: 'sensor.home_power',
            type: 'sensors',
            deviceClass: 'power',
            value: '1234',
            unit: 'W',
          }),
          device({ id: 'light.kitchen', type: 'lights', state: true }),
          device({ id: 'light.bedroom', type: 'lights', state: false }),
          device({
            id: 'binary_sensor.window',
            type: 'sensors',
            deviceClass: 'window',
            status: 'clear',
          }),
          device({ id: 'media_player.tv', type: 'media', state: 'idle' }),
          device({
            id: 'sensor.temperature',
            type: 'sensors',
            deviceClass: 'temperature',
            value: '23.4',
          }),
          device({ id: 'scene.goodnight', type: 'scenes' }),
          device({
            id: 'script.movie',
            type: 'helpers',
            serviceDomain: 'script',
            state: true,
          }),
        ].map((entry) => [entry.id, entry])
      )
    );

    expect(items.map((item) => [item.id, item.value, item.targetSection])).toEqual([
      ['energy', '1.2 kW', 'energy'],
      ['climate', '23°', 'climate'],
      ['security', 'No Alerts', 'security'],
      ['lights', '1 On', 'lights'],
      ['media', 'None Playing', 'media'],
    ]);
  });

  it('uses the grid import total for the home energy summary when provided', () => {
    const items = buildHomeStatusSummaryItems(new Map(), { gridImportTodayKWh: 8.24 });

    expect(items).toEqual([
      expect.objectContaining({
        id: 'energy',
        value: '8.2 kWh',
        targetSection: 'energy',
      }),
    ]);
  });

  it('appends validated custom summary pills and hides missing entity pills', () => {
    const items = buildHomeStatusSummaryItems(
      new Map(
        [
          device({
            id: 'sensor.entryway_temperature',
            type: 'sensors',
            deviceClass: 'temperature',
            value: '21.5',
            unit: 'C',
          }),
        ].map((entry) => [entry.id, entry])
      ),
      {
        customSummaryPills: [
          {
            id: 'entry-temp',
            label: 'Entry',
            icon: 'sparkles',
            valueSourceType: 'entity',
            entityId: 'sensor.entryway_temperature',
            actionType: 'section',
            actionSection: 'climate',
            visibility: 'when_value_available',
          },
          {
            id: 'missing',
            label: 'Missing',
            icon: 'bell',
            valueSourceType: 'entity',
            entityId: 'sensor.missing',
            actionType: 'none',
            visibility: 'when_value_available',
          },
        ],
      }
    );

    expect(items).toEqual([
      expect.objectContaining({
        id: 'climate',
        targetSection: 'climate',
      }),
      expect.objectContaining({
        id: 'entry-temp',
        title: 'Entry',
        value: '21.5 C',
        targetSection: 'climate',
      }),
    ]);
  });

  it('ignores inactive scenes and scripts in the summary bar', () => {
    const scene = device({ id: 'scene.goodnight', type: 'scenes' });
    const script = device({
      id: 'script.movie',
      type: 'helpers',
      serviceDomain: 'script',
      state: false,
    });
    const items = buildHomeStatusSummaryItems(
      new Map([
        [scene.id, scene],
        [script.id, script],
      ])
    );

    expect(items).toEqual([]);
  });

  it('keeps the section order stable when alert and playback states change', () => {
    const items = buildHomeStatusSummaryItems(
      new Map(
        [
          device({ id: 'light.kitchen', type: 'lights', state: false }),
          device({
            id: 'binary_sensor.leak',
            type: 'sensors',
            deviceClass: 'moisture',
            status: 'active',
          }),
          device({ id: 'media_player.speaker', type: 'media', state: 'playing' }),
        ].map((entry) => [entry.id, entry])
      )
    );

    expect(items.map((item) => item.id)).toEqual(['security', 'lights', 'media']);
    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'security',
          value: '1 Alert',
          icon: Shield,
          targetSection: 'security',
        }),
        expect.objectContaining({ id: 'media', value: '1 Playing', targetSection: 'media' }),
      ])
    );
  });

  it('counts powered TVs as active in the media summary without counting idle speakers', () => {
    const items = buildRoomStatusSummaryItems(
      new Map(
        [
          device({
            id: 'media_player.living_room_tv',
            type: 'media',
            room: 'Living Room',
            deviceClass: 'tv',
            state: 'idle',
          }),
          device({
            id: 'media_player.living_room_speaker',
            type: 'media',
            room: 'Living Room',
            deviceClass: 'speaker',
            state: 'idle',
          }),
        ].map((entry) => [entry.id, entry])
      ),
      'Living Room'
    );

    expect(items).toEqual([
      expect.objectContaining({
        id: 'media',
        value: '1 Active',
        targetSection: 'media',
      }),
    ]);
  });

  it('does not count active-only security activity in the summary bar alert total', () => {
    const items = buildHomeStatusSummaryItems(
      new Map(
        [
          device({
            id: 'binary_sensor.entry_motion',
            type: 'sensors',
            deviceClass: 'motion',
            status: 'active',
          }),
          device({
            id: 'camera.driveway',
            type: 'cameras',
            motionDetected: true,
          }),
        ].map((entry) => [entry.id, entry])
      )
    );

    expect(items).toEqual([
      expect.objectContaining({
        id: 'security',
        value: 'No Alerts',
        iconColor: '#22c55e',
        targetSection: 'security',
      }),
    ]);
  });

  it('counts unavailable security devices in the summary bar like the attention lane', () => {
    const items = buildHomeStatusSummaryItems(
      new Map(
        [
          device({
            id: 'binary_sensor.side_door',
            type: 'sensors',
            deviceClass: 'door',
            status: 'unavailable',
            securitySeverity: 'unknown',
          }),
        ].map((entry) => [entry.id, entry])
      )
    );

    expect(items).toEqual([
      expect.objectContaining({
        id: 'security',
        value: '1 Alert',
        targetSection: 'security',
      }),
    ]);
  });

  it('excludes presence devices from the summary bar security alert count like the attention lane', () => {
    const items = buildHomeStatusSummaryItems(
      new Map(
        [
          device({
            id: 'binary_sensor.side_door',
            type: 'sensors',
            deviceClass: 'door',
            status: 'unavailable',
            securitySeverity: 'unknown',
          }),
          device({
            id: 'person.alex',
            type: 'persons',
            securityKind: 'person',
            securitySeverity: 'unknown',
            state: 'away',
            location: 'Away',
          }),
        ].map((entry) => [entry.id, entry])
      )
    );

    expect(items).toEqual([
      expect.objectContaining({
        id: 'security',
        value: '1 Alert',
        targetSection: 'security',
      }),
    ]);
  });

  it('deduplicates grouped opening alerts when aggregate membership metadata is present', () => {
    const items = buildHomeStatusSummaryItems(
      new Map(
        [
          device({
            id: 'binary_sensor.any_window_open',
            type: 'sensors',
            deviceClass: 'opening',
            securityKind: 'opening',
            status: 'active',
            securitySeverity: 'warning',
            groupMembers: ['binary_sensor.window_left', 'binary_sensor.window_right'],
          }),
          device({
            id: 'binary_sensor.window_left',
            type: 'sensors',
            deviceClass: 'window',
            securityKind: 'window',
            status: 'active',
            securitySeverity: 'warning',
          }),
          device({
            id: 'binary_sensor.window_right',
            type: 'sensors',
            deviceClass: 'window',
            securityKind: 'window',
            status: 'active',
            securitySeverity: 'warning',
          }),
        ].map((entry) => [entry.id, entry])
      )
    );

    expect(items).toEqual([
      expect.objectContaining({
        id: 'security',
        value: '1 Alert',
        targetSection: 'security',
      }),
    ]);
  });

  it('keeps separate opening alerts when overlap metadata is absent', () => {
    const items = buildHomeStatusSummaryItems(
      new Map(
        [
          device({
            id: 'binary_sensor.any_window_open',
            type: 'sensors',
            deviceClass: 'opening',
            securityKind: 'opening',
            status: 'active',
            securitySeverity: 'warning',
          }),
          device({
            id: 'binary_sensor.window_left',
            type: 'sensors',
            deviceClass: 'window',
            securityKind: 'window',
            status: 'active',
            securitySeverity: 'warning',
          }),
        ].map((entry) => [entry.id, entry])
      )
    );

    expect(items).toEqual([
      expect.objectContaining({
        id: 'security',
        value: '2 Alerts',
        targetSection: 'security',
      }),
    ]);
  });

  it('builds room summary items from devices in the selected room only', () => {
    const items = buildRoomStatusSummaryItems(
      new Map(
        [
          device({ id: 'light.living_room', type: 'lights', room: 'Living Room', state: true }),
          device({ id: 'light.kitchen', type: 'lights', room: 'Kitchen', state: true }),
          device({
            id: 'sensor.living_room_power',
            type: 'sensors',
            room: 'Living Room',
            deviceClass: 'power',
            value: '418',
            unit: 'W',
          }),
          device({
            id: 'sensor.living_room_temperature',
            type: 'sensors',
            room: 'Living Room',
            deviceClass: 'temperature',
            value: '21.2',
          }),
          device({
            id: 'media_player.kitchen_speaker',
            type: 'media',
            room: 'Kitchen',
            state: 'playing',
          }),
        ].map((entry) => [entry.id, entry])
      ),
      'Living Room'
    );

    expect(items.map((item) => [item.id, item.value])).toEqual([
      ['energy', '418 W'],
      ['climate', '21°'],
      ['lights', '1 On'],
    ]);
  });

  it('only uses climate entities that exist in the room climate dashboard', () => {
    const temperature = device({
      id: 'sensor.living_room_temperature',
      type: 'sensors',
      room: 'Living Room',
      deviceClass: 'temperature',
      value: '21.2',
    });
    const items = buildRoomStatusSummaryItems(
      new Map([[temperature.id, temperature]]),
      'Living Room',
      { climateEntityIds: new Set() }
    );

    expect(items).toEqual([]);
  });

  it('uses ambient climate readings instead of thermostat targets in the climate summary', () => {
    const items = buildHomeStatusSummaryItems(
      new Map(
        [
          device({
            id: 'climate.hallway',
            type: 'climate',
            currentTemperature: 20,
            temperature: 60.1,
            mode: 'heat',
          }),
        ].map((entry) => [entry.id, entry])
      )
    );

    expect(items).toEqual([
      expect.objectContaining({
        id: 'climate',
        value: '20°',
        targetSection: 'climate',
      }),
    ]);
  });

  it('does not use target-only thermostat setpoints in the climate summary range', () => {
    const items = buildHomeStatusSummaryItems(
      new Map(
        [
          device({
            id: 'climate.living_room',
            type: 'climate',
            currentTemperature: 15,
            hasCurrentTemperature: false,
            temperature: 15,
            temperatureUnit: 'celsius',
            mode: 'heat',
          }),
          device({
            id: 'sensor.living_room_temperature',
            type: 'sensors',
            deviceClass: 'temperature',
            value: '20.1',
            unit: '°C',
          }),
        ].map((entry) => [entry.id, entry])
      ),
      { temperatureUnit: 'fahrenheit' }
    );

    expect(items).toEqual([
      expect.objectContaining({
        id: 'climate',
        value: '68°',
        targetSection: 'climate',
      }),
    ]);
  });

  it('does not treat unitless Fahrenheit climate readings as Celsius in the climate summary', () => {
    const items = buildHomeStatusSummaryItems(
      new Map(
        [
          device({
            id: 'climate.hallway',
            type: 'climate',
            currentTemperature: 75,
            temperature: 76,
            mode: 'cool',
          }),
        ].map((entry) => [entry.id, entry])
      ),
      { temperatureUnit: 'fahrenheit' }
    );

    expect(items).toEqual([
      expect.objectContaining({
        id: 'climate',
        value: '75°',
        targetSection: 'climate',
      }),
    ]);
  });

  it('ignores water-heater temperatures in the climate summary strip', () => {
    const items = buildHomeStatusSummaryItems(
      new Map(
        [
          device({
            id: 'climate.hallway',
            type: 'climate',
            currentTemperature: 20,
            temperature: 21,
            mode: 'heat',
          }),
          device({
            id: 'water_heater.boiler',
            type: 'climate',
            currentTemperature: 60.1,
            temperature: 60.1,
            mode: 'eco',
            serviceDomain: 'water_heater',
          }),
        ].map((entry) => [entry.id, entry])
      )
    );

    expect(items).toEqual([
      expect.objectContaining({
        id: 'climate',
        value: '20°',
        targetSection: 'climate',
      }),
    ]);
  });

  it('ignores boiler temperature sensors in the climate summary strip', () => {
    const items = buildHomeStatusSummaryItems(
      new Map(
        [
          device({
            id: 'sensor.living_room_temperature',
            type: 'sensors',
            deviceClass: 'temperature',
            value: '20',
            unit: '°C',
            name: 'Living Room Temperature',
          }),
          device({
            id: 'sensor.boiler_temperature',
            type: 'sensors',
            deviceClass: 'temperature',
            value: '60.1',
            unit: '°C',
            name: 'Boiler Temperature',
            room: 'Utility',
          }),
        ].map((entry) => [entry.id, entry])
      )
    );

    expect(items).toEqual([
      expect.objectContaining({
        id: 'climate',
        value: '20°',
        targetSection: 'climate',
      }),
    ]);
  });

  it('ignores processor and device temperature sensors in the climate summary strip', () => {
    const items = buildHomeStatusSummaryItems(
      new Map(
        [
          device({
            id: 'sensor.living_room_temperature',
            type: 'sensors',
            deviceClass: 'temperature',
            value: '20.1',
            unit: '°C',
            name: 'Living Room Temperature',
          }),
          device({
            id: 'sensor.system_monitor_processor_temperature',
            type: 'sensors',
            deviceClass: 'temperature',
            value: '59.5',
            unit: '°C',
            name: 'System Monitor Processor temperature',
          }),
          device({
            id: 'sensor.zigbee_device_temperature',
            type: 'sensors',
            deviceClass: 'temperature',
            value: '47',
            unit: '°C',
            name: 'Device temperature',
          }),
        ].map((entry) => [entry.id, entry])
      )
    );

    expect(items).toEqual([
      expect.objectContaining({
        id: 'climate',
        value: '20°',
        targetSection: 'climate',
      }),
    ]);
  });

  it('ignores outside temperature sensors in the climate summary strip', () => {
    const items = buildHomeStatusSummaryItems(
      new Map(
        [
          device({
            id: 'climate.hallway',
            type: 'climate',
            currentTemperature: 20,
            temperature: 21,
            temperatureUnit: 'celsius',
            mode: 'heat',
          }),
          device({
            id: 'sensor.outside_temperature',
            type: 'sensors',
            deviceClass: 'temperature',
            value: '60.08',
            unit: '°F',
            name: 'Outside Temperature',
            room: 'Outside',
          }),
        ].map((entry) => [entry.id, entry])
      )
    );

    expect(items).toEqual([
      expect.objectContaining({
        id: 'climate',
        value: '20°',
        targetSection: 'climate',
      }),
    ]);
  });
});
