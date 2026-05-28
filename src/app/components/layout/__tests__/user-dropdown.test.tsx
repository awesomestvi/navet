import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { integrationStore } from '@/app/stores/integration-store';
import { renderWithProviders } from '@/test/render';
import { resetAppStores } from '@/test/store-reset';
import { UserDropdown } from '../user-dropdown';

describe('UserDropdown', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  it('shows the active normalized provider label instead of hardcoding Home Assistant', () => {
    integrationStore.getState().setIntegrationUser({
      name: 'Alex Johnson',
      is_admin: true,
    });
    integrationStore.getState().setCurrentProviderId('homey');
    integrationStore.setState((state) => ({
      ...state,
      providerRuntime: {
        ...state.providerRuntime,
        homey: {
          ...state.providerRuntime.homey,
          connected: true,
        },
      },
    }));

    renderWithProviders(<UserDropdown />);

    fireEvent.click(screen.getByRole('button', { name: 'Open user menu' }));

    expect(screen.getByText('Alex Johnson')).toBeInTheDocument();
    expect(screen.getByText('Homey')).toBeInTheDocument();
    expect(screen.queryByText('Home Assistant')).not.toBeInTheDocument();
  });
});
