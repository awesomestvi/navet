import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarketingReleaseResourcesSection } from './MarketingReleaseResourcesSection';

describe('MarketingReleaseResourcesSection', () => {
  it('links the current release and relevant setup guides', () => {
    renderWithProviders(<MarketingReleaseResourcesSection />);

    expect(screen.getByText('Navet v0.10.0')).toBeInTheDocument();
    expect(screen.getByText('Release highlights')).toBeInTheDocument();
    expect(screen.getByText(/room-based Lights dashboard/)).toBeInTheDocument();
    expect(screen.getByText(/Clearer, denser layouts/)).toBeInTheDocument();
    expect(screen.getByText(/More reliable recovery/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Read the changelog' })).toHaveAttribute(
      'href',
      'https://docs.navet.app/changelog/'
    );
    expect(screen.getByRole('link', { name: /View v0.10.0 on GitHub/ })).toHaveAttribute(
      'href',
      'https://github.com/awesomestvi/navet/releases/tag/v0.10.0'
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
