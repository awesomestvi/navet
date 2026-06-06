import { beforeEach, describe, expect, it, vi } from 'vitest';
import { homeyService } from './homey.service';
import {
  homeyEntityRuntimeService,
  resetHomeyEntityRuntimeServiceCachesForTests,
} from './homey-entity-runtime.service';

describe('homeyEntityRuntimeService', () => {
  beforeEach(() => {
    homeyService.resetSnapshot();
    resetHomeyEntityRuntimeServiceCachesForTests();
  });

  it('reuses unchanged device and capability snapshots for equivalent cloned snapshots', () => {
    homeyService.replaceSnapshot({
      connected: true,
      zones: {
        zone_living: {
          id: 'zone_living',
          name: 'Living Room',
        },
      },
      devices: {
        'device-1': {
          id: 'device-1',
          name: 'Living Room Sensor',
          zone: 'zone_living',
          capabilitiesObj: {
            measure_temperature: {
              value: 21.5,
              units: 'C',
              title: 'Temperature',
            },
          },
        },
      },
    });

    const firstDevice = homeyEntityRuntimeService.getEntitySnapshot?.('device-1');
    const firstCapability = homeyEntityRuntimeService.getEntitySnapshot?.(
      'device-1#measure_temperature'
    );
    const firstRegistryEntry = homeyEntityRuntimeService.getEntityRegistryEntry?.(
      'device-1#measure_temperature'
    );

    homeyService.replaceSnapshot({
      connected: true,
      zones: {
        zone_living: {
          id: 'zone_living',
          name: 'Living Room',
        },
      },
      devices: {
        'device-1': {
          id: 'device-1',
          name: 'Living Room Sensor',
          zone: 'zone_living',
          capabilitiesObj: {
            measure_temperature: {
              value: 21.5,
              units: 'C',
              title: 'Temperature',
            },
          },
        },
      },
    });

    expect(homeyEntityRuntimeService.getEntitySnapshot?.('device-1')).toBe(firstDevice);
    expect(homeyEntityRuntimeService.getEntitySnapshot?.('device-1#measure_temperature')).toBe(
      firstCapability
    );
    expect(homeyEntityRuntimeService.getEntityRegistryEntry?.('device-1#measure_temperature')).toBe(
      firstRegistryEntry
    );
  });

  it('updates derived room attributes when a Homey zone name changes', () => {
    homeyService.replaceSnapshot({
      connected: true,
      zones: {
        zone_living: {
          id: 'zone_living',
          name: 'Living Room',
        },
      },
      devices: {
        'device-1': {
          id: 'device-1',
          name: 'Living Room Sensor',
          zone: 'zone_living',
          capabilitiesObj: {
            measure_temperature: {
              value: 21.5,
              units: 'C',
              title: 'Temperature',
            },
          },
        },
      },
    });

    const firstDevice = homeyEntityRuntimeService.getEntitySnapshot?.('device-1');
    const firstCapability = homeyEntityRuntimeService.getEntitySnapshot?.(
      'device-1#measure_temperature'
    );

    homeyService.replaceSnapshot({
      connected: true,
      zones: {
        zone_living: {
          id: 'zone_living',
          name: 'Den',
        },
      },
      devices: {
        'device-1': {
          id: 'device-1',
          name: 'Living Room Sensor',
          zone: 'zone_living',
          capabilitiesObj: {
            measure_temperature: {
              value: 21.5,
              units: 'C',
              title: 'Temperature',
            },
          },
        },
      },
    });

    const nextDevice = homeyEntityRuntimeService.getEntitySnapshot?.('device-1');
    const nextCapability = homeyEntityRuntimeService.getEntitySnapshot?.(
      'device-1#measure_temperature'
    );

    expect(nextDevice).not.toBe(firstDevice);
    expect(nextDevice?.attributes.room).toBe('Den');
    expect(nextCapability).not.toBe(firstCapability);
    expect(nextCapability?.attributes.room).toBe('Den');
  });

  it('notifies entity listeners only when the subscribed Homey entity changes', () => {
    homeyService.replaceSnapshot({
      connected: true,
      zones: {
        zone_living: {
          id: 'zone_living',
          name: 'Living Room',
        },
      },
      devices: {
        'device-1': {
          id: 'device-1',
          name: 'Living Room Sensor',
          zone: 'zone_living',
          capabilitiesObj: {
            measure_temperature: {
              value: 21.5,
              units: 'C',
              title: 'Temperature',
            },
          },
        },
      },
    });

    const listener = vi.fn();
    const unsubscribe = homeyEntityRuntimeService.subscribeEntitySnapshot?.(
      'device-1#measure_temperature',
      listener
    );

    homeyService.replaceSnapshot({
      connected: true,
      zones: {
        zone_living: {
          id: 'zone_living',
          name: 'Living Room',
        },
      },
      devices: {
        'device-1': {
          id: 'device-1',
          name: 'Living Room Sensor',
          zone: 'zone_living',
          capabilitiesObj: {
            measure_temperature: {
              value: 21.5,
              units: 'C',
              title: 'Temperature',
            },
          },
        },
        'device-2': {
          id: 'device-2',
          name: 'Desk Lamp',
          zone: 'zone_living',
          capabilitiesObj: {
            onoff: {
              value: true,
            },
          },
        },
      },
    });

    expect(listener).not.toHaveBeenCalled();

    homeyService.replaceSnapshot({
      connected: true,
      zones: {
        zone_living: {
          id: 'zone_living',
          name: 'Living Room',
        },
      },
      devices: {
        'device-1': {
          id: 'device-1',
          name: 'Living Room Sensor',
          zone: 'zone_living',
          capabilitiesObj: {
            measure_temperature: {
              value: 22,
              units: 'C',
              title: 'Temperature',
            },
          },
        },
        'device-2': {
          id: 'device-2',
          name: 'Desk Lamp',
          zone: 'zone_living',
          capabilitiesObj: {
            onoff: {
              value: true,
            },
          },
        },
      },
    });

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe?.();
  });
});
