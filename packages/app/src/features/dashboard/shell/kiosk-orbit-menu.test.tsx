import {
  createDashboardDefinition,
  createLegacyDashboardCollection,
  sanitizeDashboardCollection,
} from '@navet/app/features/dashboard/dashboards/dashboard-collection';
import { useDashboardCollectionStore } from '@navet/app/features/dashboard/dashboards/dashboard-collection-store';
import { useNavigationStore, useSettingsStore } from '@navet/app/stores';
import { setMediaQueryMatch } from '@navet/app/test/browser-mocks';
import { renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { fireEvent, screen, within } from '@testing-library/react';
import { type ComponentProps, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KioskControlCenter } from './kiosk-control-center';

function TestControlCenter({
  ...props
}: Omit<ComponentProps<typeof KioskControlCenter>, 'onOpenChange' | 'open'>) {
  const [open, setOpen] = useState(false);
  return <KioskControlCenter {...props} open={open} onOpenChange={setOpen} />;
}

describe('KioskControlCenter', () => {
  beforeEach(async () => {
    await resetAppStores();
    setMediaQueryMatch('(min-width: 768px)', true);
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

    renderWithProviders(<TestControlCenter />);

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

    renderWithProviders(<TestControlCenter />);

    fireEvent.click(screen.getByTestId('kiosk-orbit-trigger'));

    expect(
      within(screen.getByTestId('kiosk-orbit-menu')).getByRole('button', { name: 'Movie status' })
    ).toHaveAttribute('aria-current', 'page');
  });

  it('renders the shared sidebar section items in the kiosk mega menu', () => {
    renderWithProviders(<TestControlCenter />);

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
      <TestControlCenter
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
      <TestControlCenter
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
    fireEvent.click(screen.getByRole('button', { name: 'Customize' }));
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
      <TestControlCenter
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

  it('keeps large room lists inside the workspace content scroll region', () => {
    renderWithProviders(
      <TestControlCenter
        roomNavigation={{
          activeRoom: 'Room 1',
          hiddenRoomNames: [],
          onRoomChange: vi.fn(),
          rooms: Array.from({ length: 40 }, (_, index) => `Room ${index + 1}`),
        }}
      />
    );

    fireEvent.click(screen.getByTestId('kiosk-orbit-trigger'));

    const roomList = screen.getByTestId('kiosk-control-room-list');
    expect(roomList.className).not.toContain('overflow-y-auto');
    expect(within(roomList).getByRole('button', { name: 'Room 40' })).toBeInTheDocument();
  });
});
