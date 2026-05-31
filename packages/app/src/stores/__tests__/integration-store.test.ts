import { homeyService } from '@navet/app/services/homey.service';
import { resetAppStores } from '@navet/app/test/store-reset';
import { describe, expect, it } from 'vitest';
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

  it('publishes canonical provider entities, collections, and rooms', async () => {
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
      integrationStore.getState().providerDeviceCollectionsByProviderId.home_assistant
    ).toMatchObject(
      expect.objectContaining({
        lights: expect.arrayContaining([
          expect.objectContaining({
            canonicalId: 'home_assistant:light.kitchen',
            room: 'Unassigned',
          }),
        ]),
      })
    );
    expect(integrationStore.getState().providerDeviceCollectionsByProviderId.homey).toMatchObject(
      expect.objectContaining({
        switches: expect.arrayContaining([
          expect.objectContaining({
            canonicalId: 'homey:switch-1',
            name: 'Coffee Machine',
            providerId: 'homey',
            room: 'Kitchen',
            state: false,
          }),
        ]),
      })
    );
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

  it('reuses unchanged provider slices when Home Assistant publishes an equivalent payload', async () => {
    await resetAppStores();

    const kitchenEntity = {
      entity_id: 'light.kitchen',
      state: 'on',
      attributes: { friendly_name: 'Kitchen Light', brightness: 255 },
      last_changed: '2024-01-01T00:00:00.000Z',
      last_updated: '2024-01-01T00:00:00.000Z',
      context: { id: 'ctx', parent_id: null, user_id: null },
    };

    homeAssistantStore.setState({
      connected: true,
      areas: [{ area_id: 'kitchen', name: 'Kitchen' }],
      entities: {
        'light.kitchen': kitchenEntity,
      },
    });
    homeyService.replaceSnapshot({
      connected: true,
      devices: {},
      zones: {
        kitchen: { id: 'kitchen', name: 'Kitchen' },
      },
    });

    const previousState = integrationStore.getState();
    const previousEntity =
      previousState.providerEntitiesByCanonicalId['home_assistant:light.kitchen'];
    const previousView =
      previousState.providerEntityViewsByCanonicalId['home_assistant:light.kitchen'];
    const previousRoomDescriptors = previousState.roomDescriptors;
    const previousHomeyCollection = previousState.providerDeviceCollectionsByProviderId.homey;

    homeAssistantStore.setState({
      connected: true,
      areas: [{ area_id: 'kitchen', name: 'Kitchen' }],
      entities: {
        'light.kitchen': {
          ...kitchenEntity,
          attributes: { friendly_name: 'Kitchen Light', brightness: 255 },
        },
      },
    });

    const nextState = integrationStore.getState();

    expect(nextState.providerEntitiesByCanonicalId['home_assistant:light.kitchen']).toBe(
      previousEntity
    );
    expect(nextState.providerEntityViewsByCanonicalId['home_assistant:light.kitchen']).toBe(
      previousView
    );
    expect(nextState.roomDescriptors).toBe(previousRoomDescriptors);
    expect(nextState.providerDeviceCollectionsByProviderId.homey).toBe(previousHomeyCollection);
  });

  it('updates only changed derived entries for Home Assistant entities', async () => {
    await resetAppStores();

    homeAssistantStore.setState({
      connected: true,
      entities: {
        'light.kitchen': {
          entity_id: 'light.kitchen',
          state: 'off',
          attributes: { friendly_name: 'Kitchen Light' },
          last_changed: '2024-01-01T00:00:00.000Z',
          last_updated: '2024-01-01T00:00:00.000Z',
          context: { id: 'ctx-1', parent_id: null, user_id: null },
        },
        'light.hall': {
          entity_id: 'light.hall',
          state: 'on',
          attributes: { friendly_name: 'Hall Light', brightness: 200 },
          last_changed: '2024-01-01T00:00:00.000Z',
          last_updated: '2024-01-01T00:00:00.000Z',
          context: { id: 'ctx-2', parent_id: null, user_id: null },
        },
      },
    });

    const previousState = integrationStore.getState();
    const previousKitchenEntity =
      previousState.providerEntitiesByCanonicalId['home_assistant:light.kitchen'];
    const previousHallEntity =
      previousState.providerEntitiesByCanonicalId['home_assistant:light.hall'];
    const previousKitchenView =
      previousState.providerEntityViewsByCanonicalId['home_assistant:light.kitchen'];
    const previousHallView =
      previousState.providerEntityViewsByCanonicalId['home_assistant:light.hall'];

    homeAssistantStore.setState({
      connected: true,
      entities: {
        'light.kitchen': {
          entity_id: 'light.kitchen',
          state: 'on',
          attributes: { friendly_name: 'Kitchen Light', brightness: 255 },
          last_changed: '2024-01-01T00:00:00.000Z',
          last_updated: '2024-01-01T00:05:00.000Z',
          context: { id: 'ctx-1', parent_id: null, user_id: null },
        },
        'light.hall': {
          entity_id: 'light.hall',
          state: 'on',
          attributes: { friendly_name: 'Hall Light', brightness: 200 },
          last_changed: '2024-01-01T00:00:00.000Z',
          last_updated: '2024-01-01T00:00:00.000Z',
          context: { id: 'ctx-2', parent_id: null, user_id: null },
        },
      },
    });

    const nextState = integrationStore.getState();

    expect(nextState.providerEntitiesByCanonicalId['home_assistant:light.kitchen']).not.toBe(
      previousKitchenEntity
    );
    expect(nextState.providerEntityViewsByCanonicalId['home_assistant:light.kitchen']).not.toBe(
      previousKitchenView
    );
    expect(nextState.providerEntitiesByCanonicalId['home_assistant:light.hall']).toBe(
      previousHallEntity
    );
    expect(nextState.providerEntityViewsByCanonicalId['home_assistant:light.hall']).toBe(
      previousHallView
    );
  });
});
