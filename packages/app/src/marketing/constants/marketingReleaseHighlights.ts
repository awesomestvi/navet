export type MarketingReleaseHighlight = {
  type: 'Fixed' | 'Improved' | 'New' | 'Security';
  description: string;
};

declare const __MARKETING_RELEASE_HIGHLIGHTS__: readonly MarketingReleaseHighlight[];

export const MARKETING_RELEASE_HIGHLIGHTS = __MARKETING_RELEASE_HIGHLIGHTS__;
