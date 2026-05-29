import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProviderHealth } from '@/app/platform/types';
import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import { renderHookWithProviders } from '@/test/render';

vi.mock('@/app/hooks/use-provider-device', () => ({
  useProviderEntityModel: vi.fn(),
}));

vi.mock('@/app/hooks/use-provider-health', () => ({
  useProviderHealth: vi.fn(),
}));

import { useProviderEntityModel } from '@/app/hooks/use-provider-device';
import { useProviderHealth } from '@/app/hooks/use-provider-health';
import { useProviderCameraLiveData } from '../use-provider-camera-live-data';

const mockUseProviderHealth = useProviderHealth as unknown as ReturnType<
  typeof vi.fn<(providerId: string) => ProviderHealth>
>;

describe('useProviderCameraLiveData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    homeAssistantStore.setState({
      entities: {
        'camera.front_door': {
          entity_id: 'camera.front_door',
          state: 'streaming',
          attributes: { entity_picture: '/api/camera_proxy/camera.front_door' },
          last_changed: '2026-05-29T07:00:00.000Z',
          last_updated: '2026-05-29T07:01:00.000Z',
          context: { id: 'ctx-camera', parent_id: null, user_id: null },
        },
        'binary_sensor.front_door_motion': {
          entity_id: 'binary_sensor.front_door_motion',
          state: 'on',
          attributes: { friendly_name: 'Front Door Motion' },
          last_changed: '2026-05-29T07:02:00.000Z',
          last_updated: '2026-05-29T07:02:00.000Z',
          context: { id: 'ctx-motion', parent_id: null, user_id: null },
        },
      },
    });
    vi.mocked(useProviderEntityModel).mockReturnValue({
      id: 'home_assistant:camera.front_door',
      canonicalId: 'home_assistant:camera.front_door',
      providerId: 'home_assistant',
      externalId: 'camera.front_door',
      type: 'camera',
      name: 'Front Door',
      room: 'Entrance',
      capabilities: ['camera_snapshot'],
      primaryState: 'streaming',
      availability: 'available',
      attributes: {
        isStreamCapable: true,
        isStillImageOnly: false,
        motionDetectionEnabled: true,
      },
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
    expect(result.current.liveEntity).toMatchObject({
      entityId: 'camera.front_door',
      state: 'streaming',
    });
    expect(result.current.liveState).toEqual({
      isStreamCapable: true,
      isStillImageOnly: false,
      motionDetectionEnabled: true,
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
    expect(result.current.companionStates).toEqual([
      {
        entityId: 'binary_sensor.front_door_motion',
        type: 'motion',
        detected: true,
        changedAt: '2026-05-29T07:02:00.000Z',
      },
    ]);
  });

  it('returns empty data for non-Home Assistant providers', () => {
    vi.mocked(useProviderEntityModel).mockReturnValue({
      id: 'homey:camera.front_door',
      canonicalId: 'homey:camera.front_door',
      providerId: 'homey',
      externalId: 'camera.front_door',
      type: 'camera',
      name: 'Front Door',
      room: 'Entrance',
      capabilities: ['camera_snapshot'],
      primaryState: null,
      availability: 'available',
      attributes: {},
    });
    mockUseProviderHealth.mockReturnValue({
      providerId: 'homey',
      connected: false,
      connecting: false,
      reconnecting: false,
      implementationStatus: 'implemented',
      lastError: null,
    });

    const { result } = renderHookWithProviders(() =>
      useProviderCameraLiveData('homey:camera.front_door', ['homey:camera.front_door'])
    );

    expect(result.current.connected).toBe(false);
    expect(result.current.liveEntity).toBeUndefined();
    expect(result.current.liveState).toEqual({
      isStreamCapable: false,
      isStillImageOnly: false,
      motionDetectionEnabled: null,
    });
    expect(result.current.companionStates).toEqual([]);
    expect(result.current.deviceEntities).toEqual({});
  });
});
