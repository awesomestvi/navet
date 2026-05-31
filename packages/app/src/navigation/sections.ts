export type Section =
  | 'home'
  | 'energy'
  | 'climate'
  | 'security'
  | 'tasks'
  | 'lights'
  | 'media'
  | 'settings';

export const NAVIGATION_SECTIONS = [
  'home',
  'energy',
  'climate',
  'security',
  'lights',
  'media',
  'tasks',
  'settings',
] as const satisfies readonly Section[];

export const isSection = (value: unknown): value is Section =>
  typeof value === 'string' && NAVIGATION_SECTIONS.includes(value as Section);

const HOME_ASSISTANT_INGRESS_PREFIX = '/api/hassio_ingress/';

// Read the <base href> injected by nginx for HA Ingress support.
// Returns '/' when running standalone (no base tag or base href='/').
const getBasePath = (): string => {
  if (typeof document === 'undefined') return '/';
  const href = document.querySelector('base')?.getAttribute('href');
  if (!href || href === '/') return '/';
  return href.endsWith('/') ? href : `${href}/`;
};

const getDemoPathPrefix = (pathname: string): string | null => {
  const segments = pathname.split('/').filter(Boolean);
  const demoSegmentIndex = segments.indexOf('demo');
  if (demoSegmentIndex === -1) return null;
  return `/${segments.slice(0, demoSegmentIndex + 1).join('/')}`;
};

const getIngressSectionFromPath = (pathname: string): Section | null => {
  const ingressStart = pathname.indexOf(HOME_ASSISTANT_INGRESS_PREFIX);
  if (ingressStart === -1) {
    return null;
  }

  const pathAfterIngressPrefix = pathname.slice(
    ingressStart + HOME_ASSISTANT_INGRESS_PREFIX.length
  );
  const segments = pathAfterIngressPrefix.split('/').filter(Boolean);
  const section = segments[1] ?? '';

  return isSection(section) ? section : 'home';
};

export const sectionToPath = (section: Section): string => {
  if (typeof window !== 'undefined') {
    const demoPathPrefix = getDemoPathPrefix(window.location.pathname);
    if (demoPathPrefix) {
      return section === 'home' ? demoPathPrefix : `${demoPathPrefix}/${section}`;
    }
  }

  const base = getBasePath();
  return section === 'home' ? base : `${base}${section}`;
};

export const pathToSection = (pathname: string): Section => {
  const ingressSection = getIngressSectionFromPath(pathname);
  if (ingressSection) {
    return ingressSection;
  }

  const pathSegments = pathname.split('/').filter(Boolean);
  const demoSegmentIndex = pathSegments.indexOf('demo');
  if (demoSegmentIndex !== -1) {
    const segment = pathSegments[demoSegmentIndex + 1] ?? '';
    if (!segment || !isSection(segment)) return 'home';
    return segment;
  }

  const base = getBasePath();
  const relative =
    base !== '/' && pathname.startsWith(base)
      ? pathname.slice(base.length)
      : pathname.replace(/^\//, '');
  const segment = relative.split('/')[0] ?? '';
  if (!segment || !isSection(segment)) return 'home';
  return segment;
};
