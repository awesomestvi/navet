export type MarketingReleaseHighlight = {
  type: 'Fixed' | 'Improved' | 'New' | 'Security';
  description: string;
};

export type MarketingLatestRelease = {
  version: string;
  url: string;
  highlights: readonly MarketingReleaseHighlight[];
};

declare const __MARKETING_LATEST_RELEASE__: MarketingLatestRelease;

export const MARKETING_LATEST_RELEASE = __MARKETING_LATEST_RELEASE__;
