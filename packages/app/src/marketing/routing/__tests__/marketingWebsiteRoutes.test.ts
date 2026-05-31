import { describe, expect, it } from 'vitest';
import { normalizeWebsitePathname, resolveMarketingWebsiteRoute } from '../marketingWebsiteRoutes';

describe('marketing website routes', () => {
  it('normalizes paths relative to a Pages base path', () => {
    expect(normalizeWebsitePathname('/navet/install', '/navet/')).toBe('/install/');
    expect(normalizeWebsitePathname('/navet/roadmap/', '/navet/')).toBe('/roadmap/');
    expect(normalizeWebsitePathname('/navet/', '/navet/')).toBe('/');
  });

  it('resolves supported routes', () => {
    expect(resolveMarketingWebsiteRoute('/navet/', '/navet/').id).toBe('home');
    expect(resolveMarketingWebsiteRoute('/navet/install/', '/navet/').id).toBe('install');
    expect(resolveMarketingWebsiteRoute('/navet/roadmap/', '/navet/').id).toBe('roadmap');
  });

  it('falls back unknown routes to home', () => {
    expect(resolveMarketingWebsiteRoute('/navet/not-found/', '/navet/').id).toBe('home');
  });
});
