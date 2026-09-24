import type { MediaDialogMediaStackSettings } from '@navet/app/features/media/components/media/media-dialog.types';
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
  EntityGrid: ({
    devices,
    cardReplacementById,
    mediaStackSettingsById,
  }: {
    devices: MediaSectionDevice[];
    cardReplacementById?: ReadonlyMap<string, { size: string; node: ReactNode }>;
    mediaStackSettingsById?: ReadonlyMap<string, MediaDialogMediaStackSettings>;
  }) => (
    <div data-testid="media-group-grid">
      {devices.map((device) => {
        const replacement = cardReplacementById?.get(device.id);
        if (replacement) {
          return (
            <div
              key={device.id}
              className={replacement.size === 'large' ? 'col-span-4 row-span-4' : undefined}
            >
              {replacement.node}
            </div>
          );
        }

        const settings = mediaStackSettingsById?.get(device.id);
        return (
          <div key={device.id}>
            {device.id}
            {settings ? (
              <button
                type="button"
                onClick={() =>
                  settings.onUpdate({
                    entityIds: [device.id, 'media_player.living_room_tv'],
                    priorityOrder: [device.id, 'media_player.living_room_tv'],
                    idleBehavior: 'compact',
                  })
                }
              >
                {`Create stack from ${device.name}`}
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  ),
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
          size: 'large',
          data: {
            entityIds: ['media_player.kitchen', 'media_player.living_room_tv'],
            priorityOrder: ['media_player.kitchen', 'media_player.living_room_tv'],
            idleBehavior: 'compact',
          },
        },
      ])
    );

    renderWithProviders(<MediaSection />);

    expect(screen.getByTestId('media-display-group')).toHaveTextContent(
      'media_player.kitchen,media_player.living_room_tv'
    );
    expect(screen.getByTestId('media-display-group').closest('.col-span-4')).toHaveClass(
      'col-span-4',
      'row-span-4'
    );
    expect(screen.getByTestId('media-group-grid')).toHaveTextContent('media_player.kitchen');
    expect(screen.queryByRole('tab', { name: 'TVs' })).not.toBeInTheDocument();
  });

  it('keeps idle players in the media cards when their display group is hidden', () => {
    window.localStorage.setItem(
      'navet-media-display-groups',
      JSON.stringify([
        {
          id: 'all-players',
          data: {
            entityIds: ['media_player.kitchen', 'media_player.living_room_tv'],
            priorityOrder: ['media_player.kitchen', 'media_player.living_room_tv'],
            idleBehavior: 'hidden',
          },
        },
      ])
    );

    renderWithProviders(<MediaSection />);

    expect(screen.queryByTestId('media-display-group')).not.toBeInTheDocument();
    expect(screen.getByTestId('media-group-grid')).toHaveTextContent('media_player.kitchen');
    fireEvent.click(screen.getByRole('tab', { name: 'TVs' }));
    expect(screen.getByTestId('media-group-grid')).toHaveTextContent('media_player.living_room_tv');
  });

  it('can create a group in edit mode and save its selected players', async () => {
    isEditModeMock.mockReturnValue(true);
    renderWithProviders(<MediaSection />);

    expect(screen.queryByRole('button', { name: 'Add Entity' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create stack from Kitchen speaker' }));

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem('navet-media-display-groups') ?? '[]')).toEqual(
        [
          expect.objectContaining({
            anchorEntityId: 'media_player.kitchen',
            data: expect.objectContaining({
              entityIds: ['media_player.kitchen', 'media_player.living_room_tv'],
            }),
          }),
        ]
      );
    });
  });

  it('opens Add Entity from the dashboard edit command', async () => {
    isEditModeMock.mockReturnValue(true);
    const { rerender } = renderWithProviders(<MediaSection addEntityRequestKey={0} />);

    rerender(<MediaSection addEntityRequestKey={1} />);

    expect(await screen.findByRole('dialog', { name: 'Add Entity' })).toBeInTheDocument();
  });
});
