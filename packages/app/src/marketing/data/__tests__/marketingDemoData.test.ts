import { describe, expect, it } from 'vitest';
import { MARKETING_BENTO_RSS_ITEMS } from '../marketingDemoData';

describe('MARKETING_BENTO_RSS_ITEMS', () => {
  it('includes thumbnails for the RSS bento card articles', () => {
    expect(MARKETING_BENTO_RSS_ITEMS.every((item) => typeof item.imageUrl === 'string')).toBe(true);
  });
});
