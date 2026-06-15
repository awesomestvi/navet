import { Sidebar } from '@navet/app/components/layout/sidebar';
import { useEditModeStore, useNavigationStore, useSettingsStore } from '@navet/app/stores';
import { setMediaQueryMatch } from '@navet/app/test/browser-mocks';
import { renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

const mobileRoomNavigation = {
  activeRoom: 'Living room',
  onRoomChange: () => {},
  rooms: ['Living room', 'Kitchen'],
};

describe('Sidebar mobile navigation', () => {
  beforeEach(async () => {
    await resetAppStores();
    setMediaQueryMatch('(max-width: 767px)', true);
  });

  function getMobileDock(container: HTMLElement) {
    const dock = container.querySelector<HTMLElement>('.mobile-bottom-dock-offset');

    if (!dock) {
      throw new Error('Mobile dock not found');
    }

    return dock;
  }

  it('renders a more launcher that exposes tasks, climate, lights, and media', () => {
    const { container } = renderWithProviders(
      <Sidebar mobileRoomNavigation={mobileRoomNavigation} />
    );
    const dock = getMobileDock(container);

    fireEvent.click(within(dock).getByRole('button', { name: 'More' }));

    const dialog = screen.getByRole('dialog');

    expect(within(dialog).getByRole('button', { name: /^Tasks/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /^Climate/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /^Lights/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /^Media/ })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /^Tasks/ }));

    expect(useNavigationStore.getState().activeSection).toBe('tasks');
    expect(screen.queryByText('Recent sections')).not.toBeInTheDocument();
  });

  it('renders home, more, and search in the centered dock', () => {
    const { container } = renderWithProviders(
      <Sidebar mobileRoomNavigation={mobileRoomNavigation} />
    );
    const dock = getMobileDock(container);

    expect(within(dock).getByRole('button', { name: 'Living room' })).toBeInTheDocument();
    expect(within(dock).getByRole('button', { name: 'More' })).toBeInTheDocument();
    expect(within(dock).getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(within(dock).queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument();
  });

  it('closes the more sheet after section selection', () => {
    const { container } = renderWithProviders(
      <Sidebar mobileRoomNavigation={mobileRoomNavigation} />
    );
    const dock = getMobileDock(container);

    fireEvent.click(within(dock).getByRole('button', { name: 'More' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Media/ }));

    expect(useNavigationStore.getState().activeSection).toBe('media');
    expect(screen.queryByText('Sections')).not.toBeInTheDocument();
  });

  it('does not render recent sections or current room in the more sheet', () => {
    const { container } = renderWithProviders(
      <Sidebar mobileRoomNavigation={mobileRoomNavigation} />
    );
    const dock = getMobileDock(container);

    fireEvent.click(within(dock).getByRole('button', { name: 'More' }));

    expect(screen.queryByText('Recent sections')).not.toBeInTheDocument();
    expect(screen.queryByText('Current room')).not.toBeInTheDocument();
  });

  it('renders saved custom sidebar actions in the more sheet when advanced customization is enabled', () => {
    useSettingsStore.getState().updateSettings({
      advancedCustomizationEnabled: true,
      customSidebarActions: [
        {
          id: 'movie-status',
          label: 'Movie status',
          icon: 'link',
          targetType: 'url',
          targetUrl: 'https://example.com/status',
          visibility: 'always',
        },
      ],
    });

    const { container } = renderWithProviders(
      <Sidebar mobileRoomNavigation={mobileRoomNavigation} />
    );
    const dock = getMobileDock(container);

    fireEvent.click(within(dock).getByRole('button', { name: 'More' }));

    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: /^Movie status/ })
    ).toBeInTheDocument();
  });

  it('renders a customize sidebar action in the more sheet', () => {
    useEditModeStore.getState().setEditMode(true);
    const { container } = renderWithProviders(
      <Sidebar mobileRoomNavigation={mobileRoomNavigation} />
    );
    const dock = getMobileDock(container);

    fireEvent.click(within(dock).getByRole('button', { name: 'More' }));

    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: /^Customize sidebar/ })
    ).toBeInTheDocument();
  });

  it('does not render the desktop customize sidebar button outside edit mode', () => {
    setMediaQueryMatch('(max-width: 767px)', false);

    renderWithProviders(<Sidebar mobileRoomNavigation={mobileRoomNavigation} />);

    expect(screen.queryByRole('button', { name: 'Customize sidebar' })).not.toBeInTheDocument();
  });

  it('renders a pencil affordance for custom desktop sidebar actions in edit mode', () => {
    setMediaQueryMatch('(max-width: 767px)', false);
    useEditModeStore.getState().setEditMode(true);
    useSettingsStore.getState().updateSettings({
      advancedCustomizationEnabled: true,
      customSidebarActions: [
        {
          id: 'movie-status',
          label: 'Movie status',
          icon: 'link',
          targetType: 'url',
          targetUrl: 'https://example.com/status',
          visibility: 'always',
        },
      ],
    });

    renderWithProviders(<Sidebar mobileRoomNavigation={mobileRoomNavigation} />);

    expect(screen.getByRole('button', { name: 'Edit Movie status' })).toBeInTheDocument();
  });

  it('opens the customization dialog instead of triggering a custom desktop sidebar action in edit mode', () => {
    setMediaQueryMatch('(max-width: 767px)', false);
    useEditModeStore.getState().setEditMode(true);
    useSettingsStore.getState().updateSettings({
      advancedCustomizationEnabled: true,
      customSidebarActions: [
        {
          id: 'movie-status',
          label: 'Movie status',
          icon: 'link',
          targetType: 'section',
          targetSection: 'media',
          visibility: 'always',
        },
      ],
    });

    renderWithProviders(<Sidebar mobileRoomNavigation={mobileRoomNavigation} />);

    fireEvent.click(screen.getByRole('button', { name: 'Movie status' }));

    expect(useNavigationStore.getState().activeSection).toBe('home');
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Edit sidebar action')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('Movie status')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('does not render a customize sidebar action in the more sheet outside edit mode', () => {
    const { container } = renderWithProviders(
      <Sidebar mobileRoomNavigation={mobileRoomNavigation} />
    );
    const dock = getMobileDock(container);

    fireEvent.click(within(dock).getByRole('button', { name: 'More' }));

    expect(
      within(screen.getByRole('dialog')).queryByRole('button', { name: /^Customize sidebar/ })
    ).not.toBeInTheDocument();
  });
});
