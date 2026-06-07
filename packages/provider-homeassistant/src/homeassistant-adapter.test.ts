import { createProviderScopedId } from '@navet/core/ids';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createHomeAssistantContractAdapter,
  createHomeAssistantProviderContract,
} from './homeassistant-adapter';
import { configureHomeAssistantServiceBridge } from './homeassistant-service-bridge';

function lightEntityFactory() {
  return {
    entity_id: 'light.kitchen',
    state: 'on',
    attributes: {
      friendly_name: 'Kitchen Light',
      brightness: 128,
      supported_color_modes: ['brightness'],
    },
    last_changed: '2026-05-30T10:00:00.000Z',
    last_updated: '2026-05-30T10:00:00.000Z',
    context: { id: 'ctx-1', parent_id: null, user_id: null },
  };
}

function alarmEntityFactory() {
  return {
    entity_id: 'alarm_control_panel.home',
    state: 'disarmed',
    attributes: {
      friendly_name: 'Home Alarm',
      supported_features: 1,
    },
    last_changed: '2026-05-30T10:00:00.000Z',
    last_updated: '2026-05-30T10:00:00.000Z',
    context: { id: 'ctx-2', parent_id: null, user_id: null },
  };
}

const { callHomeAssistantServiceMock, resolveArtworkMock } = vi.hoisted(() => ({
  callHomeAssistantServiceMock: vi.fn(async () => undefined),
  resolveArtworkMock: vi.fn(async (entityId: string) => ({
    id: entityId,
    kind: 'image' as const,
    cacheKey: entityId,
    authStrategy: 'none' as const,
  })),
}));

