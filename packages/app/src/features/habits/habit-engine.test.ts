import { integrationStore } from '@navet/app/stores/integration-store';
import { resetAppStores } from '@navet/app/test/store-reset';
import type { HabitRule } from '@navet/core/habits';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordHabitCommand } from './command-attribution';

const { dispatchEntityCommandMock } = vi.hoisted(() => ({
  dispatchEntityCommandMock: vi.fn().mockResolvedValue({
    accepted: true,
    requiresEventConfirmation: true,
  }),
}));

vi.mock('@navet/app/services/integration-action.service', () => ({
  dispatchEntityCommand: dispatchEntityCommandMock,
}));

import { initializeHabitEngine, stopHabitEngine } from './habit-engine';
import { useHabitStore } from './habit-store';

type ProviderEntitiesByCanonicalId = ReturnType<
  typeof integrationStore.getState
>['providerEntitiesByCanonicalId'];

function setEntities(state: Record<string, unknown>) {
  integrationStore.setState({
    providerEntitiesByCanonicalId: state as ProviderEntitiesByCanonicalId,
  });
}

async function flushAsyncWork() {
  for (let index = 0; index < 6; index += 1) {
    await Promise.resolve();
  }
}

function makeEntity(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'home_assistant:light.kitchen',
    canonicalId: 'home_assistant:light.kitchen',
    providerId: 'home_assistant',
    externalId: 'light.kitchen',
    type: 'light',
    name: 'Kitchen Light',
    room: 'Kitchen',
    primaryState: 'off',
    availability: 'available',
    attributes: {},
    capabilities: ['toggle'],
    lastUpdated: '2026-06-01T21:00:00.000Z',
    ...overrides,
  };
}

function makePowerSensorEntity(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'home_assistant:sensor.energy_now',
    canonicalId: 'home_assistant:sensor.energy_now',
    providerId: 'home_assistant',
    externalId: 'sensor.energy_now',
    type: 'sensor',
    name: 'Energy Now',
    room: 'Kitchen',
    primaryState: 400,
    availability: 'available',
    attributes: {
      device_class: 'power',
      unit_of_measurement: 'W',
    },
    capabilities: [],
    lastUpdated: '2026-06-01T21:00:00.000Z',
    ...overrides,
  };
}

function makePersonEntity(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'home_assistant:person.vishal',
    canonicalId: 'home_assistant:person.vishal',
    providerId: 'home_assistant',
    externalId: 'person.vishal',
    type: 'person',
    name: 'Vishal',
    room: undefined,
    primaryState: 'away',
    availability: 'available',
    attributes: {},
    capabilities: [],
    lastUpdated: '2026-06-01T21:00:00.000Z',
    ...overrides,
  };
}

function makeRule(overrides: Partial<HabitRule> = {}): HabitRule {
  return {
    id: 'rule-1',
    enabled: true,
    scope: 'navet_local',
    trigger: {
      days: [0],
      startMinute: 21 * 60,
      endMinute: 22 * 60,
      roomId: 'Kitchen',
      occupancy: 'any',
      presence: 'any',
    },
    action: {
      type: 'turn_on',
      entityIds: ['home_assistant:light.kitchen'],
    },
    safety: {
      allowDomains: ['light', 'switch'],
      requireUserCreated: true,
    },
    createdAt: '2026-06-01T20:00:00.000Z',
    updatedAt: '2026-06-01T20:00:00.000Z',
    ...overrides,
  };
}

