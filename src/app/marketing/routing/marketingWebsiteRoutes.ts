export type MarketingWebsiteRouteId = 'home' | 'install' | 'roadmap';

export interface MarketingWebsiteRoute {
  id: MarketingWebsiteRouteId;
  pathname: '/' | '/install/' | '/roadmap/';
}

export const MARKETING_WEBSITE_ROUTES: Record<MarketingWebsiteRouteId, MarketingWebsiteRoute> = {
  home: { id: 'home', pathname: '/' },
  install: { id: 'install', pathname: '/install/' },
  roadmap: { id: 'roadmap', pathname: '/roadmap/' },
};

function ensureLeadingSlash(pathname: string) {
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

function ensureTrailingSlash(pathname: string) {
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

export function normalizeWebsitePathname(pathname: string, baseUrl = '/') {
  const normalizedBaseUrl = ensureTrailingSlash(ensureLeadingSlash(baseUrl));
  const normalizedPathname = ensureTrailingSlash(ensureLeadingSlash(pathname));

  if (normalizedBaseUrl !== '/' && normalizedPathname.startsWith(normalizedBaseUrl)) {
    const stripped = normalizedPathname.slice(normalizedBaseUrl.length - 1);
    return ensureTrailingSlash(ensureLeadingSlash(stripped));
  }

  return normalizedPathname;
}

export function resolveMarketingWebsiteRoute(
  pathname: string,
  baseUrl = '/'
): MarketingWebsiteRoute {
  const normalizedPathname = normalizeWebsitePathname(pathname, baseUrl);

  if (normalizedPathname === MARKETING_WEBSITE_ROUTES.install.pathname) {
    return MARKETING_WEBSITE_ROUTES.install;
  }

  if (normalizedPathname === MARKETING_WEBSITE_ROUTES.roadmap.pathname) {
    return MARKETING_WEBSITE_ROUTES.roadmap;
  }

  return MARKETING_WEBSITE_ROUTES.home;
}
