import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { SettingsSection } from '../settings-section';

describe('SettingsSection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows an experimental tab and routes keep-awake controls there', () => {
    renderWithProviders(<SettingsSection />);

    fireEvent.click(screen.getByRole('tab', { name: 'Experimental' }));

    expect(screen.getByRole('heading', { name: 'Experimental' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Keep device awake' })).toBeInTheDocument();
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
