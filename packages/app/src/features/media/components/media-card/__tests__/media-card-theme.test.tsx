import { renderWithProviders } from '@navet/app/test/render';
import { describe, expect, it, vi } from 'vitest';
import { MediaCard } from '../index';

let mockIsOff = true;
let mockTheme: 'glass' | 'dark' = 'glass';

vi.mock('@navet/app/hooks', () => ({
  useTheme: () => ({
    theme: mockTheme,
    colors: {
      media: {
        off: {
          border: 'border-zinc-950',
        },
      },
    },
  }),
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@navet/app/components/shared/edit-mode-settings-request', () => ({
  useEditModeSettingsRequest: vi.fn(),
}));

vi.mock('../use-media-card-controller', () => ({
  useMediaCardController: () => ({
    albumArt: null,
    artworkResource: null,
    clearPlaylist: vi.fn(),
    cycleRepeat: vi.fn(),
    closeDialog: vi.fn(),
    durationSeconds: 0,
    displayArtist: 'Ready to play',
    displayTitle: 'Living Room TV',
    elapsedSeconds: 0,
    handleArtworkError: vi.fn(),
    handleNext: vi.fn(),
    handlePrevious: vi.fn(),
    handleVolumeChange: vi.fn(),
    groupMembers: [],
    isOff: mockIsOff,
    isPlaying: false,
    isMuted: false,
    isOpen: false,
    mediaCapabilities: {},
    openDialog: vi.fn(),
    remoteAvailable: false,
    repeatMode: 'off',
    seekTo: vi.fn(),
    selectSource: vi.fn(),
    selectSoundMode: vi.fn(),
    availableGroupingPlayers: [],
    attachGroupMember: vi.fn(),
    detachGroupMember: vi.fn(),
    canNextTrack: false,
    canPreviousTrack: false,
    shuffleEnabled: false,
    soundMode: '',
    soundModeList: [],
    source: 'HDMI 1',
    sourceList: ['HDMI 1'],
    supportsGrouping: false,
    startVolumeInteraction: vi.fn(),
    endVolumeInteraction: vi.fn(),
    sendRemoteCommand: vi.fn(),
    toggleTvPower: vi.fn(),
    toggleShuffle: vi.fn(),
    toggleMute: vi.fn(),
    togglePlay: vi.fn(),
    upNextTitle: '',
    volume: 24,
  }),
}));

describe('MediaCard theme surfaces', () => {
  it('keeps glass TV cards on the shared glass border instead of a dark media-off border', () => {
    mockIsOff = true;
    mockTheme = 'glass';

    const { container } = renderWithProviders(
      <MediaCard
        id="media_player.living_room_tv"
        name="Living Room TV"
        room="Living Room"
        title="Living Room TV"
        artist="Ready to play"
        deviceClass="tv"
        state="off"
        volume={24}
        isMuted={false}
        size="medium"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    const card = container.firstElementChild;
    expect(card).not.toBeNull();
    expect(card).toHaveClass('border-white/22');
    expect(card).not.toHaveClass('border-zinc-950');
  });

  it('uses a stronger glass shell tint when the TV card is on', () => {
    mockIsOff = false;
    mockTheme = 'glass';

    const { container } = renderWithProviders(
      <MediaCard
        id="media_player.living_room_tv"
        name="Living Room TV"
        room="Living Room"
        title="Living Room TV"
        artist="Ready to play"
        deviceClass="tv"
        state="playing"
        volume={24}
        isMuted={false}
        size="medium"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    const card = container.firstElementChild;
    expect(card).not.toBeNull();
    expect(card).toHaveClass('border-fuchsia-400/20');
    expect(card).toHaveStyle({
      background:
        'linear-gradient(135deg, rgba(217,70,239,0.34) 0%, rgba(126,34,206,0.2) 52%, rgba(255,255,255,0.08) 100%)',
      borderColor: 'rgba(244,114,182,0.38)',
    });
  });

  it('keeps the active TV shell gradient in dark theme', () => {
    mockIsOff = false;
    mockTheme = 'dark';

    const { container } = renderWithProviders(
      <MediaCard
        id="media_player.living_room_tv"
        name="Living Room TV"
        room="Living Room"
        title="Living Room TV"
        artist="Ready to play"
        deviceClass="tv"
        state="playing"
        volume={24}
        isMuted={false}
        size="medium"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    const card = container.firstElementChild;
    expect(card).not.toBeNull();
    expect(card).toHaveClass(
      'bg-gradient-to-br',
      'from-violet-950/90',
      'via-fuchsia-950/75',
      'to-zinc-950'
    );
    expect(card).toHaveClass('border-fuchsia-500/25');
  });
});
