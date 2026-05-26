import { calendarEntityFactory } from '../entities/calendar';

export const googleCalendarFixtures = {
  calendar: calendarEntityFactory({
    friendly_name: 'Google Family Calendar',
    message: 'Dentist Appointment',
  }),
};
