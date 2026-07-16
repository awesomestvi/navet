import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarketingFeatureGridSection } from './MarketingFeatureGridSection';

describe('MarketingFeatureGridSection', () => {
  it('explains how Navet turns an existing platform into a daily dashboard', () => {
    renderWithProviders(<MarketingFeatureGridSection />);

    expect(
      screen.getByRole('heading', {
        name: 'Your platform runs the home. Navet makes it easier to use.',
      })
    ).toBeInTheDocument();
    expect(screen.getByAltText('Home Assistant logo')).toBeInTheDocument();
    expect(screen.getByAltText('Homey logo')).toBeInTheDocument();
    expect(screen.getByAltText('openHAB logo')).toBeInTheDocument();
    expect(screen.getByText(/Find daily controls by room and purpose/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open the live demo/ })).toHaveAttribute(
      'href',
      'https://demo.navet.app/'
    );
  });
});
