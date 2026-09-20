import { MARKETING_LATEST_RELEASE } from '@navet/app/marketing/constants/marketingReleaseHighlights';
import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MarketingReleaseResourcesSection } from './MarketingReleaseResourcesSection';

describe('MarketingReleaseResourcesSection', () => {
  it('links the current release and relevant setup guides', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));
    renderWithProviders(<MarketingReleaseResourcesSection />);

    expect(screen.getByText(`Navet v${MARKETING_LATEST_RELEASE.version}`)).toBeInTheDocument();
    expect(screen.getByText('Release highlights')).toBeInTheDocument();
    for (const highlight of MARKETING_LATEST_RELEASE.highlights) {
      expect(screen.getByText(highlight.description)).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: 'Read the changelog' })).toHaveAttribute(
      'href',
      'https://docs.navet.app/changelog/'
    );
    expect(
      screen.getByRole('link', {
        name: `View v${MARKETING_LATEST_RELEASE.version} on GitHub`,
      })
    ).toHaveAttribute('href', MARKETING_LATEST_RELEASE.url);
    expect(screen.getByRole('link', { name: /Home Assistant setup/ })).toHaveAttribute(
      'href',
      'https://docs.navet.app/install/home-assistant/'
    );
    expect(screen.getByRole('link', { name: /Homey setup/ })).toHaveAttribute(
      'href',
      'https://docs.navet.app/install/homey/'
    );
    expect(screen.getByRole('link', { name: /openHAB setup/ })).toHaveAttribute(
      'href',
      'https://docs.navet.app/install/openhab/'
    );
    expect(screen.getByAltText('Home Assistant logo')).toBeInTheDocument();
    expect(screen.getByAltText('Homey logo')).toBeInTheDocument();
    expect(screen.getByAltText('openHAB logo')).toBeInTheDocument();
  });
});
