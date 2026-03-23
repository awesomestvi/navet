export type Section =
  | 'home'
  | 'energy'
  | 'security'
  | 'tasks'
  | 'locks'
  | 'lights'
  | 'media'
  | 'settings';

export const NAVIGATION_SECTIONS = [
  'home',
  'energy',
  'security',
  'tasks',
  'locks',
  'lights',
  'media',
  'settings',
] as const satisfies readonly Section[];

export const isSection = (value: unknown): value is Section =>
  typeof value === 'string' && NAVIGATION_SECTIONS.includes(value as Section);

// Read the <base href> injected by nginx for HA Ingress support.
// Returns '/' when running standalone (no base tag or base href='/').
const getBasePath = (): string => {
  if (typeof document === 'undefined') return '/';
  const href = document.querySelector('base')?.getAttribute('href');
  if (!href || href === '/') return '/';
  return href.endsWith('/') ? href : `${href}/`;
};

export const sectionToPath = (section: Section): string => {
  const base = getBasePath();
  return section === 'home' ? base : `${base}${section}`;
};

export const pathToSection = (pathname: string): Section => {
  const base = getBasePath();
  const relative =
    base !== '/' && pathname.startsWith(base)
      ? pathname.slice(base.length)
      : pathname.replace(/^\//, '');
  const segment = relative.split('/')[0] ?? '';
  if (!segment || !isSection(segment)) return 'home';
  return segment;
};
