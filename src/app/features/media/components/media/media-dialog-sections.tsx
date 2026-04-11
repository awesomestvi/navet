import * as Dialog from '@radix-ui/react-dialog';
import {
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { RoundControlButton } from '@/app/components/primitives/round-control-button';
import { EntityRoomSelector } from '@/app/components/shared/entity-room-selector';
import { useI18n } from '@/app/hooks';
import { getEntityTypeLabel } from '@/app/utils/entity-type-label';
import type { MediaDialogGroupingPlayer, MediaDialogProps } from './media-dialog.types';
import { MediaFallbackArtwork } from './media-fallback-artwork';
import type { MediaDialogController } from './use-media-dialog-controller';

interface MediaDialogHeaderProps {
  artist: string;
  controller: MediaDialogController;
  entityId: string;
  title: string;
}

export function MediaDialogHeader({ artist, controller, entityId, title }: MediaDialogHeaderProps) {
  const { t } = useI18n();
  const entityType = getEntityTypeLabel(entityId);

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="mb-2">
          <EntityRoomSelector
            entityId={entityId}
            label={t('media.room')}
            compact
            className={controller.surface.textSecondary}
          />
        </div>
        <Dialog.Title
          className={`truncate text-xl font-semibold ${controller.surface.textPrimary}`}
        >
          {title}
        </Dialog.Title>
        <Dialog.Description className={`mt-1 truncate text-sm ${controller.surface.textSecondary}`}>
          {entityType}
        </Dialog.Description>
        {artist ? (
          <div className={`mt-2 truncate text-sm ${controller.surface.textSecondary}`}>
            {artist}
          </div>
        ) : null}
      </div>

      <Dialog.Close asChild>
        <button
          type="button"
          className={`shrink-0 rounded-xl p-2 transition-all duration-300 ${controller.isGlass ? 'bg-white/10 hover:bg-white/14' : 'bg-white/8 hover:bg-white/12'} ${controller.surface.textPrimary}`}
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
            <path
              d="M6 6 14 14M14 6 6 14"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </Dialog.Close>
    </div>
  );
}

interface MediaDialogArtworkProps {
  artist: string;
  artwork?: string | null;
  controller: MediaDialogController;
  onArtworkError?: (imageUrl?: string | null) => void;
  title: string;
}

export function MediaDialogArtwork({
  artist,
  artwork,
  controller,
  onArtworkError,
  title,
}: MediaDialogArtworkProps) {
  const { t } = useI18n();

  return (
    <div className="flex justify-center">
      {artwork ? (
        <img
          src={artwork}
          alt={t('media.artworkAlt', { title, artist })}
          onError={() => onArtworkError?.(artwork)}
          className="h-44 w-44 rounded-3xl object-cover shadow-2xl md:h-48 md:w-48"
        />
      ) : (
        <MediaFallbackArtwork
          palette={controller.palette}
          className="relative h-44 w-44 rounded-3xl shadow-2xl md:h-48 md:w-48"
        />
      )}
    </div>
  );
}

interface MediaDialogPlaybackControlsProps {
  controller: MediaDialogController;
  isPlaying: boolean;
  onCycleRepeat: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onTogglePlay: () => void;
  onToggleShuffle: () => void;
  repeatMode: MediaDialogProps['repeatMode'];
  shuffleEnabled: boolean;
}

