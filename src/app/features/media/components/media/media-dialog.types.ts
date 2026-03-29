export interface MediaDialogGroupingPlayer {
  id: string;
  name: string;
  isAttached: boolean;
}

export interface MediaDialogProps {
  entityId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  artwork?: string | null;
  onArtworkError?: (imageUrl?: string | null) => void;
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
  onTogglePlay: () => void;
  onNext: () => void;
  shuffleEnabled: boolean;
  repeatMode: 'off' | 'one' | 'all';
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  upNextTitle?: string;
  onToggleMute: () => void;
  onVolumeChange: (value: number) => void;
  onVolumeInteractionStart: () => void;
  onVolumeInteractionEnd: () => void;
  onAttachGroupMember: (entityId: string) => void;
  onDetachGroupMember: (entityId: string) => void;
}
