import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { SettingsSection } from '../settings-section';

describe('SettingsSection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the habits tab after enabling the production-safe experimental feature', () => {
    renderWithProviders(<SettingsSection />);

    expect(screen.queryByRole('tab', { name: 'Habits' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Experimental' }));

    expect(screen.getByRole('heading', { name: 'Experimental' })).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Local habits' })).getByRole('button', {
        name: 'On',
      })
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Habits' }));

    expect(screen.getByRole('heading', { name: 'Local habits' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Enable local habits' })).toBeInTheDocument();
  });

  it('restores the persisted tab after remounting', async () => {
    const firstRender = renderWithProviders(<SettingsSection />);

    fireEvent.click(screen.getByRole('tab', { name: 'System' }));

    await waitFor(() =>
      expect(localStorage.getItem('navet-settings-active-tab')).toBe(JSON.stringify('system'))
    );

    firstRender.unmount();
    renderWithProviders(<SettingsSection />);

    expect(screen.getByRole('heading', { name: 'System' })).toBeInTheDocument();
  });
});
