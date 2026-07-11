import {
  getMediaPlayerCapabilities,
  MEDIA_PLAYER_FEATURES,
} from '@navet/app/constants/media-player-features';
import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { setMediaQueryMatch } from '@navet/app/test/browser-mocks';
import { renderWithProviders } from '@navet/app/test/render';
import type { MediaDevice } from '@navet/app/types/device.types';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaDashboard } from '../media-dashboard';

const {
  browseMediaPlayerMock,
  dispatchEntityCommandMock,
  liveMediaEntityMock,
  playMediaMock,
  selectSourceMock,
} = vi.hoisted(() => ({
  browseMediaPlayerMock: vi.fn().mockResolvedValue({
    title: 'Library',
    children: [
      {
        title: 'Daily Mix',
        mediaContentId: 'spotify:playlist:daily',
        mediaContentType: 'playlist',
        mediaClass: 'playlist',
        canPlay: true,
      },
    ],
  }),
  dispatchEntityCommandMock: vi.fn().mockResolvedValue({ accepted: true }),
  liveMediaEntityMock: vi.fn(),
  playMediaMock: vi.fn().mockResolvedValue(undefined),
  selectSourceMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@navet/app/services/integration-media-feature.service', () => ({
  integrationMediaFeatureService: {
    browseMediaPlayer: browseMediaPlayerMock,
    playMedia: playMediaMock,
    selectMediaPlayerSource: selectSourceMock,
    seekMediaPlayer: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@navet/app/commands', () => ({
  dispatchEntityCommand: dispatchEntityCommandMock,
}));

vi.mock('@navet/app/features/media/hooks/use-provider-media-playback-data', () => ({
  useProviderMediaEntity: liveMediaEntityMock,
}));

const mediaCapabilities = getMediaPlayerCapabilities(
  MEDIA_PLAYER_FEATURES.PAUSE |
    MEDIA_PLAYER_FEATURES.PLAY |
    MEDIA_PLAYER_FEATURES.PLAY_MEDIA |
    MEDIA_PLAYER_FEATURES.SELECT_SOURCE |
    MEDIA_PLAYER_FEATURES.BROWSE_MEDIA |
    MEDIA_PLAYER_FEATURES.VOLUME_SET
);
const mediaCapabilitiesWithoutBrowse = getMediaPlayerCapabilities(
  MEDIA_PLAYER_FEATURES.PAUSE |
    MEDIA_PLAYER_FEATURES.PLAY |
    MEDIA_PLAYER_FEATURES.PLAY_MEDIA |
    MEDIA_PLAYER_FEATURES.SELECT_SOURCE |
    MEDIA_PLAYER_FEATURES.VOLUME_SET
);

function createMediaDevice(overrides: Partial<MediaDevice> = {}): MediaDevice & { type: 'media' } {
  return {
    id: 'media_player.spotify',
    name: 'Spotify Vishal Chauhan',
    room: 'Kitchen',
    size: 'medium',
    title: 'Spotify Vishal Chauhan',
    artist: '',
    album: '',
    entityType: 'Media Player',
    state: 'idle',
    volume: 24,
    isMuted: false,
    source: undefined,
    sourceList: ['Kitchen', 'Living Room'],
    mediaCapabilities,
    supportsGrouping: false,
    supportsPreviousTrack: false,
    supportsNextTrack: false,
    groupMembers: [],
    type: 'media',
    ...overrides,
  };
}

describe('MediaDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    browseMediaPlayerMock.mockResolvedValue({
      title: 'Library',
      children: [
        {
          title: 'Daily Mix',
          mediaContentId: 'spotify:playlist:daily',
          mediaContentType: 'playlist',
          mediaClass: 'playlist',
          canPlay: true,
        },
      ],
    });
    liveMediaEntityMock.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows browse without source selection for an idle Spotify account', async () => {
    renderWithProviders(<MediaDashboard devices={[createMediaDevice()]} />);

    await waitFor(() => expect(screen.getByText('Daily Mix')).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: 'Browse' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load media browser' })).not.toBeInTheDocument();
    expect(
      screen.queryByText('Select an output before starting playback.')
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Source' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resume playback' })).not.toBeInTheDocument();
    expect(screen.queryByText('Coming next')).not.toBeInTheDocument();
  });

  it('loads provider media browser items and plays playable results', async () => {
    renderWithProviders(
      <MediaDashboard
        devices={[
          createMediaDevice({
            state: 'playing',
            title: 'Olalla',
            artist: 'Blanco White',
            source: 'Kitchen',
          }),
        ]}
      />
    );

    await waitFor(() => expect(screen.getByText('Daily Mix')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Daily Mix'));

    await waitFor(() =>
      expect(playMediaMock).toHaveBeenCalledWith('media_player.spotify', {
        mediaContentId: 'spotify:playlist:daily',
        mediaContentType: 'playlist',
      })
    );
  });

  it('explains restricted Spotify speaker playback and recommends Music Assistant', async () => {
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => 'toast-id');
    playMediaMock.mockRejectedValueOnce(
      new Error('UPnP Error 800 received from media_player.bathroom')
    );

    renderWithProviders(<MediaDashboard devices={[createMediaDevice()]} />);

    fireEvent.click(await screen.findByText('Daily Mix'));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        'Spotify does not allow Web API playback control on this device. For Sonos and some Chromecast targets, use Music Assistant in Home Assistant to play this item from Navet.'
      )
    );
  });

  it('plays browsed media when the live entity capability snapshot is stale', async () => {
    renderWithProviders(
      <MediaDashboard
        devices={[
          createMediaDevice({
            mediaCapabilities: getMediaPlayerCapabilities(MEDIA_PLAYER_FEATURES.BROWSE_MEDIA),
          }),
        ]}
      />
    );

    fireEvent.click(await screen.findByText('Daily Mix'));

    await waitFor(() =>
      expect(playMediaMock).toHaveBeenCalledWith('media_player.spotify', {
        mediaContentId: 'spotify:playlist:daily',
        mediaContentType: 'playlist',
      })
    );
  });

  it('shows a back button after entering a browsable media directory', async () => {
    browseMediaPlayerMock.mockImplementation(async (_entityId, media) => {
      if (media?.mediaContentId === 'spotify:directory:playlists') {
        return {
          title: 'Playlists',
          children: [
            {
              title: 'Daily Mix',
              mediaContentId: 'spotify:playlist:daily',
              mediaContentType: 'playlist',
              mediaClass: 'playlist',
              canPlay: true,
            },
          ],
        };
      }

      return {
        title: 'Library',
        children: [
          {
            title: 'Playlists',
            mediaContentId: 'spotify:directory:playlists',
            mediaContentType: 'playlist',
            mediaClass: 'directory',
            canExpand: true,
            canPlay: false,
          },
        ],
      };
    });

    renderWithProviders(<MediaDashboard devices={[createMediaDevice()]} />);

    await waitFor(() => expect(screen.getByText('Playlists')).toBeInTheDocument());
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Playlists'));

    await waitFor(() =>
      expect(browseMediaPlayerMock).toHaveBeenCalledWith('media_player.spotify', {
        mediaContentId: 'spotify:directory:playlists',
        mediaContentType: 'playlist',
      })
    );
    await waitFor(() => expect(screen.getByText('Daily Mix')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    await waitFor(() =>
      expect(browseMediaPlayerMock).toHaveBeenLastCalledWith('media_player.spotify', {
        mediaContentId: undefined,
        mediaContentType: undefined,
      })
    );
  });

  it('shows item-count badges for browsable media directories', async () => {
    browseMediaPlayerMock.mockImplementation(async (_entityId, media) => {
      if (media?.mediaContentId === 'spotify:directory:playlists') {
        return {
          title: 'Playlists',
          children: [
            { title: 'Daily Mix 1', mediaContentId: 'spotify:playlist:1', canPlay: true },
            { title: 'Daily Mix 2', mediaContentId: 'spotify:playlist:2', canPlay: true },
            { title: 'Daily Mix 3', mediaContentId: 'spotify:playlist:3', canPlay: true },
          ],
        };
      }
      if (media?.mediaContentId === 'spotify:directory:albums') {
        return { title: 'Albums', children: [] };
      }

      return {
        title: 'Library',
        children: [
          {
            title: 'Playlists',
            mediaContentId: 'spotify:directory:playlists',
            mediaContentType: 'playlist',
            mediaClass: 'directory',
            canExpand: true,
            canPlay: false,
          },
          {
            title: 'Albums',
            mediaContentId: 'spotify:directory:albums',
            mediaContentType: 'album',
            mediaClass: 'directory',
            canExpand: true,
            canPlay: false,
          },
        ],
      };
    });

    renderWithProviders(<MediaDashboard devices={[createMediaDevice()]} />);

    expect(await screen.findByLabelText('3 items')).toBeInTheDocument();
    expect(await screen.findByLabelText('0 items')).toBeInTheDocument();
  });

  it('keeps non-recent media folders in the compact two-row card footprint', async () => {
    browseMediaPlayerMock.mockImplementation(async (_entityId, media) => {
      if (media?.mediaContentId === 'spotify:directory:albums') {
        return {
          title: 'Albums',
          children: Array.from({ length: 20 }, (_, index) => ({
            title: `Album ${index + 1}`,
            mediaContentId: `spotify:album:${index + 1}`,
            mediaContentType: 'album',
            mediaClass: 'album',
            canPlay: true,
          })),
        };
      }

      return {
        title: 'Media Library',
        children: [
          {
            title: 'Albums',
            mediaContentId: 'spotify:directory:albums',
            mediaContentType: 'album',
            mediaClass: 'directory',
            canExpand: true,
            canPlay: false,
          },
        ],
      };
    });

    renderWithProviders(<MediaDashboard devices={[createMediaDevice()]} />);

    fireEvent.click(await screen.findByText('Albums'));
    expect(await screen.findByRole('heading', { name: 'Albums' })).toBeInTheDocument();
    const albumGrid = screen.getByTestId('media-browser-compact-grid');
    expect(albumGrid).toHaveStyle({ height: '364px' });
    expect(albumGrid.children).toHaveLength(16);
  });

  it('uses a compact single-row media rail below 900px', async () => {
    setMediaQueryMatch('(max-width: 899px)', true);
    localStorage.setItem(
      STORAGE_KEYS.mediaDefaultViews,
      JSON.stringify({
        'media_player.spotify': {
          title: 'Recently played',
          mediaClass: 'directory',
          mediaContentId: 'spotify:directory:recently-played',
          mediaContentType: 'track',
          canExpand: true,
          canPlay: false,
        },
      })
    );
    browseMediaPlayerMock.mockResolvedValue({
      title: 'Recently played',
      children: Array.from({ length: 10 }, (_, index) => ({
        title: `Track ${index + 1}`,
        mediaContentId: `spotify:track:${index + 1}`,
        mediaContentType: 'track',
        mediaClass: 'track',
        canPlay: true,
      })),
    });

    renderWithProviders(<MediaDashboard devices={[createMediaDevice()]} />);

    const mobileGrid = await screen.findByTestId('media-browser-compact-grid');
    expect(mobileGrid).toHaveStyle({ height: '170px' });
    expect(mobileGrid).toHaveClass('overflow-x-auto');
    expect(mobileGrid.children).toHaveLength(8);
    expect(screen.getByRole('button', { name: 'Show all' })).toBeInTheDocument();
  });

  it('persists a media folder as the default view and opens it on the next visit', async () => {
    browseMediaPlayerMock.mockImplementation(async (_entityId, media) => {
      if (media?.mediaContentId === 'spotify:directory:recently-played') {
        return {
          title: 'Recently played',
          children: [
            {
              title: 'Bed Head',
              mediaContentId: 'spotify:track:bed-head',
              mediaContentType: 'track',
              mediaClass: 'track',
              canPlay: true,
            },
          ],
        };
      }

      return {
        title: 'Media Library',
        children: [
          {
            title: 'Recently played',
            mediaContentId: 'spotify:directory:recently-played',
            mediaContentType: 'track',
            mediaClass: 'directory',
            canExpand: true,
            canPlay: false,
          },
        ],
      };
    });

    const firstVisit = renderWithProviders(<MediaDashboard devices={[createMediaDevice()]} />);

    fireEvent.click(await screen.findByText('Recently played'));
    expect(await screen.findByRole('heading', { name: 'Recently played' })).toBeInTheDocument();
    const saveDefaultViewButton = screen.getByRole('button', {
      name: 'Set Recently played as default view',
    });
    expect(saveDefaultViewButton).toHaveTextContent(/^$/);
    expect(saveDefaultViewButton).not.toHaveClass('rounded-full');
    fireEvent.click(saveDefaultViewButton);

    await waitFor(() =>
      expect(localStorage.getItem(STORAGE_KEYS.mediaDefaultViews)).toContain(
        'spotify:directory:recently-played'
      )
    );

    firstVisit.unmount();
    browseMediaPlayerMock.mockClear();
    renderWithProviders(<MediaDashboard devices={[createMediaDevice()]} />);

    await waitFor(() =>
      expect(browseMediaPlayerMock).toHaveBeenCalledWith('media_player.spotify', {
        mediaContentId: 'spotify:directory:recently-played',
        mediaContentType: 'track',
      })
    );
    expect(await screen.findByRole('heading', { name: 'Recently played' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove default view' })).toBeInTheDocument();
  });

  it('preserves the expanded media view after the dashboard is remounted', async () => {
    localStorage.setItem(
      STORAGE_KEYS.mediaDefaultViews,
      JSON.stringify({
        'media_player.spotify': {
          title: 'Recently played',
          mediaClass: 'directory',
          mediaContentId: 'spotify:directory:recently-played',
          mediaContentType: 'track',
          canExpand: true,
          canPlay: false,
        },
      })
    );
    browseMediaPlayerMock.mockResolvedValue({
      title: 'Recently played',
      children: Array.from({ length: 20 }, (_, index) => ({
        title: `Track ${index + 1}`,
        mediaContentId: `spotify:track:${index + 1}`,
        mediaContentType: 'track',
        mediaClass: 'track',
        canPlay: true,
      })),
    });

    const firstVisit = renderWithProviders(<MediaDashboard devices={[createMediaDevice()]} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Show all' }));

    await waitFor(() =>
      expect(localStorage.getItem(STORAGE_KEYS.mediaBrowserExpandedViews)).toContain('true')
    );
    firstVisit.unmount();

    renderWithProviders(<MediaDashboard devices={[createMediaDevice()]} />);

    expect(await screen.findByRole('button', { name: 'Show less' })).toBeInTheDocument();
    expect(screen.getByTestId('media-browser-virtual-table-shell')).toBeInTheDocument();
  });

  it('removes duplicate entries from recently played while preserving their order', async () => {
    browseMediaPlayerMock.mockImplementation(async (_entityId, media) => {
      if (media?.mediaContentId === 'spotify:directory:recently-played') {
        return {
          title: 'Recently played',
          children: [
            {
              title: 'The Grocery',
              mediaContentId: 'spotify:track:the-grocery',
              mediaContentType: 'track',
              mediaClass: 'track',
              canPlay: true,
            },
            {
              title: 'Angel Of Death',
              mediaContentId: 'spotify:track:angel-of-death',
              mediaContentType: 'track',
              mediaClass: 'track',
              canPlay: true,
            },
            {
              title: 'The Grocery',
              mediaContentId: 'spotify:track:the-grocery',
              mediaContentType: 'track',
              mediaClass: 'track',
              canPlay: true,
            },
          ],
        };
      }

      return {
        title: 'Media Library',
        children: [
          {
            title: 'Recently played',
            mediaContentId: 'spotify:directory:recently-played',
            mediaContentType: 'track',
            mediaClass: 'directory',
            canExpand: true,
            canPlay: false,
          },
        ],
      };
    });

    renderWithProviders(<MediaDashboard devices={[createMediaDevice()]} />);

    fireEvent.click(await screen.findByText('Recently played'));

    expect(await screen.findByRole('heading', { name: 'Recently played' })).toBeInTheDocument();
    expect(screen.getAllByText('The Grocery')).toHaveLength(1);
    expect(screen.getAllByText('Angel Of Death')).toHaveLength(1);
  });

  it('allows Home Assistant media browsing when the provider supports browse but the entity snapshot is stale', async () => {
    renderWithProviders(
      <MediaDashboard
        devices={[
          createMediaDevice({
            mediaCapabilities: mediaCapabilitiesWithoutBrowse,
          }),
        ]}
      />
    );

    await waitFor(() =>
      expect(browseMediaPlayerMock).toHaveBeenCalledWith('media_player.spotify', {
        mediaContentId: undefined,
        mediaContentType: undefined,
      })
    );
  });

  it('shows unsupported browser UI when neither the entity nor provider supports browsing', () => {
    renderWithProviders(
      <MediaDashboard
        devices={[
          createMediaDevice({
            id: 'homey:media_player.spotify',
            mediaCapabilities: mediaCapabilitiesWithoutBrowse,
          }),
        ]}
      />
    );

    expect(
      screen.getByText('This player or provider did not expose a media browser.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load media browser' })).not.toBeInTheDocument();
  });

  it('shows the browser empty state when browsing fails', async () => {
    browseMediaPlayerMock.mockRejectedValueOnce(new Error('Browse failed'));

    renderWithProviders(<MediaDashboard devices={[createMediaDevice()]} />);

    await waitFor(() =>
      expect(
        screen.getByText('No browsable media was exposed for this player right now.')
      ).toBeInTheDocument()
    );
    expect(screen.queryByRole('button', { name: 'Load media browser' })).not.toBeInTheDocument();
  });

  it('uses live Spotify media title and artist for the Spotify Connect artwork text', () => {
    liveMediaEntityMock.mockReturnValue({
      state: 'playing',
      attributes: {
        media_title: 'Above the Clouds of Pompeii',
        media_artist: "Bear's Den",
        media_album_name: 'Islands',
        entity_picture: '/api/media_player_proxy/media_player.spotify',
      },
    });

    renderWithProviders(
      <MediaDashboard
        devices={[
          createMediaDevice({
            state: 'playing',
            title: 'Above the Clouds of Pompeii',
            album: 'Islands',
            entityPicture: '/stale-artwork.jpg',
          }),
        ]}
      />
    );

    expect(screen.getByText('Above the Clouds of Pompeii')).toBeInTheDocument();
    expect(screen.getByText("Bear's Den")).toBeInTheDocument();
    expect(screen.queryByText('Islands')).not.toBeInTheDocument();
  });

  it('uses the selected output player artwork when Spotify playback is delegated', () => {
    liveMediaEntityMock.mockImplementation((entityId: string) =>
      entityId === 'media_player.bathroom'
        ? {
            state: 'playing',
            attributes: {
              media_title: 'Warning Signs',
              media_artist: 'Band of Horses',
              entity_picture: '/api/media_player_proxy/media_player.bathroom',
            },
          }
        : { state: 'idle', attributes: {} }
    );

    renderWithProviders(
      <MediaDashboard
        devices={[
          createMediaDevice({
            id: 'media_player.spotify',
            name: 'Spotify Premium',
          }),
          createMediaDevice({
            id: 'media_player.bathroom',
            name: 'Bathroom',
            state: 'playing',
            source: undefined,
            sourceList: [],
          }),
        ]}
      />
    );

    expect(screen.getByText('Warning Signs')).toBeInTheDocument();
    expect(screen.getByText('Band of Horses')).toBeInTheDocument();
    expect(screen.getByTestId('spotify-connect-card').querySelector('img')).toHaveAttribute(
      'src',
      '/api/media_player_proxy/media_player.bathroom'
    );
    expect(screen.getByRole('button', { name: 'Spotify output' })).toHaveClass('min-w-9');
  });

  it('uses an idle speaker for media browsing instead of the Spotify account', async () => {
    renderWithProviders(
      <MediaDashboard
        devices={[
          createMediaDevice({
            id: 'media_player.kitchen',
            name: 'Kitchen',
            source: undefined,
            sourceList: ['Spotify'],
          }),
          createMediaDevice({
            id: 'media_player.spotify',
            name: 'Spotify Premium',
            source: 'iPhone',
            sourceList: ['iPhone'],
          }),
        ]}
      />
    );

    await waitFor(() =>
      expect(browseMediaPlayerMock).toHaveBeenCalledWith('media_player.kitchen', {
        mediaContentId: undefined,
        mediaContentType: undefined,
      })
    );

    expect(screen.queryByText('Play on')).not.toBeInTheDocument();
    expect(screen.getByTestId('spotify-connect-card')).toHaveStyle({
      height: '364px',
      minHeight: '364px',
    });
    expect(screen.getByTestId('spotify-connect-targets')).not.toHaveClass('sm:grid-cols-3');
    expect(screen.getByTestId('spotify-card-header-icon')).toBeInTheDocument();
    expect(screen.getByText('Spotify Premium')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kitchen' })).toBeInTheDocument();
  });

  it('starts Spotify Connect playback on the selected Spotify-capable media player', async () => {
    renderWithProviders(
      <MediaDashboard
        devices={[
          createMediaDevice({
            state: 'idle',
            source: undefined,
            sourceList: ['Kitchen', 'Living Room'],
          }),
          createMediaDevice({
            id: 'media_player.living_room',
            name: 'Living Room',
            source: undefined,
            sourceList: ['Spotify'],
          }),
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Living Room' }));

    await waitFor(() =>
      expect(selectSourceMock).toHaveBeenCalledWith('media_player.living_room', 'Spotify')
    );
    expect(dispatchEntityCommandMock).toHaveBeenCalledWith({
      type: 'play_pause',
      entityId: 'media_player.living_room',
    });
  });

  it('groups compatible speakers from the media library header', async () => {
    renderWithProviders(
      <MediaDashboard
        devices={[
          createMediaDevice({
            id: 'media_player.spotify',
            name: 'Spotify Premium',
          }),
          createMediaDevice({
            id: 'media_player.bathroom',
            name: 'Bathroom',
            state: 'playing',
            supportsGrouping: true,
            groupMembers: ['media_player.bathroom'],
            source: undefined,
            sourceList: [],
          }),
          createMediaDevice({
            id: 'media_player.living_room',
            name: 'Living Room',
            supportsGrouping: true,
            source: undefined,
            sourceList: [],
          }),
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Spotify output' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Living Room' }));

    await waitFor(() =>
      expect(dispatchEntityCommandMock).toHaveBeenCalledWith({
        type: 'join_group',
        entityId: 'media_player.bathroom',
        members: ['media_player.living_room'],
      })
    );
  });

  it('renders the destination control when a provider omits group members', () => {
    renderWithProviders(
      <MediaDashboard
        devices={[
          createMediaDevice({ id: 'media_player.spotify', name: 'Spotify Premium' }),
          createMediaDevice({
            id: 'media_player.bathroom',
            name: 'Bathroom',
            groupMembers: undefined,
            source: undefined,
            sourceList: [],
          }),
        ]}
      />
    );

    expect(screen.getByRole('button', { name: 'Spotify output' })).toBeInTheDocument();
  });

  it('does not show transport play for dormant Spotify', async () => {
    renderWithProviders(
      <MediaDashboard
        devices={[
          createMediaDevice({
            state: 'idle',
            source: undefined,
            sourceList: [],
          }),
        ]}
      />
    );

    expect(screen.queryByRole('button', { name: 'Resume playback' })).not.toBeInTheDocument();
    expect(dispatchEntityCommandMock).not.toHaveBeenCalled();
  });

  it('retargets media browsing and playback to the selected Spotify Connect speaker', async () => {
    renderWithProviders(
      <MediaDashboard
        devices={[
          createMediaDevice({
            id: 'media_player.spotify',
            name: 'Spotify Premium',
            source: undefined,
            sourceList: [],
          }),
          createMediaDevice({
            id: 'media_player.living_room',
            name: 'Living Room',
            source: 'Spotify Connect',
            sourceList: [],
          }),
        ]}
      />
    );

    expect(screen.queryByRole('combobox', { name: 'Source' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Living Room' })).toBeInTheDocument();

    expect(selectSourceMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Living Room' }));

    await waitFor(() =>
      expect(browseMediaPlayerMock).toHaveBeenCalledWith('media_player.living_room', {
        mediaContentId: undefined,
        mediaContentType: undefined,
      })
    );

    fireEvent.click(screen.getByText('Daily Mix'));

    await waitFor(() =>
      expect(playMediaMock).toHaveBeenCalledWith('media_player.living_room', {
        mediaContentId: 'spotify:playlist:daily',
        mediaContentType: 'playlist',
      })
    );
  });

  it('uses the active Spotify Connect speaker as the initial media library target', async () => {
    renderWithProviders(
      <MediaDashboard
        devices={[
          createMediaDevice({
            id: 'media_player.spotify',
            name: 'Spotify Premium',
            source: 'Bathroom',
          }),
          createMediaDevice({
            id: 'media_player.bathroom',
            name: 'Bathroom',
            state: 'playing',
            source: 'Spotify Connect',
            sourceList: ['Spotify Connect'],
          }),
        ]}
      />
    );

    await waitFor(() =>
      expect(browseMediaPlayerMock).toHaveBeenCalledWith('media_player.bathroom', {
        mediaContentId: undefined,
        mediaContentType: undefined,
      })
    );

    fireEvent.click(await screen.findByText('Daily Mix'));

    await waitFor(() =>
      expect(playMediaMock).toHaveBeenCalledWith('media_player.bathroom', {
        mediaContentId: 'spotify:playlist:daily',
        mediaContentType: 'playlist',
      })
    );
  });

  it('keeps media browsing on a speaker with blank source metadata', async () => {
    const spotifyDevice = createMediaDevice({
      id: 'media_player.spotify',
      name: 'Spotify Premium',
      source: undefined,
    });
    const idleBathroom = createMediaDevice({
      id: 'media_player.bathroom',
      name: 'Bathroom',
      state: 'idle',
      source: undefined,
      sourceList: [],
    });
    const view = renderWithProviders(<MediaDashboard devices={[spotifyDevice, idleBathroom]} />);

    await waitFor(() =>
      expect(browseMediaPlayerMock).toHaveBeenCalledWith('media_player.bathroom', {
        mediaContentId: undefined,
        mediaContentType: undefined,
      })
    );
    view.rerender(
      <MediaDashboard
        devices={[
          spotifyDevice,
          {
            ...idleBathroom,
            state: 'playing',
          },
        ]}
      />
    );

    fireEvent.click(await screen.findByText('Daily Mix'));
    await waitFor(() =>
      expect(playMediaMock).toHaveBeenCalledWith('media_player.bathroom', {
        mediaContentId: 'spotify:playlist:daily',
        mediaContentType: 'playlist',
      })
    );
  });

  it('fills Spotify recently played rows with CDN artwork, artist, and album metadata', async () => {
    localStorage.setItem(
      STORAGE_KEYS.mediaDefaultViews,
      JSON.stringify({
        'media_player.spotify': {
          title: 'Recently played',
          mediaClass: 'directory',
          mediaContentId: 'spotify:directory:recently-played',
          mediaContentType: 'track',
          canExpand: true,
          canPlay: false,
        },
      })
    );
    browseMediaPlayerMock.mockResolvedValueOnce({
      title: 'Recently played',
      children: [
        {
          title: 'Bed Head',
          mediaContentId: 'spotify:track:1234567890123456789012',
          mediaContentType: 'track',
          mediaClass: 'track',
          thumbnail: '/image/ab67616d00001e02bedheadart',
          canPlay: true,
        },
        ...Array.from({ length: 20 }, (_, index) => ({
          title: `Track ${index + 2}`,
          mediaContentId: `spotify:track:${String(index + 2).padStart(22, '0')}`,
          mediaContentType: 'track',
          mediaClass: 'track',
          canPlay: true,
        })),
      ],
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            title: 'Bed Head',
            artistName: 'Manchester Orchestra',
            albumTitle: 'The Million Masks Of God',
            artworkUrls: ['https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02bedheadart'],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );

    const { container } = renderWithProviders(<MediaDashboard devices={[createMediaDevice()]} />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Show all' })).toBeInTheDocument()
    );
    const recentGrid = screen.getByTestId('media-browser-compact-grid');
    expect(recentGrid).toHaveStyle({ height: '364px' });
    expect(recentGrid.children).toHaveLength(16);

    fireEvent.click(screen.getByRole('button', { name: 'Show all' }));

    await waitFor(() => expect(screen.getByText('Manchester Orchestra')).toBeInTheDocument());
    expect(screen.getByTestId('media-browser-virtual-table-shell')).toHaveStyle({
      height: '364px',
    });
    expect(screen.getByTestId('media-browser-virtual-table')).toHaveStyle({ height: '320px' });
    expect(screen.getByText('The Million Masks Of God')).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://i.scdn.co/image/ab67616d00001e02bedheadart'
    );
  });
});
