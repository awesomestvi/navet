import { getMediaPlayerCapabilities } from '@navet/app/constants/media-player-features';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MediaDialog } from '../media-dialog';

const { useThemeMock, useMediaArtworkColorsMock, entityRoomSelectorMock } = vi.hoisted(() => ({
  useThemeMock: vi.fn(),
  useMediaArtworkColorsMock: vi.fn(),
  entityRoomSelectorMock: vi.fn((_props?: unknown) => <div>Bathroom</div>),
}));

vi.mock('@navet/app/hooks', async () => {
  const actual = await vi.importActual<typeof import('@navet/app/hooks')>('@navet/app/hooks');

  return {
    ...actual,
    useEntityProviderFeatureMatrix: () => ({
      mediaBrowse: false,
      mediaControls: false,
    }),
    useTheme: () => useThemeMock(),
  };
});

vi.mock('@navet/app/components/shared/entity-room-selector', () => ({
  EntityRoomSelector: (props: unknown) => entityRoomSelectorMock(props),
}));

vi.mock('@navet/app/features/media/hooks/use-provider-media-playback-data', () => ({
  useProviderMediaPlaybackData: () => ({
    entities: [],
    entityRegistry: [],
  }),
}));

vi.mock('../use-media-artwork-colors', async () => {
  const actual = await vi.importActual<typeof import('../use-media-artwork-colors')>(
    '../use-media-artwork-colors'
  );

  return {
    ...actual,
    useMediaArtworkColors: useMediaArtworkColorsMock,
  };
});

