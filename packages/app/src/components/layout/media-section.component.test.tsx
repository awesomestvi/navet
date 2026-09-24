import { renderWithProviders } from '@navet/app/test/render';
import type { MediaDevice } from '@navet/app/types/device.types';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaSection } from './media-section';

type MediaSectionDevice = MediaDevice & { type: 'media' };
const { isEditModeMock } = vi.hoisted(() => ({ isEditModeMock: vi.fn(() => false) }));

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
    useEditMode: () => ({ isEditMode: isEditModeMock(), toggleEditMode: vi.fn() }),
    useMediaQuery: () => false,
  };
});

vi.mock('@navet/app/features/media/components/media-dashboard/media-dashboard', () => ({
  MediaDashboard: () => <div data-testid="media-dashboard-workspace" />,
}));

vi.mock('@navet/app/features/dashboard/components/widgets/media-stack-widget', () => ({
  MediaStackWidget: ({
    data,
    onUpdate,
  }: {
    data?: { entityIds?: string[] };
    onUpdate?: (data: {
      entityIds: string[];
      priorityOrder: string[];
      idleBehavior: 'compact';
    }) => void;
  }) => (
    <div data-testid="media-display-group">
      {data?.entityIds?.join(',')}
      <button
        type="button"
        onClick={() =>
          onUpdate?.({
            entityIds: ['media_player.living_room_tv'],
            priorityOrder: ['media_player.living_room_tv'],
            idleBehavior: 'compact',
          })
        }
      >
        Choose TV
      </button>
    </div>
  ),
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
    isEditModeMock.mockReturnValue(false);
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

  it('shows a configured display group and removes its members from individual cards', () => {
    window.localStorage.setItem(
      'navet-media-display-groups',
      JSON.stringify([
        {
          id: 'living-room',
          data: {
            entityIds: ['media_player.living_room_tv'],
            priorityOrder: ['media_player.living_room_tv'],
            idleBehavior: 'compact',
          },
        },
      ])
    );

    renderWithProviders(<MediaSection />);

    expect(screen.getByTestId('media-display-group')).toHaveTextContent(
      'media_player.living_room_tv'
    );
    expect(screen.getByTestId('media-group-grid')).toHaveTextContent('media_player.kitchen');
    expect(screen.queryByRole('tab', { name: 'TVs' })).not.toBeInTheDocument();
  });

  it('can create a group in edit mode and save its selected players', async () => {
    isEditModeMock.mockReturnValue(true);
    renderWithProviders(<MediaSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Media Stack' }));
    fireEvent.click(screen.getByRole('button', { name: 'Choose TV' }));

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem('navet-media-display-groups') ?? '[]')).toEqual(
        [
          expect.objectContaining({
            data: expect.objectContaining({ entityIds: ['media_player.living_room_tv'] }),
          }),
        ]
      );
    });
  });
});
