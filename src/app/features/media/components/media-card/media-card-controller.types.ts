export interface UseMediaCardControllerParams {
  entityId: string;
  deviceClass?: string;
  entityPicture?: string;
  artworkKey?: string;
  initialTitle: string;
  initialArtist: string;
  initialSource?: string;
  initialSourceList?: string[];
  initialState: 'playing' | 'paused' | 'idle' | 'off';
  initialVolume: number;
  initialMuted: boolean;
  initialElapsedSeconds?: number;
  initialDurationSeconds?: number;
  initialPositionUpdatedAt?: string;
  initialSupportsGrouping?: boolean;
  initialGroupMembers?: string[];
}