describe('MediaDialog', () => {
  it('keeps the header identity while rendering the simplified Apple-like playback layout', () => {
    entityRoomSelectorMock.mockClear();
    useThemeMock.mockReturnValue({ theme: 'dark' });
    useMediaArtworkColorsMock.mockReturnValue({
      dominant: 'rgb(32, 32, 35)',
      vibrant: 'rgb(80, 80, 86)',
      darkMuted: 'rgb(18, 18, 20)',
      highlight: 'rgb(242, 242, 245)',
      gradientEnd: 'rgb(10, 10, 12)',
    });

    renderWithProviders(
      <MediaDialog
        entityId="media_player.bathroom"
        room="Bathroom"
        isOpen
        onOpenChange={vi.fn()}
        artwork="data:image/png;base64,artwork"
        entityName="Bathroom"
        entityType="Speaker"
        title="Touch"
        artist="Cigarettes After Sex"
        isPlaying
        volume={10}
        isMuted={false}
        elapsedSeconds={93}
        durationSeconds={293}
        supportsGrouping={false}
        groupMembers={[]}
        availableGroupingPlayers={[]}
        onPrevious={vi.fn()}
        canPreviousTrack
        onTogglePlay={vi.fn()}
        onNext={vi.fn()}
        canNextTrack
        shuffleEnabled={false}
        repeatMode="off"
        onToggleShuffle={vi.fn()}
        onCycleRepeat={vi.fn()}
        capabilities={getMediaPlayerCapabilities(4 | 8 | 16 | 32 | 2 | 32768 | 262144)}
        sourceList={[]}
        onSelectSource={vi.fn()}
        soundModeList={[]}
        onSelectSoundMode={vi.fn()}
        onSeek={vi.fn()}
        onClearPlaylist={vi.fn()}
        onToggleMute={vi.fn()}
        onVolumeChange={vi.fn()}
        onVolumeInteractionStart={vi.fn()}
        onVolumeInteractionEnd={vi.fn()}
        onAttachGroupMember={vi.fn()}
        onDetachGroupMember={vi.fn()}
      />
    );

    expect(screen.getAllByText('Bathroom').length).toBeGreaterThanOrEqual(2);
    expect(entityRoomSelectorMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        entityId: 'media_player.bathroom',
        fallbackRoomName: 'Bathroom',
      })
    );
    expect(screen.getAllByText('Speaker').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: 'Edit Bathroom' })).toBeInTheDocument();
    expect(screen.getAllByText('Touch').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Cigarettes After Sex').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: 'Pause playback' })).toBeInTheDocument();
    expect(screen.queryByText('Volume')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
  });

  it('keeps the seek slider visible when the media dialog is idle', () => {
    entityRoomSelectorMock.mockClear();
    useThemeMock.mockReturnValue({ theme: 'dark' });
    useMediaArtworkColorsMock.mockReturnValue({
      dominant: 'rgb(32, 32, 35)',
      vibrant: 'rgb(80, 80, 86)',
      darkMuted: 'rgb(18, 18, 20)',
      highlight: 'rgb(242, 242, 245)',
      gradientEnd: 'rgb(10, 10, 12)',
    });

    renderWithProviders(
      <MediaDialog
        entityId="media_player.living_room"
        room="Living Room"
        isOpen
        onOpenChange={vi.fn()}
        artwork={null}
        entityName="Living Room"
        entityType="Speaker"
        title="Nothing playing"
        artist=""
        isPlaying={false}
        volume={10}
        isMuted={false}
        elapsedSeconds={0}
        durationSeconds={0}
        supportsGrouping={false}
        groupMembers={[]}
        availableGroupingPlayers={[]}
        onPrevious={vi.fn()}
        canPreviousTrack
        onTogglePlay={vi.fn()}
        onNext={vi.fn()}
        canNextTrack
        shuffleEnabled={false}
        repeatMode="off"
        onToggleShuffle={vi.fn()}
        onCycleRepeat={vi.fn()}
        capabilities={getMediaPlayerCapabilities(4 | 8 | 16 | 32 | 2 | 32768 | 262144)}
        sourceList={[]}
        onSelectSource={vi.fn()}
        soundModeList={[]}
        onSelectSoundMode={vi.fn()}
        onSeek={vi.fn()}
        onClearPlaylist={vi.fn()}
        onToggleMute={vi.fn()}
        onVolumeChange={vi.fn()}
        onVolumeInteractionStart={vi.fn()}
        onVolumeInteractionEnd={vi.fn()}
        onAttachGroupMember={vi.fn()}
        onDetachGroupMember={vi.fn()}
      />
    );

    expect(screen.getByRole('slider', { name: 'Seek' })).toBeInTheDocument();
  });

  it('renders media stack settings inside the media dialog', () => {
    useThemeMock.mockReturnValue({ theme: 'dark' });
    useMediaArtworkColorsMock.mockReturnValue({
      dominant: 'rgb(32, 32, 35)',
      vibrant: 'rgb(80, 80, 86)',
      darkMuted: 'rgb(18, 18, 20)',
      highlight: 'rgb(242, 242, 245)',
      gradientEnd: 'rgb(10, 10, 12)',
    });
    const onUpdate = vi.fn();

    renderWithProviders(
      <MediaDialog
        entityId="media_player.living_room"
        room="Living Room"
        isOpen
        onOpenChange={vi.fn()}
        entityName="Living Room TV"
        entityType="TV"
        title="Apple TV"
        artist=""
        isPlaying={false}
        volume={10}
        isMuted={false}
        elapsedSeconds={0}
        durationSeconds={0}
        supportsGrouping={false}
        groupMembers={[]}
        availableGroupingPlayers={[]}
        onPrevious={vi.fn()}
        canPreviousTrack={false}
        onTogglePlay={vi.fn()}
        onNext={vi.fn()}
        canNextTrack={false}
        shuffleEnabled={false}
        repeatMode="off"
        onToggleShuffle={vi.fn()}
        onCycleRepeat={vi.fn()}
        capabilities={getMediaPlayerCapabilities(0)}
        sourceList={[]}
        onSelectSource={vi.fn()}
        soundModeList={[]}
        onSelectSoundMode={vi.fn()}
        onSeek={vi.fn()}
        onClearPlaylist={vi.fn()}
        onToggleMute={vi.fn()}
        onVolumeChange={vi.fn()}
        onVolumeInteractionStart={vi.fn()}
        onVolumeInteractionEnd={vi.fn()}
        onAttachGroupMember={vi.fn()}
        onDetachGroupMember={vi.fn()}
        mediaStackSettings={{
          entityIds: ['media_player.living_room', 'media_player.speaker'],
          priorityOrder: ['media_player.speaker', 'media_player.living_room'],
          idleBehavior: 'compact',
          playerOptions: [
            {
              id: 'media_player.living_room',
              name: 'Living Room TV',
              room: 'Living Room',
              subtitle: 'TV',
            },
            {
              id: 'media_player.speaker',
              name: 'Living Room Speaker',
              room: 'Living Room',
              subtitle: 'Speaker',
            },
          ],
          onUpdate,
        }}
        initialTab="stack"
      />
    );

    expect(screen.getByText('Media players')).toBeInTheDocument();
    const [firstCheckbox] = screen.getAllByRole('checkbox');

    expect(firstCheckbox).toBeDefined();
    if (!firstCheckbox) {
      throw new Error('Expected media stack checkbox to be rendered');
    }

    fireEvent.click(firstCheckbox);
    expect(onUpdate).toHaveBeenCalledWith({
      entityIds: ['media_player.speaker'],
      priorityOrder: ['media_player.speaker'],
      idleBehavior: 'compact',
    });
  });

  it('uses a fixed-height mobile dialog shell with a scrollable body', () => {
    entityRoomSelectorMock.mockClear();
    useThemeMock.mockReturnValue({ theme: 'dark' });
    useMediaArtworkColorsMock.mockReturnValue({
      dominant: 'rgb(32, 32, 35)',
      vibrant: 'rgb(80, 80, 86)',
      darkMuted: 'rgb(18, 18, 20)',
      highlight: 'rgb(242, 242, 245)',
      gradientEnd: 'rgb(10, 10, 12)',
    });

    renderWithProviders(
      <MediaDialog
        entityId="media_player.living_room"
        room="Living Room"
        isOpen
        onOpenChange={vi.fn()}
        artwork="data:image/png;base64,artwork"
        entityName="Living Room"
        entityType="Speaker"
        title="Long Queue"
        artist="Artist"
        isPlaying
        volume={10}
        isMuted={false}
        elapsedSeconds={93}
        durationSeconds={293}
        supportsGrouping
        groupMembers={Array.from({ length: 12 }, (_, index) => `media_player.member_${index}`)}
        availableGroupingPlayers={Array.from({ length: 12 }, (_, index) => ({
          id: `media_player.available_${index}`,
          name: `Available ${index + 1}`,
          isAttached: false,
        }))}
        onPrevious={vi.fn()}
        canPreviousTrack
        onTogglePlay={vi.fn()}
        onNext={vi.fn()}
        canNextTrack
        shuffleEnabled={false}
        repeatMode="off"
        onToggleShuffle={vi.fn()}
        onCycleRepeat={vi.fn()}
        capabilities={getMediaPlayerCapabilities(4 | 8 | 16 | 32 | 2 | 32768 | 262144)}
        sourceList={[]}
        onSelectSource={vi.fn()}
        soundModeList={[]}
        onSelectSoundMode={vi.fn()}
        onSeek={vi.fn()}
        onClearPlaylist={vi.fn()}
        onToggleMute={vi.fn()}
        onVolumeChange={vi.fn()}
        onVolumeInteractionStart={vi.fn()}
        onVolumeInteractionEnd={vi.fn()}
        onAttachGroupMember={vi.fn()}
        onDetachGroupMember={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toHaveClass('flex', 'flex-col', 'max-h-[88vh]');
    expect(screen.getByRole('dialog')).toHaveClass('max-sm:!h-[min(88dvh,calc(100dvh-1rem))]');
    expect(document.body.querySelector('.media-dialog-body.h-full.overflow-y-auto')).not.toBeNull();
  });

  it('opens speaker grouping from a single control and closes when toggled again', () => {
    entityRoomSelectorMock.mockClear();
    useThemeMock.mockReturnValue({ theme: 'dark' });
    useMediaArtworkColorsMock.mockReturnValue({
      dominant: 'rgb(32, 32, 35)',
      vibrant: 'rgb(80, 80, 86)',
      darkMuted: 'rgb(18, 18, 20)',
      highlight: 'rgb(242, 242, 245)',
      gradientEnd: 'rgb(10, 10, 12)',
    });

    renderWithProviders(
      <MediaDialog
        entityId="media_player.bathroom"
        room="Bathroom"
        isOpen
        onOpenChange={vi.fn()}
        artwork="data:image/png;base64,artwork"
        entityName="Bathroom"
        entityType="Speaker"
        title="Touch"
        artist="Cigarettes After Sex"
        isPlaying
        volume={10}
        isMuted={false}
        elapsedSeconds={93}
        durationSeconds={293}
        supportsGrouping
        groupMembers={['media_player.bathroom', 'media_player.kitchen']}
        availableGroupingPlayers={[
          { id: 'media_player.kitchen', name: 'Kitchen', isAttached: true },
          { id: 'media_player.living_room', name: 'Living Room', isAttached: false },
        ]}
        onPrevious={vi.fn()}
        canPreviousTrack
        onTogglePlay={vi.fn()}
        onNext={vi.fn()}
        canNextTrack
        shuffleEnabled={false}
        repeatMode="off"
        onToggleShuffle={vi.fn()}
        onCycleRepeat={vi.fn()}
        capabilities={getMediaPlayerCapabilities(4 | 8 | 16 | 32 | 2 | 32768 | 262144)}
        sourceList={[]}
        onSelectSource={vi.fn()}
        soundModeList={[]}
        onSelectSoundMode={vi.fn()}
        onSeek={vi.fn()}
        onClearPlaylist={vi.fn()}
        onToggleMute={vi.fn()}
        onVolumeChange={vi.fn()}
        onVolumeInteractionStart={vi.fn()}
        onVolumeInteractionEnd={vi.fn()}
        onAttachGroupMember={vi.fn()}
        onDetachGroupMember={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'Playback' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Group' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Speaker Group' }));

    expect(screen.getAllByText('Touch').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
    expect(screen.getByText('Living Room')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Speaker Group' }));

    expect(screen.queryByText('Kitchen')).not.toBeInTheDocument();
  });

  it('defaults TVs to remote controls when the current source looks like video playback', () => {
    entityRoomSelectorMock.mockClear();
    useThemeMock.mockReturnValue({ theme: 'dark' });
    useMediaArtworkColorsMock.mockReturnValue({
      dominant: 'rgb(32, 32, 35)',
      vibrant: 'rgb(80, 80, 86)',
      darkMuted: 'rgb(18, 18, 20)',
      highlight: 'rgb(242, 242, 245)',
      gradientEnd: 'rgb(10, 10, 12)',
    });

    renderWithProviders(
      <MediaDialog
        entityId="media_player.living_room_tv"
        room="Living Room"
        deviceClass="tv"
        remoteAvailable
        isOpen
        onOpenChange={vi.fn()}
        artwork={null}
        entityName="LG webOS TV"
        entityType="TV"
        title="LG webOS TV"
        artist=""
        isPlaying
        volume={9}
        isMuted={false}
        elapsedSeconds={0}
        durationSeconds={0}
        supportsGrouping={false}
        groupMembers={[]}
        availableGroupingPlayers={[]}
        onPrevious={vi.fn()}
        canPreviousTrack
        onTogglePlay={vi.fn()}
        onNext={vi.fn()}
        canNextTrack
        shuffleEnabled={false}
        repeatMode="off"
        onToggleShuffle={vi.fn()}
        onCycleRepeat={vi.fn()}
        capabilities={getMediaPlayerCapabilities(128 | 4 | 8 | 16 | 32)}
        source="YouTube"
        sourceList={['YouTube', 'Netflix']}
        onSelectSource={vi.fn()}
        soundModeList={[]}
        onSelectSoundMode={vi.fn()}
        onRemoteCommand={vi.fn()}
        onSeek={vi.fn()}
        onClearPlaylist={vi.fn()}
        onToggleMute={vi.fn()}
        onVolumeChange={vi.fn()}
        onVolumeInteractionStart={vi.fn()}
        onVolumeInteractionEnd={vi.fn()}
        onAttachGroupMember={vi.fn()}
        onDetachGroupMember={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'TV' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Playback' })).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.queryByText('Cigarettes After Sex')).not.toBeInTheDocument();
  });

  it('defaults TVs to playback controls when the current source looks like music playback', () => {
    entityRoomSelectorMock.mockClear();
    useThemeMock.mockReturnValue({ theme: 'dark' });
    useMediaArtworkColorsMock.mockReturnValue({
      dominant: 'rgb(32, 32, 35)',
      vibrant: 'rgb(80, 80, 86)',
      darkMuted: 'rgb(18, 18, 20)',
      highlight: 'rgb(242, 242, 245)',
      gradientEnd: 'rgb(10, 10, 12)',
    });

    renderWithProviders(
      <MediaDialog
        entityId="media_player.living_room_tv"
        room="Living Room"
        deviceClass="tv"
        remoteAvailable
        isOpen
        onOpenChange={vi.fn()}
        artwork={null}
        entityName="LG webOS TV"
        entityType="TV"
        title="Touch"
        artist="Cigarettes After Sex"
        isPlaying
        volume={9}
        isMuted={false}
        elapsedSeconds={93}
        durationSeconds={293}
        supportsGrouping={false}
        groupMembers={[]}
        availableGroupingPlayers={[]}
        onPrevious={vi.fn()}
        canPreviousTrack
        onTogglePlay={vi.fn()}
        onNext={vi.fn()}
        canNextTrack
        shuffleEnabled={false}
        repeatMode="off"
        onToggleShuffle={vi.fn()}
        onCycleRepeat={vi.fn()}
        capabilities={getMediaPlayerCapabilities(4 | 8 | 16 | 32 | 2)}
        source="Spotify"
        sourceList={['Spotify']}
        onSelectSource={vi.fn()}
        soundModeList={[]}
        onSelectSoundMode={vi.fn()}
        onRemoteCommand={vi.fn()}
        onSeek={vi.fn()}
        onClearPlaylist={vi.fn()}
        onToggleMute={vi.fn()}
        onVolumeChange={vi.fn()}
        onVolumeInteractionStart={vi.fn()}
        onVolumeInteractionEnd={vi.fn()}
        onAttachGroupMember={vi.fn()}
        onDetachGroupMember={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'TV' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Playback' })).toBeInTheDocument();
    expect(screen.getAllByText('Touch').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Cigarettes After Sex').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument();
  });
});
