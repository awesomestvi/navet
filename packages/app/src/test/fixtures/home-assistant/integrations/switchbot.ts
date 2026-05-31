import { lockEntityFactory } from '../entities/lock';

export const switchBotFixtures = {
  lock: lockEntityFactory({
    friendly_name: 'SwitchBot Lock',
  }),
};
