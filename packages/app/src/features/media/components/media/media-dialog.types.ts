import type { MediaPlayerCapabilities } from '@navet/app/constants/media-player-features';
import type { TvRemoteAction } from '@navet/app/features/media/tv-remote-commands';
import type { ResolvedPlatformResource } from '@navet/app/platform/resources';

export interface MediaDialogGroupingPlayer {
  id: string;
  name: string;
  isAttached: boolean;
}

export interface MediaDialogProps {
  entityId: string;
  room?: string;
  deviceClass?: string;
  remoteAvailable?: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  artwork?: string | null;
  artworkResource?: ResolvedPlatformResource | null;
  onArtworkError?: (imageUrl?: string | null) => void;
  entityName: string;
  entityType: string;
  title: string;
  artist: string;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  elapsedSeconds: number;
  durationSeconds: number;
  supportsGrouping: boolean;
  groupMembers: string[];
  availableGroupingPlayers: MediaDialogGroupingPlayer[];
  onPrevious: () => void;
  canPreviousTrack: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  canNextTrack: boolean;
  shuffleEnabled: boolean;
  repeatMode: 'off' | 'one' | 'all';
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  upNextTitle?: string;
  capabilities: MediaPlayerCapabilities;
  source?: string;
  sourceList: string[];
  onSelectSource: (source: string) => void;
  soundMode?: string;
  soundModeList: string[];
  onSelectSoundMode: (soundMode: string) => void;
  onRemoteCommand?: (action: TvRemoteAction) => void;
  onSeek: (elapsedSeconds: number) => void;
  onClearPlaylist: () => void;
  onToggleMute: () => void;
  onVolumeChange: (value: number) => void;
  onVolumeInteractionStart: () => void;
  onVolumeInteractionEnd: () => void;
  onAttachGroupMember: (entityId: string) => void;
  onDetachGroupMember: (entityId: string) => void;
}
