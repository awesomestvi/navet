import type { NavetCommand, NavetEntity } from '@navet/core/types';
import type { HomeyCapabilityCommand } from './homey-service';
import type { HomeyDevice } from './homey-types';

const numeric = (device: HomeyDevice, id: string) => {
  const value = device.capabilitiesObj?.[id]?.value;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};
const writable = (device: HomeyDevice, id: string) =>
  device.capabilitiesObj?.[id]?.setable === true;
const has = (device: HomeyDevice, id: string) =>
  device.capabilities?.includes(id) || id in (device.capabilitiesObj ?? {});
const supportsCoverMovement = (device: HomeyDevice, value: string) =>
  writable(device, 'windowcoverings_state') &&
  device.capabilitiesObj?.windowcoverings_state?.values?.some((option) => option.id === value);

/** Specialized device identities take precedence over their optional power switch. */
export function getHomeyDeviceProfile(device: HomeyDevice): {
  type: NavetEntity['type'];
  state: Record<string, unknown>;
} | null {
  if (
    ['window_coverings', 'blinds', 'curtains', 'sunshade'].includes(device.class ?? '') ||
    ['windowcoverings_set', 'windowcoverings_state', 'windowcoverings_closed'].some((id) =>
      has(device, id)
    )
  ) {
    const level = numeric(device, 'windowcoverings_set');
    const position = level !== null && level >= 0 && level <= 1 ? level * 100 : undefined;
    const closed = device.capabilitiesObj?.windowcoverings_closed?.value;
    const movement = device.capabilitiesObj?.windowcoverings_state?.value;
    const canSet = writable(device, 'windowcoverings_set');
    const canToggle = writable(device, 'windowcoverings_closed');
    return {
      type: 'cover',
      state: {
        value:
          movement === 'up'
            ? 'opening'
            : movement === 'down'
              ? 'closing'
              : position !== undefined
                ? position === 0
                  ? 'closed'
                  : 'open'
                : closed === true
                  ? 'closed'
                  : closed === false
                    ? 'open'
                    : 'unknown',
        position,
        positionMode: 'position',
        hasPosition: position !== undefined,
        deviceClass:
          device.class === 'curtains'
            ? 'curtain'
            : device.class === 'sunshade'
              ? 'awning'
              : 'blind',
        size: 'small',
        // Compatibility feature bits consumed by Navet's current cover-card model.
        supportedFeatures:
          (canSet || canToggle || supportsCoverMovement(device, 'up') ? 1 : 0) |
          (canSet || canToggle || supportsCoverMovement(device, 'down') ? 2 : 0) |
          (canSet ? 4 : 0) |
          (supportsCoverMovement(device, 'idle') ? 8 : 0),
      },
    };
  }
  if (device.class === 'lock' || has(device, 'locked')) {
    const locked = device.capabilitiesObj?.locked?.value;
    return {
      type: 'lock',
      state: {
        value: locked === true ? 'locked' : locked === false ? 'unlocked' : 'unknown',
        locked: typeof locked === 'boolean' ? locked : undefined,
        securityKind: 'lock',
      },
    };
  }
  if (has(device, 'target_temperature')) {
    const target = device.capabilitiesObj?.target_temperature;
    const thermostatMode = device.capabilitiesObj?.thermostat_mode;
    const modes = thermostatMode?.values?.map((value) => value.id) ?? [];
    const power = device.capabilitiesObj?.onoff;
    const mode =
      power?.value === false
        ? 'off'
        : typeof thermostatMode?.value === 'string'
          ? thermostatMode.value
          : 'auto';
    return {
      type: 'climate',
      state: {
        value: mode,
        mode,
        temperature: numeric(device, 'target_temperature'),
        currentTemperature: numeric(device, 'measure_temperature'),
        hasCurrentTemperature: numeric(device, 'measure_temperature') !== null,
        temperatureUnit: (
          target?.units ?? device.capabilitiesObj?.measure_temperature?.units
        )?.includes('F')
          ? 'fahrenheit'
          : 'celsius',
        supportedClimateModes:
          writable(device, 'thermostat_mode') && modes.length
            ? [...new Set([...modes, ...(writable(device, 'onoff') ? ['off'] : [])])]
            : writable(device, 'onoff')
              ? ['off', 'auto']
              : [],
        minTemperature: target?.min,
        maxTemperature: target?.max,
        temperatureStep: target?.step,
        humidity: numeric(device, 'measure_humidity'),
        serviceDomain: 'climate',
      },
    };
  }
  if (device.class === 'speaker' || has(device, 'speaker_playing') || has(device, 'volume_set')) {
    const playing = device.capabilitiesObj?.speaker_playing?.value;
    const value =
      device.capabilitiesObj?.onoff?.value === false
        ? 'off'
        : playing === true
          ? 'playing'
          : playing === false
            ? 'paused'
            : 'idle';
    const text = (id: string) => {
      const value = device.capabilitiesObj?.[id]?.value;
      return typeof value === 'string' ? value : '';
    };
    return {
      type: 'media_player',
      state: {
        value,
        volume: (numeric(device, 'volume_set') ?? 0) * 100,
        isMuted: device.capabilitiesObj?.volume_mute?.value === true,
        title: text('speaker_track') || text('speaker_title'),
        artist: text('speaker_artist'),
        album: text('speaker_album'),
        entityType: 'Speaker',
        deviceClass: 'speaker',
        supportsGrouping: false,
        supportsPreviousTrack: writable(device, 'speaker_prev'),
        supportsNextTrack: writable(device, 'speaker_next'),
        mediaCapabilities: {
          canAnnounce: false,
          canBrowseMedia: false,
          canClearPlaylist: false,
          canEnqueue: false,
          canGroup: false,
          canMuteVolume: writable(device, 'volume_mute'),
          canNextTrack: writable(device, 'speaker_next'),
          canPreviousTrack: writable(device, 'speaker_prev'),
          canPause: writable(device, 'speaker_playing'),
          canPlay: writable(device, 'speaker_playing'),
          canPlayMedia: false,
          canRepeat: false,
          canSearchMedia: false,
          canSeek: false,
          canSelectSoundMode: false,
          canSelectSource: false,
          canSetVolume: writable(device, 'volume_set'),
          canShuffle: writable(device, 'speaker_shuffle'),
          canStop: false,
          canTurnOff: false,
          canTurnOn: false,
          canVolumeStep: false,
        },
      },
    };
  }
  return null;
}

