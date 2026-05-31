import { binarySensorEntityFactory } from '../entities/binary-sensor';
import { lightEntityFactory } from '../entities/light';

export const zigbee2MqttFixtures = {
  light: lightEntityFactory({
    friendly_name: 'Z2M Kitchen Strip',
    linkquality: 101,
    color_mode: 'xy',
  }),
  motion: binarySensorEntityFactory({
    friendly_name: 'Z2M Hall Motion',
    battery: 88,
    linkquality: 93,
  }),
};
