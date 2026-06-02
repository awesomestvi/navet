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
      screen.getByRole('heading', { name: /One surface for the smart home/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try the demo/i })).toBeInTheDocument();
  });
});
