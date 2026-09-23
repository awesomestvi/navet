import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  RSSArticleListLarge,
  RSSArticleListMedium,
  RSSArticleListSmall,
} from '../rss-article-list';
import { getRSSFeedCardSurfaceTokens } from '../surface-tokens';
import type { RSSItem } from '../types';

const items: RSSItem[] = [
  {
    id: 'first',
    title: 'First article',
    source: 'BBC',
    timeAgo: '1h',
    url: 'https://example.com/first',
    imageUrl: 'https://example.com/first.jpg',
  },
  {
    id: 'second',
    title: 'Second article',
    source: 'BBC',
    timeAgo: '2h',
    url: 'https://example.com/second',
    imageUrl: 'https://example.com/second.jpg',
  },
];

describe('RSSArticleListLarge', () => {
  it('keeps thumbnails off the critical request path', () => {
    render(
      <RSSArticleListLarge
        items={items}
        inEditMode={false}
        rssSurface={getRSSFeedCardSurfaceTokens('glass', '#f97316')}
        handleArticleClick={vi.fn()}
      />
    );

    expect(screen.getByAltText('First article')).toHaveAttribute('loading', 'lazy');
    expect(screen.getByAltText('First article')).toHaveAttribute('fetchpriority', 'low');
    expect(screen.getByAltText('First article')).toHaveAttribute('decoding', 'async');
    expect(screen.getByAltText('Second article')).toHaveAttribute('loading', 'lazy');
    expect(screen.getByAltText('Second article')).toHaveAttribute('fetchpriority', 'low');
    expect(screen.getByAltText('Second article')).toHaveAttribute('decoding', 'async');
  });
});

for (const [size, List] of [
  ['small', RSSArticleListSmall],
  ['medium', RSSArticleListMedium],
  ['large', RSSArticleListLarge],
] as const) {
  it(`${size} articles expose only safe links and open valid URLs`, () => {
    const handleArticleClick = vi.fn();
    render(
      <List
        items={[items[0], { ...items[1], url: 'javascript:alert(1)' }]}
        inEditMode={false}
        rssSurface={getRSSFeedCardSurfaceTokens('glass', '#f97316')}
        handleArticleClick={handleArticleClick}
      />
    );

    const validArticle = screen.getByRole('link', { name: /First article/ });
    const invalidArticle = screen.getByText('Second article').closest('a');
    expect(validArticle).toHaveAttribute('href', 'https://example.com/first');
    expect(invalidArticle).not.toHaveAttribute('href');
    fireEvent.click(validArticle);
    fireEvent.click(invalidArticle as HTMLElement);
    expect(handleArticleClick).toHaveBeenCalledExactlyOnceWith('https://example.com/first');
  });
}
