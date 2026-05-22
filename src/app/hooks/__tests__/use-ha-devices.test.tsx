import type { HassEntity } from 'home-assistant-js-websocket';
import { describe, expect, it } from 'vitest';
import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import { renderHookWithProviders } from '@/test/render';
import { resetAppStores } from '@/test/store-reset';
import { useHADevices } from '../use-ha-devices';

function createEntity(
  entityId: string,
  state: string,
  attributes: Record<string, unknown> = {}
): HassEntity {
  return {
    entity_id: entityId,
    state,
    attributes,
    last_changed: '2026-05-17T00:00:00.000Z',
    last_updated: '2026-05-17T00:00:00.000Z',
    context: { id: 'ctx', parent_id: null, user_id: null },
  } as HassEntity;
}

describe('useHADevices', () => {
  it('maps Home Assistant fan entities as addable fan devices', async () => {
    await resetAppStores();
    homeAssistantStore.setState({
      entities: {
        'fan.hallway': createEntity('fan.hallway', 'on', {
          friendly_name: 'Hallway Fan',
          percentage: 50,
        }),
      },
      entityRegistry: [{ entity_id: 'fan.hallway', area_id: 'hallway' }],
      areas: [{ area_id: 'hallway', name: 'Hallway' }],
    });

    const { result } = renderHookWithProviders(() => useHADevices());

    expect(result.current.fans).toEqual([
      expect.objectContaining({
        id: 'fan.hallway',
        name: 'Hallway Fan',
        room: 'Hallway',
        state: true,
        percentage: 50,
      }),
    ]);
    expect(result.current.switches).toEqual([]);
  });
});
