import type { DeviceWithType } from '@navet/app/types/device.types';
import type { NavetEntity } from '@navet/core/types';
import { describe, expect, it } from 'vitest';
import { buildLightDashboardModel } from '../light-dashboard-model';

function lightDevice(id: string, room: string, state = false, brightness = 0): DeviceWithType {
  return {
    id,
    name: id,
    room,
    state,
    brightness,
    temp: 4000,
    size: 'small',
    type: 'lights',
    providerId: 'home_assistant',
  };
}

function lightEntity(
  id: string,
  overrides: Partial<NavetEntity> & { brightnessPct?: number } = {}
): NavetEntity {
  const { brightnessPct, ...entityOverrides } = overrides;
  return {
    id,
    canonicalId: `home_assistant:${id}`,
    providerId: 'home_assistant',
    externalId: id,
    type: 'light',
    name: id,
    room: 'Kitchen',
    primaryState: 'off',
    availability: 'available',
    attributes: brightnessPct === undefined ? {} : { brightnessPct },
    capabilities: ['toggle', 'brightness'],
    ...entityOverrides,
  };
}

describe('buildLightDashboardModel', () => {
  it('counts active and unavailable lights and averages only active available dimmable lights', () => {
    const devices = [
      lightDevice('light.island', 'Kitchen'),
      lightDevice('light.sink', 'Kitchen'),
      lightDevice('light.corner', 'Kitchen'),
      lightDevice('light.porch', 'Outside'),
    ];
    const entities = [
      lightEntity('light.island', { primaryState: 'on', brightnessPct: 20 }),
      lightEntity('light.sink', { primaryState: 'on', brightnessPct: 80 }),
      lightEntity('light.corner', { availability: 'unavailable', brightnessPct: 100 }),
      lightEntity('light.porch', {
        room: 'Outside',
        primaryState: 'off',
        capabilities: ['toggle'],
      }),
    ];
    const model = buildLightDashboardModel({
      deviceMap: new Map(devices.map((device) => [device.id, device])),
      entities: Object.fromEntries(entities.map((entity) => [entity.canonicalId, entity])),
      rooms: ['Kitchen', 'Outside'],
      cardOrders: {},
    });

    expect(model).toMatchObject({
      totalCount: 4,
      activeCount: 2,
      activeRoomCount: 1,
      unavailableCount: 1,
    });
    expect(model.rooms[0]).toMatchObject({
      room: 'Kitchen',
      activeCount: 2,
      unavailableCount: 1,
      averageBrightness: 50,
      dimmableCount: 2,
    });
  });

  it('normalizes brightness and preserves explicit room and card order', () => {
    const first = lightDevice('light.first', 'Living room');
    const second = lightDevice('light.second', 'Living room');
    const model = buildLightDashboardModel({
      deviceMap: new Map([
        [first.id, first],
        [second.id, second],
      ]),
      entities: {
        'home_assistant:light.first': lightEntity('light.first', { brightnessPct: 140 }),
        'home_assistant:light.second': lightEntity('light.second', { brightnessPct: -12 }),
      },
      rooms: ['Living room'],
      cardOrders: { 'Living room': ['light.second', 'light.first'] },
    });

    expect(model.rooms[0]?.lights.map((light) => light.id)).toEqual([
      'light.second',
      'light.first',
    ]);
    expect(model.rooms[0]?.lights.map((light) => light.brightness)).toEqual([0, 100]);
  });

  it('reuses unrelated room summaries when one entity changes', () => {
    const kitchen = lightDevice('light.kitchen', 'Kitchen');
    const hall = lightDevice('light.hall', 'Hall');
    const deviceMap = new Map([
      [kitchen.id, kitchen],
      [hall.id, hall],
    ]);
    const first = buildLightDashboardModel({
      deviceMap,
      entities: {
        'home_assistant:light.kitchen': lightEntity('light.kitchen'),
        'home_assistant:light.hall': lightEntity('light.hall', { room: 'Hall' }),
      },
      rooms: ['Kitchen', 'Hall'],
      cardOrders: {},
    });
    const second = buildLightDashboardModel({
      deviceMap,
      entities: {
        'home_assistant:light.kitchen': lightEntity('light.kitchen', {
          primaryState: 'on',
          brightnessPct: 60,
        }),
        'home_assistant:light.hall': lightEntity('light.hall', { room: 'Hall' }),
      },
      rooms: ['Kitchen', 'Hall'],
      cardOrders: {},
      previous: first,
    });

    expect(second.rooms[0]).not.toBe(first.rooms[0]);
    expect(second.rooms[1]).toBe(first.rooms[1]);
  });

  it('keeps unassigned lights in an intentional final room and scales to large collections', () => {
    const devices = Array.from({ length: 240 }, (_, index) =>
      lightDevice(`light.${index}`, index === 239 ? '' : `Room ${index % 12}`)
    );
    const model = buildLightDashboardModel({
      deviceMap: new Map(devices.map((device) => [device.id, device])),
      entities: {},
      rooms: Array.from({ length: 12 }, (_, index) => `Room ${index}`),
      cardOrders: {},
    });

    expect(model.totalCount).toBe(240);
    expect(model.rooms).toHaveLength(13);
    expect(model.rooms.at(-1)).toMatchObject({ room: 'Unassigned', totalCount: 1 });
  });
});
