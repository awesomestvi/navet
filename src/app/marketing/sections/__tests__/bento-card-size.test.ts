import { describe, expect, it } from 'vitest';
import { getMarketingBentoCardSize } from '../bento-card-size';

describe('getMarketingBentoCardSize', () => {
  it('keeps the RSS bento tile on the large card layout path', () => {
    expect(getMarketingBentoCardSize('rss')).toBe('large');
  });
});
