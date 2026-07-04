import type { NavetEntity } from '@navet/core/types';
import { describe, expect, it } from 'vitest';
import { applyPreviewCommandToEntity } from './preview-command-model';

function createEntity(overrides: Partial<NavetEntity> = {}): NavetEntity {
  return {
    id: 'home_assistant:light.living_room',
    canonicalId: 'home_assistant:light.living_room',
    providerId: 'home_assistant',
    externalId: 'light.living_room',
    type: 'light',
    name: 'Living Room',
    room: 'Living Room',
    primaryState: 'on',
    availability: 'available',
    attributes: {
      value: 'on',
      brightnessPct: 60,
    },
    capabilities: [],
    ...overrides,
  };
}

describe('applyPreviewCommandToEntity', () => {
  it('applies light brightness commands through the preview command model', () => {
    const entity = applyPreviewCommandToEntity(createEntity(), {
      type: 'set_brightness',
      entityId: 'home_assistant:light.living_room',
      brightness: 24,
    });

    expect(entity.primaryState).toBe('on');
    expect(entity.attributes).toEqual(
      expect.objectContaining({
        value: 'on',
        brightnessPct: 24,
      })
    );
  });

  it('uses boolean state for switch-like preview entities', () => {
    const entity = applyPreviewCommandToEntity(
      createEntity({
        id: 'home_assistant:switch.desk_power',
        canonicalId: 'home_assistant:switch.desk_power',
        externalId: 'switch.desk_power',
        type: 'switch',
        primaryState: true,
        attributes: { value: true },
      }),
      {
        type: 'turn_off',
        entityId: 'home_assistant:switch.desk_power',
      }
    );

    expect(entity.primaryState).toBe(false);
    expect(entity.attributes.value).toBe(false);
  });

  it('maps lock commands to preview lock attributes', () => {
    const entity = applyPreviewCommandToEntity(
      createEntity({
        id: 'home_assistant:lock.front_door',
        canonicalId: 'home_assistant:lock.front_door',
        externalId: 'lock.front_door',
        type: 'lock',
        primaryState: 'unlocked',
        attributes: { value: 'unlocked', locked: false },
      }),
      {
        type: 'lock',
        entityId: 'home_assistant:lock.front_door',
      }
    );

    expect(entity.primaryState).toBe('locked');
    expect(entity.attributes).toEqual(
      expect.objectContaining({
        value: 'locked',
        locked: true,
      })
    );
  });
});
