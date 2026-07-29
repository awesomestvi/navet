import type { HabitRule } from '@navet/core/habits';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const bridgeMocks = vi.hoisted(() => ({
  callServiceMock: vi.fn(async () => undefined),
  getAutomationConfigMock: vi.fn(async () => ({ config: {} })),
  getStoreStateMock: vi.fn(() => ({
    connected: true,
    entities: null,
    areas: [],
    deviceRegistry: [],
    entityRegistry: [],
    automationCategories: [],
  })),
  saveAutomationConfigMock: vi.fn(async () => undefined),
  subscribeStoreMock: vi.fn((_listener: () => void) => () => undefined),
}));

vi.mock('./homeassistant-service-bridge', () => ({
  callHomeAssistantService: bridgeMocks.callServiceMock,
  getHomeAssistantAutomationConfig: bridgeMocks.getAutomationConfigMock,
  getHomeAssistantStoreState: bridgeMocks.getStoreStateMock,
  saveHomeAssistantAutomationConfig: bridgeMocks.saveAutomationConfigMock,
  subscribeHomeAssistantStore: bridgeMocks.subscribeStoreMock,
}));

import { homeAssistantTaskFeatureService } from './homeassistant-task-feature.service';

function createHabitRule(overrides: Partial<HabitRule> = {}) {
  return {
    id: 'habit-rule:morning-lights',
    sourceCandidateId: 'habit-candidate:morning-lights',
    enabled: true,
    scope: 'navet_local',
    trigger: {
      days: [1, 2, 3, 4, 5],
      startMinute: 420,
      endMinute: 480,
    },
    action: {
      type: 'turn_on',
      entityIds: ['light.kitchen', 'switch.coffee'],
    },
    safety: {
      allowDomains: ['light', 'switch'],
      requireUserCreated: true,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } satisfies HabitRule;
}

describe('homeAssistantTaskFeatureService', () => {
  beforeEach(() => {
    bridgeMocks.saveAutomationConfigMock.mockClear();
    bridgeMocks.subscribeStoreMock.mockClear();
  });

  it('resolves automation category names from Home Assistant registries', () => {
    bridgeMocks.getStoreStateMock.mockReturnValueOnce({
      connected: true,
      entities: {
        'automation.morning': {
          entity_id: 'automation.morning',
          state: 'on',
          attributes: { friendly_name: 'Morning routine' },
          last_changed: '2026-01-01T00:00:00.000Z',
          last_reported: '2026-01-01T00:00:00.000Z',
          last_updated: '2026-01-01T00:00:00.000Z',
          context: { id: 'context-id', parent_id: null, user_id: null },
        },
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [
        {
          entity_id: 'automation.morning',
          categories: { automation: 'morning-id' },
        },
      ],
      automationCategories: [{ category_id: 'morning-id', name: 'Morning' }],
    } as never);

    expect(homeAssistantTaskFeatureService.getTaskRuntimeSnapshot().entityReferences).toEqual([
      expect.objectContaining({
        entityId: 'automation.morning',
        category: 'Morning',
      }),
    ]);
  });

  it('keeps the task snapshot stable when only a dependency entity changes', () => {
    const automationEntity = {
      entity_id: 'automation.morning',
      state: 'on',
      attributes: { friendly_name: 'Morning routine' },
      last_changed: '2026-01-01T00:00:00.000Z',
      last_reported: '2026-01-01T00:00:00.000Z',
      last_updated: '2026-01-01T00:00:00.000Z',
      context: { id: 'automation-context', parent_id: null, user_id: null },
    };
    const sensorEntity = {
      entity_id: 'sensor.temperature',
      state: '20',
      attributes: { friendly_name: 'Temperature' },
      last_changed: '2026-01-01T00:00:00.000Z',
      last_reported: '2026-01-01T00:00:00.000Z',
      last_updated: '2026-01-01T00:00:00.000Z',
      context: { id: 'sensor-context', parent_id: null, user_id: null },
    };
    const state: {
      connected: boolean;
      entities: Record<string, typeof automationEntity>;
      areas: never[];
      deviceRegistry: never[];
      entityRegistry: Array<{ entity_id: string }>;
      automationCategories: never[];
    } = {
      connected: true,
      entities: {
        'automation.morning': automationEntity,
        'sensor.temperature': sensorEntity,
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [{ entity_id: 'automation.morning' }],
      automationCategories: [],
    };
    bridgeMocks.getStoreStateMock.mockReturnValue(state as never);
    let storeListener: (() => void) | undefined;
    bridgeMocks.subscribeStoreMock.mockImplementationOnce((listener) => {
      storeListener = listener;
      return () => undefined;
    });
    const listener = vi.fn();

    const initialSnapshot = homeAssistantTaskFeatureService.getTaskRuntimeSnapshot();
    homeAssistantTaskFeatureService.subscribeTaskRuntimeSnapshot(listener);
    state.entities = {
      'automation.morning': {
        ...automationEntity,
        attributes: { ...automationEntity.attributes },
      },
      'sensor.temperature': {
        ...sensorEntity,
        state: '21',
      },
    };
    storeListener?.();

    expect(listener).not.toHaveBeenCalled();
    expect(
      homeAssistantTaskFeatureService.getTaskRuntimeSnapshot().entities?.['automation.morning']
    ).toBe(initialSnapshot.entities?.['automation.morning']);
    expect(
      homeAssistantTaskFeatureService.getTaskRuntimeSnapshot().entities?.['sensor.temperature']
    ).toBeUndefined();

    state.entities = {
      ...Object.fromEntries(
        Object.entries(state.entities).map(([entityId, entity]) => [
          entityId,
          { ...entity, attributes: { ...entity.attributes } },
        ])
      ),
      'automation.morning': {
        ...automationEntity,
        state: 'off',
      },
    };
    storeListener?.();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(
      homeAssistantTaskFeatureService.getTaskRuntimeSnapshot().entities?.['automation.morning']
        ?.state
    ).toBe('off');

    state.entities = {
      ...state.entities,
      'scene.arrival': {
        ...automationEntity,
        entity_id: 'scene.arrival',
        state: 'scening',
      },
    };
    storeListener?.();

    expect(listener).toHaveBeenCalledTimes(2);
    expect(
      homeAssistantTaskFeatureService.getTaskRuntimeSnapshot().entities?.['scene.arrival']?.state
    ).toBe('scening');

    const { 'scene.arrival': _removedScene, ...remainingEntities } = state.entities;
    state.entities = remainingEntities;
    storeListener?.();

    expect(listener).toHaveBeenCalledTimes(3);
    expect(
      homeAssistantTaskFeatureService.getTaskRuntimeSnapshot().entities?.['scene.arrival']
    ).toBeUndefined();
  });

  it('creates a Home Assistant automation config from a suggested habit rule', async () => {
    const rule = createHabitRule();

    await expect(
      homeAssistantTaskFeatureService.createAutomationFromHabitRule?.(rule, {
        name: 'Morning lights',
        description: 'Kitchen lights are usually turned on around breakfast.',
      })
    ).resolves.toEqual({
      automationId: 'navet_morning_lights',
      entityId: 'automation.navet_morning_lights',
    });

    expect(bridgeMocks.saveAutomationConfigMock).toHaveBeenCalledWith('navet_morning_lights', {
      alias: 'Morning lights',
      description: 'Kitchen lights are usually turned on around breakfast.',
      mode: 'single',
      triggers: [{ trigger: 'time', at: '07:00:00' }],
      conditions: [{ condition: 'time', weekday: ['mon', 'tue', 'wed', 'thu', 'fri'] }],
      actions: [
        {
          action: 'homeassistant.turn_on',
          target: {
            entity_id: ['light.kitchen', 'switch.coffee'],
          },
        },
      ],
    });
  });

  it('omits weekday conditions for every-day turn-off rules', async () => {
    const rule = createHabitRule({
      sourceCandidateId: 'habit-candidate:night-off',
      action: {
        type: 'turn_off',
        entityIds: ['light.kitchen'],
      },
      trigger: {
        days: [0, 1, 2, 3, 4, 5, 6],
        startMinute: 1380,
        endMinute: 1439,
      },
    });

    await expect(
      homeAssistantTaskFeatureService.createAutomationFromHabitRule?.(rule, {
        name: 'Night off',
      })
    ).resolves.toEqual({
      automationId: 'navet_night_off',
      entityId: 'automation.navet_night_off',
    });

    expect(bridgeMocks.saveAutomationConfigMock).toHaveBeenCalledWith(
      'navet_night_off',
      expect.objectContaining({
        conditions: [],
        actions: [
          {
            action: 'homeassistant.turn_off',
            target: {
              entity_id: ['light.kitchen'],
            },
          },
        ],
      })
    );
  });
});
