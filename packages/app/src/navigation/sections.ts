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

export type NavigationDestination =
  | { kind: 'section'; section: Section }
  | { kind: 'custom_sidebar'; actionId: string };

const HOME_ASSISTANT_INGRESS_PREFIX = '/api/hassio_ingress/';

// Read the <base href> injected by nginx for HA Ingress support.
// Returns '/' when running standalone (no base tag or base href='/').
const getBasePath = (): string => {
  if (typeof document === 'undefined') return '/';
  const href = document.querySelector('base')?.getAttribute('href');
  if (!href || href === '/') return '/';

  try {
    const url = new URL(href, window.location.origin);
    return url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
  } catch {
    return href.endsWith('/') ? href : `${href}/`;
  }
};

const getDemoPathPrefix = (pathname: string): string | null => {
  const segments = pathname.split('/').filter(Boolean);
  const demoSegmentIndex = segments.indexOf('demo');
  if (demoSegmentIndex === -1) return null;
  return `/${segments.slice(0, demoSegmentIndex + 1).join('/')}`;
};

const getIngressDestinationFromPath = (pathname: string): NavigationDestination | null => {
  const ingressStart = pathname.indexOf(HOME_ASSISTANT_INGRESS_PREFIX);
  if (ingressStart === -1) {
    return null;
  }

  const pathAfterIngressPrefix = pathname.slice(
    ingressStart + HOME_ASSISTANT_INGRESS_PREFIX.length
  );
  const segments = pathAfterIngressPrefix.split('/').filter(Boolean);
  const route = segments[1] ?? '';

  if (route === 'embedded') {
    const actionId = segments[2] ?? '';
    return actionId ? { kind: 'custom_sidebar', actionId } : { kind: 'section', section: 'home' };
  }

  return { kind: 'section', section: isSection(route) ? route : 'home' };
};

const stripLeadingSlash = (value: string) => value.replace(/^\//, '');

function buildBaseRelativePath(segment?: string): string {
  const base = getBasePath();
  const trimmedSegment = segment ? stripLeadingSlash(segment) : '';
  if (!trimmedSegment) {
    return base;
  }

  return `${base}${trimmedSegment}`;
}

export const sectionToPath = (section: Section): string => {
  if (typeof window !== 'undefined') {
    const demoPathPrefix = getDemoPathPrefix(window.location.pathname);
    if (demoPathPrefix) {
      return section === 'home' ? demoPathPrefix : `${demoPathPrefix}/${section}`;
    }
  }

  return section === 'home' ? buildBaseRelativePath() : buildBaseRelativePath(section);
};

export const customSidebarActionToPath = (actionId: string): string => {
  if (typeof window !== 'undefined') {
    const demoPathPrefix = getDemoPathPrefix(window.location.pathname);
    if (demoPathPrefix) {
      return `${demoPathPrefix}/embedded/${encodeURIComponent(actionId)}`;
    }
  }

  return buildBaseRelativePath(`embedded/${encodeURIComponent(actionId)}`);
};

export const pathToDestination = (pathname: string): NavigationDestination => {
  const ingressDestination = getIngressDestinationFromPath(pathname);
  if (ingressDestination) {
    return ingressDestination;
  }

  const pathSegments = pathname.split('/').filter(Boolean);
  const demoSegmentIndex = pathSegments.indexOf('demo');
  if (demoSegmentIndex !== -1) {
    const segment = pathSegments[demoSegmentIndex + 1] ?? '';
    if (segment === 'embedded') {
      const actionId = pathSegments[demoSegmentIndex + 2] ?? '';
      return actionId
        ? { kind: 'custom_sidebar', actionId: decodeURIComponent(actionId) }
        : { kind: 'section', section: 'home' };
    }

    if (!segment || !isSection(segment)) {
      return { kind: 'section', section: 'home' };
    }

    return { kind: 'section', section: segment };
  }

  const base = getBasePath();
  const relative =
    base !== '/' && pathname.startsWith(base)
      ? pathname.slice(base.length)
      : pathname.replace(/^\//, '');
  const segment = relative.split('/')[0] ?? '';

  if (segment === 'embedded') {
    const actionId = relative.split('/')[1] ?? '';
    return actionId
      ? { kind: 'custom_sidebar', actionId: decodeURIComponent(actionId) }
      : { kind: 'section', section: 'home' };
  }

  if (!segment || !isSection(segment)) {
    return { kind: 'section', section: 'home' };
  }

  return { kind: 'section', section: segment };
};

export const pathToSection = (pathname: string): Section => {
  const destination = pathToDestination(pathname);
  return destination.kind === 'section' ? destination.section : 'home';
};
