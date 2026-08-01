import { setMediaQueryMatch } from '@navet/app/test/browser-mocks';
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

    expect(screen.queryByRole('button', { name: 'Habits' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Experimental' }));

    expect(screen.getByRole('heading', { name: 'Experimental' })).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Local habits' })).getByRole('button', {
        name: 'On',
      })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Habits' }));

    expect(screen.getByRole('heading', { name: 'Local habits' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Enable local habits' })).toBeInTheDocument();
  });

  it('restores the persisted tab after remounting', async () => {
    const firstRender = renderWithProviders(<SettingsSection />);

    fireEvent.click(screen.getByRole('button', { name: 'System' }));

    await waitFor(() =>
      expect(localStorage.getItem('navet-settings-active-tab')).toBe(JSON.stringify('system'))
    );

    firstRender.unmount();
    renderWithProviders(<SettingsSection />);

    expect(screen.getByRole('heading', { name: 'System' })).toBeInTheDocument();
  });

  it('uses a settings sidebar without the former hero', () => {
    renderWithProviders(<SettingsSection />);

    expect(screen.getByRole('navigation', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Appearance' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.queryByText('A calmer place to tune Navet.')).not.toBeInTheDocument();
  });

  it('filters settings destinations from the sidebar search', () => {
    renderWithProviders(<SettingsSection />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), {
      target: { value: 'system' },
    });

    expect(screen.getByRole('button', { name: 'System, System' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Appearance' })).not.toBeInTheDocument();
  });

  it('finds a nested setting and navigates to it in the parent section', async () => {
    renderWithProviders(<SettingsSection />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), {
      target: { value: 'visual quality' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Visual quality, Appearance' }));

    const target = await screen.findByText('Visual quality', { selector: 'h3' });
    await waitFor(() => expect(target.closest('[data-settings-search-label]')).toHaveFocus());
    expect(screen.getByRole('button', { name: 'Appearance' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('uses list-to-detail navigation on mobile and returns to the category list', () => {
    setMediaQueryMatch('(max-width: 767px)', true);
    renderWithProviders(<SettingsSection />);

    const navigation = screen.getByRole('navigation', { name: 'Settings' });
    fireEvent.click(within(navigation).getByRole('button', { name: 'Localization' }));

    expect(screen.queryByRole('navigation', { name: 'Settings' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Localization' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(screen.getByRole('navigation', { name: 'Settings' })).toBeInTheDocument();
  });
});
