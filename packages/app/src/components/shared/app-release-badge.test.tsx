import { useThemeStore } from '@navet/app/stores/theme-store';
import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppReleaseBadge } from './app-release-badge';

vi.mock('@navet/app/constants/app-build-metadata', () => ({
  getAppReleaseBadgeLabel: vi.fn(),
}));

import { getAppReleaseBadgeLabel } from '@navet/app/constants/app-build-metadata';

describe('AppReleaseBadge', () => {
  beforeEach(() => {
    useThemeStore.setState({
      ...useThemeStore.getState(),
      theme: 'dark',
      primaryColor: 'green',
      customPrimaryColor: null,
    });
  });

  it('renders the release label with shared badge styling', () => {
    vi.mocked(getAppReleaseBadgeLabel).mockReturnValue('Beta');

    renderWithProviders(<AppReleaseBadge />);

    const badge = screen.getByText('Beta');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('rounded-full');
    expect(badge.className).not.toContain('uppercase');
    expect(badge.className).not.toContain('text-[0.68rem]');
    expect(badge.className).not.toContain('tracking-[0.16em]');
    expect(badge.className).toContain('font-normal');
    expect(badge.className).toContain('text-xs');
    expect(badge.className).toContain('px-2');
    expect(badge.className).toContain('py-0.5');
  });

  it('uses a white surface with an accent border in light theme', () => {
    vi.mocked(getAppReleaseBadgeLabel).mockReturnValue('Beta');
    useThemeStore.setState({
      ...useThemeStore.getState(),
      theme: 'light',
      primaryColor: 'green',
      customPrimaryColor: null,
    });

    renderWithProviders(<AppReleaseBadge />);

    expect(screen.getByText('Beta')).toHaveStyle({
      backgroundColor: 'rgb(255, 255, 255)',
      borderColor: '#22c55e80',
    });
  });

  it('renders nothing when there is no release label', () => {
    vi.mocked(getAppReleaseBadgeLabel).mockReturnValue(null);

    renderWithProviders(<AppReleaseBadge />);

    expect(screen.queryByText(/beta|edge/i)).not.toBeInTheDocument();
  });
});
