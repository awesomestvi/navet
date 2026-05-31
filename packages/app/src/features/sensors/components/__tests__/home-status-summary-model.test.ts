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
      ['routines', '1 Routine', 'tasks'],
    ]);
  });

  it('can use the task routine count so automations are included with scenes and scripts', () => {
    const scene = device({ id: 'scene.goodnight', type: 'scenes' });
    const items = buildHomeStatusSummaryItems(new Map([[scene.id, scene]]), { routineCount: 4 });

    expect(items).toEqual([
      expect.objectContaining({
        id: 'routines',
        value: '4 Routines',
        targetSection: 'tasks',
      }),
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

  it('ignores inactive scenes and scripts when no task routine count is provided', () => {
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

  it('can include room-scoped automation routines in room summaries', () => {
    const items = buildRoomStatusSummaryItems(new Map(), 'Kitchen', { routineCount: 2 });

    expect(items).toEqual([
      expect.objectContaining({
        id: 'routines',
        value: '2 Routines',
        targetSection: 'tasks',
      }),
    ]);
  });
});
