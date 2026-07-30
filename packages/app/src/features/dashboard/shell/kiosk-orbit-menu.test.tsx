import {
  createDashboardDefinition,
  createLegacyDashboardCollection,
  sanitizeDashboardCollection,
} from '@navet/app/features/dashboard/dashboards/dashboard-collection';
import { useDashboardCollectionStore } from '@navet/app/features/dashboard/dashboards/dashboard-collection-store';
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

  it('renders the shared sidebar section items in the kiosk mega menu', () => {
    renderWithProviders(<KioskOrbitMenu />);

    fireEvent.click(screen.getByTestId('kiosk-orbit-trigger'));

    const orbitMenu = within(screen.getByTestId('kiosk-orbit-menu'));
    expect(orbitMenu.getByRole('button', { name: 'Energy' })).toBeInTheDocument();
    expect(orbitMenu.getByRole('button', { name: 'Media' })).toBeInTheDocument();
    expect(orbitMenu.getByRole('button', { name: 'Tasks' })).toBeInTheDocument();
  });

  it('shows dashboards above rooms only after a second dashboard exists', () => {
    const home = createDashboardDefinition({ id: 'home', name: 'Home' });
    const upstairs = createDashboardDefinition({ id: 'upstairs', name: 'Upstairs lights' });
    useDashboardCollectionStore.setState({
      collection: sanitizeDashboardCollection(
        {
          schemaVersion: 1,
          defaultDashboardId: 'home',
          order: ['home', 'upstairs'],
          dashboardsById: { home, upstairs },
          dashboardIdByClientId: {},
        },
        createLegacyDashboardCollection({ homeLayout: null })
      ),
      activeDashboardId: 'home',
    });

    renderWithProviders(
      <KioskOrbitMenu
        roomNavigation={{
          activeRoom: 'Bedroom',
          hiddenRoomNames: [],
          onRoomChange: vi.fn(),
          rooms: ['Bedroom'],
        }}
      />
    );

    fireEvent.click(screen.getByTestId('kiosk-orbit-trigger'));

    const menu = screen.getByTestId('kiosk-orbit-menu');
    expect(within(menu).getByText('Dashboards')).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: 'Upstairs lights' })).toBeInTheDocument();
    expect(within(menu).getByText('Rooms')).toBeInTheDocument();
    const menuText = menu.textContent ?? '';
    expect(menuText.indexOf('Dashboards')).toBeLessThan(menuText.indexOf('Rooms'));
  });

  it('shows customize sidebar in edit mode', () => {
    const onCustomizeSidebar = vi.fn();

    renderWithProviders(
      <KioskOrbitMenu
        editActions={{
          allViewGrouping: 'custom',
          isEditMode: true,
          onToggleEditMode: vi.fn(),
          onAllViewGroupingChange: vi.fn(),
        }}
        onCustomizeSidebar={onCustomizeSidebar}
      />
    );

    fireEvent.click(screen.getByTestId('kiosk-orbit-trigger'));
    fireEvent.click(screen.getByRole('button', { name: 'Customize sidebar' }));

    expect(onCustomizeSidebar).toHaveBeenCalled();
  });

  it('opens the edit sidebar item flow for existing custom items in edit mode', () => {
    const onEditSidebarItem = vi.fn();

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

    renderWithProviders(
      <KioskOrbitMenu
        editActions={{
          allViewGrouping: 'custom',
          isEditMode: true,
          onToggleEditMode: vi.fn(),
          onAllViewGroupingChange: vi.fn(),
        }}
        onEditSidebarItem={onEditSidebarItem}
      />
    );

    fireEvent.click(screen.getByTestId('kiosk-orbit-trigger'));
    fireEvent.click(screen.getByRole('button', { name: 'Movie status' }));

    expect(onEditSidebarItem).toHaveBeenCalledWith('movie-status');
  });

  it('lays out large room counts without a scrollable room bucket', () => {
    renderWithProviders(
      <KioskOrbitMenu
        roomNavigation={{
          activeRoom: 'Room 1',
          hiddenRoomNames: [],
          onRoomChange: vi.fn(),
          rooms: Array.from({ length: 40 }, (_, index) => `Room ${index + 1}`),
        }}
      />
    );

    fireEvent.click(screen.getByTestId('kiosk-orbit-trigger'));

    const roomGrid = screen.getByTestId('kiosk-orbit-room-grid');
    expect(roomGrid.className).toContain('grid-cols-2');
    expect(roomGrid.className).toContain('xl:grid-cols-5');
    expect(roomGrid.className).not.toContain('overflow-y-auto');
    expect(within(roomGrid).getByRole('button', { name: 'Room 40' })).toBeInTheDocument();
  });
});
