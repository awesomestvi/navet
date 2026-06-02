import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MarketingWebsiteShell } from './MarketingWebsiteShell';

describe('MarketingWebsiteShell', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();

    if (!window.matchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
    }
  });

  it('renders the premium navbar links without a Home link', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));

    renderWithProviders(
      <MarketingWebsiteShell currentPathname="/">
        <div>Marketing body</div>
      </MarketingWebsiteShell>
    );

    const header = screen.getByRole('banner');

    expect(within(header).getByRole('link', { name: 'Navet home' })).toBeInTheDocument();
    expect(within(header).queryByRole('link', { name: 'Home' })).not.toBeInTheDocument();
    expect(within(header).getByRole('link', { name: 'Demo' })).toBeInTheDocument();
    expect(within(header).getByRole('link', { name: 'Storybook' })).toBeInTheDocument();
    expect(within(header).getByRole('link', { name: /GitHub/i })).toBeInTheDocument();
  });

  it('toggles the attached mobile navigation menu with aria state', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));

    renderWithProviders(
      <MarketingWebsiteShell currentPathname="/">
        <div>Marketing body</div>
      </MarketingWebsiteShell>
    );

    const toggle = screen.getByRole('button', { name: 'Open navigation menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('navigation', { name: 'Mobile primary' })).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(screen.getByRole('button', { name: 'Close navigation menu' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    const mobileNav = screen.getByRole('navigation', { name: 'Mobile primary' });
    expect(mobileNav).toBeInTheDocument();
    expect(within(mobileNav).getByRole('link', { name: 'Demo' })).toBeInTheDocument();
    expect(within(mobileNav).getByRole('link', { name: 'Storybook' })).toBeInTheDocument();
    expect(within(mobileNav).getByRole('link', { name: /^GitHub$/i })).toBeInTheDocument();
  });

  it('shows the cached GitHub star count when available', () => {
    window.localStorage.setItem(
      'marketing:github-stars',
      JSON.stringify({
        count: 1234,
        expiresAt: Date.now() + 60_000,
      })
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));

    renderWithProviders(
      <MarketingWebsiteShell currentPathname="/">
        <div>Marketing body</div>
      </MarketingWebsiteShell>
    );

    expect(screen.getAllByText('1.2K').length).toBeGreaterThan(0);
  });

  it('omits the GitHub star count inside the mobile menu', () => {
    window.localStorage.setItem(
      'marketing:github-stars',
      JSON.stringify({
        count: 1234,
        expiresAt: Date.now() + 60_000,
      })
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));

    renderWithProviders(
      <MarketingWebsiteShell currentPathname="/">
        <div>Marketing body</div>
      </MarketingWebsiteShell>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));

    const mobileNav = screen.getByRole('navigation', { name: 'Mobile primary' });
    expect(within(mobileNav).getByRole('link', { name: /^GitHub$/i })).toBeInTheDocument();
    expect(within(mobileNav).queryByText('1.2K')).not.toBeInTheDocument();
  });

  it('hides the GitHub star count when loading fails and keeps external link rels', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));

    renderWithProviders(
      <MarketingWebsiteShell currentPathname="/">
        <div>Marketing body</div>
      </MarketingWebsiteShell>
    );

    const header = screen.getByRole('banner');
    const githubLink = within(header).getByRole('link', { name: /^GitHub$/i });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    expect(screen.queryByText('1.2K')).not.toBeInTheDocument();
    expect(githubLink).toHaveAttribute('target', '_blank');
    expect(githubLink).toHaveAttribute('rel', 'noreferrer');
  });
});
