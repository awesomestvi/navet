import { MARKETING_URLS } from '@navet/app/marketing/constants/marketingLinks';

export const MARKETING_HERO_CONTENT = {
  headline: {
    lead: 'A smart home dashboard for',
    accent: 'every screen',
  },
  subheadline:
    'Use Navet as a polished, local-first dashboard for Home Assistant, Homey, or openHAB on wall panels, tablets, desktops, and phones.',
  supportLine:
    'Control smart lights, climate, media, energy, and security by room—without the admin-screen clutter.',
  pills: ['Local-first', '3 supported platforms', 'Wall panels to phones'],
  primaryCtas: [{ label: 'Explore the demo', href: MARKETING_URLS.demo }],
  secondaryCtas: [
    {
      label: 'How to install',
      href: MARKETING_URLS.install.page,
      external: true,
    },
  ],
} as const;

export const MARKETING_CURRENT_SUPPORT = {
  title: 'Works with three smart-home platforms.',
  subtitle:
    'Choose the platform you already use, then keep the same Navet experience across screens.',
  providers: [
    { name: 'Home Assistant', status: 'Most mature integration' },
    { name: 'Homey', status: 'Supported in standalone mode' },
    { name: 'openHAB', status: 'Supported in standalone mode' },
  ],
  dashboardSections: [
    'Home',
    'Lights',
    'Media',
    'Energy',
    'Climate',
    'Security',
    'Tasks',
    'Settings',
  ],
  cards: [
    'Lights',
    'Switches',
    'Fans',
    'Climate & HVAC',
    'Humidifiers',
    'Covers',
    'Locks',
    'Alarm panels',
    'Cameras',
    'Media players',
    'Weather',
    'Calendars',
    'People',
    'Sensors',
    'Sensor groups',
    'Scenes',
    'Helpers',
    'Vacuums',
    'Lawn mowers',
  ],
  widgets: [
    'Info',
    'RSS',
    'Photo',
    'Note',
    'Battery',
    'UPS',
    'Energy now',
    'Button',
    'Map',
    'Entity',
  ],
} as const;

export const MARKETING_PRIVACY = {
  eyebrow: 'PRIVACY',
  title: 'Local by default.',
  description:
    'Navet is built for self-hosted smart homes. Your provider data, dashboard state, and credentials stay on your own device or server, not on Navet servers.',
  pills: ['Local storage', 'Self-hosted friendly', 'Provider tokens stay local'],
} as const;

export const MARKETING_ROADMAP = {
  title: 'What Navet supports now—and what comes next.',
  description:
    'See what is ready today, what the team is improving next, and where broader platform support fits.',
  now: [
    'Home Assistant, Homey, and openHAB integrations',
    'Eight focused dashboard sections with editable Home layouts',
    'Nineteen entity-card families and ten addable widget types',
    'PWA installation, four themes, localization, and layouts from wall panels to phones',
  ],
  next: [
    'Multiple dashboards, views, and more flexible panel and stack layouts',
    'Standalone history, statistics, conditional, filter, floor-plan, logbook, gauge, timer, and list cards',
    'Per-user dashboards and profile editing',
  ],
  later: [
    'Continued Homey and openHAB maturity',
    'Hubitat support when product demand justifies it',
    'SmartThings support when product demand justifies it',
  ],
} as const;
