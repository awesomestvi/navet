import { coverEntityFactory } from '../entities/cover';
import { switchEntityFactory } from '../entities/switch';

export const shellyFixtures = {
  relaySwitch: switchEntityFactory({
    friendly_name: 'Shelly Relay',
  }),
  cover: coverEntityFactory({
    friendly_name: 'Shelly Blind',
    current_tilt_position: 55,
  }),
};
