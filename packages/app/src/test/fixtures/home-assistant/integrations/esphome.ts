import { buttonEntityFactory } from '../entities/button';
import { sensorEntityFactory } from '../entities/sensor';

export const esphomeFixtures = {
  temperatureSensor: sensorEntityFactory({
    friendly_name: 'ESPHome Desk Temperature',
  }),
  restartButton: buttonEntityFactory({
    friendly_name: 'ESPHome Restart',
  }),
};
