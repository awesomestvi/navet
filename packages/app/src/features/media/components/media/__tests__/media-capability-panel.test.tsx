import { getMediaPlayerCapabilities } from '@navet/app/constants/media-player-features';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MediaCapabilityPanel } from '../media-capability-panel';

const { serviceMock } = vi.hoisted(() => ({
  serviceMock: {
    browseMediaPlayer: vi.fn().mockResolvedValue({
      title: 'Library',
      children: [
        {
          title: 'Daily Mix',
          mediaContentId: 'spotify:playlist:daily',
          mediaContentType: 'playlist',
          canPlay: true,
        },
      ],
    }),
    clearMediaPlayerPlaylist: vi.fn().mockResolvedValue(undefined),
    playMedia: vi.fn().mockResolvedValue(undefined),
    searchMediaPlayer: vi.fn().mockResolvedValue({
      title: 'Search',
      children: [
        {
          title: 'Search Result',
          mediaContentId: 'spotify:track:result',
          mediaContentType: 'music',
          canPlay: true,
        },
      ],
    }),
  },
}));

vi.mock('@navet/app/services/integration-media-feature.service', () => ({
  integrationMediaFeatureService: serviceMock,
}));

const controller = {
  isGlass: true,
  activeTransportStyle: {},
  subtleControlStyle: {},
  palette: {
    darkMuted: 'rgb(24, 24, 27)',
    highlight: 'rgb(249, 115, 22)',
  },
  readableForeground: {
    titleColor: 'rgb(255, 255, 255)',
    subtitleColor: 'rgb(161, 161, 170)',
    titleStyle: {},
    subtitleStyle: {},
  },
  surface: {
    border: 'border-white/10',
    textMuted: 'text-white/45',
    textPrimary: 'text-white',
    textSecondary: 'text-white/70',
  },
} as never;

describe('MediaCapabilityPanel', () => {
  it('browses, searches, and plays media items for capable players', async () => {
    renderWithProviders(
      <MediaCapabilityPanel
        capabilities={getMediaPlayerCapabilities(4127295 | 4194304)}
        controller={controller}
        durationSeconds={180}
        elapsedSeconds={30}
        entityId="media_player.living_room"
        onClearPlaylist={serviceMock.clearMediaPlayerPlaylist}
        onSeek={vi.fn()}
        onSelectSoundMode={vi.fn()}
        onSelectSource={vi.fn()}
        sourceList={['Living Room']}
        soundModeList={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Browse' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Daily Mix' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Daily Mix' }));
    expect(serviceMock.playMedia).toHaveBeenCalledWith('media_player.living_room', {
      mediaContentId: 'spotify:playlist:daily',
      mediaContentType: 'playlist',
      enqueue: 'play',
      announce: false,
    });

    fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), {
      target: { value: 'result' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => {
      expect(serviceMock.searchMediaPlayer).toHaveBeenCalledWith(
        'media_player.living_room',
        'result'
      );
    });
  });

  it('hides provider-unsupported media controls even when HA-style feature flags are present', () => {
    renderWithProviders(
      <MediaCapabilityPanel
        capabilities={getMediaPlayerCapabilities(4127295 | 4194304)}
        controller={controller}
        durationSeconds={180}
        elapsedSeconds={30}
        entityId="homey:media_player.living_room"
        onClearPlaylist={serviceMock.clearMediaPlayerPlaylist}
        onSeek={vi.fn()}
        onSelectSoundMode={vi.fn()}
        onSelectSource={vi.fn()}
        sourceList={['Living Room']}
        soundModeList={[]}
      />
    );

    expect(screen.queryByText('More media controls')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Browse' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Search' })).not.toBeInTheDocument();
  });
});
