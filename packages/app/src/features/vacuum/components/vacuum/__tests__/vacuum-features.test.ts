import { describe, expect, it } from 'vitest';
import { resolveVacuumCapabilities } from '../vacuum-features';

describe('resolveVacuumCapabilities', () => {
  it('resolves Home Assistant supported feature flags into action booleans', () => {
    const capabilities = resolveVacuumCapabilities({
      providerEntity: {
        id: 'home_assistant:vacuum.roborock',
        canonicalId: 'home_assistant:vacuum.roborock',
        providerId: 'home_assistant',
        externalId: 'vacuum.roborock',
        type: 'vacuum',
        name: 'Roborock',
        primaryState: 'idle',
        availability: 'available',
        capabilities: [],
        attributes: {
          supportedFeatures: 4 | 16 | 32 | 512 | 1024 | 2048 | 8192,
          fanSpeed: 'balanced',
          fanSpeedList: ['quiet', 'balanced', 'turbo'],
          availableCleaningAreas: [
            { id: 'kitchen', label: 'Kitchen' },
            { id: 'hallway', label: 'Hallway' },
          ],
          canOrderAreaCleaning: true,
        },
      },
    });

    expect(capabilities).toEqual({
      canStart: true,
      canPause: true,
      canStop: false,
      canReturnHome: true,
      canLocate: true,
      canCleanSpot: true,
      canSetFanSpeed: true,
      currentFanSpeed: 'balanced',
      fanSpeedOptions: ['quiet', 'balanced', 'turbo'],
      canCycleFanSpeed: true,
      canShowMap: true,
      canCleanByArea: true,
      canOrderAreaCleaning: true,
      availableCleaningAreas: [
        { id: 'kitchen', label: 'Kitchen' },
        { id: 'hallway', label: 'Hallway' },
      ],
    });
  });

  it('keeps unsupported actions out when the bitmask does not advertise them', () => {
    const capabilities = resolveVacuumCapabilities({
      providerEntity: {
        id: 'home_assistant:vacuum.basic',
        canonicalId: 'home_assistant:vacuum.basic',
        providerId: 'home_assistant',
        externalId: 'vacuum.basic',
        type: 'vacuum',
        name: 'Basic Vacuum',
        primaryState: 'idle',
        availability: 'available',
        capabilities: [],
        attributes: {
          supportedFeatures: 8192,
        },
      },
    });

    expect(capabilities).toEqual({
      canStart: true,
      canPause: false,
      canStop: false,
      canReturnHome: false,
      canLocate: false,
      canCleanSpot: false,
      canSetFanSpeed: false,
      currentFanSpeed: undefined,
      fanSpeedOptions: [],
      canCycleFanSpeed: false,
      canShowMap: false,
      canCleanByArea: false,
      canOrderAreaCleaning: false,
      availableCleaningAreas: [],
    });
  });
});
