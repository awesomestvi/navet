import type {
  ProviderClimateFeatureService,
  ProviderNativeActionFeatureService,
  ProviderSecurityFeatureService,
} from '@navet/core/provider-feature-services';
import type { NavetCommand } from '@navet/core/types';
import { executeOpenHABCommand } from './openhab-adapter';
import { mapOpenHABSnapshotToNavetEntities } from './openhab-mappers';
import { openhabService } from './openhab-service';

function entity(id: string) {
  const nativeId = id.replace(/^openhab:/, '');
  const result = mapOpenHABSnapshotToNavetEntities(openhabService.getSnapshot()).find(
    (item) => item.externalId === nativeId
  );
  if (!result) throw new Error('Unknown openHAB item');
  return result;
}

async function command(id: string, action: NavetCommand) {
  await executeOpenHABCommand(entity(id), action);
}

async function cover(
  id: string,
  action: 'UP' | 'DOWN' | 'STOP' | number,
  mode?: 'position' | 'tilt'
) {
  const item = entity(id);
  if (mode === 'tilt' || item.type !== 'cover')
    throw new Error('This openHAB cover control is unavailable');
  if (openhabService.getSnapshot().items[item.externalId]?.stateDescription?.readOnly)
    throw new Error('This openHAB item is read-only');
  if (typeof action === 'number' && (!Number.isFinite(action) || action < 0 || action > 100))
    throw new Error('Invalid cover position');
  await openhabService.sendItemCommand(
    item.externalId,
    typeof action === 'number' ? String(100 - action) : action
  );
}
const unsupported = async () => {
  throw new Error('openHAB alarm-panel controls are unavailable');
};

export const openHABSecurityFeatureService: ProviderSecurityFeatureService = {
  lockEntity: async (id) => command(id, { type: 'lock', entityId: id }),
  unlockEntity: async (id) => command(id, { type: 'unlock', entityId: id }),
  armHome: unsupported,
  armAway: unsupported,
  armNight: unsupported,
  armVacation: unsupported,
  armCustomBypass: unsupported,
  disarm: unsupported,
  trigger: unsupported,
  openCover: async (id, mode) => cover(id, 'UP', mode),
  closeCover: async (id, mode) => cover(id, 'DOWN', mode),
  stopCover: async (id, mode) => cover(id, 'STOP', mode),
  setCoverPosition: async (id, position, mode) => cover(id, position, mode),
};

export const openHABClimateFeatureService: ProviderClimateFeatureService = {
  setTargetTemperature: async (id, update) => {
    if (
      update.temperature === undefined ||
      update.targetTemperatureLow !== undefined ||
      update.targetTemperatureHigh !== undefined
    )
      throw new Error('openHAB setpoints support one target temperature');
    await command(id, { type: 'set_temperature', entityId: id, temperature: update.temperature });
  },
};

export const openHABNativeActionFeatureService: ProviderNativeActionFeatureService = {
  invokeAction: async ({ entityId, target, service, serviceData = {} }) => {
    const id = entityId ?? (typeof target?.entityId === 'string' ? target.entityId : undefined);
    if (!id) throw new Error('An openHAB item is required');
    const number = (key: string) => {
      const value = serviceData[key];
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Invalid ${key}`);
      return value;
    };
    if (service === 'turn_on' && serviceData.hs_color !== undefined) {
      const item = entity(id);
      const color = serviceData.hs_color;
      if (
        item.attributes.itemType !== 'Color' ||
        !Array.isArray(color) ||
        color.length !== 2 ||
        !color.every((value) => typeof value === 'number' && Number.isFinite(value)) ||
        color[0] < 0 ||
        color[0] > 360 ||
        color[1] < 0 ||
        color[1] > 100
      )
        throw new Error('Invalid openHAB light color');
      if (openhabService.getSnapshot().items[item.externalId]?.stateDescription?.readOnly)
        throw new Error('This openHAB item is read-only');
      const brightness =
        serviceData.brightness_pct !== undefined
          ? number('brightness_pct')
          : Math.max(
              1,
              typeof item.attributes.brightnessPct === 'number'
                ? item.attributes.brightnessPct
                : 100
            );
      if (brightness < 0 || brightness > 100) throw new Error('Invalid brightness');
      await openhabService.sendItemCommand(
        item.externalId,
        `${color[0]},${color[1]},${brightness}`
      );
      return;
    }
    if (
      ['rgb_color', 'xy_color', 'color_temp_kelvin', 'effect'].some(
        (key) => serviceData[key] !== undefined
      )
    )
      throw new Error('This openHAB light setting is unavailable');
    if (service === 'set_cover_position') return cover(id, number('position'));
    const types = {
      turn_on: 'turn_on',
      turn_off: 'turn_off',
      media_play_pause: 'play_pause',
      media_play: 'start',
      media_pause: 'pause',
      lock: 'lock',
      unlock: 'unlock',
      open_cover: 'open',
      close_cover: 'close',
      stop_cover: 'stop',
    } as const;
    let action: NavetCommand;
    if (service === 'volume_set')
      action = { type: 'set_volume', entityId: id, volume: number('volume_level') * 100 };
    else if (service === 'set_percentage')
      action = { type: 'set_fan_speed', entityId: id, percentage: number('percentage') };
    else if (service === 'set_temperature')
      action = { type: 'set_temperature', entityId: id, temperature: number('temperature') };
    else if (service === 'turn_on' && serviceData.brightness_pct !== undefined)
      action = { type: 'set_brightness', entityId: id, brightness: number('brightness_pct') };
    else if (service in types)
      action = { type: types[service as keyof typeof types], entityId: id };
    else throw new Error('This openHAB action is unavailable');
    await command(id, action);
  },
};
