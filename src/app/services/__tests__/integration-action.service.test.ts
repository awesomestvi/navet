import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NavetCommand } from '@/providers/core/types';

const { callServiceMock } = vi.hoisted(() => ({
  callServiceMock: vi.fn(),
}));

const { homeyCallServiceMock } = vi.hoisted(() => ({
  homeyCallServiceMock: vi.fn(),
}));

function getDomain(entityId: string) {
  const nativeId = entityId.replace(/^[^:]+:/, '');
  return nativeId.includes('.') ? nativeId.split('.', 1)[0] || 'homeassistant' : 'switch';
}

vi.mock('../home-assistant.service', () => ({
  homeAssistantService: {
    callService: callServiceMock,
  },
}));

vi.mock('../homey.service', () => ({
  homeyService: {
    callService: homeyCallServiceMock,
  },
}));

vi.mock('@/providers/provider-contract-registry', () => ({
  getRegisteredSmartHomeProviderAdapter: (providerId: 'home_assistant' | 'homey') => ({
    async connect() {},
    async disconnect() {},
    async listEntities() {
      return [];
    },
    async getEntity() {
      return null;
    },
    async execute(command: NavetCommand) {
      const nativeEntityId = command.entityId.replace(/^[^:]+:/, '');
      const serviceCaller = providerId === 'homey' ? homeyCallServiceMock : callServiceMock;

      if (command.type === 'turn_on' || command.type === 'turn_off') {
        await serviceCaller(
          getDomain(command.entityId),
          command.type,
          {},
          { entity_id: nativeEntityId }
        );
      }

      if (command.type === 'set_fan_speed') {
        await serviceCaller(
          'fan',
          'set_percentage',
          { percentage: command.percentage },
          {
            entity_id: nativeEntityId,
          }
        );
      }

      if (command.type === 'play_pause') {
        await serviceCaller('media_player', 'media_play_pause', {}, { entity_id: nativeEntityId });
      }

      if (command.type === 'previous_track') {
        await serviceCaller(
          'media_player',
          'media_previous_track',
          {},
          {
            entity_id: nativeEntityId,
          }
        );
      }

      if (command.type === 'next_track') {
        await serviceCaller('media_player', 'media_next_track', {}, { entity_id: nativeEntityId });
      }

      if (command.type === 'set_volume') {
        await serviceCaller(
          'media_player',
          'volume_set',
          { volume_level: command.volume / 100 },
          {
            entity_id: nativeEntityId,
          }
        );
      }

      if (command.type === 'mute') {
        await serviceCaller(
          'media_player',
          'volume_mute',
          { is_volume_muted: true },
          {
            entity_id: nativeEntityId,
          }
        );
      }

      if (command.type === 'unmute') {
        await serviceCaller(
          'media_player',
          'volume_mute',
          { is_volume_muted: false },
          {
            entity_id: nativeEntityId,
          }
        );
      }

      if (command.type === 'return_home') {
        await serviceCaller('vacuum', 'return_to_base', {}, { entity_id: nativeEntityId });
      }

      if (command.type === 'set_shuffle') {
        await serviceCaller(
          'media_player',
          'shuffle_set',
          { shuffle: command.shuffle },
          {
            entity_id: nativeEntityId,
          }
        );
      }

      if (command.type === 'set_repeat_mode') {
        await serviceCaller(
          'media_player',
          'repeat_set',
          { repeat: command.repeatMode },
          {
            entity_id: nativeEntityId,
          }
        );
      }

      if (command.type === 'join_group') {
        await serviceCaller(
          'media_player',
          'join',
          { group_members: command.members },
          {
            entity_id: nativeEntityId,
          }
        );
      }

      if (command.type === 'leave_group') {
        await serviceCaller('media_player', 'unjoin', {}, { entity_id: nativeEntityId });
      }

      if (command.type === 'set_climate_mode') {
        const isWaterHeater = nativeEntityId.startsWith('water_heater.');
        await serviceCaller(
          isWaterHeater ? 'water_heater' : 'climate',
          isWaterHeater ? 'set_operation_mode' : 'set_hvac_mode',
          isWaterHeater ? { operation_mode: command.mode } : { hvac_mode: command.mode },
          { entity_id: nativeEntityId }
        );
      }

      return {
        accepted: true,
        requiresEventConfirmation: true,
      };
    },
    async subscribeToEvents() {
      return () => {};
    },
  }),
}));

