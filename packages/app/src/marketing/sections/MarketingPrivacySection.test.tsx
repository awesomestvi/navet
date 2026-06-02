import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarketingPrivacySection } from './MarketingPrivacySection';

describe('MarketingPrivacySection', () => {
  it('renders the privacy headline, supporting copy, and proof pills', () => {
    renderWithProviders(<MarketingPrivacySection />);

    expect(screen.getByText('PRIVACY')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Local by default.' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Navet is built for self-hosted smart homes. Your provider data, dashboard state, and credentials stay on your own device or server, not on Navet servers.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Local storage')).toBeInTheDocument();
    expect(screen.getByText('Self-hosted friendly')).toBeInTheDocument();
    expect(screen.getByText('Provider tokens stay local')).toBeInTheDocument();
  });
});
