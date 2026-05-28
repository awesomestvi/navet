import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getMediaPlayerCapabilities } from '@/app/constants/media-player-features';
import { renderWithProviders } from '@/test/render';
import { MediaCapabilityPanel } from '../media-capability-panel';

const { serviceMock } = vi.hoisted(() => ({
  serviceMock: {
    browseMediaPlayer: vi.fn().mockResolvedValue({
      title: 'Library',
      children: [
        {
          title: 'Daily Mix',
          media_content_id: 'spotify:playlist:daily',
          media_content_type: 'playlist',
          can_play: true,
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
          media_content_id: 'spotify:track:result',
          media_content_type: 'music',
          can_play: true,
        },
      ],
    }),
  },
}));

vi.mock('@/app/services/home-assistant.service', () => ({
  homeAssistantService: serviceMock,
}));

const controller = {
  isGlass: true,
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
        'result',
        undefined
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