function writeHomeyCapability(device: HomeyDevice, id: string, value: boolean | number | string) {
  const cap = device.capabilitiesObj?.[id];
  if (cap?.setable !== true || device.available === false)
    throw new Error('This Homey capability cannot be changed');
  if (
    typeof value === 'number' &&
    (!Number.isFinite(value) ||
      (cap.min !== undefined && value < cap.min) ||
      (cap.max !== undefined && value > cap.max))
  )
    throw new Error('Invalid Homey capability value');
  if (cap.type === 'enum' && !cap.values?.some((option) => option.id === value))
    throw new Error('Unsupported Homey mode');
  return { deviceId: device.id, capabilityId: id, value };
}

export function translateHomeyCoverPosition(
  device: HomeyDevice,
  position: number
): HomeyCapabilityCommand[] {
  if (getHomeyDeviceProfile(device)?.type !== 'cover')
    throw new Error('Homey position actions require a cover');
  if (!Number.isFinite(position) || position < 0 || position > 100)
    throw new Error('Invalid Homey cover position');
  return [writeHomeyCapability(device, 'windowcoverings_set', position / 100)];
}

export function translateHomeySpecializedCommand(
  device: HomeyDevice,
  command: NavetCommand
): HomeyCapabilityCommand[] {
  const write = (id: string, value: boolean | number | string) =>
    writeHomeyCapability(device, id, value);
  const type = getHomeyDeviceProfile(device)?.type;
  if (type === 'cover') {
    if (command.type === 'open' || command.type === 'close') {
      const movement = command.type === 'open' ? 'up' : 'down';
      if (supportsCoverMovement(device, movement))
        return [write('windowcoverings_state', movement)];
      if (writable(device, 'windowcoverings_set'))
        return translateHomeyCoverPosition(device, command.type === 'open' ? 100 : 0);
      return [write('windowcoverings_closed', command.type === 'close')];
    }
    if (command.type === 'stop' && supportsCoverMovement(device, 'idle'))
      return [write('windowcoverings_state', 'idle')];
  }
  if (type === 'lock') {
    if (command.type === 'lock') return [write('locked', true)];
    if (command.type === 'unlock') return [write('locked', false)];
  }
  if (type === 'climate') {
    if (command.type === 'set_temperature')
      return [write('target_temperature', command.temperature)];
    if (command.type === 'set_climate_mode') {
      if (
        writable(device, 'thermostat_mode') &&
        device.capabilitiesObj?.thermostat_mode?.values?.some(
          (option) => option.id === command.mode
        )
      ) {
        return [
          write('thermostat_mode', command.mode),
          ...(writable(device, 'onoff') ? [write('onoff', command.mode !== 'off')] : []),
        ];
      }
      if (
        command.mode === 'off' ||
        (command.mode === 'auto' && !writable(device, 'thermostat_mode'))
      )
        return [write('onoff', command.mode !== 'off')];
      throw new Error('Unsupported Homey thermostat mode');
    }
  }
  if (type === 'media_player') {
    switch (command.type) {
      case 'play_pause':
        return [write('speaker_playing', device.capabilitiesObj?.speaker_playing?.value !== true)];
      case 'start':
        return [write('speaker_playing', true)];
      case 'pause':
        return [write('speaker_playing', false)];
      case 'set_volume':
        if (!Number.isFinite(command.volume) || command.volume < 0 || command.volume > 100)
          throw new Error('Invalid Homey volume');
        return [write('volume_set', command.volume / 100)];
      case 'mute':
        return [write('volume_mute', true)];
      case 'unmute':
        return [write('volume_mute', false)];
      case 'next_track':
        return [write('speaker_next', true)];
      case 'previous_track':
        return [write('speaker_prev', true)];
      case 'set_shuffle':
        return [write('speaker_shuffle', command.shuffle)];
    }
  }
  throw new Error(`Homey does not support ${command.type} for this device`);
}
