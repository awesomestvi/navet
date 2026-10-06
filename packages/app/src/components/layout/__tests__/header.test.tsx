import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Header } from '../header';
import type { HeaderController } from '../use-header-controller';

vi.mock('../use-header-datetime', () => ({
  useHeaderDateTime: () => ({
    formattedDate: 'May 30',
    formattedTime: '12:00',
    greetingKey: 'header.greeting.welcome',
    weekNumber: 22,
  }),
}));

function createController(overrides: Partial<HeaderController> = {}): HeaderController {
  const surface = getThemeSurfaceTokens('dark');

  return {
    activeColorValue: '#f97316',
    avatarUrl: null,
    border: surface.border,
    closeMobileSearch: vi.fn(),
    closeMobileUtility: vi.fn(),
    closeNotifications: vi.fn(),
    desktopNotificationButtonRef: createRef<HTMLButtonElement>(),
    dividerColor: surface.textMuted,
    firstName: 'Jane',
    headerCustomText: '',
    headerTitleMode: 'clock',
    handleClearSearch: vi.fn(),
    handleSearchChange: vi.fn(),
    handleToggleMobileSearch: vi.fn(),
    hoverBg: surface.hoverBg,
    inputBg: surface.inputBg,
    isMobileSearchOpen: false,
    isMobileUtilityOpen: false,
    isNotificationOpen: false,
    isSearchActive: false,
    isSearchFocused: false,
    mobileNotificationButtonRef: createRef<HTMLButtonElement>(),
    mobileSearchInputRef: createRef<HTMLInputElement>(),
    openMobileUtility: vi.fn(),
    openNotifications: vi.fn(),
    placeholder: surface.placeholder,
    searchQuery: '',
    setIsMobileSearchOpen: vi.fn(),
    setIsMobileUtilityOpen: vi.fn(),
    setIsNotificationOpen: vi.fn(),
    setIsSearchFocused: vi.fn(),
    surface,
    t: (key, params) => {
      if (key === 'header.greeting.welcome') {
        return `Welcome back, ${params?.name ?? 'Guest'}!`;
      }

      if (key === 'header.weekLabel') {
        return `Week ${params?.week ?? ''}`;
      }

      if (key === 'notifications.title') {
        return 'Notifications';
      }

      if (key === 'common.moreActions') {
        return 'More actions';
      }

      if (key === 'header.searchPlaceholder') {
        return 'Search devices';
      }

      if (key === 'dashboard.roomNav.customize') {
        return 'Customize';
      }

      if (key === 'dashboard.roomNav.doneEditing') {
        return 'Done editing';
      }

      return key;
    },
    textPrimary: surface.textPrimary,
    textSecondary: surface.textSecondary,
    unreadCount: 0,
    ...overrides,
  };
}

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the clock title and greeting metadata from header time state', () => {
    renderWithProviders(<Header controller={createController()} />);

    expect(screen.getAllByText('May 30 · 12:00')).toHaveLength(2);
    expect(screen.getAllByText('Welcome back, Jane! · Week 22')).toHaveLength(2);
  });
  it('returns focus to the launcher after Clear or Escape without stealing outside focus', async () => {
    const controller = createController({ isSearchActive: true, searchQuery: 'kitchen' });
    renderWithProviders(
      <>
        <Header controller={controller} />
        <button type="button">Outside</button>
      </>
    );
    const launcher = screen.getByRole('button', { name: 'Search devices' });
    fireEvent.click(launcher);
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus());
    const clear = screen.getByRole('button', { name: 'Clear search' });
    clear.focus();
    fireEvent.click(clear);
    expect(controller.handleClearSearch).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Search devices' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Search devices' }));
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus());
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Search devices' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Search devices' }));
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus());
    const outside = screen.getByRole('button', { name: 'Outside' });
    outside.focus();
    fireEvent.click(outside);
    expect(outside).toHaveFocus();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
