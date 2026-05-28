import type { PlatformEntitySnapshotMap } from '@/app/platform/provider-feature-models';
import { resolveAddonLocalEndpointUrl } from '@/app/utils/home-assistant-connection-target';
import { parseRSSDocument, toRSSItem } from './rss-feed-parser';
import type { RSSItem, RSSProvider } from './types';

const RSS_PROXY_PATH = '/__navet_rss_proxy__';

export function getRSSProxyRequestUrl(feedUrl: string) {
  const baseUrl =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'http://localhost';
  const proxyUrl = new URL(resolveAddonLocalEndpointUrl(RSS_PROXY_PATH), baseUrl);
  proxyUrl.searchParams.set('url', feedUrl);
  return proxyUrl.toString();
}

export async function fetchUrlProviderItems(
  provider: RSSProvider,
  fallbackRecentLabel: string,
  formatRelativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit) => string
): Promise<RSSItem[]> {
  if (provider.demoItems) {
    return provider.demoItems;
  }

  if (!provider.feedUrl) {
    return [];
  }

  const response = await fetch(getRSSProxyRequestUrl(provider.feedUrl), {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`unable-to-load:${provider.name}`);
  }

  const xml = await response.text();
  return parseRSSDocument(xml, provider.name, fallbackRecentLabel, formatRelativeTime);
}

export function getHomeAssistantProviderItems(
  provider: RSSProvider,
  entities: PlatformEntitySnapshotMap | null,
  fallbackRecentLabel: string,
  formatRelativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit) => string
): RSSItem[] {
  if (provider.type !== 'home-assistant-feedreader' || !provider.entityId || !entities) {
    return [];
  }

  const entity = entities[provider.entityId];
  if (!entity) {
    return [];
  }

  const attributes = entity.attributes as Record<string, unknown> | undefined;
  const link = typeof attributes?.link === 'string' ? attributes.link : undefined;
  const title =
    (typeof attributes?.title === 'string' && attributes.title) ||
    (typeof attributes?.friendly_name === 'string' && attributes.friendly_name) ||
    undefined;

  if (!link || !title) {
    return [];
  }

  return [
    toRSSItem({
      id: provider.entityId,
      title,
      providerName: provider.name,
      link,
      fallbackRecentLabel,
      formatRelativeTime,
      publishedAtRaw:
        (typeof attributes?.published === 'string' && attributes.published) ||
        (typeof attributes?.pubDate === 'string' && attributes.pubDate) ||
        (typeof attributes?.updated === 'string' && attributes.updated) ||
        undefined,
      excerpt:
        (typeof attributes?.summary === 'string' && attributes.summary) ||
        (typeof attributes?.description === 'string' && attributes.description) ||
        undefined,
      imageUrl:
        (typeof attributes?.image === 'string' && attributes.image) ||
        (typeof attributes?.entity_picture === 'string' && attributes.entity_picture) ||
        undefined,
    }),
  ];
}
