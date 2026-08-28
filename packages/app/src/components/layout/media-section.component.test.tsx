import { renderWithProviders } from '@navet/app/test/render';
import type { MediaDevice } from '@navet/app/types/device.types';
import { fireEvent, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaSection } from './media-section';

type MediaSectionDevice = MediaDevice & { type: 'media' };

const mediaDevices: MediaSectionDevice[] = [
  {
    id: 'media_player.kitchen',
    name: 'Kitchen speaker',
    room: 'Kitchen',
    size: 'medium',
    title: 'Ready to play',
    artist: '',
    state: 'idle',
    volume: 20,
    isMuted: false,
    entityType: 'Speaker',
    deviceClass: 'speaker',
    type: 'media',
  },
  {
    id: 'media_player.living_room_tv',
    name: 'Living room TV',
    room: 'Living Room',
    size: 'medium',
    title: 'Ready to play',
    artist: '',
    state: 'idle',
    volume: 15,
    isMuted: false,
    entityType: 'TV',
    deviceClass: 'tv',
    type: 'media',
  },
];

vi.mock('@navet/app/hooks', async () => {
  const actual = await vi.importActual<object>('@navet/app/hooks');
  return {
    ...actual,
    useDeviceCollectionsByKeys: () => ({ media: mediaDevices }),
    useEditMode: () => ({ isEditMode: false, toggleEditMode: vi.fn() }),
    useMediaQuery: () => false,
  };
});

vi.mock('@navet/app/features/media/components/media-dashboard/media-dashboard', () => ({
  MediaDashboard: () => <div data-testid="media-dashboard-workspace" />,
}));

vi.mock('./entity-grid', () => ({
  EntityGrid: ({ devices }: { devices: MediaSectionDevice[] }) => (
    <div data-testid="media-group-grid">{devices.map((device) => device.id).join(',')}</div>
  ),
}));

vi.mock('./section-customize-shell', () => ({
  SectionCustomizeShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe('MediaSection grouping', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('filters media cards by type and can regroup them by room', () => {
    renderWithProviders(<MediaSection />);

    expect(screen.getByRole('button', { name: 'Group cards by: Type' })).toBeInTheDocument();
    expect(screen.getByTestId('media-group-grid')).toHaveTextContent('media_player.kitchen');
    expect(screen.getByTestId('media-group-grid')).not.toHaveTextContent(
      'media_player.living_room_tv'
    );

    fireEvent.click(screen.getByRole('tab', { name: 'TVs' }));
    expect(screen.getByTestId('media-group-grid')).toHaveTextContent('media_player.living_room_tv');

    const groupingTrigger = screen.getByRole('button', { name: 'Group cards by: Type' });
    fireEvent.pointerDown(groupingTrigger, { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Room' }));
    expect(screen.getByRole('button', { name: 'Group cards by: Room' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Living Room' }));
    expect(screen.getByTestId('media-group-grid')).toHaveTextContent('media_player.living_room_tv');
  });
});
