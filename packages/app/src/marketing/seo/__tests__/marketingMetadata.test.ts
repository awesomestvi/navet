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

    expect(document.title).toBe('Provider-neutral Smart Home Dashboard | Navet');
    expect(
      document.head.querySelector('meta[name="description"]')?.getAttribute('content')
    ).toContain('local-first smart home dashboard');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://navet.app/'
    );
  });

  it('replaces Cards metadata when navigating back home', () => {
    applyMarketingWebsiteMetadata(MARKETING_WEBSITE_ROUTES.cards);
    expect(document.title).toBe('Navet Cards — Home Assistant dashboard cards');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://navet.app/cards/'
    );
    applyMarketingWebsiteMetadata(MARKETING_WEBSITE_ROUTES.home);
    expect(document.title).toBe('Provider-neutral Smart Home Dashboard | Navet');
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://navet.app/'
    );
  });

  it('applies route-specific metadata', () => {
    applyMarketingWebsiteMetadata(MARKETING_WEBSITE_ROUTES.roadmap);

    expect(document.title).toBe('Navet Roadmap — What is shipping now and next');
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      'Navet Roadmap — What is shipping now and next'
    );
    expect(document.head.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(
      'https://navet.app/roadmap/'
    );
    expect(document.head.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
      'https://navet.app/navet-social-card.jpg'
    );
  });
});
