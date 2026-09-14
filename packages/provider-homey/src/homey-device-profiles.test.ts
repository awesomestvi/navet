import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mapHomeySnapshotToNavetEntities } from './homey-mappers';
import { homeyService } from './homey-service';
import type { HomeySnapshot } from './homey-types';

const fixture: HomeySnapshot = {
  connected: true,
  zones: {
    living: { id: 'living', name: 'Living Room' },
    entrance: { id: 'entrance', name: 'Entrance' },
    bedroom: { id: 'bedroom', name: 'Master Bedroom' },
  },
  devices: {
    blind: {
      id: 'blind',
      name: 'Bedroom blind',
      class: 'blinds',
      zone: 'bedroom',
      capabilities: ['windowcoverings_set'],
      capabilitiesObj: {
        windowcoverings_set: { type: 'number', value: 0.35, min: 0, max: 1, setable: true },
      },
    },
    frontDoor: {
      id: 'frontDoor',
      name: 'Front door lock',
      class: 'lock',
      zone: 'entrance',
      capabilities: ['locked', 'alarm_contact', 'measure_battery'],
      capabilitiesObj: {
        locked: { type: 'boolean', value: true, setable: true },
        alarm_contact: { type: 'boolean', value: false, setable: false },
        measure_battery: { type: 'number', value: 78, units: '%', setable: false },
      },
    },
    thermostat: {
      id: 'thermostat',
      name: 'Living room climate',
      class: 'thermostat',
      zone: 'living',
      capabilities: ['onoff', 'target_temperature', 'measure_temperature', 'measure_humidity'],
      capabilitiesObj: {
        onoff: { type: 'boolean', value: true, setable: true },
        target_temperature: {
          type: 'number',
          value: 21.5,
          units: '°C',
          min: 5,
          max: 35,
          step: 0.5,
          setable: true,
        },
        measure_temperature: { type: 'number', value: 21.6, units: '°C', setable: false },
        measure_humidity: { type: 'number', value: 46, units: '%', setable: false },
      },
    },
    speaker: {
      id: 'speaker',
      name: 'Living room speaker',
      class: 'speaker',
      zone: 'living',
      capabilities: ['speaker_playing', 'volume_set', 'volume_mute'],
      capabilitiesObj: {
        speaker_playing: { type: 'boolean', value: false, setable: true },
        volume_set: { type: 'number', value: 0.32, min: 0, max: 1, setable: true },
        volume_mute: { type: 'boolean', value: false, setable: true },
      },
    },
  },
};

function entity(id: string) {
  const value = mapHomeySnapshotToNavetEntities(homeyService.getSnapshot()).find(
    (item) => item.externalId === id
  );
  if (!value) throw new Error('Missing fixture entity');
  return value;
}

