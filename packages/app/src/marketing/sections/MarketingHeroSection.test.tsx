import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarketingHeroSection } from './MarketingHeroSection';

describe('MarketingHeroSection', () => {
  it('keeps the product visual in the hero markup', () => {
    renderWithProviders(<MarketingHeroSection />);

    expect(
      screen.getAllByAltText('Navet dashboard product preview shown on a tablet-style device')
        .length
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole('heading', { name: /Your smart home, easier to use/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try the live demo/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /How to install/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /View GitHub/i })).not.toBeInTheDocument();
  });
});
