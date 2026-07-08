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
  })),
  saveAutomationConfigMock: vi.fn(async () => undefined),
  subscribeStoreMock: vi.fn(() => () => undefined),
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
