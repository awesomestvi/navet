import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { resetAppStores } from '@/test/store-reset';
import { DashboardLayout } from '../index';

vi.mock('@/app/components/layout/header', () => ({
  Header: () => <header>Header</header>,
}));

vi.mock('@/app/components/layout/sidebar', () => ({
  Sidebar: () => <aside data-testid="sidebar">Sidebar</aside>,
}));

vi.mock('@/app/components/layout/use-header-controller', () => ({
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
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });
});