describe('integration-action.service', () => {
  beforeEach(() => {
    callServiceMock.mockReset();
    homeyCallServiceMock.mockReset();
  });

  it('dispatches provider-neutral commands through the Home Assistant adapter', async () => {
    const { dispatchEntityCommand } = await import('../integration-action.service');

    await dispatchEntityCommand({
      type: 'turn_on',
      entityId: 'light.kitchen',
    });

    expect(callServiceMock).toHaveBeenCalledWith(
      'light',
      'turn_on',
      {},
      { entity_id: 'light.kitchen' }
    );
  });

  it('dispatches provider-neutral media commands through the Home Assistant adapter', async () => {
    const { dispatchEntityCommand } = await import('../integration-action.service');

    await dispatchEntityCommand({
      type: 'play_pause',
      entityId: 'media_player.living_room',
    });

    expect(callServiceMock).toHaveBeenCalledWith(
      'media_player',
      'media_play_pause',
      {},
      { entity_id: 'media_player.living_room' }
    );
  });

  it('dispatches provider-neutral media volume commands through the Home Assistant adapter', async () => {
    const { dispatchEntityCommand } = await import('../integration-action.service');

    await dispatchEntityCommand({
      type: 'set_volume',
      entityId: 'media_player.living_room',
      volume: 45,
    });

    expect(callServiceMock).toHaveBeenCalledWith(
      'media_player',
      'volume_set',
      { volume_level: 0.45 },
      { entity_id: 'media_player.living_room' }
    );
  });

  it('dispatches provider-neutral media shuffle and repeat commands through the Home Assistant adapter', async () => {
    const { dispatchEntityCommand } = await import('../integration-action.service');

    await dispatchEntityCommand({
      type: 'set_shuffle',
      entityId: 'media_player.living_room',
      shuffle: true,
    });
    await dispatchEntityCommand({
      type: 'set_repeat_mode',
      entityId: 'media_player.living_room',
      repeatMode: 'all',
    });

    expect(callServiceMock).toHaveBeenNthCalledWith(
      1,
      'media_player',
      'shuffle_set',
      { shuffle: true },
      { entity_id: 'media_player.living_room' }
    );
    expect(callServiceMock).toHaveBeenNthCalledWith(
      2,
      'media_player',
      'repeat_set',
      { repeat: 'all' },
      { entity_id: 'media_player.living_room' }
    );
  });

  it('dispatches provider-neutral media grouping commands through the Home Assistant adapter', async () => {
    const { dispatchEntityCommand } = await import('../integration-action.service');

    await dispatchEntityCommand({
      type: 'join_group',
      entityId: 'media_player.kitchen',
      members: ['media_player.living_room'],
    });
    await dispatchEntityCommand({
      type: 'leave_group',
      entityId: 'media_player.living_room',
    });

    expect(callServiceMock).toHaveBeenNthCalledWith(
      1,
      'media_player',
      'join',
      { group_members: ['media_player.living_room'] },
      { entity_id: 'media_player.kitchen' }
    );
    expect(callServiceMock).toHaveBeenNthCalledWith(
      2,
      'media_player',
      'unjoin',
      {},
      { entity_id: 'media_player.living_room' }
    );
  });

  it('dispatches provider-neutral vacuum return-home commands through the Home Assistant adapter', async () => {
    const { dispatchEntityCommand } = await import('../integration-action.service');

    await dispatchEntityCommand({
      type: 'return_home',
      entityId: 'vacuum.roborock',
    });

    expect(callServiceMock).toHaveBeenCalledWith(
      'vacuum',
      'return_to_base',
      {},
      { entity_id: 'vacuum.roborock' }
    );
  });

  it('dispatches provider-neutral climate mode commands through the Home Assistant adapter', async () => {
    const { dispatchEntityCommand } = await import('../integration-action.service');

    await dispatchEntityCommand({
      type: 'set_climate_mode',
      entityId: 'climate.hallway',
      mode: 'cool',
    });
    await dispatchEntityCommand({
      type: 'set_climate_mode',
      entityId: 'water_heater.boiler',
      mode: 'performance',
    });

    expect(callServiceMock).toHaveBeenNthCalledWith(
      1,
      'climate',
      'set_hvac_mode',
      { hvac_mode: 'cool' },
      { entity_id: 'climate.hallway' }
    );
    expect(callServiceMock).toHaveBeenNthCalledWith(
      2,
      'water_heater',
      'set_operation_mode',
      { operation_mode: 'performance' },
      { entity_id: 'water_heater.boiler' }
    );
  });

  it('dispatches provider-neutral commands through the Homey adapter', async () => {
    const { dispatchEntityCommand } = await import('../integration-action.service');

    await dispatchEntityCommand(
      {
        type: 'turn_off',
        entityId: 'homey:device-1',
      },
      'homey'
    );

    expect(homeyCallServiceMock).toHaveBeenCalledWith(
      'switch',
      'turn_off',
      {},
      {
        entity_id: 'device-1',
      }
    );
  });

  it('dispatches provider-neutral fan-speed commands through the Home Assistant adapter', async () => {
    const { dispatchEntityCommand } = await import('../integration-action.service');

    await dispatchEntityCommand({
      type: 'set_fan_speed',
      entityId: 'fan.ceiling_fan',
      percentage: 66,
    });

    expect(callServiceMock).toHaveBeenCalledWith(
      'fan',
      'set_percentage',
      { percentage: 66 },
      { entity_id: 'fan.ceiling_fan' }
    );
  });
});
