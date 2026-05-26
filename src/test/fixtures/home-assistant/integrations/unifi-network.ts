import { deviceTrackerEntityFactory } from '../entities/device-tracker';
import { updateEntityFactory } from '../entities/update';

export const unifiNetworkFixtures = {
  deviceTracker: deviceTrackerEntityFactory({
    friendly_name: 'Family iPhone',
    source_type: 'router',
  }),
  firmwareUpdate: updateEntityFactory({
    friendly_name: 'Access Point Firmware',
  }),
};
