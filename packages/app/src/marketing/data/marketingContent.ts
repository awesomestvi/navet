import { MARKETING_URLS } from '@navet/app/marketing/constants/marketingLinks';
import { Bot, LayoutDashboard, Palette, PanelsTopLeft, Smartphone, ToggleLeft } from 'lucide-react';

export const MARKETING_HERO_CONTENT = {
  headline: 'A beautiful dashboard for your smart home',
  subheadline:
    'Navet gives you a cleaner, more polished way to control your smart home from a wall panel, tablet, desktop, or phone, with a provider-neutral architecture and the most mature support today centered on Home Assistant.',
  primaryCtas: [
    { label: 'Try the demo', href: MARKETING_URLS.demo, external: false },
    { label: 'Install Navet', href: '/install/', external: false },
  ],
  secondaryCta: {
    label: 'View on GitHub',
    href: MARKETING_URLS.github,
    external: true,
  },
} as const;

export const MARKETING_FEATURES = [
  {
    title: 'Wall-panel ready',
    description: 'Designed for tablets, kiosks, and always-on smart-home displays.',
    icon: PanelsTopLeft,
  },
  {
    title: 'Beautiful themes',
    description: 'Choose between light, dark, black, and glass-style themes.',
    icon: Palette,
  },
  {
    title: 'Smart-home cards',
    description: 'Control common smart-home devices through cards that feel consistent.',
    icon: LayoutDashboard,
  },
  {
    title: 'Multi-provider direction',
    description:
      'Built around shared UI and provider adapters instead of a single platform lock-in.',
    icon: Bot,
  },
  {
    title: 'Responsive layouts',
    description: 'Use Navet on wall panels, tablets, desktops, and phones.',
    icon: Smartphone,
  },
  {
    title: 'Simple everyday control',
    description: 'Make your smart home easier for the whole household to use.',
    icon: ToggleLeft,
  },
] as const;

export const MARKETING_CURRENT_SUPPORT = {
  providers: ['Home Assistant', 'Homey', 'openHAB'],
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
    label: 'Recommended',
    title: 'Home Assistant Custom Panel',
    description:
      'The most mature install path today. Navet is served inside Home Assistant and reuses the existing frontend session.',
    href: MARKETING_URLS.install.homeAssistantCustomPanel,
  },
  {
    label: 'Advanced',
    title: 'Home Assistant Add-on',
    description:
      'Run Navet through Home Assistant Ingress when you want Home Assistant to own installation and lifecycle.',
    href: MARKETING_URLS.install.homeAssistantAddon,
  },
  {
    label: 'Standalone',
    title: 'Standalone Docker',
    description:
      'Run Navet as its own app with the same provider-neutral shell, while using the provider setup that fits your deployment.',
    href: MARKETING_URLS.install.standaloneDocker,
  },
] as const;

export const MARKETING_SECONDARY_INSTALLS = [
  { title: 'Homey standalone setup', href: MARKETING_URLS.install.homey },
  { title: 'openHAB standalone setup', href: MARKETING_URLS.install.openhab },
] as const;

export const MARKETING_ROADMAP = {
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
