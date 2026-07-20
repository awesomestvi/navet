import { APP_VERSION } from '@navet/app/constants/app-version';
import { MARKETING_RELEASE_HIGHLIGHTS } from '@navet/app/marketing/constants/marketingReleaseHighlights';
import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarketingReleaseResourcesSection } from './MarketingReleaseResourcesSection';

describe('MarketingReleaseResourcesSection', () => {
  it('links the current release and relevant setup guides', () => {
    renderWithProviders(<MarketingReleaseResourcesSection />);

    expect(screen.getByText(`Navet v${APP_VERSION}`)).toBeInTheDocument();
    expect(screen.getByText('Release highlights')).toBeInTheDocument();
    for (const highlight of MARKETING_RELEASE_HIGHLIGHTS) {
      expect(screen.getByText(highlight.description)).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: 'Read the changelog' })).toHaveAttribute(
      'href',
      'https://docs.navet.app/changelog/'
    );
    expect(screen.getByRole('link', { name: `View v${APP_VERSION} on GitHub` })).toHaveAttribute(
      'href',
      `https://github.com/awesomestvi/navet/releases/tag/v${APP_VERSION}`
    );
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
