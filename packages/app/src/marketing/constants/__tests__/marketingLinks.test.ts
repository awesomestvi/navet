import { describe, expect, it } from 'vitest';
import { getMarketingWebsitePath, MARKETING_URLS } from '../marketingLinks';

describe('marketing links', () => {
  it('uses the real public repo and pages URLs', () => {
    expect(MARKETING_URLS.github).toBe('https://github.com/awesomestvi/navet');
    expect(MARKETING_URLS.demo).toBe('https://awesomestvi.github.io/navet/demo/');
    expect(MARKETING_URLS.storybook).toBe('https://awesomestvi.github.io/navet/storybook/');
  });

  it('builds base-aware internal paths', () => {
    expect(getMarketingWebsitePath('/')).toBe('/');
    expect(getMarketingWebsitePath('/install/')).toBe('/install/');
  });
});
