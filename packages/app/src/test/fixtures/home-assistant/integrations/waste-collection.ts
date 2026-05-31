import { calendarEntityFactory } from '../entities/calendar';

export const wasteCollectionFixtures = {
  calendar: calendarEntityFactory({
    friendly_name: 'Waste Pickup',
    all_day: true,
    message: 'Recycling',
  }),
};
