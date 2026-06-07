import { describe, expect, it } from 'vitest';
import { getMarketingBentoCardSize } from '../bento-card-size';

describe('getMarketingBentoCardSize', () => {
  it('keeps the RSS bento tile on the large card layout path', () => {
    expect(getMarketingBentoCardSize('rss')).toBe('large');
  });

  it('keeps the humidifier and alarm panel on medium card layout paths', () => {
    expect(getMarketingBentoCardSize('humidifier')).toBe('medium');
    expect(getMarketingBentoCardSize('alarmPanel')).toBe('medium');
  });
});
