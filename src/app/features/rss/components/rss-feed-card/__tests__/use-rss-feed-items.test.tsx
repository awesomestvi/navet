import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/app/i18n/i18n-provider';
import type { RSSProvider } from '../types';
import { useRSSFeedItems } from '../use-rss-feed-items';

const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>;

const makeProvider = (id: string, name: string, feedUrl: string): RSSProvider => ({
  id,
  name,
  type: 'url',
  feedUrl,
});

const makeRssResponse = (items: string[]) => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    ${items.join('\n')}
  </channel>
</rss>`;

const makeItem = ({ title, link, pubDate }: { title: string; link: string; pubDate?: string }) => `
<item>
  <title>${title}</title>
  <link>${link}</link>
  ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ''}
</item>`;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useRSSFeedItems', () => {
  it('sorts merged provider items by recency before applying the limit', async () => {
    const providers = [
      makeProvider('bbc-world-sort', 'BBC World', 'https://feeds.example.com/bbc.xml'),
      makeProvider('dn-sort', 'DN', 'https://feeds.example.com/dn.xml'),
    ];

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes(encodeURIComponent('https://feeds.example.com/bbc.xml'))) {
        return new Response(
          makeRssResponse([
            makeItem({
              title: 'BBC older 1',
              link: 'https://bbc.example.com/1',
              pubDate: 'Mon, 01 Jan 2024 10:00:00 GMT',
            }),
            makeItem({
              title: 'BBC older 2',
              link: 'https://bbc.example.com/2',
              pubDate: 'Mon, 01 Jan 2024 09:00:00 GMT',
            }),
            makeItem({
              title: 'BBC older 3',
              link: 'https://bbc.example.com/3',
              pubDate: 'Mon, 01 Jan 2024 08:00:00 GMT',
            }),
          ])
        );
      }

      return new Response(
        makeRssResponse([
          makeItem({
            title: 'DN newest',
            link: 'https://dn.example.com/1',
            pubDate: 'Tue, 02 Jan 2024 10:00:00 GMT',
          }),
          makeItem({
            title: 'DN second',
            link: 'https://dn.example.com/2',
            pubDate: 'Tue, 02 Jan 2024 09:00:00 GMT',
          }),
        ])
      );
    });

    const { result } = renderHook(() => useRSSFeedItems(providers, null, 3), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toHaveLength(3);
    expect(result.current.items.map((item) => item.title)).toEqual([
      'DN newest',
      'DN second',
      'BBC older 1',
    ]);
    expect(result.current.items.map((item) => item.source)).toEqual(['DN', 'DN', 'BBC World']);
  });

  it('dedupes duplicate article URLs across providers', async () => {
    const providers = [
      makeProvider('bbc-world-dedupe', 'BBC World', 'https://feeds.example.com/bbc-dedupe.xml'),
      makeProvider('dn-dedupe', 'DN', 'https://feeds.example.com/dn-dedupe.xml'),
    ];

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes(encodeURIComponent('https://feeds.example.com/bbc-dedupe.xml'))) {
        return new Response(
          makeRssResponse([
            makeItem({
              title: 'Shared story',
              link: 'https://shared.example.com/story',
              pubDate: 'Tue, 02 Jan 2024 10:00:00 GMT',
            }),
          ])
        );
      }

      return new Response(
        makeRssResponse([
          makeItem({
            title: 'Shared story copy',
            link: 'https://shared.example.com/story',
            pubDate: 'Tue, 02 Jan 2024 11:00:00 GMT',
          }),
        ])
      );
    });

    const { result } = renderHook(() => useRSSFeedItems(providers, null, 10), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.url).toBe('https://shared.example.com/story');
  });

  it('keeps undated items after dated ones', async () => {
    const providers = [
      makeProvider('dated-provider', 'Dated', 'https://feeds.example.com/dated.xml'),
      makeProvider('undated-provider', 'Undated', 'https://feeds.example.com/undated.xml'),
    ];

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes(encodeURIComponent('https://feeds.example.com/dated.xml'))) {
        return new Response(
          makeRssResponse([
            makeItem({
              title: 'Dated article',
              link: 'https://dated.example.com/1',
              pubDate: 'Tue, 02 Jan 2024 10:00:00 GMT',
            }),
          ])
        );
      }

      return new Response(
        makeRssResponse([
          makeItem({
            title: 'Undated article',
            link: 'https://undated.example.com/1',
          }),
        ])
      );
    });

    const { result } = renderHook(() => useRSSFeedItems(providers, null, 10), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items.map((item) => item.title)).toEqual([
      'Dated article',
      'Undated article',
    ]);
    expect(result.current.items[0]?.publishedAtMs).toBeTypeOf('number');
    expect(result.current.items[1]?.publishedAtMs).toBeUndefined();
  });
});
