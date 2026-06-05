import { useNavigationStore, useSettingsStore } from '@navet/app/stores';
import { useThemeStore } from '@navet/app/stores/theme-store';
import { renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardLayout } from '../index';

vi.mock('@navet/app/components/layout/header', () => ({
  Header: () => <header data-testid="header">Header</header>,
}));

vi.mock('@navet/app/components/layout/sidebar', () => ({
  Sidebar: () => <aside data-testid="sidebar">Sidebar</aside>,
}));

vi.mock('@navet/app/components/layout/use-header-controller', () => ({
  useHeaderController: () => ({
    activeColorValue: '#f97316',
    handleClearSearch: vi.fn(),
    handleSearchChange: vi.fn(),
    handleToggleMobileSearch: vi.fn(),
    hoverBg: '',
    inputBg: '',
    isMobileSearchOpen: false,
    isSearchActive: false,
    isSearchFocused: false,
    mobileSearchInputRef: { current: null },
    searchQuery: '',
    setIsSearchFocused: vi.fn(),
    textPrimary: '',
    textSecondary: '',
  }),
}));

function setPath(path: string) {
  window.history.replaceState(null, '', path);
}

describe('DashboardLayout', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  afterEach(() => {
    document.querySelector('base')?.remove();
    setPath('/');
  });

  it('does not show an add-on topbar for Home Assistant add-on ingress users', () => {
    setPath('/api/hassio_ingress/navet_dev/dashboard');

    renderWithProviders(
      <DashboardLayout>
        <main>Dashboard content</main>
      </DashboardLayout>
    );

    expect(screen.queryByText(/custom panel/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /view setup steps/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('renders the dashboard layout outside Home Assistant add-on mode', () => {
    setPath('/dashboard');

    renderWithProviders(
      <DashboardLayout>
        <main>Dashboard content</main>
      </DashboardLayout>
    );

    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.queryByTestId('kiosk-orbit-menu')).not.toBeInTheDocument();
  });

  it('uses tighter shell padding in more-space mode', () => {
    setPath('/dashboard');
    useSettingsStore.getState().updateSettings({ dashboardSpaceMode: 'more_space' });

    renderWithProviders(
      <DashboardLayout>
        <main>Dashboard content</main>
      </DashboardLayout>
    );

    expect(screen.getByTestId('dashboard-layout-content')).toHaveClass('px-2.5');
    expect(screen.getByTestId('dashboard-layout-content')).toHaveClass('md:px-4');
    expect(screen.getByTestId('dashboard-layout-content')).toHaveClass('lg:px-5');
  });

  it('hides the dashboard chrome and renders the kiosk more menu in kiosk mode', () => {
    setPath('/dashboard');
    useSettingsStore.getState().updateSettings({ kioskMode: true });

    renderWithProviders(
      <DashboardLayout>
        <main>Dashboard content</main>
      </DashboardLayout>
    );

    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    expect(screen.queryByTestId('header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    expect(screen.getByTestId('kiosk-orbit-menu')).toBeInTheDocument();
    expect(screen.getByTestId('kiosk-orbit-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-layout-content')).not.toHaveClass('md:ml-16');
    expect(screen.getByTestId('dashboard-layout-content')).toHaveClass('pb-24');
  });

  it('keeps settings route content reachable in kiosk mode', () => {
    setPath('/settings');
    useSettingsStore.getState().updateSettings({ kioskMode: true });

    renderWithProviders(
      <DashboardLayout>
        <main>Settings content</main>
      </DashboardLayout>
    );

    expect(screen.getByText('Settings content')).toBeInTheDocument();
    expect(screen.queryByTestId('header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
  });

  it('navigates home from the kiosk more menu', () => {
    useSettingsStore.getState().updateSettings({ kioskMode: true });
    useNavigationStore.getState().setActiveSection('settings');

    renderWithProviders(
      <DashboardLayout>
        <main>Settings content</main>
      </DashboardLayout>
    );

    fireEvent.click(screen.getByTestId('kiosk-orbit-trigger'));
    fireEvent.click(screen.getByRole('button', { name: 'Home' }));

    expect(useNavigationStore.getState().activeSection).toBe('home');
  });

  it('navigates to settings from the kiosk more menu', () => {
    useSettingsStore.getState().updateSettings({ kioskMode: true });
    useNavigationStore.getState().setActiveSection('home');

    renderWithProviders(
      <DashboardLayout>
        <main>Dashboard content</main>
      </DashboardLayout>
    );

    fireEvent.click(screen.getByTestId('kiosk-orbit-trigger'));
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(useNavigationStore.getState().activeSection).toBe('settings');
  });

  it('toggles customize from the kiosk more menu', () => {
    const onToggleEditMode = vi.fn();
    useSettingsStore.getState().updateSettings({ kioskMode: true });

    renderWithProviders(
      <DashboardLayout mobileEditActions={{ isEditMode: false, onToggleEditMode }}>
        <main>Dashboard content</main>
      </DashboardLayout>
    );

    fireEvent.click(screen.getByTestId('kiosk-orbit-trigger'));
    fireEvent.click(screen.getByRole('button', { name: 'Customize' }));

    expect(onToggleEditMode).toHaveBeenCalledTimes(1);
  });

  it('switches rooms from the kiosk more menu', () => {
    const onRoomChange = vi.fn();
    useSettingsStore.getState().updateSettings({ kioskMode: true });
    useNavigationStore.getState().setActiveSection('home');

    renderWithProviders(
      <DashboardLayout
        mobileRoomNavigation={{
          activeRoom: 'All',
          onRoomChange,
          rooms: ['All', 'Kitchen'],
        }}
      >
        <main>Dashboard content</main>
      </DashboardLayout>
    );

    fireEvent.click(screen.getByTestId('kiosk-orbit-trigger'));
    fireEvent.click(screen.getByRole('button', { name: 'Kitchen' }));

    expect(onRoomChange).toHaveBeenCalledWith('Kitchen');
  });

  it('uses a light wallpaper readability treatment in light theme', () => {
    useThemeStore.getState().setTheme('light');
    useThemeStore.getState().setWallpaper('/wallpapers/custom-room-shot.jpg');

    renderWithProviders(
      <DashboardLayout>
        <main>Dashboard content</main>
      </DashboardLayout>
    );

    expect(screen.getByTestId('dashboard-wallpaper-accent-overlay')).not.toHaveStyle({
      mixBlendMode: 'multiply',
    });
    expect(screen.getByTestId('dashboard-wallpaper-readability-layer')).toHaveStyle({
      backgroundColor: 'rgba(249, 250, 251, 0.68)',
    });
  });
});
