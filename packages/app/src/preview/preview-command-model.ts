import type { NavetCommand, NavetEntity } from '@navet/core/types';

export function applyPreviewCommandToEntity(
  entity: NavetEntity,
  command: NavetCommand
): NavetEntity {
  switch (command.type) {
    case 'turn_on':
      return {
        ...entity,
        primaryState: entity.type === 'switch' || entity.type === 'helper' ? true : 'on',
        attributes: {
          ...entity.attributes,
          value: entity.type === 'switch' || entity.type === 'helper' ? true : 'on',
        },
      };
    case 'turn_off':
      return {
        ...entity,
        primaryState: entity.type === 'switch' || entity.type === 'helper' ? false : 'off',
        attributes: {
          ...entity.attributes,
          value: entity.type === 'switch' || entity.type === 'helper' ? false : 'off',
        },
      };
    case 'set_brightness':
      return {
        ...entity,
        primaryState: 'on',
        attributes: { ...entity.attributes, value: 'on', brightnessPct: command.brightness },
      };
    case 'set_color_temperature':
      return {
        ...entity,
        primaryState: 'on',
        attributes: { ...entity.attributes, value: 'on', colorTemperatureKelvin: command.kelvin },
      };
    case 'lock':
      return {
        ...entity,
        primaryState: 'locked',
        attributes: { ...entity.attributes, value: 'locked', locked: true },
      };
    case 'unlock':
      return {
        ...entity,
        primaryState: 'unlocked',
        attributes: { ...entity.attributes, value: 'unlocked', locked: false },
      };
    case 'open':
      return {
        ...entity,
        primaryState: 'open',
        attributes: { ...entity.attributes, value: 'open', position: 100 },
      };
    case 'close':
      return {
        ...entity,
        primaryState: 'closed',
        attributes: { ...entity.attributes, value: 'closed', position: 0 },
      };
    case 'stop':
      return entity;
    default:
      return entity;
  }
}
