import type { HassConfig } from 'home-assistant-js-websocket';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  homeAssistantEntityRuntimeService,
  resetHomeAssistantEntityRuntimeServiceCachesForTests,
} from './homeassistant-entity-runtime.service';
import { configureHomeAssistantServiceBridge } from './homeassistant-service-bridge';

const state = {
  entities: null as Record<string, unknown> | null,
  config: null as HassConfig | null,
};

describe('homeAssistantEntityRuntimeService', () => {
  beforeEach(() => {
    state.entities = null;
    state.config = null;
    resetHomeAssistantEntityRuntimeServiceCachesForTests();
    configureHomeAssistantServiceBridge({
      callService: vi.fn(async () => undefined),
      signPath: vi.fn(async (path: string) => ({ path })),
      getCameraStreamUrl: vi.fn(async () => ({ url: '/stream' })),
      addListener: vi.fn(() => () => {}),
      isConnected: vi.fn(() => true),
      getPanelHass: vi.fn(() => null),
      getConnection: vi.fn(() => null),
      getEntities: () => state.entities as never,
      getEntityRegistry: vi.fn(() => []),
      getConfig: () => state.config,
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
      resolveArtwork: vi.fn(async (entityId: string) => ({
        id: entityId,
        kind: 'image' as const,
        cacheKey: entityId,
        authStrategy: 'none' as const,
      })),
      resolveProxyUrl: vi.fn((resourceUrl: string) => resourceUrl),
      getCameraPlaybackPlan: vi.fn(async () => ({ mode: 'snapshot' })),
      resolveCameraStreamResource: vi.fn(async (entityId: string) => ({
        id: entityId,
        kind: 'unavailable' as const,
        cacheKey: entityId,
        authStrategy: 'none' as const,
      })),
      getStoreState: () => ({
        connected: true,
        entities: state.entities as never,
        config: state.config,
        areas: [],
        deviceRegistry: [],
        entityRegistry: [],
        connect: vi.fn(async () => undefined),
        disconnect: vi.fn(async () => undefined),
        syncPanelHass: vi.fn(),
      }),
      subscribeStore: () => () => {},
    });
  });

  it('reuses entity snapshot references when cloned entity maps are semantically unchanged', () => {
    state.entities = {
      'sensor.kitchen_temperature': {
        entity_id: 'sensor.kitchen_temperature',
        state: '21',
        attributes: {
          unit_of_measurement: 'C',
        },
        last_changed: '2026-05-30T10:00:00.000Z',
        last_updated: '2026-05-30T10:00:00.000Z',
        context: { id: 'ctx-1', parent_id: null, user_id: null },
      },
    };

    const firstSnapshot = homeAssistantEntityRuntimeService.getEntitySnapshots();

    state.entities = {
      'sensor.kitchen_temperature': {
        entity_id: 'sensor.kitchen_temperature',
        state: '21',
        attributes: {
          unit_of_measurement: 'C',
        },
        last_changed: '2026-05-30T10:00:00.000Z',
        last_updated: '2026-05-30T10:00:00.000Z',
        context: { id: 'ctx-1', parent_id: null, user_id: null },
      },
    };

    const secondSnapshot = homeAssistantEntityRuntimeService.getEntitySnapshots();

    expect(secondSnapshot).toBe(firstSnapshot);
  });

  it('reuses config references when cloned config objects are semantically unchanged', () => {
    const config = {
      latitude: 1,
      longitude: 2,
      elevation: 3,
      unit_system: {
        length: 'km',
      },
      location_name: 'Home',
      time_zone: 'Europe/Stockholm',
      components: [],
      config_dir: '/config',
      whitelist_external_dirs: [],
      allowlist_external_dirs: [],
      allowlist_external_urls: [],
      version: '2026.5.0',
      config_source: 'storage',
      safe_mode: false,
      state: 'RUNNING',
      external_url: null,
      internal_url: null,
      currency: 'EUR',
    } as unknown as HassConfig;

    state.config = config;

    const firstConfig = homeAssistantEntityRuntimeService.getConfig();

    state.config = {
      ...config,
      unit_system: {
        ...config.unit_system,
      },
    };

    const secondConfig = homeAssistantEntityRuntimeService.getConfig();

    expect(secondConfig).toBe(firstConfig);
  });
});
