import { renderWithProviders } from '@navet/app/test/render';
import { isProductionEnvironment } from '@navet/app/utils/environment';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsSection } from '../settings-section';

vi.mock('@navet/app/utils/environment', () => ({
  isProductionEnvironment: vi.fn(() => false),
}));

describe('SettingsSection', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(isProductionEnvironment).mockReturnValue(false);
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

  it('hides the habits tab in production', () => {
    vi.mocked(isProductionEnvironment).mockReturnValue(true);

    renderWithProviders(<SettingsSection />);

    expect(screen.queryByRole('tab', { name: 'Habits' })).not.toBeInTheDocument();
  });
});