export function MediaDialogPlaybackControls({
  controller,
  isPlaying,
  onCycleRepeat,
  onNext,
  onPrevious,
  onTogglePlay,
  onToggleShuffle,
  repeatMode,
  shuffleEnabled,
}: MediaDialogPlaybackControlsProps) {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-center gap-2 md:gap-3">
      <RoundControlButton
        theme={controller.theme}
        size="medium"
        variant="soft"
        aria-label={t('media.shuffle')}
        onClick={onToggleShuffle}
        className={`h-10 w-10 transition-colors ${shuffleEnabled ? '!border-0 text-white' : ''}`}
        style={shuffleEnabled ? controller.activeMiniControlStyle : controller.subtleControlStyle}
      >
        <Shuffle className="h-4 w-4" />
      </RoundControlButton>
      <RoundControlButton
        theme={controller.theme}
        size="large"
        variant="soft"
        aria-label={t('media.previousTrack')}
        onClick={onPrevious}
        className="h-12 w-12 transition-colors !border-0 text-white"
        style={controller.subtleControlStyle}
      >
        <SkipBack className="h-6 w-6" />
      </RoundControlButton>
      <RoundControlButton
        theme={controller.theme}
        size="large"
        variant="emphasis"
        onClick={onTogglePlay}
        aria-label={isPlaying ? t('media.pausePlayback') : t('media.resumePlayback')}
        className="h-16 w-16 transition-colors !border-0 text-white"
        style={controller.activeTransportStyle}
      >
        {isPlaying ? (
          <Pause className="h-7 w-7" fill="currentColor" />
        ) : (
          <Play className="h-7 w-7" fill="currentColor" />
        )}
      </RoundControlButton>
      <RoundControlButton
        theme={controller.theme}
        size="large"
        variant="soft"
        aria-label={t('media.nextTrack')}
        onClick={onNext}
        className="h-12 w-12 transition-colors !border-0 text-white"
        style={controller.subtleControlStyle}
      >
        <SkipForward className="h-6 w-6" />
      </RoundControlButton>
      <RoundControlButton
        theme={controller.theme}
        size="medium"
        variant="soft"
        aria-label={
          repeatMode === 'one'
            ? t('media.repeatOne')
            : repeatMode === 'all'
              ? t('media.repeatAll')
              : t('media.repeatOff')
        }
        onClick={onCycleRepeat}
        className={`h-10 w-10 transition-colors ${repeatMode !== 'off' ? '!border-0 text-white' : ''}`}
        style={
          repeatMode !== 'off' ? controller.activeMiniControlStyle : controller.subtleControlStyle
        }
      >
        {repeatMode === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
      </RoundControlButton>
    </div>
  );
}

interface MediaDialogVolumeControlProps {
  controller: MediaDialogController;
  isMuted: boolean;
  isPlaying: boolean;
  onToggleMute: () => void;
  onVolumeChange: (value: number) => void;
  onVolumeInteractionEnd: () => void;
  onVolumeInteractionStart: () => void;
  volume: number;
}