describe('homeassistant-adapter', () => {
  const connectMock = vi.fn(async () => undefined);
  const disconnectMock = vi.fn(async () => undefined);
  const syncPanelHassMock = vi.fn();

  beforeEach(() => {
    callHomeAssistantServiceMock.mockReset();
    resolveArtworkMock.mockReset();
    connectMock.mockReset();
    disconnectMock.mockReset();
    syncPanelHassMock.mockReset();
    configureHomeAssistantServiceBridge({
      callService: callHomeAssistantServiceMock,
      signPath: vi.fn(async (path: string) => ({ path })),
      getCameraStreamUrl: vi.fn(async () => ({ url: '/stream' })),
      getCameraStreamPaths: vi.fn(async () => ({})),
      addListener: vi.fn(() => () => {}),
      isConnected: vi.fn(() => true),
      getPanelHass: vi.fn(() => null),
      getConnection: vi.fn(() => null),
      getEntities: vi.fn(() => ({
        'light.kitchen': lightEntityFactory(),
        'alarm_control_panel.home': alarmEntityFactory(),
      })),
      getEntityRegistry: vi.fn(() => []),
      getConfig: vi.fn(() => null),
      updateLight: vi.fn(async () => undefined),
      playMedia: vi.fn(async () => undefined),
      browseMediaPlayer: vi.fn(async () => ({ title: 'Media' })),
      searchMediaPlayer: vi.fn(async () => ({ title: 'Media' })),
      selectMediaPlayerSource: vi.fn(async () => undefined),
      selectMediaPlayerSoundMode: vi.fn(async () => undefined),
      seekMediaPlayer: vi.fn(async () => undefined),
      clearMediaPlayerPlaylist: vi.fn(async () => undefined),
      updateMediaPlayerPower: vi.fn(async () => undefined),
      sendRemoteCommand: vi.fn(async () => undefined),
      browseMediaSource: vi.fn(async () => ({ title: 'Media' })),
      resolveMediaSource: vi.fn(async () => ({ url: '/media', mime_type: 'image/jpeg' })),
      getAutomationConfig: vi.fn(async () => ({ config: {} })),
      getCameraCapabilities: vi.fn(async () => ({ frontend_stream_types: [] })),
      enableCameraMotionDetection: vi.fn(async () => undefined),
      disableCameraMotionDetection: vi.fn(async () => undefined),
      getWebRtcClientConfiguration: vi.fn(async () => ({})),
      subscribeCameraWebRtcOffer: vi.fn(async () => () => {}),
      addCameraWebRtcCandidate: vi.fn(async () => undefined),
      createArea: vi.fn(async () => ({ area_id: 'kitchen', name: 'Kitchen' })),
      updateEntityArea: vi.fn(async () => undefined),
      updateEntityName: vi.fn(async () => undefined),
      deleteArea: vi.fn(async () => undefined),
      resolveArtwork: resolveArtworkMock,
      resolveProxyUrl: vi.fn((resourceUrl: string) => resourceUrl),
      getCameraPlaybackPlan: vi.fn(async () => ({ mode: 'snapshot' })),
      resolveCameraStreamResource: vi.fn(async (entityId: string) => ({
        id: entityId,
        kind: 'unavailable' as const,
        cacheKey: entityId,
        authStrategy: 'none' as const,
      })),
      getStoreState: vi.fn(() => ({
        connected: true,
        entities: {
          'light.kitchen': lightEntityFactory(),
          'alarm_control_panel.home': alarmEntityFactory(),
        },
        config: null,
        areas: [],
        deviceRegistry: [],
        entityRegistry: [],
        syncPanelHass: syncPanelHassMock,
        connect: connectMock,
        disconnect: disconnectMock,
      })),
      subscribeStore: vi.fn(() => () => {}),
    });
  });

  it('maps provider-neutral color temperature commands to color_temp_kelvin', async () => {
    const adapter = createHomeAssistantContractAdapter();

    await adapter.execute({
      type: 'set_color_temperature',
      entityId: createProviderScopedId('home_assistant', 'light.kitchen'),
      kelvin: 3200,
    });

    expect(callHomeAssistantServiceMock).toHaveBeenCalledWith(
      'light',
      'turn_on',
      { color_temp_kelvin: 3200 },
      { entityId: 'light.kitchen' }
    );
  });

  it('maps provider-neutral alarm commands to Home Assistant alarm services', async () => {
    const adapter = createHomeAssistantContractAdapter();

    await adapter.execute({
      type: 'arm_away',
      entityId: createProviderScopedId('home_assistant', 'alarm_control_panel.home'),
      code: '1234',
    });

    expect(callHomeAssistantServiceMock).toHaveBeenCalledWith(
      'alarm_control_panel',
      'alarm_arm_away',
      { code: '1234' },
      { entityId: 'alarm_control_panel.home' }
    );
  });

  it('resolves primary_image resources through the Home Assistant artwork resolver', async () => {
    const contract = createHomeAssistantProviderContract();
    expect(contract.resolveResource).toBeDefined();
    const resolveResource = contract.resolveResource;
    if (!resolveResource) {
      throw new Error('Expected resolveResource to be defined');
    }

    const result = await resolveResource({
      deviceId: 'home_assistant:person.vishal',
      providerId: 'home_assistant',
      kind: 'primary_image',
      attrs: {
        entity_picture: '/api/image/serve/person-vishal/512x512',
      },
      fallbackPicture: '/api/image/serve/person-vishal/fallback',
    });

    expect(resolveArtworkMock).toHaveBeenCalledWith(
      'person.vishal',
      {
        entity_picture: '/api/image/serve/person-vishal/512x512',
      },
      '/api/image/serve/person-vishal/fallback'
    );
    expect(result).toMatchObject({
      id: 'person.vishal',
      kind: 'image',
    });
  });

  it('attaches the parent Home Assistant runtime bridge without opening a second connection', () => {
    const contract = createHomeAssistantProviderContract();
    const parentHass = {
      states: { 'light.kitchen': lightEntityFactory() },
      config: { location_name: 'Parent Home' },
      connection: {
        sendMessagePromise: vi.fn(async () => ({ ok: true })),
        subscribeMessage: vi.fn(async () => vi.fn()),
      },
      callService: vi.fn(async () => undefined),
      callWS: vi.fn(async () => ({ ok: true })),
    };

    contract.attachRuntimeBridge?.(parentHass as never);

    expect(syncPanelHassMock).toHaveBeenCalledWith(parentHass);
    expect(connectMock).not.toHaveBeenCalled();
  });
});
