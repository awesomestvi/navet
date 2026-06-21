import { homeAssistantStore } from '@navet/app/stores/home-assistant-store';
import { renderHookWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { describe, expect, it } from 'vitest';
import { useClimateRegistryDeviceTopology } from '../use-registry-device-topology';

describe('useClimateRegistryDeviceTopology', () => {
  it('includes fan entities attached to the same Home Assistant device', async () => {
    await resetAppStores();
    homeAssistantStore.setState({
      entityRegistry: [
        { entity_id: 'climate.hallway', device_id: 'device-climate' },
        { entity_id: 'fan.hallway', device_id: 'device-climate' },
        { entity_id: 'switch.hallway_boost', device_id: 'device-climate' },
        { entity_id: 'light.hallway', device_id: 'device-climate' },
      ],
    });

    const { result } = renderHookWithProviders(() =>
      useClimateRegistryDeviceTopology('climate.hallway')
    );

    expect(result.current).toEqual({
      deviceId: 'device-climate',
      siblingIds: ['fan.hallway', 'switch.hallway_boost'],
    });
  });

  it('resolves provider-scoped Home Assistant IDs and ignores non-Home Assistant providers', async () => {
    await resetAppStores();
    homeAssistantStore.setState({
      entityRegistry: [
        { entity_id: 'climate.hallway', device_id: 'device-climate' },
        { entity_id: 'fan.hallway', device_id: 'device-climate' },
      ],
    });

    const { result: scopedResult } = renderHookWithProviders(() =>
      useClimateRegistryDeviceTopology('home_assistant:climate.hallway')
    );
    const { result: homeyResult } = renderHookWithProviders(() =>
      useClimateRegistryDeviceTopology('homey:climate.hallway')
    );

    expect(scopedResult.current).toEqual({
      deviceId: 'device-climate',
      siblingIds: ['fan.hallway'],
    });
    expect(homeyResult.current).toEqual({
      deviceId: null,
      siblingIds: [],
    });
  });
});
