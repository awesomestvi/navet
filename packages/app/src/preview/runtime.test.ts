import { getProviderRuntimeRegistration } from '@navet/app/provider-runtime-registry';
import { integrationStore } from '@navet/app/stores/integration-store';
import { afterEach, describe, expect, it } from 'vitest';
import { maybeDispatchPreviewCommand } from './preview-action-bridge';
import {
  createPreviewLightEntity,
  createPreviewStoryScenario,
  getPreviewDeviceCollection,
  getPreviewRuntimeScenario,
  installPreviewRuntime,
  replacePreviewEntity,
  resetPreviewRuntime,
} from './runtime';

describe('preview runtime', () => {
  afterEach(() => {
    resetPreviewRuntime();
  });

  it('hydrates the integration store from the preview scenario', () => {
    installPreviewRuntime(getPreviewRuntimeScenario('default'));

    const state = integrationStore.getState();
    const helperCollection = state.providerDeviceCollectionsByProviderId.home_assistant?.helpers;

    expect(state.currentProviderId).toBe('home_assistant');
    expect(state.selectedProviderIds).toEqual(['home_assistant']);
    expect(helperCollection).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'home_assistant:input_boolean.guest_mode',
        }),
      ])
    );
  });

  it('routes provider commands through the preview adapter', async () => {
    installPreviewRuntime(getPreviewRuntimeScenario('default'));

    const adapter = getProviderRuntimeRegistration('home_assistant').providerContractAdapter;

    await adapter.execute({
      type: 'turn_off',
      entityId: 'home_assistant:light.living_room',
    });

    const nextEntity =
      integrationStore.getState().providerEntitiesByProviderId.home_assistant?.[
        'home_assistant:light.living_room'
      ];

    expect(nextEntity?.primaryState).toBe('off');
    expect(nextEntity?.attributes.value).toBe('off');
  });

  it('shares normalized light brightness with compatibility reads after an acknowledged edit', async () => {
    const light = createPreviewLightEntity('light.living_room', { brightnessPct: 72 });
    installPreviewRuntime(replacePreviewEntity(createPreviewStoryScenario(), light));
    const registration = getProviderRuntimeRegistration('home_assistant');
    const snapshots = registration.entityRuntimeService;
    expect(snapshots?.getEntitySnapshot?.('light.living_room')?.attributes.brightness_pct).toBe(72);
    let notifications = 0;
    const unsubscribe = snapshots?.subscribeEntitySnapshot?.(
      'light.living_room',
      () => notifications++
    );
    const previousRuntime = document.documentElement.dataset.navetPreviewRuntime;
    document.documentElement.dataset.navetPreviewRuntime = 'storybook';
    try {
      expect(
        await maybeDispatchPreviewCommand({
          type: 'set_brightness',
          entityId: light.canonicalId,
          brightness: 71,
        })
      ).toMatchObject({ accepted: true });
    } finally {
      if (previousRuntime === undefined)
        delete document.documentElement.dataset.navetPreviewRuntime;
      else document.documentElement.dataset.navetPreviewRuntime = previousRuntime;
    }
    expect(notifications).toBeGreaterThan(0);
    expect(snapshots?.getEntitySnapshot?.('light.living_room')?.attributes.brightness_pct).toBe(71);
    expect(
      integrationStore.getState().providerEntitiesByCanonicalId[light.canonicalId]?.attributes
        .brightnessPct
    ).toBe(71);
    unsubscribe?.();
    installPreviewRuntime(replacePreviewEntity(createPreviewStoryScenario(), light));
    expect(
      getProviderRuntimeRegistration('home_assistant').entityRuntimeService?.getEntitySnapshot?.(
        'light.living_room'
      )?.attributes.brightness_pct
    ).toBe(72);
  });

  it('retains the on/off-only preview light capability without synthetic dimming attributes', () => {
    const light = createPreviewLightEntity('light.living_room');
    light.attributes = { supportedColorModes: ['onoff'] };
    light.capabilities = ['toggle'];
    installPreviewRuntime(replacePreviewEntity(createPreviewStoryScenario(), light));
    const snapshot = getProviderRuntimeRegistration(
      'home_assistant'
    ).entityRuntimeService?.getEntitySnapshot?.(light.externalId);
    expect(snapshot?.attributes.supported_color_modes).toEqual(['onoff']);
    expect(snapshot?.attributes.brightness_pct).toBeUndefined();
    expect(snapshot?.attributes.color_temp_kelvin).toBeUndefined();
  });

  it('provides deterministic media browsing for isolated previews', async () => {
    installPreviewRuntime(getPreviewRuntimeScenario('default'));

    const mediaService = getProviderRuntimeRegistration('home_assistant').mediaFeatureService;
    const library = await mediaService?.browseMediaPlayer('media_player.living_room_speaker');
    const recentlyPlayed = await mediaService?.browseMediaPlayer(
      'media_player.living_room_speaker',
      { mediaContentId: 'preview:recently-played', mediaContentType: 'track' }
    );

    expect(library?.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Recently played', canExpand: true }),
      ])
    );
    expect(recentlyPlayed?.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Olalla',
          artist: 'Blanco White',
          album: 'On the Other Side',
        }),
      ])
    );
  });

  it('retains a demo temperature adjustment in the provider snapshot', async () => {
    installPreviewRuntime(getPreviewRuntimeScenario('demo'));
    const climate = getProviderRuntimeRegistration('home_assistant').climateFeatureService;
    expect(climate).toBeDefined();
    if (!climate) throw new Error('Expected preview climate service');
    await climate.setTargetTemperature('climate.main_floor', {
      serviceDomain: 'climate',
      temperature: 22.5,
    });
    const entity =
      integrationStore.getState().providerEntitiesByProviderId.home_assistant?.[
        'home_assistant:climate.main_floor'
      ];
    expect(entity?.attributes.temperature).toBe(22.5);
    expect(entity?.attributes.currentTemperature).toBe(21);
  });

  it('provides artwork for the featured demo media card', () => {
    const devices = getPreviewDeviceCollection(getPreviewRuntimeScenario('demo'));
    const featuredSpeaker = devices.media.find((device) =>
      device.id.endsWith('media_player.living_room_speaker')
    );

    expect(featuredSpeaker?.entityPicture).toContain('artworks-original');
  });

  it('provides staggered security history for realistic activity previews', async () => {
    installPreviewRuntime(getPreviewRuntimeScenario('demo'));

    const historyService = getProviderRuntimeRegistration('home_assistant').historyFeatureService;
    const histories = await historyService?.getEntityHistories?.({
      entityIds: ['binary_sensor.driveway_motion', 'lock.front_door', 'sensor.temperature'],
      startTime: '2026-08-25T10:00:00.000Z',
      endTime: '2026-08-25T12:00:00.000Z',
    });

    expect(histories).toEqual([
      {
        entityId: 'binary_sensor.driveway_motion',
        points: [
          { state: 'off', changedAt: '2026-08-25T11:50:00.000Z' },
          { state: 'on', changedAt: '2026-08-25T11:52:00.000Z' },
        ],
      },
      {
        entityId: 'lock.front_door',
        points: [
          { state: 'unlocked', changedAt: '2026-08-25T10:38:00.000Z' },
          { state: 'locked', changedAt: '2026-08-25T10:48:00.000Z' },
        ],
      },
      { entityId: 'sensor.temperature', points: [] },
    ]);
  });
});
