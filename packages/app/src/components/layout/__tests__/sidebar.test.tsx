import { Sidebar } from '@navet/app/components/layout/sidebar';
import { useNavigationStore } from '@navet/app/stores';
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
});
