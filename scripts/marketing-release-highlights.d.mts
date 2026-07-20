export type MarketingReleaseHighlight = {
  type: 'Fixed' | 'Improved' | 'New' | 'Security';
  description: string;
};

export function getMarketingReleaseHighlights(
  changelog: string,
  version: string,
  limit?: number
): MarketingReleaseHighlight[];
