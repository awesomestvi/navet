export type MarketingWebsiteRouteId = 'home' | 'roadmap' | 'cards';

export interface MarketingWebsiteRoute {
  id: MarketingWebsiteRouteId;
  pathname: '/' | '/roadmap/' | '/cards/';
}

export const MARKETING_WEBSITE_ROUTES: Record<MarketingWebsiteRouteId, MarketingWebsiteRoute> = {
  cards: { id: 'cards', pathname: '/cards/' },
  home: { id: 'home', pathname: '/' },
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

  if (normalizedPathname === MARKETING_WEBSITE_ROUTES.roadmap.pathname) {
    return MARKETING_WEBSITE_ROUTES.roadmap;
  }

  if (normalizedPathname === MARKETING_WEBSITE_ROUTES.cards.pathname) {
    return MARKETING_WEBSITE_ROUTES.cards;
  }

  return MARKETING_WEBSITE_ROUTES.home;
}
