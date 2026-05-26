export const homeAssistantRestFixtures = {
  apiRoot: { message: 'API running.' },
  config: {
    location_name: 'Home',
    time_zone: 'Europe/Stockholm',
    version: '2026.5.0',
    unit_system: {
      length: 'km',
      mass: 'g',
      temperature: 'C',
      volume: 'L',
    },
  },
  serviceSuccess: {
    status: 200,
    body: [],
  },
  unauthorized: {
    status: 401,
    body: { message: 'Unauthorized' },
  },
};
