import { MARKETING_WEBSITE_ROUTES } from '@navet/app/marketing/routing/marketingWebsiteRoutes';
import { afterEach, describe, expect, it } from 'vitest';
import { applyMarketingWebsiteMetadata } from '../marketingMetadata';

describe('marketing website metadata', () => {
  afterEach(() => {
    document.head.innerHTML = '';
    document.title = '';
  });

  it('applies homepage metadata', () => {
    applyMarketingWebsiteMetadata(MARKETING_WEBSITE_ROUTES.home);

    expect(document.title).toBe('Navet - A beautiful smart-home dashboard');
    expect(
      document.head.querySelector('meta[name="description"]')?.getAttribute('content')
    ).toContain('provider-neutral smart-home dashboard');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://navet.app/'
    );
  });

  it('applies route-specific metadata', () => {
    applyMarketingWebsiteMetadata(MARKETING_WEBSITE_ROUTES.install);

    expect(document.title).toBe('Install Navet');
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      'Install Navet'
    );
    expect(document.head.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(
      'https://navet.app/install/'
    );
  });
});
