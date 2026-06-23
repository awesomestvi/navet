import { useNavigationStore, useSettingsStore } from '@navet/app/stores';
import { renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KioskOrbitMenu } from './kiosk-orbit-menu';

describe('KioskOrbitMenu custom sidebar actions', () => {
  beforeEach(async () => {
    await resetAppStores();
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('navigates iframe custom sidebar actions inside Navet', () => {
    useSettingsStore.getState().updateSettings({
      advancedCustomizationEnabled: true,
      customSidebarActions: [
        {
          id: 'movie-status',
          label: 'Movie status',
          icon: 'link',
          targetType: 'iframe',
          targetUrl: 'https://example.com/status',
          visibility: 'always',
        },
      ],
    });

    renderWithProviders(<KioskOrbitMenu />);

    fireEvent.click(screen.getByTestId('kiosk-orbit-trigger'));
    fireEvent.click(screen.getByRole('button', { name: 'Movie status' }));

    expect(useNavigationStore.getState().activeCustomSidebarActionId).toBe('movie-status');
    expect(window.open).not.toHaveBeenCalled();
  });

  it('keeps iframe custom sidebar actions marked active when selected', () => {
    useSettingsStore.getState().updateSettings({
      advancedCustomizationEnabled: true,
      customSidebarActions: [
        {
          id: 'movie-status',
          label: 'Movie status',
          icon: 'link',
          targetType: 'iframe',
          targetUrl: 'https://example.com/status',
          visibility: 'always',
        },
      ],
    });
    useNavigationStore.getState().setActiveCustomSidebarAction('movie-status');

    renderWithProviders(<KioskOrbitMenu />);

    fireEvent.click(screen.getByTestId('kiosk-orbit-trigger'));

    expect(
      within(screen.getByTestId('kiosk-orbit-menu')).getByRole('button', { name: 'Movie status' })
    ).toHaveAttribute('aria-current', 'page');
  });
});
