import { describe, expect, it } from 'vitest';
import { homeyService } from '@/app/services/homey.service';
import { resetAppStores } from '@/test/store-reset';
import { homeAssistantStore } from '../home-assistant-store';
import { integrationStore } from '../integration-store';
import { integrationSelectors } from '../selectors';

describe('integrationStore', () => {
  it('tracks provider health for Home Assistant and Homey', async () => {
    await resetAppStores();

    homeAssistantStore.setState({
      connected: true,
      connecting: false,
      reconnecting: false,
      error: null,
    });
    homeyService.replaceSnapshot({
      connected: true,
      devices: {},
      zones: {},
    });

    expect(integrationStore.getState().providerHealth.home_assistant).toMatchObject({
      providerId: 'home_assistant',
      connected: true,
      connecting: false,
      reconnecting: false,
    });
    expect(integrationStore.getState().providerHealth.homey).toMatchObject({
      providerId: 'homey',
      connected: true,
    });
  });

  it('resolves canonical entity ids through the shared integration store', async () => {
    await resetAppStores();

    homeAssistantStore.setState({
      entities: {
        'light.kitchen': {
          entity_id: 'light.kitchen',
          state: 'on',
          attributes: { friendly_name: 'Kitchen Light' },
          last_changed: '2024-01-01T00:00:00.000Z',
          last_updated: '2024-01-01T00:00:00.000Z',
          context: { id: 'ctx', parent_id: null, user_id: null },
        },
      },
    });

    const entity = integrationSelectors.entity('home_assistant:light.kitchen')(
      integrationStore.getState()
    );
    expect(entity?.attributes.friendly_name).toBe('Kitchen Light');
  });

  it('publishes canonical provider snapshots, devices, and rooms', async () => {
    await resetAppStores();

    homeAssistantStore.setState({
      connected: true,
      entities: {
        'light.kitchen': {
          entity_id: 'light.kitchen',
          state: 'on',
          attributes: { friendly_name: 'Kitchen Light', brightness: 255 },
          last_changed: '2024-01-01T00:00:00.000Z',
          last_updated: '2024-01-01T00:00:00.000Z',
          context: { id: 'ctx', parent_id: null, user_id: null },
        },
      },
    });
    homeyService.replaceSnapshot({
      connected: true,
      zones: {
        kitchen: { id: 'kitchen', name: 'Kitchen' },
      },
      devices: {
        'switch-1': {
          id: 'switch-1',
          name: 'Coffee Machine',
          class: 'socket',
          zone: 'kitchen',
          capabilitiesObj: {
            onoff: { value: false },
          },
        },
      },
    });

    expect(integrationStore.getState().providerSnapshots.home_assistant?.devices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonicalId: 'home_assistant:light.kitchen',
          kind: 'light',
          capabilities: expect.arrayContaining(['toggle', 'brightness']),
        }),
      ])
    );
    expect(integrationStore.getState().providerSnapshots.homey?.devices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonicalId: 'homey:switch-1',
          kind: 'switch',
          capabilities: ['toggle'],
        }),
      ])
    );
    expect(
      integrationStore.getState().devicesByCanonicalId['home_assistant:light.kitchen']
    ).toMatchObject({
      room: 'Unassigned',
    });
    expect(Object.values(integrationStore.getState().roomsByCanonicalId)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonicalId: 'home_assistant:unassigned',
          providerId: 'home_assistant',
        }),
        expect.objectContaining({
          canonicalId: 'homey:kitchen',
          providerId: 'homey',
          memberIds: ['homey:switch-1'],
        }),
      ])
    );
  });
});
