import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProviderHealth } from '@/app/platform/types';
import { renderHookWithProviders } from '@/test/render';

type MockEntityMap = Record<
  string,
  {
    state: string;
    attributes?: Record<string, unknown>;
    last_changed?: string;
    last_updated?: string;
  }
>;

const { serviceMock } = vi.hoisted(() => ({
  serviceMock: {
    addListener: vi.fn(() => () => {}),
    getEntities: vi.fn<() => MockEntityMap | null>(() => null),
  },
}));

vi.mock('@/app/services/home-assistant.service', () => ({
  homeAssistantService: serviceMock,
}));

vi.mock('@/app/hooks/use-provider-device', () => ({
  useProviderDevice: vi.fn(),
}));

vi.mock('@/app/hooks/use-provider-health', () => ({
  useProviderHealth: vi.fn(),
}));

import { useProviderDevice } from '@/app/hooks/use-provider-device';
import { useProviderHealth } from '@/app/hooks/use-provider-health';
import { useProviderCameraLiveData } from '../use-provider-camera-live-data';

const mockUseProviderHealth = useProviderHealth as unknown as ReturnType<
  typeof vi.fn<(providerId: string) => ProviderHealth>
>;

describe('useProviderCameraLiveData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMock.addListener.mockImplementation(() => () => {});
    serviceMock.getEntities.mockReturnValue({
      'camera.front_door': {
        state: 'streaming',
        attributes: { entity_picture: '/api/camera_proxy/camera.front_door' },
        last_changed: '2026-05-29T07:00:00.000Z',
        last_updated: '2026-05-29T07:01:00.000Z',
      },
      'binary_sensor.front_door_motion': {
        state: 'on',
        attributes: { device_class: 'motion' },
        last_changed: '2026-05-29T07:02:00.000Z',
        last_updated: '2026-05-29T07:02:00.000Z',
      },
    });
    vi.mocked(useProviderDevice).mockReturnValue({
      id: 'home_assistant:camera.front_door',
      canonicalId: 'home_assistant:camera.front_door',
      providerId: 'home_assistant',
      nativeId: 'camera.front_door',
      kind: 'camera',
      name: 'Front Door',
      room: 'Entrance',
      capabilities: ['camera_snapshot'],
      state: {},
    });
    mockUseProviderHealth.mockReturnValue({
      providerId: 'home_assistant',
      connected: true,
      connecting: false,
      reconnecting: false,
      implementationStatus: 'implemented',
      lastError: null,
    });
  });

  it('reads live camera and sibling entity snapshots through the provider service', () => {
    const { result } = renderHookWithProviders(() =>
      useProviderCameraLiveData('home_assistant:camera.front_door', [
        'home_assistant:camera.front_door',
        'home_assistant:binary_sensor.front_door_motion',
      ])
    );

    expect(result.current.connected).toBe(true);
    expect(result.current.isHomeAssistantProvider).toBe(true);
    expect(result.current.liveEntity).toMatchObject({
      entityId: 'camera.front_door',
      state: 'streaming',
    });
    expect(result.current.deviceEntities).toMatchObject({
      'camera.front_door': {
        entityId: 'camera.front_door',
        state: 'streaming',
      },
      'binary_sensor.front_door_motion': {
        entityId: 'binary_sensor.front_door_motion',
        state: 'on',
      },
    });
    expect(serviceMock.getEntities).toHaveBeenCalled();
  });

  it('returns empty data for non-Home Assistant providers', () => {
    vi.mocked(useProviderDevice).mockReturnValue({
      id: 'homey:camera.front_door',
      canonicalId: 'homey:camera.front_door',
      providerId: 'homey',
      nativeId: 'camera.front_door',
      kind: 'camera',
      name: 'Front Door',
      room: 'Entrance',
      capabilities: ['camera_snapshot'],
      state: {},
    });

    const { result } = renderHookWithProviders(() =>
      useProviderCameraLiveData('homey:camera.front_door', ['homey:camera.front_door'])
    );

    expect(result.current.connected).toBe(false);
    expect(result.current.isHomeAssistantProvider).toBe(false);
    expect(result.current.liveEntity).toBeUndefined();
    expect(result.current.deviceEntities).toEqual({});
  });
});
