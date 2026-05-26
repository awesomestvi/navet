import { lockEntityFactory } from '../entities/lock';
import { sensorEntityFactory } from '../entities/sensor';

export const zwaveJsFixtures = {
  doorLock: lockEntityFactory({
    friendly_name: 'Z-Wave Front Door',
  }),
  nodeStatus: sensorEntityFactory({
    friendly_name: 'Front Door Node Status',
    device_class: null,
    unit_of_measurement: null,
  }),
};
