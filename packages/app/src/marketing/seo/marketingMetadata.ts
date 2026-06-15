import logoHorizontalLight from '@assets/public/logo-horizontal-light.svg';
import { getMarketingPublicSiteUrl } from '@navet/app/marketing/constants/marketingLinks';
import type { MarketingWebsiteRoute } from '@navet/app/marketing/routing/marketingWebsiteRoutes';

const DEFAULT_TITLE = 'Navet - A beautiful smart-home dashboard';
const DEFAULT_DESCRIPTION =
  'Navet is a provider-neutral smart-home dashboard with polished UI for wall panels, tablets, desktops, and phones, with support today for Home Assistant, Homey, and openHAB.';

export interface MarketingWebsiteMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  socialImageUrl: string;
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  const meta = existing ?? document.createElement('meta');

  for (const [key, value] of Object.entries(attributes)) {
    meta.setAttribute(key, value);
  }

  if (!existing) {
    document.head.append(meta);
  }
}

function upsertCanonicalLink(href: string) {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const link = existing ?? document.createElement('link');
  link.setAttribute('rel', 'canonical');
  link.setAttribute('href', href);
  if (!existing) {
    document.head.append(link);
  }
}

export function getMarketingWebsiteMetadata(
  route: MarketingWebsiteRoute
): MarketingWebsiteMetadata {
  const siteUrl = getMarketingPublicSiteUrl();
  const socialImageUrl = new URL(
    logoHorizontalLight,
    typeof window === 'undefined' ? siteUrl : window.location.origin
  ).toString();

  if (route.id === 'install') {
    return {
      title: 'Install Navet',
      description:
        'Choose the Navet install path that fits your provider and how you want the dashboard to be hosted.',
      canonicalUrl: new URL(route.pathname.slice(1), siteUrl).toString(),
      socialImageUrl,
    };
  }

  if (route.id === 'roadmap') {
    return {
      title: 'Navet Roadmap',
      description:
        'See what Navet ships today, what is coming next for dashboards and kiosk use, and where future provider work fits.',
      canonicalUrl: new URL(route.pathname.slice(1), siteUrl).toString(),
      socialImageUrl,
    };
  }

  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    canonicalUrl: siteUrl,
    socialImageUrl,
  };
}

export function applyMarketingWebsiteMetadata(route: MarketingWebsiteRoute) {
  const metadata = getMarketingWebsiteMetadata(route);

  document.title = metadata.title;
  upsertCanonicalLink(metadata.canonicalUrl);
  upsertMeta('meta[name="description"]', { name: 'description', content: metadata.description });
  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: metadata.title });
  upsertMeta('meta[property="og:description"]', {
    property: 'og:description',
    content: metadata.description,
  });
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: metadata.canonicalUrl });
  upsertMeta('meta[property="og:image"]', {
    property: 'og:image',
    content: metadata.socialImageUrl,
  });
  upsertMeta('meta[name="twitter:card"]', {
    name: 'twitter:card',
    content: 'summary_large_image',
  });
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: metadata.title });
  upsertMeta('meta[name="twitter:description"]', {
    name: 'twitter:description',
    content: metadata.description,
  });
  upsertMeta('meta[name="twitter:image"]', {
    name: 'twitter:image',
    content: metadata.socialImageUrl,
  });
}
