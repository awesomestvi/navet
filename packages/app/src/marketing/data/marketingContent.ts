import { MARKETING_URLS } from '@navet/app/marketing/constants/marketingLinks';
import { Bot, LayoutDashboard, Palette, PanelsTopLeft, Smartphone, ToggleLeft } from 'lucide-react';

export const MARKETING_HERO_CONTENT = {
  headline: {
    lead: 'One surface for the',
    accent: 'smart home',
  },
  subheadline:
    'Navet turns provider integrations into a cleaner daily dashboard for wall panels, tablets, desktops, and phones, with shared UI already running across Home Assistant, Homey, and openHAB.',
  supportLine: 'Less dashboard maintenance, more useful control.',
  pills: ['3 providers', '30+ shared surfaces', 'Wall panels to phones'],
  primaryCtas: [{ label: 'Try the demo', href: MARKETING_URLS.demo }],
  secondaryCtas: [
    { label: 'View GitHub', href: MARKETING_URLS.github, external: true },
    {
      label: 'How to install',
      href: MARKETING_URLS.install.page,
      external: false,
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
    title: 'Provider-neutral by design',
    description:
      'Shared UI sits above provider adapters instead of collapsing into one backend-specific frontend.',
    icon: Bot,
  },
  {
    title: 'Built for real surfaces',
    description:
      'The same home stays usable on kiosk displays, tablets on the wall, desktops, and phones in hand.',
    icon: Smartphone,
  },
  {
    title: 'A calmer daily dashboard',
    description:
      'The product aims for quick household control instead of raw admin screens and startup-style marketing noise.',
    icon: ToggleLeft,
  },
] as const;

export const MARKETING_PRODUCT_PROOF = {
  title: 'Less dashboard maintenance. More useful control.',
  description:
    'Navet is not trying to expose every backend concept on the first screen. It keeps the interface direct, room-based, and practical for the routines people repeat every day.',
  columns: [
    {
      kicker: 'Dashboard shape',
      title: 'Rooms first, not settings first.',
      items: ['Home', 'Lights', 'Media', 'Energy', 'Climate', 'Security', 'Tasks', 'Settings'],
    },
    {
      kicker: 'Device coverage',
      title: 'Core controls already share the same surface.',
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
  title: '3 providers.',
  subtitle: '30+ shared surfaces already in motion.',
  providers: [
    { name: 'Home Assistant', status: 'Available in Navet today' },
    { name: 'Homey', status: 'Available in Navet today' },
    { name: 'openHAB', status: 'Available in Navet today' },
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

export const MARKETING_INSTALL_OPTIONS = [
  {
    label: 'Home Assistant',
    title: 'Home Assistant Custom Panel',
    description:
      'Run Navet in the Home Assistant sidebar through HACS when you want a Home Assistant-hosted experience.',
    href: MARKETING_URLS.install.homeAssistantCustomPanel,
  },
  {
    label: 'Home Assistant',
    title: 'Home Assistant Add-on',
    description:
      'Use Ingress when you want Home Assistant to own installation, updates, and the local app lifecycle.',
    href: MARKETING_URLS.install.homeAssistantAddon,
  },
  {
    label: 'Standalone',
    title: 'Standalone Docker',
    description:
      'Run Navet as its own app when you want the same dashboard shell with provider setup that matches your deployment.',
    href: MARKETING_URLS.install.standaloneDocker,
  },
] as const;

export const MARKETING_PRIVACY = {
  eyebrow: 'PRIVACY',
  title: 'Local by default.',
  description:
    'Navet is built for self-hosted smart homes. Your provider data, dashboard state, and credentials stay on your own device or server, not on Navet servers.',
  pills: ['Local storage', 'Self-hosted friendly', 'Provider tokens stay local'],
} as const;

export const MARKETING_SECONDARY_INSTALLS = [
  { title: 'Homey standalone setup', href: MARKETING_URLS.install.homey },
  { title: 'openHAB standalone setup', href: MARKETING_URLS.install.openhab },
] as const;

export const MARKETING_ROADMAP = {
  title: 'Clear about what ships now and what still needs work.',
  description:
    'Provider-neutral architecture is already real in the product, but maturity is not equal everywhere. The roadmap keeps current proof separate from the next layer of expansion.',
  now: [
    'Provider-neutral app shell',
    'Core dashboard cards',
    'Themes',
    'Mature Home Assistant path',
  ],
  next: [
    'More entity coverage',
    'Easier dashboard customization',
    'Better kiosk and tablet performance',
  ],
  later: ['Broader provider maturity', 'Additional provider integrations'],
} as const;
