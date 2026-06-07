import type { CardSize } from '@navet/app/components/shared/card-size';
import { MARKETING_BENTO_CARDS } from '@navet/app/marketing/data/marketingDemoData';

export type BentoCardKey =
  | keyof typeof MARKETING_BENTO_CARDS
  | 'rss'
  | 'note'
  | 'map'
  | 'photo'
  | 'media'
  | 'hvac'
  | 'humidifier'
  | 'batteryOverview';

export function getMarketingBentoCardSize(cardKey: BentoCardKey): CardSize {
  if (cardKey === 'rss') {
    return 'large';
  }

  if (
    cardKey === 'note' ||
    cardKey === 'map' ||
    cardKey === 'photo' ||
    cardKey === 'media' ||
    cardKey === 'hvac' ||
    cardKey === 'humidifier' ||
    cardKey === 'batteryOverview'
  ) {
    return 'medium';
  }

  return MARKETING_BENTO_CARDS[cardKey].size;
}
