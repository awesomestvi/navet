import artworksOriginal from '@assets/reference/media/artworks-original.jpg';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import {
  getMediaPlayerCapabilities,
  MEDIA_PLAYER_FEATURES,
} from '@navet/app/constants/media-player-features';
import { type ThemeMode, useThemeStore } from '@navet/app/stores/theme-store';
import type { MediaDevice } from '@navet/app/types/device.types';
import type { Meta, StoryObj } from '@storybook/react';
import { type ComponentProps, useEffect } from 'react';
import { MediaDashboard } from './media-dashboard';

type StoryDevice = MediaDevice & { type: 'media' };

const FULL_AUDIO_CAPABILITIES = getMediaPlayerCapabilities(
  MEDIA_PLAYER_FEATURES.PAUSE |
    MEDIA_PLAYER_FEATURES.SEEK |
    MEDIA_PLAYER_FEATURES.VOLUME_SET |
    MEDIA_PLAYER_FEATURES.VOLUME_MUTE |
    MEDIA_PLAYER_FEATURES.PREVIOUS_TRACK |
    MEDIA_PLAYER_FEATURES.NEXT_TRACK |
    MEDIA_PLAYER_FEATURES.PLAY_MEDIA |
    MEDIA_PLAYER_FEATURES.SELECT_SOURCE |
    MEDIA_PLAYER_FEATURES.PLAY |
    MEDIA_PLAYER_FEATURES.SHUFFLE_SET |
    MEDIA_PLAYER_FEATURES.BROWSE_MEDIA |
    MEDIA_PLAYER_FEATURES.REPEAT_SET
);

const SOURCE_ONLY_CAPABILITIES = {
  ...getMediaPlayerCapabilities(0),
  canPlay: true,
  canPause: true,
  canSelectSource: true,
  canSetVolume: true,
};

const NO_BROWSER_CAPABILITIES = {
  ...FULL_AUDIO_CAPABILITIES,
  canBrowseMedia: false,
  canSearchMedia: false,
};

const baseSpotify = {
  id: 'media_player.spotify_vishal',
  name: 'Spotify Vishal Chauhan',
  room: 'Whole Home',
  title: 'Olalla',
  artist: 'Blanco White',
  album: 'On the Other Side',
  entityType: 'Media Player',
  deviceClass: undefined,
  source: 'Bathroom',
  sourceList: ['Bathroom', 'Kitchen', 'Living Room', 'Maya’s Room'],
  entityPicture: artworksOriginal,
  state: 'playing',
  volume: 36,
  isMuted: false,
  elapsedSeconds: 35,
  durationSeconds: 248,
  mediaCapabilities: FULL_AUDIO_CAPABILITIES,
  supportsGrouping: false,
  supportsPreviousTrack: true,
  supportsNextTrack: true,
  groupMembers: [],
  size: 'medium',
  type: 'media',
} satisfies StoryDevice;

const kitchenSpeaker = {
  id: 'media_player.kitchen',
  name: 'Kitchen',
  room: 'Kitchen',
  title: 'Ready to play',
  artist: '',
  entityType: 'Speaker',
  deviceClass: 'speaker',
  source: 'Kitchen',
  sourceList: ['Kitchen'],
  state: 'idle',
  volume: 22,
  isMuted: false,
  mediaCapabilities: SOURCE_ONLY_CAPABILITIES,
  supportsGrouping: true,
  supportsPreviousTrack: false,
  supportsNextTrack: false,
  groupMembers: [],
  size: 'medium',
  type: 'media',
} satisfies StoryDevice;

const livingRoomTv = {
  id: 'media_player.living_room_tv',
  name: 'Living Room TV',
  room: 'Living Room',
  title: 'Samsung TV Plus',
  artist: 'Live',
  entityType: 'TV',
  deviceClass: 'tv',
  source: 'HDMI 1',
  sourceList: ['HDMI 1', 'Apple TV', 'TV'],
  state: 'idle',
  volume: 18,
  isMuted: false,
  mediaCapabilities: {
    ...getMediaPlayerCapabilities(
      MEDIA_PLAYER_FEATURES.VOLUME_SET |
        MEDIA_PLAYER_FEATURES.VOLUME_MUTE |
        MEDIA_PLAYER_FEATURES.SELECT_SOURCE |
        MEDIA_PLAYER_FEATURES.PAUSE |
        MEDIA_PLAYER_FEATURES.PLAY
    ),
  },
  supportsGrouping: false,
  supportsPreviousTrack: false,
  supportsNextTrack: false,
  groupMembers: [],
  size: 'medium',
  type: 'media',
} satisfies StoryDevice;

const radioSpeaker = {
  id: 'media_player.studio_radio',
  name: 'Studio Radio',
  room: 'Studio',
  title: 'NTS Radio 1',
  artist: 'Live radio',
  album: 'Morning rotation',
  entityType: 'Speaker',
  deviceClass: 'speaker',
  source: 'Radio',
  sourceList: ['Radio', 'Bluetooth'],
  state: 'playing',
  volume: 44,
  isMuted: false,
  elapsedSeconds: 0,
  durationSeconds: 0,
  mediaCapabilities: NO_BROWSER_CAPABILITIES,
  supportsGrouping: true,
  supportsPreviousTrack: false,
  supportsNextTrack: false,
  groupMembers: ['media_player.kitchen'],
  size: 'medium',
  type: 'media',
} satisfies StoryDevice;

