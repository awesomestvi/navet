import { describe, expect, it } from 'vitest';
import type { PlatformRoomMutationStep } from './provider-feature-models';
import {
  createPlatformRoomMutationPlan,
  createProviderRoomManagementCapabilities,
} from './provider-room-management';

describe('provider room management', () => {
  it('normalizes provider-owned room management capabilities', () => {
    expect(
      createProviderRoomManagementCapabilities('homey', {
        discover: true,
      })
    ).toEqual({
      providerId: 'homey',
      discover: true,
      create: false,
      rename: false,
      assign: false,
      unassign: false,
      delete: false,
    });
  });

  it('creates a deterministic dependency-ordered mutation plan', () => {
    const steps: PlatformRoomMutationStep[] = [
      {
        stepId: 'move-light',
        operation: 'assign',
        entityId: 'home_assistant:light.kitchen',
        roomId: 'home_assistant:living_room',
      },
      {
        stepId: 'delete-kitchen',
        operation: 'delete',
        roomId: 'home_assistant:kitchen',
        dependsOn: ['move-light'],
      },
    ];

    const plan = createPlatformRoomMutationPlan('home_assistant', steps);
    steps[1].dependsOn?.push('later-change');

    expect(plan).toEqual({
      providerId: 'home_assistant',
      steps: [
        {
          stepId: 'move-light',
          operation: 'assign',
          entityId: 'home_assistant:light.kitchen',
          roomId: 'home_assistant:living_room',
          dependsOn: undefined,
        },
        {
          stepId: 'delete-kitchen',
          operation: 'delete',
          roomId: 'home_assistant:kitchen',
          dependsOn: ['move-light'],
        },
      ],
    });
  });

  it('rejects unsafe dependency graphs before execution', () => {
    expect(() =>
      createPlatformRoomMutationPlan('home_assistant', [
        {
          stepId: 'delete-kitchen',
          operation: 'delete',
          roomId: 'home_assistant:kitchen',
          dependsOn: ['move-light'],
        },
        {
          stepId: 'move-light',
          operation: 'assign',
          entityId: 'home_assistant:light.kitchen',
          roomId: 'home_assistant:living_room',
        },
      ])
    ).toThrow('depends on a missing or later step');
  });
});
