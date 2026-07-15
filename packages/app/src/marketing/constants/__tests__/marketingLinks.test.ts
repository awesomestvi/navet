import { describe, expect, it } from 'vitest';
import { getMarketingWebsitePath, MARKETING_URLS } from '../marketingLinks';

describe('marketing links', () => {
  it('uses the real public repo and pages URLs', () => {
    expect(MARKETING_URLS.github).toBe('https://github.com/awesomestvi/navet');
    expect(MARKETING_URLS.demo).toBe('https://demo.navet.app/');
    expect(MARKETING_URLS.storybook).toBe('https://storybook.navet.app/');
    expect(MARKETING_URLS.docsIndex).toBe('https://docs.navet.app/');
    expect(MARKETING_URLS.gettingStarted).toBe('https://docs.navet.app/getting-started/');
    expect(MARKETING_URLS.install.page).toBe('https://docs.navet.app/install/');
    expect(MARKETING_URLS.install.homeAssistantGuide).toBe(
      'https://docs.navet.app/install/home-assistant/'
    );
  });

  it('builds base-aware internal paths', () => {
    expect(getMarketingWebsitePath('/')).toBe('/');
    expect(getMarketingWebsitePath('/install/')).toBe('/install/');
  });
});
