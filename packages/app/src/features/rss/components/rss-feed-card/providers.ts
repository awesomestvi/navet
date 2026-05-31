import type { RSSProvider } from './types';

export const DEFAULT_RSS_PROVIDERS: RSSProvider[] = [
  {
    id: 'bbc-world',
    name: 'BBC World',
    type: 'url',
    feedUrl: 'https://feeds.bbci.co.uk/news/world/rss.xml',
  },
];
