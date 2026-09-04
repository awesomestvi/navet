import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarketingHeroSection } from './MarketingHeroSection';

describe('MarketingHeroSection', () => {
  it('keeps the product visual in the hero markup', () => {
    renderWithProviders(<MarketingHeroSection />);

    expect(
      screen.getAllByRole('group', { name: 'Navet wall panel sample home' }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole('heading', { name: /A smart home dashboard for every screen/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explore the demo/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /How to install/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /View GitHub/i })).not.toBeInTheDocument();
  });
});
