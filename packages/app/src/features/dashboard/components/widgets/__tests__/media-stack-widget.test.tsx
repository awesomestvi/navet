import { renderWithProviders } from '@navet/app/test/render';
import type { DeviceCollection } from '@navet/app/types/device.types';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaStackWidget } from '../media-stack-widget';

const { useAreaRoomsMock, useDeviceCollectionsByKeysMock, mediaCardMock } = vi.hoisted(() => ({
  useAreaRoomsMock: vi.fn(),
  useDeviceCollectionsByKeysMock: vi.fn(),
  mediaCardMock: vi.fn(),
}));

vi.mock('@navet/app/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@navet/app/hooks')>();

  return {
    ...actual,
    useAreaRooms: useAreaRoomsMock,
    useDeviceCollectionsByKeys: useDeviceCollectionsByKeysMock,
  };
});

vi.mock('@navet/app/features/media', () => ({
  MediaCard: (props: { id: string; title: string }) => {
    mediaCardMock(props);
    return <div>{`media-card:${props.id}:${props.title}`}</div>;
  },
}));

function createMediaCollection(
  stateOverrides: Array<Record<string, unknown>> = []
): DeviceCollection {
  return {
    lights: [],
    fans: [],
    hvac: [],
    climate: [],
    media: stateOverrides.map((overrides, index) => ({
      id: (overrides.id as string) ?? `media_player.device_${index}`,
      name: (overrides.name as string) ?? `Device ${index}`,
      room: (overrides.room as string) ?? 'Living Room',
      size: 'medium' as const,
      title: (overrides.title as string) ?? 'Nothing playing',
      artist: (overrides.artist as string) ?? 'Ready to play',
      state: (overrides.state as 'playing' | 'paused' | 'idle' | 'off') ?? 'off',
      volume: (overrides.volume as number) ?? 0,
      isMuted: (overrides.isMuted as boolean) ?? false,
      entityType: (overrides.entityType as string | undefined) ?? 'TV',
      deviceClass: (overrides.deviceClass as string | undefined) ?? 'tv',
      source: overrides.source as string | undefined,
      sourceList: overrides.sourceList as string[] | undefined,
      entityPicture: overrides.entityPicture as string | undefined,
      elapsedSeconds: overrides.elapsedSeconds as number | undefined,
      durationSeconds: overrides.durationSeconds as number | undefined,
      positionUpdatedAt: overrides.positionUpdatedAt as string | undefined,
      mediaCapabilities: overrides.mediaCapabilities as never,
      supportsGrouping: overrides.supportsGrouping as boolean | undefined,
      supportsPreviousTrack: overrides.supportsPreviousTrack as boolean | undefined,
      supportsNextTrack: overrides.supportsNextTrack as boolean | undefined,
      supportedFeatures: overrides.supportedFeatures as number | undefined,
      groupMembers: overrides.groupMembers as string[] | undefined,
    })),
    weather: [],
    switches: [],
    helpers: [],
    covers: [],
    locks: [],
    scenes: [],
    persons: [],
    sensors: [],
    vacuums: [],
    calendars: [],
    cameras: [],
    'grouped-sensors': [],
  };
}

describe('MediaStackWidget', () => {
  beforeEach(() => {
    useAreaRoomsMock.mockReturnValue(['Living Room', 'Office']);
    useDeviceCollectionsByKeysMock.mockReturnValue(
      createMediaCollection([
        {
          id: 'media_player.living_room_tv',
          name: 'Living Room TV',
          state: 'paused',
          title: 'Apple TV',
        },
        {
          id: 'media_player.living_room_speaker',
          name: 'Living Room Speaker',
          state: 'playing',
          title: 'Jazz FM',
          deviceClass: 'speaker',
          entityType: 'Speaker',
        },
      ])
    );
    mediaCardMock.mockReset();
  });

  it('shows an empty state until media players are selected', async () => {
    renderWithProviders(<MediaStackWidget onUpdate={vi.fn()} />);

    expect(screen.getByText('No media players selected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Media players' }));
    expect(await screen.findByText('Media stack')).toBeInTheDocument();
  });

  it('saves player selection from settings', async () => {
    const onUpdate = vi.fn();

    renderWithProviders(<MediaStackWidget onUpdate={onUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Media players' }));
    fireEvent.click(await screen.findByText('Living Room TV'));

    expect(onUpdate).toHaveBeenCalledWith({
      entityIds: ['media_player.living_room_tv'],
      priorityOrder: ['media_player.living_room_tv'],
      idleBehavior: 'compact',
    });
  });

  it('forwards settings requests to the stacked media card dialog', () => {
    renderWithProviders(
      <MediaStackWidget
        onUpdate={vi.fn()}
        data={{
          entityIds: ['media_player.living_room_tv', 'media_player.living_room_speaker'],
          priorityOrder: ['media_player.living_room_speaker', 'media_player.living_room_tv'],
          idleBehavior: 'compact',
        }}
        openSettingsRequestKey={1}
      />
    );

    expect(mediaCardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        openSettingsRequestKey: 1,
      })
    );
  });

  it('renders the most relevant active player', () => {
    renderWithProviders(
      <MediaStackWidget
        data={{
          entityIds: ['media_player.living_room_tv', 'media_player.living_room_speaker'],
          priorityOrder: ['media_player.living_room_tv', 'media_player.living_room_speaker'],
          idleBehavior: 'compact',
        }}
      />
    );

    expect(
      screen.getByText('media-card:media_player.living_room_speaker:Jazz FM')
    ).toBeInTheDocument();
    expect(mediaCardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'media_player.living_room_speaker',
        mediaStackAppearance: true,
      })
    );
  });

  it('hides the widget when idle behavior is hidden and nothing is active', () => {
    useDeviceCollectionsByKeysMock.mockReturnValue(
      createMediaCollection([
        {
          id: 'media_player.living_room_tv',
          name: 'Living Room TV',
          state: 'off',
        },
      ])
    );

    const { queryByText } = renderWithProviders(
      <MediaStackWidget
        data={{
          entityIds: ['media_player.living_room_tv'],
          priorityOrder: ['media_player.living_room_tv'],
          idleBehavior: 'hidden',
        }}
      />
    );

    expect(queryByText(/media-card:/)).not.toBeInTheDocument();
    expect(screen.getByText('Selected media players unavailable')).toBeInTheDocument();
  });
});
