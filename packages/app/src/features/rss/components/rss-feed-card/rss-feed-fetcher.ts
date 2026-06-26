import { resolveAddonLocalEndpointUrl } from '@navet/app/utils/home-assistant-connection-target';
import { parseRSSDocument } from './rss-feed-parser';
import type { RSSItem, RSSProvider } from './types';

const RSS_PROXY_PATH = '/__navet_rss_proxy__';

function shouldFetchRSSDirectly() {
  return (
    typeof document !== 'undefined' && document.documentElement.dataset.navetStorybook === 'true'
  );
}

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

  const response = await fetch(
    shouldFetchRSSDirectly() ? provider.feedUrl : getRSSProxyRequestUrl(provider.feedUrl),
    {
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    throw new Error(`unable-to-load:${provider.name}`);
  }

  const xml = await response.text();
  return parseRSSDocument(xml, provider.name, fallbackRecentLabel, formatRelativeTime);
}
