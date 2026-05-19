import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { resetAppStores } from '@/test/store-reset';
import { DashboardLayout } from '../index';

vi.mock('@/app/components/layout/header', () => ({
  Header: () => <header>Header</header>,
}));

vi.mock('@/app/components/layout/sidebar', () => ({
  Sidebar: ({ topbarVisible }: { topbarVisible?: boolean }) => (
    <aside data-testid="sidebar" data-topbar-visible={String(Boolean(topbarVisible))}>
      Sidebar
    </aside>
  ),
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
    t: (key: string) => {
      const messages: Record<string, string> = {
        'notifications.navet.addonPhaseOut.title': 'Move Navet to custom panel',
        'notifications.navet.addonPhaseOut.message':
          'The Home Assistant add-on will be phased out gradually. Install Navet through HACS as a custom panel for the easier, recommended setup path. [View setup steps](https://github.com/awesomestvi/navet#home-assistant-custom-panel-with-hacs).',
      };

      return messages[key] ?? key;
    },
  }),
}));

function setPath(path: string) {
  window.history.replaceState(null, '', path);
}

describe('DashboardLayout custom panel migration topbar', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  afterEach(() => {
    document.querySelector('base')?.remove();
    setPath('/');
  });

  it('shows the migration topbar for Home Assistant add-on ingress users', () => {
    setPath('/api/hassio_ingress/navet_dev/dashboard');

    renderWithProviders(
      <DashboardLayout>
        <main>Dashboard content</main>
      </DashboardLayout>
    );

    expect(screen.getByText('Move Navet to custom panel')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view setup steps/i })).toHaveAttribute(
      'href',
      'https://github.com/awesomestvi/navet#home-assistant-custom-panel-with-hacs'
    );
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-topbar-visible', 'true');
  });

  it('hides the migration topbar outside Home Assistant add-on mode', () => {
    setPath('/dashboard');

    renderWithProviders(
      <DashboardLayout>
        <main>Dashboard content</main>
      </DashboardLayout>
    );

    expect(screen.queryByText('Move Navet to custom panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-topbar-visible', 'false');
  });

  it('keeps the topbar dismissed temporarily after user dismissal', () => {
    setPath('/api/hassio_ingress/navet_dev/dashboard');

    const { rerender } = renderWithProviders(
      <DashboardLayout>
        <main>Dashboard content</main>
      </DashboardLayout>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    rerender(
      <DashboardLayout>
        <main>Dashboard content</main>
      </DashboardLayout>
    );

    expect(screen.queryByText('Move Navet to custom panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-topbar-visible', 'false');
  });
});
