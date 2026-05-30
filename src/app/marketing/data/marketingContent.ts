import { Bot, LayoutDashboard, Palette, PanelsTopLeft, Smartphone, ToggleLeft } from 'lucide-react';
import { MARKETING_URLS } from '@/app/marketing/constants/marketingLinks';

export const MARKETING_HERO_CONTENT = {
  headline: 'A beautiful dashboard for your Home Assistant smart home',
  subheadline:
    'Navet gives you a cleaner, more polished way to control your smart home from a wall panel, tablet, desktop, or phone.',
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
    title: 'Home Assistant support',
    description: 'Connect Navet to your existing Home Assistant setup.',
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
      'The cleanest Home Assistant-native setup. Navet is served inside Home Assistant and reuses the existing frontend session.',
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
    description: 'Run Navet as its own app while still connecting to Home Assistant through OAuth.',
    href: MARKETING_URLS.install.standaloneDocker,
  },
] as const;

export const MARKETING_SECONDARY_INSTALLS = [
  { title: 'Homey standalone setup', href: MARKETING_URLS.install.homey },
  { title: 'openHAB standalone setup', href: MARKETING_URLS.install.openhab },
] as const;

export const MARKETING_ROADMAP = {
  now: ['Home Assistant support', 'Core dashboard cards', 'Themes', 'Docker install'],
  next: [
    'More entity coverage',
    'Easier dashboard customization',
    'Better kiosk and tablet performance',
  ],
  later: ['More smart-home platforms', 'Provider integrations'],
} as const;