describe('habit engine', () => {
  beforeEach(async () => {
    await resetAppStores();
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    dispatchEntityCommandMock.mockClear();
    stopHabitEngine();
    vi.useFakeTimers();
  });

  it('does not emit fake events from the initial baseline snapshot', async () => {
    initializeHabitEngine();

    setEntities({
      'home_assistant:light.kitchen': makeEntity(),
    });
    await flushAsyncWork();

    expect(useHabitStore.getState().events).toHaveLength(0);
  });

  it('collects one event after a real entity update even if initialized twice', async () => {
    initializeHabitEngine();
    initializeHabitEngine();

    setEntities({
      'home_assistant:light.kitchen': makeEntity(),
    });
    setEntities({
      'home_assistant:light.kitchen': makeEntity({
        primaryState: 'on',
        lastUpdated: '2026-06-01T21:05:00.000Z',
      }),
    });
    await flushAsyncWork();

    expect(useHabitStore.getState().events).toHaveLength(1);
  });

  it('does not collect presence-only changes', async () => {
    initializeHabitEngine();

    setEntities({
      'home_assistant:person.vishal': makePersonEntity(),
    });
    setEntities({
      'home_assistant:person.vishal': makePersonEntity({
        primaryState: 'home',
        lastUpdated: '2026-06-01T21:05:00.000Z',
      }),
    });
    await flushAsyncWork();

    expect(useHabitStore.getState().events).toHaveLength(0);
  });

  it('only collects high energy spikes for power sensors', async () => {
    initializeHabitEngine();

    setEntities({
      'home_assistant:sensor.energy_now': makePowerSensorEntity(),
    });
    setEntities({
      'home_assistant:sensor.energy_now': makePowerSensorEntity({
        primaryState: 900,
        lastUpdated: '2026-06-01T21:05:00.000Z',
      }),
    });
    setEntities({
      'home_assistant:sensor.energy_now': makePowerSensorEntity({
        primaryState: 1800,
        lastUpdated: '2026-06-01T21:06:00.000Z',
      }),
    });
    await flushAsyncWork();

    expect(useHabitStore.getState().events).toHaveLength(1);
    expect(useHabitStore.getState().events[0]?.action).toBe('energy_sampled');
    expect(useHabitStore.getState().events[0]?.currentState).toBe(1800);
  });

  it('marks matched recent commands as navet-sourced', async () => {
    initializeHabitEngine();
    vi.setSystemTime(new Date('2026-06-01T21:00:00'));

    setEntities({
      'home_assistant:light.kitchen': makeEntity(),
    });

    recordHabitCommand({
      type: 'turn_on',
      entityId: 'home_assistant:light.kitchen',
    });

    setEntities({
      'home_assistant:light.kitchen': makeEntity({
        primaryState: 'on',
        lastUpdated: new Date('2026-06-01T21:00:05').toISOString(),
      }),
    });
    await flushAsyncWork();

    expect(useHabitStore.getState().events[0]?.source).toBe('navet');
  });

  it('runs eligible local rules only once per day', async () => {
    initializeHabitEngine();
    await flushAsyncWork();

    setEntities({
      'home_assistant:light.kitchen': makeEntity({ primaryState: 'off' }),
    });

    await useHabitStore.getState().saveRule(makeRule());

    vi.setSystemTime(new Date('2026-06-07T21:05:00'));
    await vi.advanceTimersByTimeAsync(60_000);
    await vi.advanceTimersByTimeAsync(60_000);

    expect(dispatchEntityCommandMock).toHaveBeenCalledTimes(1);
    expect(useHabitStore.getState().rules[0]?.lastTriggeredAt).toBeTruthy();
  });

  it('does not run disabled or notify-only rules', async () => {
    initializeHabitEngine();
    await flushAsyncWork();

    setEntities({
      'home_assistant:light.kitchen': makeEntity({ primaryState: 'off' }),
    });

    await useHabitStore.getState().saveRule(
      makeRule({
        id: 'rule-disabled',
        enabled: false,
      })
    );
    await useHabitStore.getState().saveRule(
      makeRule({
        id: 'rule-notify',
        action: {
          type: 'notify',
          entityIds: ['home_assistant:light.kitchen'],
        },
      })
    );

    vi.setSystemTime(new Date('2026-06-07T21:05:00'));
    await vi.advanceTimersByTimeAsync(60_000);

    expect(dispatchEntityCommandMock).not.toHaveBeenCalled();
  });

  it('respects occupancy, presence, and lux guards before running a rule', async () => {
    initializeHabitEngine();
    await flushAsyncWork();

    setEntities({
      'home_assistant:light.kitchen': makeEntity({ primaryState: 'off' }),
      'home_assistant:binary_sensor.kitchen_motion': makeEntity({
        id: 'home_assistant:binary_sensor.kitchen_motion',
        canonicalId: 'home_assistant:binary_sensor.kitchen_motion',
        externalId: 'binary_sensor.kitchen_motion',
        type: 'binary_sensor',
        name: 'Kitchen Occupancy',
        primaryState: 'off',
      }),
      'home_assistant:sensor.kitchen_lux': makeEntity({
        id: 'home_assistant:sensor.kitchen_lux',
        canonicalId: 'home_assistant:sensor.kitchen_lux',
        externalId: 'sensor.kitchen_lux',
        type: 'sensor',
        name: 'Kitchen Lux',
        primaryState: 60,
        attributes: { unit_of_measurement: 'lx', device_class: 'illuminance' },
      }),
      'home_assistant:person.alex': makeEntity({
        id: 'home_assistant:person.alex',
        canonicalId: 'home_assistant:person.alex',
        externalId: 'person.alex',
        type: 'person',
        name: 'Alex',
        room: undefined,
        primaryState: 'away',
      }),
    });

    await useHabitStore.getState().saveRule(
      makeRule({
        trigger: {
          days: [0],
          startMinute: 21 * 60,
          endMinute: 22 * 60,
          roomId: 'Kitchen',
          occupancy: 'vacant',
          presence: 'home',
          luxBelow: 25,
        },
      })
    );

    vi.setSystemTime(new Date('2026-06-07T21:05:00'));
    await vi.advanceTimersByTimeAsync(60_000);

    expect(dispatchEntityCommandMock).not.toHaveBeenCalled();

    setEntities({
      'home_assistant:light.kitchen': makeEntity({ primaryState: 'off' }),
      'home_assistant:binary_sensor.kitchen_motion': makeEntity({
        id: 'home_assistant:binary_sensor.kitchen_motion',
        canonicalId: 'home_assistant:binary_sensor.kitchen_motion',
        externalId: 'binary_sensor.kitchen_motion',
        type: 'binary_sensor',
        name: 'Kitchen Occupancy',
        primaryState: 'off',
      }),
      'home_assistant:sensor.kitchen_lux': makeEntity({
        id: 'home_assistant:sensor.kitchen_lux',
        canonicalId: 'home_assistant:sensor.kitchen_lux',
        externalId: 'sensor.kitchen_lux',
        type: 'sensor',
        name: 'Kitchen Lux',
        primaryState: 10,
        attributes: { unit_of_measurement: 'lx', device_class: 'illuminance' },
      }),
      'home_assistant:person.alex': makeEntity({
        id: 'home_assistant:person.alex',
        canonicalId: 'home_assistant:person.alex',
        externalId: 'person.alex',
        type: 'person',
        name: 'Alex',
        room: undefined,
        primaryState: 'home',
      }),
    });
    vi.setSystemTime(new Date('2026-06-07T21:06:00'));
    await vi.advanceTimersByTimeAsync(60_000);

    expect(dispatchEntityCommandMock).toHaveBeenCalledTimes(1);
  });

  it('stops collecting events after shutdown', async () => {
    initializeHabitEngine();

    setEntities({
      'home_assistant:light.kitchen': makeEntity(),
    });
    await flushAsyncWork();

    stopHabitEngine();

    setEntities({
      'home_assistant:light.kitchen': makeEntity({
        primaryState: 'on',
        lastUpdated: '2026-06-01T21:05:00.000Z',
      }),
    });
    await flushAsyncWork();

    expect(useHabitStore.getState().events).toHaveLength(0);
  });
});
