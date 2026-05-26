import { sensorEntityFactory } from '../entities/sensor';
import { switchEntityFactory } from '../entities/switch';

export const mqttFixtures = {
  switch: switchEntityFactory({
    friendly_name: 'MQTT Garage Relay',
    availability_topic: 'garage/relay/availability',
  }),
  sensor: sensorEntityFactory({
    friendly_name: 'MQTT Temperature',
    state_topic: 'home/temperature',
  }),
};