export function MediaDialogVolumeControl({
  controller,
  isMuted,
  isPlaying,
  onToggleMute,
  onVolumeChange,
  onVolumeInteractionEnd,
  onVolumeInteractionStart,
  volume,
}: MediaDialogVolumeControlProps) {
  const { t } = useI18n();

  return (
    <div>
      {isPlaying ? (
        <div className="mb-3 flex items-center justify-between">
          <span className={`text-sm ${controller.surface.textSecondary}`}>
            {controller.displayRemaining}
          </span>
          <span className={`text-sm ${controller.surface.textSecondary}`}>
            {controller.displayDuration}
          </span>
        </div>
      ) : null}
      <div className="mb-3 flex items-center justify-between">
        <span className={`text-sm font-medium ${controller.surface.textSecondary}`}>
          {t('media.volume')}
        </span>
        <span className={`text-sm font-semibold ${controller.surface.textPrimary}`}>
          {isMuted ? 0 : volume}%
        </span>
      </div>
      <div className="flex items-center gap-3">
        <RoundControlButton
          theme={controller.theme}
          size="medium"
          variant="soft"
          onClick={onToggleMute}
          aria-label={isMuted ? t('media.unmuteVolume') : t('media.muteVolume')}
          className="h-10 w-10 transition-colors !border-0 text-white"
          style={isMuted ? controller.subtleControlStyle : controller.accentControlStyle}
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </RoundControlButton>
        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/20">
          <div
            className="absolute left-0 top-0 h-full bg-white transition-all duration-150"
            style={{ width: isMuted ? '0%' : `${volume}%` }}
          />
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onMouseDown={onVolumeInteractionStart}
            onTouchStart={onVolumeInteractionStart}
            onKeyDown={onVolumeInteractionStart}
            onMouseUp={onVolumeInteractionEnd}
            onTouchEnd={onVolumeInteractionEnd}
            onKeyUp={onVolumeInteractionEnd}
            onBlur={onVolumeInteractionEnd}
            onChange={(event) => onVolumeChange(Number.parseInt(event.target.value, 10))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
      </div>
    </div>
  );
}

interface MediaDialogUpNextProps {
  controller: MediaDialogController;
  title: string;
}

export function MediaDialogUpNext({ controller, title }: MediaDialogUpNextProps) {
  const { t } = useI18n();

  return (
    <div>
      <span className={`mb-2 block text-sm font-medium ${controller.surface.textSecondary}`}>
        {t('media.upNext')}
      </span>
      <div
        className={`rounded-2xl border px-4 py-3 text-sm ${controller.surface.textPrimary} ${controller.isGlass ? 'bg-white/10' : 'bg-white/5'} ${controller.surface.border}`}
      >
        {title}
      </div>
    </div>
  );
}

interface MediaDialogGroupingProps {
  availableGroupingPlayers: MediaDialogGroupingPlayer[];
  controller: MediaDialogController;
  entityId: string;
  groupMembers: string[];
  onAttachGroupMember: (entityId: string) => void;
  onDetachGroupMember: (entityId: string) => void;
}

function GroupingChip({
  controller,
  label,
  onClick,
}: {
  controller: MediaDialogController;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${controller.surface.border} ${controller.surface.textPrimary} ${controller.isGlass ? 'bg-white/10 hover:bg-white/14' : 'bg-white/5 hover:bg-white/10'}`}
    >
      {label}
    </button>
  );
}

export function MediaDialogGrouping({
  availableGroupingPlayers,
  controller,
  entityId,
  groupMembers,
  onAttachGroupMember,
  onDetachGroupMember,
}: MediaDialogGroupingProps) {
  const { t } = useI18n();
  const attachedPlayers = availableGroupingPlayers.filter((player) => player.isAttached);
  const availablePlayers = availableGroupingPlayers.filter((player) => !player.isAttached);
  const hasAttachedMembers = groupMembers.some((memberId) => memberId !== entityId);

  return (
    <div>
      <span className={`mb-3 block text-sm font-medium ${controller.surface.textSecondary}`}>
        {t('media.group.title')}
      </span>

      <div className="space-y-3">
        <div>
          <div
            className={`mb-2 text-xs uppercase tracking-[0.14em] ${controller.surface.textMuted}`}
          >
            {t('media.group.attached')}
          </div>
          <div className="flex flex-wrap gap-2">
            {hasAttachedMembers ? (
              attachedPlayers.map((player) => (
                <GroupingChip
                  key={player.id}
                  controller={controller}
                  label={`${player.name} · ${t('media.group.detach')}`}
                  onClick={() => onDetachGroupMember(player.id)}
                />
              ))
            ) : (
              <div className={`text-sm ${controller.surface.textMuted}`}>
                {t('media.group.noAttached')}
              </div>
            )}
          </div>
        </div>

        <div>
          <div
            className={`mb-2 text-xs uppercase tracking-[0.14em] ${controller.surface.textMuted}`}
          >
            {t('media.group.available')}
          </div>
          <div className="flex flex-wrap gap-2">
            {availablePlayers.length > 0 ? (
              availablePlayers.map((player) => (
                <GroupingChip
                  key={player.id}
                  controller={controller}
                  label={`${player.name} · ${t('media.group.attach')}`}
                  onClick={() => onAttachGroupMember(player.id)}
                />
              ))
            ) : (
              <div className={`text-sm ${controller.surface.textMuted}`}>
                {t('media.group.noAvailable')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