const unavailablePlayer = {
  ...kitchenSpeaker,
  id: 'media_player.bedroom_unavailable',
  name: 'Bedroom Speaker',
  room: 'Bedroom',
  title: 'Bedroom Speaker',
  source: undefined,
  sourceList: [],
  state: 'off',
  volume: 0,
  mediaCapabilities: getMediaPlayerCapabilities(0),
} satisfies StoryDevice;

function MediaDashboardStory(props: ComponentProps<typeof MediaDashboard> & { theme: ThemeMode }) {
  const { theme, ...dashboardProps } = props;
  const surface = getThemeSurfaceTokens(theme);

  useEffect(() => {
    const previousTheme = useThemeStore.getState();
    useThemeStore.setState({ ...previousTheme, theme, followSystemTheme: false, wallpaper: null });
    return () => {
      useThemeStore.setState(previousTheme);
    };
  }, [theme]);

  return (
    <div className={`min-h-screen p-3 md:p-6 ${surface.appBg}`}>
      <MediaDashboard {...dashboardProps} />
    </div>
  );
}

const meta = {
  title: 'Pages/Media/Media Dashboard',
  component: MediaDashboardStory,
  tags: ['autodocs'],
  args: {
    devices: [baseSpotify, kitchenSpeaker, livingRoomTv],
    initialDeviceId: baseSpotify.id,
    theme: 'glass',
  },
  parameters: {
    layout: 'fullscreen',
    viewport: { defaultViewport: 'desktop1080p' },
    docs: {
      description: {
        component:
          'The provider-neutral, non-edit media surface. Stories run against the deterministic preview media service, so browsing and playback affordances never require a live smart-home session.',
      },
    },
  },
} satisfies Meta<typeof MediaDashboardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SpotifyPlaying: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'A playing Spotify account with artwork, live progress, Spotify Connect targets, and a browsable provider library.',
      },
    },
  },
};

export const SpotifyIdleNoSelectedSource: Story = {
  args: {
    devices: [
      {
        ...baseSpotify,
        source: undefined,
        state: 'idle',
        title: 'Spotify Vishal Chauhan',
        artist: '',
        entityPicture: undefined,
        mediaCapabilities: SOURCE_ONLY_CAPABILITIES,
      },
      kitchenSpeaker,
      livingRoomTv,
    ],
    initialDeviceId: baseSpotify.id,
  },
};

export const SpotifyWithAvailableSources: Story = {
  args: {
    devices: [{ ...baseSpotify, state: 'idle', source: 'Kitchen' }, kitchenSpeaker, livingRoomTv],
    initialDeviceId: baseSpotify.id,
  },
};

export const GenericSpeakerPlayingRadio: Story = {
  args: {
    devices: [radioSpeaker, kitchenSpeaker, livingRoomTv],
    initialDeviceId: radioSpeaker.id,
  },
};

export const TvMediaPlayer: Story = {
  args: {
    devices: [livingRoomTv, kitchenSpeaker],
    initialDeviceId: livingRoomTv.id,
  },
};

export const UnavailablePlayer: Story = {
  args: {
    devices: [unavailablePlayer, livingRoomTv],
    initialDeviceId: unavailablePlayer.id,
  },
};

export const NoBrowserSupport: Story = {
  args: {
    devices: [
      {
        ...baseSpotify,
        id: 'homey:media_player.spotify_vishal',
        mediaCapabilities: NO_BROWSER_CAPABILITIES,
      },
      kitchenSpeaker,
    ],
    initialDeviceId: 'homey:media_player.spotify_vishal',
  },
};

export const NoArtwork: Story = {
  args: {
    devices: [{ ...baseSpotify, entityPicture: undefined }, kitchenSpeaker, livingRoomTv],
    initialDeviceId: baseSpotify.id,
  },
};

export const MultipleRoomMediaPlayers: Story = {
  args: {
    devices: [
      baseSpotify,
      kitchenSpeaker,
      { ...kitchenSpeaker, id: 'media_player.bathroom', name: 'Bathroom', room: 'Bathroom' },
      {
        ...kitchenSpeaker,
        id: 'media_player.mayas_room',
        name: 'Maya’s Room',
        room: 'Maya’s Room',
      },
      radioSpeaker,
      livingRoomTv,
    ],
    initialDeviceId: baseSpotify.id,
  },
};

export const MobileMediaLibrary: Story = {
  args: {
    devices: [
      {
        ...kitchenSpeaker,
        title: 'Morning Mix',
        artist: 'Navet Radio',
        album: 'Daily rotation',
        state: 'playing',
        entityPicture: artworksOriginal,
        mediaCapabilities: FULL_AUDIO_CAPABILITIES,
      },
      livingRoomTv,
    ],
    initialDeviceId: kitchenSpeaker.id,
  },
  parameters: {
    viewport: { defaultViewport: 'iphone14plus' },
    docs: {
      description: {
        story:
          'The single-column, touch-first layout with a playing speaker and the deterministic preview media library.',
      },
    },
  },
};

export const TabletMediaSession: Story = {
  parameters: { viewport: { defaultViewport: 'tabletLandscape' } },
};

export const IdlePhone: Story = {
  ...SpotifyIdleNoSelectedSource,
  parameters: { viewport: { defaultViewport: 'iphone14' } },
};

export const LightTheme: Story = { args: { theme: 'light' } };
export const BlackTheme: Story = { args: { theme: 'black' } };
