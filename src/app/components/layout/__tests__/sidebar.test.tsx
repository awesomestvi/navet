import { act, fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { Sidebar } from '@/app/components/layout/sidebar';
import { useNavigationStore } from '@/app/stores';
import { setMediaQueryMatch } from '@/test/browser-mocks';
import { renderWithProviders } from '@/test/render';
import { resetAppStores } from '@/test/store-reset';

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

  it('renders an orbit launcher that exposes tasks, lights, and media', () => {
    const { container } = renderWithProviders(
      <Sidebar mobileRoomNavigation={mobileRoomNavigation} />
    );
    const dock = getMobileDock(container);

    fireEvent.click(within(dock).getByRole('button', { name: 'Orbit' }));

    const dialog = screen.getByRole('dialog');

    expect(within(dialog).getByRole('button', { name: /^Tasks/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /^Lights/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /^Media/ })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /^Tasks/ }));

    expect(useNavigationStore.getState().activeSection).toBe('tasks');
    expect(screen.queryByText('Recent sections')).not.toBeInTheDocument();
  });

  it('renders home, settings, orbit, and the floating search island in the dock', () => {
    const { container } = renderWithProviders(
      <Sidebar mobileRoomNavigation={mobileRoomNavigation} />
    );
    const dock = getMobileDock(container);

    expect(within(dock).getByRole('button', { name: 'Home' })).toBeInTheDocument();
    expect(within(dock).getByRole('button', { name: 'Settings' })).toBeInTheDocument();
    expect(within(dock).getByRole('button', { name: 'Orbit' })).toBeInTheDocument();
    expect(within(dock).getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });

  it('closes the orbit sheet after section selection', () => {
    const { container } = renderWithProviders(
      <Sidebar mobileRoomNavigation={mobileRoomNavigation} />
    );
    const dock = getMobileDock(container);

    fireEvent.click(within(dock).getByRole('button', { name: 'Orbit' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Media/ }));

    expect(useNavigationStore.getState().activeSection).toBe('media');
    expect(screen.queryByText('Section orbit')).not.toBeInTheDocument();
  });

  it('surfaces recent media navigation inside orbit after returning home', () => {
    act(() => {
      useNavigationStore.getState().setActiveSection('media');
    });

    const { container, rerender } = renderWithProviders(
      <Sidebar mobileRoomNavigation={mobileRoomNavigation} />
    );
    const dock = getMobileDock(container);

    expect(useNavigationStore.getState().lastNonHomeSection).toBe('media');

    act(() => {
      useNavigationStore.getState().setActiveSection('home');
    });
    rerender(<Sidebar mobileRoomNavigation={mobileRoomNavigation} />);

    expect(useNavigationStore.getState().lastNonHomeSection).toBe('media');
    fireEvent.click(within(dock).getByRole('button', { name: 'Orbit' }));
    const dialog = screen.getByRole('dialog');
    const recentHeading = within(dialog).getByText('Recent sections');
    const recentSection = recentHeading.closest('section');

    if (!recentSection) {
      throw new Error('Recent sections area not found');
    }

    expect(within(recentSection).getByRole('button', { name: 'Media' })).toBeInTheDocument();
  });
});
