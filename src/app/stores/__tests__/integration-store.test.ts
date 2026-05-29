import { describe, expect, it } from 'vitest';
import { homeyService } from '@/app/services/homey.service';
import { resetAppStores } from '@/test/store-reset';
import { homeAssistantStore } from '../home-assistant-store';
import { integrationStore } from '../integration-store';
import { homeAssistantSelectors } from '../selectors';

describe('integrationStore', () => {
  it('tracks provider health for implemented providers', async () => {
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
      implementationStatus: 'implemented',
    });
    expect(integrationStore.getState().providerHealth.openhab).toMatchObject({
      providerId: 'openhab',
      connected: false,
      implementationStatus: 'implemented',
    });
    expect(integrationStore.getState().providerRuntime.home_assistant).toMatchObject({
      providerId: 'home_assistant',
      connected: true,
      connecting: false,
      reconnecting: false,
      entitiesHydrated: false,
      registriesHydrated: false,
    });
    expect(integrationStore.getState().providerRuntime.homey).toMatchObject({
      providerId: 'homey',
      connected: true,
      connecting: false,
      reconnecting: false,
      entitiesHydrated: false,
      registriesHydrated: true,
    });
    expect(integrationStore.getState().currentProviderId).toBe('home_assistant');
  });

  it('updates the active provider id separately from provider session snapshots', async () => {
    await resetAppStores();

    integrationStore.getState().setCurrentProviderId('homey');

    expect(integrationStore.getState().currentProviderId).toBe('homey');
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

    const entity = homeAssistantSelectors.entity('home_assistant:light.kitchen')(
      homeAssistantStore.getState()
    );
    expect(entity?.attributes.friendly_name).toBe('Kitchen Light');
  });

  it('publishes canonical provider snapshots, devices, and rooms', async () => {
    await resetAppStores();

    homeAssistantStore.setState({
      connected: true,
      areas: [{ area_id: 'kitchen', name: 'Kitchen' }],
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
      integrationStore.getState().providerEntitiesByCanonicalId['home_assistant:light.kitchen']
    ).toMatchObject({
      canonicalId: 'home_assistant:light.kitchen',
      externalId: 'light.kitchen',
      type: 'light',
      primaryState: 'on',
      capabilities: expect.arrayContaining(['toggle', 'brightness']),
    });
    expect(
      integrationStore.getState().providerEntityViewsByCanonicalId['home_assistant:light.kitchen']
    ).toMatchObject({
      canonicalId: 'home_assistant:light.kitchen',
      externalId: 'light.kitchen',
      type: 'light',
      size: 'small',
      attributes: expect.objectContaining({
        brightnessPct: 100,
      }),
    });
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
    expect(integrationStore.getState().roomDescriptors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Kitchen',
          providerIds: expect.arrayContaining(['home_assistant', 'homey']),
          sources: expect.arrayContaining([
            expect.objectContaining({
              providerId: 'home_assistant',
              nativeId: 'kitchen',
              sourceType: 'provider_managed',
              supportsOrdering: true,
              supportsDeletion: true,
            }),
            expect.objectContaining({
              providerId: 'homey',
              nativeId: 'kitchen',
              sourceType: 'provider_managed',
              supportsOrdering: true,
              supportsDeletion: false,
            }),
          ]),
        }),
        expect.objectContaining({
          name: 'Unassigned',
          sources: expect.arrayContaining([
            expect.objectContaining({
              providerId: 'home_assistant',
              sourceType: 'derived',
              supportsOrdering: false,
            }),
          ]),
        }),
      ])
    );
    expect(integrationStore.getState().providerRuntime.home_assistant).toMatchObject({
      entitiesHydrated: true,
      registriesHydrated: false,
    });
  });

  it('records provider-neutral entity events from provider adapter updates', async () => {
    await resetAppStores();

    homeAssistantStore.setState({
      entities: {
        'light.kitchen': {
          entity_id: 'light.kitchen',
          state: 'off',
          attributes: { friendly_name: 'Kitchen Light' },
          last_changed: '2024-01-01T00:00:00.000Z',
          last_updated: '2024-01-01T00:00:00.000Z',
          context: { id: 'ctx', parent_id: null, user_id: null },
        },
      },
    });

    homeAssistantStore.setState({
      entities: {
        'light.kitchen': {
          entity_id: 'light.kitchen',
          state: 'on',
          attributes: { friendly_name: 'Kitchen Light', brightness: 255 },
          last_changed: '2024-01-01T00:00:00.000Z',
          last_updated: '2024-01-01T00:05:00.000Z',
          context: { id: 'ctx', parent_id: null, user_id: null },
        },
      },
    });

    expect(integrationStore.getState().providerEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'entity_updated',
          providerId: 'home_assistant',
          entityId: 'home_assistant:light.kitchen',
        }),
      ])
    );
  });
});
