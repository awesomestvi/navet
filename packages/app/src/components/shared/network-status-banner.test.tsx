import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NetworkStatusBanner } from './network-status-banner';

describe('NetworkStatusBanner', () => {
  it('renders provider-aware disconnect copy for non-Home Assistant providers', () => {
    renderWithProviders(
      <NetworkStatusBanner
        connected={false}
        connecting={false}
        reconnecting={false}
        isOnline
        providerLabel="openHAB"
      />
    );

    expect(screen.getByText('openHAB disconnected')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Navet cannot reach openHAB right now. Cached UI is still available while it reconnects.'
      )
    ).toBeInTheDocument();
  });

  it('shows provider-specific error details when available', () => {
    renderWithProviders(
      <NetworkStatusBanner
        connected={false}
        connecting={false}
        reconnecting={false}
        isOnline
        providerLabel="openHAB"
        lastError="openHAB authentication failed. Check your username, password, and API Security settings."
      />
    );

    expect(
      screen.getByText(
        'openHAB authentication failed. Check your username, password, and API Security settings.'
      )
    ).toBeInTheDocument();
  });
});
