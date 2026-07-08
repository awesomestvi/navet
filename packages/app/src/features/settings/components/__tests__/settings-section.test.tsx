import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsSection } from '../settings-section';

const { isDevOrLocalBuildMock } = vi.hoisted(() => ({
  isDevOrLocalBuildMock: vi.fn(() => true),
}));

vi.mock('@navet/app/constants/app-build-metadata', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@navet/app/constants/app-build-metadata')>()),
  isDevOrLocalBuild: isDevOrLocalBuildMock,
}));

describe('SettingsSection', () => {
  beforeEach(() => {
    localStorage.clear();
    isDevOrLocalBuildMock.mockReturnValue(true);
  });

  it('shows the habits tab after enabling it from experimental in dev builds', () => {
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

  it('hides local habits in non-dev builds', () => {
    isDevOrLocalBuildMock.mockReturnValue(false);

    renderWithProviders(<SettingsSection />);

    expect(screen.queryByRole('tab', { name: 'Habits' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Experimental' }));
    expect(screen.queryByRole('group', { name: 'Local habits' })).not.toBeInTheDocument();
  });
});