describe('Homey specialized device cards', () => {
  const setCapabilityValue = vi.fn();
  beforeEach(() => {
    setCapabilityValue.mockReset();
    homeyService.resetSnapshot();
    homeyService.setClient({ setCapabilityValue });
    homeyService.replaceSnapshot(structuredClone(fixture));
  });

  it('maps a position-only blind to a cover with percentage and only supported controls', () => {
    expect(entity('blind')).toMatchObject({
      type: 'cover',
      room: 'Master Bedroom',
      roomId: 'homey:bedroom',
      primaryState: 'open',
      capabilities: ['position'],
      attributes: {
        position: 35,
        positionMode: 'position',
        hasPosition: true,
        supportedFeatures: 7,
        size: 'small',
      },
    });
  });

  it('routes cover percentage and open/close commands to fractional positions', async () => {
    await homeyService.callService(
      'cover',
      'set_cover_position',
      { position: 75 },
      { entityId: 'blind' }
    );
    expect(entity('blind').attributes.position).toBe(75);
    await homeyService.executeCommand(entity('blind'), { type: 'close', entityId: 'homey:blind' });
    expect(entity('blind').primaryState).toBe('closed');
    await homeyService.executeCommand(entity('blind'), { type: 'open', entityId: 'homey:blind' });
    expect(setCapabilityValue.mock.calls.map(([value]) => value)).toEqual([
      { deviceId: 'blind', capabilityId: 'windowcoverings_set', value: 0.75 },
      { deviceId: 'blind', capabilityId: 'windowcoverings_set', value: 0 },
      { deviceId: 'blind', capabilityId: 'windowcoverings_set', value: 1 },
    ]);
    await expect(
      homeyService.executeCommand(entity('blind'), { type: 'stop', entityId: 'homey:blind' })
    ).rejects.toThrow('does not support');
    expect(setCapabilityValue).toHaveBeenCalledTimes(3);
  });

  it.each([NaN, -1, 101])('rejects invalid cover position %s without writing', async (position) => {
    await expect(
      homeyService.callService('cover', 'set_cover_position', { position }, { entityId: 'blind' })
    ).rejects.toThrow('Invalid');
    expect(setCapabilityValue).not.toHaveBeenCalled();
    expect(entity('blind').attributes.position).toBe(35);
  });

  it('rejects unavailable and read-only cover writes and preserves failed-write state', async () => {
    setCapabilityValue.mockRejectedValueOnce(new Error('Offline'));
    await expect(
      homeyService.callService(
        'cover',
        'set_cover_position',
        { position: 75 },
        { entityId: 'blind' }
      )
    ).rejects.toThrow('Offline');
    expect(entity('blind').attributes.position).toBe(35);
    const snapshot = structuredClone(fixture);
    const coverCapabilities = snapshot.devices.blind.capabilitiesObj;
    if (!coverCapabilities) throw new Error('Cover fixture capabilities are missing');
    coverCapabilities.windowcoverings_set.setable = false;
    homeyService.replaceSnapshot(snapshot);
    expect(entity('blind').attributes.supportedFeatures).toBe(0);
    await expect(
      homeyService.callService(
        'cover',
        'set_cover_position',
        { position: 75 },
        { entityId: 'blind' }
      )
    ).rejects.toThrow('cannot be changed');
    coverCapabilities.windowcoverings_set.setable = true;
    snapshot.devices.blind.available = false;
    homeyService.replaceSnapshot(snapshot);
    await expect(
      homeyService.callService(
        'cover',
        'set_cover_position',
        { position: 75 },
        { entityId: 'blind' }
      )
    ).rejects.toThrow('cannot be changed');
    expect(setCapabilityValue).toHaveBeenCalledTimes(1);
  });

  it('supports movement-only covers without inventing a percentage slider', async () => {
    const snapshot = structuredClone(fixture);
    snapshot.devices.blind.capabilities = ['windowcoverings_state'];
    snapshot.devices.blind.capabilitiesObj = {
      windowcoverings_state: {
        type: 'enum',
        value: 'up',
        setable: true,
        values: ['up', 'down', 'idle'].map((id) => ({ id, title: id })),
      },
    };
    homeyService.replaceSnapshot(snapshot);
    expect(entity('blind')).toMatchObject({
      primaryState: 'opening',
      attributes: { hasPosition: false, supportedFeatures: 11 },
    });
    await homeyService.executeCommand(entity('blind'), { type: 'stop', entityId: 'homey:blind' });
    await homeyService.executeCommand(entity('blind'), { type: 'close', entityId: 'homey:blind' });
    expect(setCapabilityValue.mock.calls.map(([value]) => value)).toEqual([
      { deviceId: 'blind', capabilityId: 'windowcoverings_state', value: 'idle' },
      { deviceId: 'blind', capabilityId: 'windowcoverings_state', value: 'down' },
    ]);
  });

  it('supports binary closed-state covers and leaves missing position readings unknown', async () => {
    const snapshot = structuredClone(fixture);
    snapshot.devices.blind.capabilities = ['windowcoverings_closed'];
    snapshot.devices.blind.capabilitiesObj = {
      windowcoverings_closed: { type: 'boolean', value: true, setable: true },
    };
    homeyService.replaceSnapshot(snapshot);
    expect(entity('blind')).toMatchObject({
      primaryState: 'closed',
      attributes: { hasPosition: false, supportedFeatures: 3 },
    });
    await homeyService.executeCommand(entity('blind'), { type: 'open', entityId: 'homey:blind' });
    expect(entity('blind').primaryState).toBe('open');
    expect(setCapabilityValue).toHaveBeenCalledWith({
      deviceId: 'blind',
      capabilityId: 'windowcoverings_closed',
      value: false,
    });
    snapshot.devices.blind.capabilitiesObj = {};
    homeyService.replaceSnapshot(snapshot);
    expect(entity('blind').primaryState).toBe('unknown');
    expect(entity('blind').attributes.position).toBeUndefined();
  });

  it('maps an Entrance lock without onoff, preserving its state and sensor readings', () => {
    expect(entity('frontDoor')).toMatchObject({
      type: 'lock',
      room: 'Entrance',
      roomId: 'homey:entrance',
      primaryState: 'locked',
      capabilities: expect.arrayContaining(['lock']),
      attributes: { locked: true, securityKind: 'lock' },
    });
    expect(entity('frontDoor').capabilities).not.toContain('media_playback');
    expect(entity('frontDoor').capabilities).not.toContain('toggle');
    const entities = mapHomeySnapshotToNavetEntities(homeyService.getSnapshot());
    expect(entities.find((item) => item.externalId === 'frontDoor#measure_battery')).toMatchObject({
      type: 'sensor',
      primaryState: 78,
    });
    expect(entities.find((item) => item.externalId === 'frontDoor#alarm_contact')).toMatchObject({
      type: 'binary_sensor',
      primaryState: false,
      attributes: { securityKind: 'opening', securitySeverity: 'normal', status: 'inactive' },
    });
  });

  it('routes lock and unlock to the locked capability and applies only successful writes', async () => {
    await homeyService.executeCommand(entity('frontDoor'), {
      type: 'unlock',
      entityId: 'homey:frontDoor',
    });
    expect(entity('frontDoor')).toMatchObject({
      primaryState: 'unlocked',
      attributes: { locked: false },
    });
    await homeyService.executeCommand(entity('frontDoor'), {
      type: 'lock',
      entityId: 'homey:frontDoor',
    });
    expect(setCapabilityValue.mock.calls.map(([value]) => value)).toEqual([
      { deviceId: 'frontDoor', capabilityId: 'locked', value: false },
      { deviceId: 'frontDoor', capabilityId: 'locked', value: true },
    ]);
    setCapabilityValue.mockRejectedValueOnce(new Error('Offline'));
    await expect(
      homeyService.executeCommand(entity('frontDoor'), {
        type: 'unlock',
        entityId: 'homey:frontDoor',
      })
    ).rejects.toThrow('Offline');
    expect(entity('frontDoor').primaryState).toBe('locked');
  });

  it.each(['read-only', 'unavailable', 'missing'] as const)(
    'rejects commands for a %s lock without sending a capability write',
    async (condition) => {
      const snapshot = structuredClone(fixture);
      const device = snapshot.devices.frontDoor;
      const capabilities = device.capabilitiesObj;
      if (!capabilities) throw new Error('Lock fixture capabilities are missing');
      if (condition === 'read-only') capabilities.locked.setable = false;
      if (condition === 'unavailable') device.available = false;
      if (condition === 'missing') delete capabilities.locked;
      homeyService.replaceSnapshot(snapshot);
      await expect(
        homeyService.executeCommand(entity('frontDoor'), {
          type: 'unlock',
          entityId: 'homey:frontDoor',
        })
      ).rejects.toThrow('cannot be changed');
      expect(setCapabilityValue).not.toHaveBeenCalled();
      if (condition !== 'unavailable')
        expect(entity('frontDoor').capabilities).not.toContain('lock');
      if (condition === 'unavailable') expect(entity('frontDoor').availability).toBe('unavailable');
    }
  );

  it('preserves an unknown lock reading without inventing an unlocked value', () => {
    const snapshot = structuredClone(fixture);
    const lockCapabilities = snapshot.devices.frontDoor.capabilitiesObj;
    if (!lockCapabilities) throw new Error('Lock fixture capabilities are missing');
    lockCapabilities.locked.value = null;
    homeyService.replaceSnapshot(snapshot);
    expect(entity('frontDoor')).toMatchObject({ primaryState: 'unknown' });
    expect(entity('frontDoor').attributes.locked).toBeUndefined();
  });

  it('classifies a thermostat before its power switch and maps a speaker without onoff', () => {
    expect(entity('thermostat#measure_humidity')).toMatchObject({
      type: 'sensor',
      room: 'Living Room',
      primaryState: 46,
      attributes: { unit: '%', deviceClass: 'humidity', sourceDeviceId: 'thermostat' },
    });
    expect(entity('thermostat')).toMatchObject({
      type: 'climate',
      roomId: 'homey:living',
      capabilities: expect.arrayContaining(['temperature_setpoint']),
      attributes: {
        temperature: 21.5,
        currentTemperature: 21.6,
        mode: 'auto',
        supportedClimateModes: ['off', 'auto'],
        temperatureUnit: 'celsius',
        minTemperature: 5,
        maxTemperature: 35,
        temperatureStep: 0.5,
      },
    });
    expect(entity('speaker')).toMatchObject({
      type: 'media_player',
      room: 'Living Room',
      roomId: 'homey:living',
      primaryState: 'paused',
      attributes: {
        volume: 32,
        isMuted: false,
        mediaCapabilities: {
          canPlay: true,
          canPause: true,
          canSetVolume: true,
          canMuteVolume: true,
          canNextTrack: false,
          canBrowseMedia: false,
          canGroup: false,
        },
      },
    });
    expect(
      mapHomeySnapshotToNavetEntities(homeyService.getSnapshot()).filter(
        (item) => item.type === 'switch'
      )
    ).toEqual([]);
  });

  it('translates target temperature and mode commands and applies successful echoes', async () => {
    await homeyService.callService(
      'climate',
      'set_temperature',
      { temperature: 22 },
      { entityId: 'thermostat' }
    );
    await homeyService.executeCommand(entity('thermostat'), {
      type: 'set_climate_mode',
      entityId: 'homey:thermostat',
      mode: 'off',
    });
    expect(setCapabilityValue.mock.calls.map(([value]) => value)).toEqual([
      { deviceId: 'thermostat', capabilityId: 'target_temperature', value: 22 },
      { deviceId: 'thermostat', capabilityId: 'onoff', value: false },
    ]);
    expect(entity('thermostat')).toMatchObject({
      primaryState: 'off',
      attributes: { temperature: 22 },
    });
    await expect(
      homeyService.executeCommand(entity('thermostat'), {
        type: 'set_temperature',
        entityId: 'homey:thermostat',
        temperature: 100,
      })
    ).rejects.toThrow('Invalid');
    await expect(
      homeyService.executeCommand(entity('thermostat'), {
        type: 'set_climate_mode',
        entityId: 'homey:thermostat',
        mode: 'cool',
      })
    ).rejects.toThrow('Unsupported');
    expect(setCapabilityValue).toHaveBeenCalledTimes(2);
  });

  it('routes playback, volume and mute to speaker capabilities without adding a power capability', async () => {
    await homeyService.executeCommand(entity('speaker'), {
      type: 'play_pause',
      entityId: 'homey:speaker',
    });
    await homeyService.executeCommand(entity('speaker'), {
      type: 'set_volume',
      entityId: 'homey:speaker',
      volume: 65,
    });
    await homeyService.executeCommand(entity('speaker'), {
      type: 'mute',
      entityId: 'homey:speaker',
    });
    expect(setCapabilityValue.mock.calls.map(([value]) => value)).toEqual([
      { deviceId: 'speaker', capabilityId: 'speaker_playing', value: true },
      { deviceId: 'speaker', capabilityId: 'volume_set', value: 0.65 },
      { deviceId: 'speaker', capabilityId: 'volume_mute', value: true },
    ]);
    expect(entity('speaker')).toMatchObject({
      primaryState: 'playing',
      attributes: { volume: 65, isMuted: true },
    });
    await expect(
      homeyService.executeCommand(entity('speaker'), {
        type: 'next_track',
        entityId: 'homey:speaker',
      })
    ).rejects.toThrow('cannot be changed');
    setCapabilityValue.mockRejectedValueOnce(new Error('Offline'));
    await expect(
      homeyService.executeCommand(entity('speaker'), {
        type: 'set_volume',
        entityId: 'homey:speaker',
        volume: 10,
      })
    ).rejects.toThrow('Offline');
    expect(entity('speaker').attributes.volume).toBe(65);
  });

  it('exposes only advertised thermostat modes and rejects other enum values', async () => {
    const snapshot = structuredClone(fixture);
    const thermostatCapabilities = snapshot.devices.thermostat.capabilitiesObj;
    if (!thermostatCapabilities) throw new Error('Thermostat fixture capabilities are missing');
    thermostatCapabilities.thermostat_mode = {
      type: 'enum',
      value: 'heat',
      setable: true,
      values: [
        { id: 'heat', title: 'Heat' },
        { id: 'cool', title: 'Cool' },
      ],
    };
    homeyService.replaceSnapshot(snapshot);
    expect(entity('thermostat').attributes.supportedClimateModes).toEqual(['heat', 'cool', 'off']);
    await homeyService.executeCommand(entity('thermostat'), {
      type: 'set_climate_mode',
      entityId: 'homey:thermostat',
      mode: 'cool',
    });
    expect(entity('thermostat').primaryState).toBe('cool');
    await expect(
      homeyService.executeCommand(entity('thermostat'), {
        type: 'set_climate_mode',
        entityId: 'homey:thermostat',
        mode: 'auto',
      })
    ).rejects.toThrow('Unsupported');
  });
});
