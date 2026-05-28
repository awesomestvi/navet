import { describe, expect, it } from 'vitest';
import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import { renderHookWithProviders } from '@/test/render';
import { resetAppStores } from '@/test/store-reset';
import { useHvacRegistryDeviceTopology } from '../use-registry-device-topology';

describe('useHvacRegistryDeviceTopology', () => {
  it('includes fan entities attached to the same Home Assistant device', async () => {
    await resetAppStores();
    homeAssistantStore.setState({
      entityRegistry: [
        { entity_id: 'climate.hallway', device_id: 'device-hvac' },
        { entity_id: 'fan.hallway', device_id: 'device-hvac' },
        { entity_id: 'switch.hallway_boost', device_id: 'device-hvac' },
        { entity_id: 'light.hallway', device_id: 'device-hvac' },
      ],
    });

    const { result } = renderHookWithProviders(() =>
      useHvacRegistryDeviceTopology('climate.hallway')
    );

    expect(result.current).toEqual({
      deviceId: 'device-hvac',
      siblingIds: ['fan.hallway', 'switch.hallway_boost'],
    });
  });

  it('resolves provider-scoped Home Assistant IDs and ignores non-Home Assistant providers', async () => {
    await resetAppStores();
    homeAssistantStore.setState({
      entityRegistry: [
        { entity_id: 'climate.hallway', device_id: 'device-hvac' },
        { entity_id: 'fan.hallway', device_id: 'device-hvac' },
      ],
    });

    const { result: scopedResult } = renderHookWithProviders(() =>
      useHvacRegistryDeviceTopology('home_assistant:climate.hallway')
    );
    const { result: homeyResult } = renderHookWithProviders(() =>
      useHvacRegistryDeviceTopology('homey:climate.hallway')
    );

    expect(scopedResult.current).toEqual({
      deviceId: 'device-hvac',
      siblingIds: ['fan.hallway'],
    });
    expect(homeyResult.current).toEqual({
      deviceId: null,
      siblingIds: [],
    });
  });
});
