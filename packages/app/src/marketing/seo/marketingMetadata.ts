import { getMarketingPublicSiteUrl } from '@navet/app/marketing/constants/marketingLinks';
import type { MarketingWebsiteRoute } from '@navet/app/marketing/routing/marketingWebsiteRoutes';

const DEFAULT_TITLE = 'Smart Home Dashboard for Home Assistant & Homey | Navet';
const DEFAULT_DESCRIPTION =
  'Navet is a local-first smart home dashboard for Home Assistant, Homey, and openHAB. Control smart lights, climate, media, and security on any screen.';
const SOCIAL_IMAGE_PATH = '/navet-social-card.jpg';

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
  const socialImageUrl = new URL(SOCIAL_IMAGE_PATH, siteUrl).toString();

  if (route.id === 'roadmap') {
    return {
      title: 'Navet Roadmap — What is shipping now and next',
      description:
        'See what Navet supports today, what the team is improving next, and where broader smart-home platform support fits.',
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
  upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: 'Navet' });
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
  upsertMeta('meta[property="og:image:type"]', {
    property: 'og:image:type',
    content: 'image/jpeg',
  });
  upsertMeta('meta[property="og:image:width"]', {
    property: 'og:image:width',
    content: '1200',
  });
  upsertMeta('meta[property="og:image:height"]', {
    property: 'og:image:height',
    content: '630',
  });
  upsertMeta('meta[property="og:image:alt"]', {
    property: 'og:image:alt',
    content: 'Navet smart-home dashboard shown on a tablet in a warm living room',
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
  upsertMeta('meta[name="twitter:image:alt"]', {
    name: 'twitter:image:alt',
    content: 'Navet smart-home dashboard shown on a tablet in a warm living room',
  });
}
