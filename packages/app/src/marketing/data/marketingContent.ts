import { MARKETING_URLS } from '@navet/app/marketing/constants/marketingLinks';
import {
  Cable,
  LayoutDashboard,
  Palette,
  PanelsTopLeft,
  Smartphone,
  ToggleLeft,
} from 'lucide-react';

export const MARKETING_HERO_CONTENT = {
  headline: {
    lead: 'A calmer dashboard for',
    accent: 'your smart home',
  },
  subheadline:
    'Navet is a polished, local-first smart-home dashboard for Home Assistant, Homey, and openHAB, designed for wall panels, tablets, desktops, and phones.',
  supportLine: 'Rooms, devices, and routines without the admin-screen clutter.',
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

export const MARKETING_FEATURES = [
  {
    title: 'Rooms that stay familiar',
    description:
      'Home, lights, media, energy, climate, security, tasks, and settings stay consistent across the home.',
    icon: PanelsTopLeft,
  },
  {
    title: 'Coverage people actually use',
    description:
      'Lights, climate, media, locks, cameras, scenes, sensors, calendars, and more already fit the same product language.',
    icon: Palette,
  },
  {
    title: 'Details beyond device cards',
    description:
      'RSS, photo, note, battery, UPS, map, and energy widgets cover the information that should not be buried.',
    icon: LayoutDashboard,
  },
  {
    title: 'Works with your platform',
    description:
      'Use Navet with Home Assistant, Homey, or openHAB without changing how the dashboard feels.',
    icon: Cable,
  },
  {
    title: 'Built for real surfaces',
    description:
      'The same home stays usable on kiosk displays, tablets on the wall, desktops, and phones in hand.',
    icon: Smartphone,
  },
  {
    title: 'Daily control without the clutter',
    description:
      'Reach the rooms, devices, and routines you use every day without digging through raw admin screens.',
    icon: ToggleLeft,
  },
] as const;

export const MARKETING_PRODUCT_PROOF = {
  title: 'Rooms first. Controls close at hand.',
  description:
    'Navet keeps daily control direct and room-based, with the details you need close by and backend complexity out of the way.',
  columns: [
    {
      kicker: 'Dashboard shape',
      title: 'Rooms first, not settings first.',
      items: ['Home', 'Lights', 'Media', 'Energy', 'Climate', 'Security', 'Tasks', 'Settings'],
    },
    {
      kicker: 'Device coverage',
      title: 'Core controls share one visual language.',
      items: [
        'Lights',
        'Switches',
        'Fans',
        'Climate',
        'Covers',
        'Locks',
        'Cameras',
        'Media players',
        'Weather',
        'Calendars',
        'People',
        'Sensors',
        'Scenes',
        'Vacuums',
      ],
    },
    {
      kicker: 'Utility widgets',
      title: 'The extra details still belong on the dashboard.',
      items: ['RSS', 'Photo', 'Note', 'Battery', 'UPS', 'Energy now', 'Button', 'Map'],
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
    'Climate',
    'Covers',
    'Locks',
    'Cameras',
    'Media players',
    'Weather',
    'Calendars',
    'People',
    'Sensors',
    'Scenes',
    'Vacuums',
  ],
  widgets: ['RSS', 'Photo', 'Note', 'Battery', 'UPS', 'Energy now', 'Button', 'Map'],
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
    'Home Assistant, Homey, and openHAB support',
    'Core dashboard cards',
    'Themes',
    'Wall-panel, tablet, desktop, and phone layouts',
  ],
  next: [
    'More entity coverage',
    'Easier dashboard customization',
    'Better kiosk and tablet performance',
  ],
  later: ['Broader provider maturity', 'Additional provider integrations'],
} as const;
