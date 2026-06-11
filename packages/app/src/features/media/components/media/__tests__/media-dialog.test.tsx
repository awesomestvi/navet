import { getMediaPlayerCapabilities } from '@navet/app/constants/media-player-features';
import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MediaDialog } from '../media-dialog';

const { useThemeMock, useMediaArtworkColorsMock } = vi.hoisted(() => ({
  useThemeMock: vi.fn(),
  useMediaArtworkColorsMock: vi.fn(),
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
  EntityRoomSelector: () => <div>Bathroom</div>,
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
    expect(screen.getAllByText('Speaker').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: 'Edit Bathroom' })).toBeInTheDocument();
    expect(screen.getAllByText('Touch').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Cigarettes After Sex').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: 'Pause playback' })).toBeInTheDocument();
    expect(screen.getByText('Volume')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
  });
});
