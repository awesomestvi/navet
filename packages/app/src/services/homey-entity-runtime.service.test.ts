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

  it('keeps the blind percentage live when windowcoverings_set changes', () => {
    const device = {
      id: 'blind',
      name: 'Bedroom blind',
      class: 'blinds',
      zone: 'bedroom',
      capabilitiesObj: { windowcoverings_set: { value: 0.35, setable: true } },
    };
    homeyService.replaceSnapshot({
      connected: true,
      devices: { blind: device },
      zones: { bedroom: { id: 'bedroom', name: 'Master Bedroom' } },
    });
    expect(homeyEntityRuntimeService.getEntitySnapshot?.('blind')).toMatchObject({
      state: 'open',
      attributes: { position: 35, room: 'Master Bedroom', supportedFeatures: 7 },
    });
    const listener = vi.fn();
    const unsubscribe = homeyEntityRuntimeService.subscribeEntitySnapshot?.('blind', listener);
    homeyService.replaceSnapshot({
      devices: {
        blind: { ...device, capabilitiesObj: { windowcoverings_set: { value: 0, setable: true } } },
      },
    });
    expect(homeyEntityRuntimeService.getEntitySnapshot?.('blind')).toMatchObject({
      state: 'closed',
      attributes: { position: 0 },
    });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe?.();
  });

  it('keeps an Entrance lock state live when the locked capability changes', () => {
    const device = {
      id: 'frontDoor',
      name: 'Front door lock',
      class: 'lock',
      zone: 'entrance',
      capabilitiesObj: { locked: { value: true, setable: true } },
    };
    homeyService.replaceSnapshot({
      connected: true,
      devices: { frontDoor: device },
      zones: { entrance: { id: 'entrance', name: 'Entrance' } },
    });
    expect(homeyEntityRuntimeService.getEntitySnapshot?.('frontDoor')).toMatchObject({
      state: 'locked',
      attributes: { locked: true, room: 'Entrance' },
    });
    const listener = vi.fn();
    const unsubscribe = homeyEntityRuntimeService.subscribeEntitySnapshot?.('frontDoor', listener);
    homeyService.replaceSnapshot({
      devices: {
        frontDoor: {
          ...device,
          capabilitiesObj: { locked: { value: false, setable: true } },
        },
      },
    });
    expect(homeyEntityRuntimeService.getEntitySnapshot?.('frontDoor')).toMatchObject({
      state: 'unlocked',
      attributes: { locked: false },
    });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe?.();
  });

  it('keeps thermostat and speaker state live when their specialized capabilities change', () => {
    const devices = {
      thermostat: {
        id: 'thermostat',
        name: 'Living room climate',
        class: 'thermostat',
        capabilitiesObj: {
          onoff: { value: true, setable: true },
          target_temperature: {
            value: 21.5,
            units: '°C',
            min: 5,
            max: 35,
            step: 0.5,
            setable: true,
          },
          measure_temperature: { value: 21.6 },
        },
      },
      speaker: {
        id: 'speaker',
        name: 'Living room speaker',
        class: 'speaker',
        capabilitiesObj: {
          speaker_playing: { value: false, setable: true },
          volume_set: { value: 0.32, setable: true },
          volume_mute: { value: false, setable: true },
        },
      },
    };
    homeyService.replaceSnapshot({ connected: true, devices, zones: {} });
    expect(homeyEntityRuntimeService.getEntitySnapshot?.('thermostat')).toMatchObject({
      state: 'auto',
      attributes: {
        temperature: 21.5,
        current_temperature: 21.6,
        min_temp: 5,
        max_temp: 35,
        target_temp_step: 0.5,
        hvac_modes: ['off', 'auto'],
      },
    });
    expect(homeyEntityRuntimeService.getEntitySnapshot?.('speaker')).toMatchObject({
      state: 'paused',
      attributes: { volume_level: 0.32, is_volume_muted: false },
    });
    const climateListener = vi.fn();
    const mediaListener = vi.fn();
    const unsubscribeClimate = homeyEntityRuntimeService.subscribeEntitySnapshot?.(
      'thermostat',
      climateListener
    );
    const unsubscribeMedia = homeyEntityRuntimeService.subscribeEntitySnapshot?.(
      'speaker',
      mediaListener
    );
    homeyService.replaceSnapshot({
      devices: {
        ...devices,
        thermostat: {
          ...devices.thermostat,
          capabilitiesObj: {
            ...devices.thermostat.capabilitiesObj,
            target_temperature: {
              ...devices.thermostat.capabilitiesObj.target_temperature,
              value: 22,
            },
          },
        },
      },
    });
    expect(
      homeyEntityRuntimeService.getEntitySnapshot?.('thermostat')?.attributes.temperature
    ).toBe(22);
    expect(climateListener).toHaveBeenCalledTimes(1);
    expect(mediaListener).not.toHaveBeenCalled();
    homeyService.replaceSnapshot({
      devices: {
        ...homeyService.getSnapshot().devices,
        speaker: {
          ...devices.speaker,
          capabilitiesObj: {
            ...devices.speaker.capabilitiesObj,
            speaker_playing: { value: true, setable: true },
            volume_set: { value: 0.65, setable: true },
          },
        },
      },
    });
    expect(homeyEntityRuntimeService.getEntitySnapshot?.('speaker')).toMatchObject({
      state: 'playing',
      attributes: { volume_level: 0.65 },
    });
    expect(mediaListener).toHaveBeenCalledTimes(1);
    expect(climateListener).toHaveBeenCalledTimes(1);
    unsubscribeClimate?.();
    unsubscribeMedia?.();
  });

  it('exposes cumulative energy as a live sensor and preserves its device association', () => {
    const device = {
      id: 'socket',
      name: 'Coffee maker',
      class: 'socket',
      capabilitiesObj: {
        onoff: { value: false },
        meter_power: { value: 12.45, units: 'kWh', title: 'Energy' },
      },
    };
    homeyService.replaceSnapshot({ connected: true, devices: { socket: device }, zones: {} });
    expect(homeyEntityRuntimeService.getEntitySnapshot?.('socket#meter_power')).toMatchObject({
      state: '12.45',
      attributes: {
        device_class: 'energy',
        unit_of_measurement: 'kWh',
        source_device_id: 'socket',
      },
    });
    expect(homeyEntityRuntimeService.getEntityRegistryEntry?.('socket#meter_power')).toMatchObject({
      entityId: 'socket#meter_power',
      deviceId: 'socket',
      name: 'Energy',
    });
    const listener = vi.fn();
    const unsubscribe = homeyEntityRuntimeService.subscribeEntitySnapshot?.(
      'socket#meter_power',
      listener
    );
    homeyService.replaceSnapshot({
      devices: {
        socket: {
          ...device,
          capabilitiesObj: {
            ...device.capabilitiesObj,
            meter_power: { ...device.capabilitiesObj.meter_power, value: 12.46 },
          },
        },
      },
    });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(homeyEntityRuntimeService.getEntitySnapshot?.('socket#meter_power')?.state).toBe(
      '12.46'
    );
    unsubscribe?.();
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
