import { CardDialogHeader } from '@navet/app/components/patterns';
import { RoundControlButton } from '@navet/app/components/primitives/round-control-button';
import { Slider } from '@navet/app/components/primitives/slider';
import { useI18n } from '@navet/app/hooks';
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
import { type CSSProperties, useEffect, useState } from 'react';
import { getMediaDisplayVolume } from './media-card-style-utils';
import type { MediaDialogGroupingPlayer, MediaDialogProps } from './media-dialog.types';
import { MediaFallbackArtwork } from './media-fallback-artwork';
import { formatMediaTime } from './media-time';
import type { MediaDialogController } from './use-media-dialog-controller';

interface MediaDialogHeaderProps {
  controller: MediaDialogController;
  entityName: string;
  entityType: string;
  entityId: string;
}

export function MediaDialogHeader({
  controller,
  entityName,
  entityType,
  entityId,
}: MediaDialogHeaderProps) {
  return (
    <CardDialogHeader
      title={entityName}
      description={entityType}
      entityId={entityId}
      forceDarkRoomSelector={controller.theme !== 'light'}
      roomSelectorCompactContentStyle={controller.readableForeground.subtitleStyle}
      titleStyle={controller.readableForeground.titleStyle}
      descriptionStyle={controller.readableForeground.subtitleStyle}
      actionButtonStyle={controller.readableForeground.titleStyle}
      className="mb-0"
    />
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
          className="aspect-square w-full max-w-[19.5rem] rounded-[2rem] object-cover shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)]"
        />
      ) : (
        <MediaFallbackArtwork
          palette={controller.palette}
          className="relative aspect-square w-full max-w-[19.5rem] rounded-[2rem] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)]"
        />
      )}
    </div>
  );
}

interface MediaDialogPlaybackControlsProps {
  artist: string;
  title: string;
  controller: MediaDialogController;
  isPlaying: boolean;
  canNextTrack: boolean;
  canPreviousTrack: boolean;
  durationSeconds: number;
  elapsedSeconds: number;
  onCycleRepeat: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (elapsedSeconds: number) => void;
  onTogglePlay: () => void;
  onToggleShuffle: () => void;
  repeatMode: MediaDialogProps['repeatMode'];
  shuffleEnabled: boolean;
}

export function MediaDialogPlaybackControls({
  artist,
  title,
  controller,
  isPlaying,
  canNextTrack,
  canPreviousTrack,
  durationSeconds,
  elapsedSeconds,
  onCycleRepeat,
  onNext,
  onPrevious,
  onSeek,
  onTogglePlay,
  onToggleShuffle,
  repeatMode,
  shuffleEnabled,
}: MediaDialogPlaybackControlsProps) {
  const { t } = useI18n();
  const transportIconStyle = controller.readableForeground.titleStyle;
  const [pendingSeek, setPendingSeek] = useState(elapsedSeconds);
  const [isSeeking, setIsSeeking] = useState(false);
  const timelineTrackStyle: CSSProperties = {
    backgroundColor: `${controller.readableForeground.subtitleColor}33`,
  };
  const timelineRangeStyle: CSSProperties = {
    background: `linear-gradient(90deg, ${controller.readableForeground.titleColor} 0%, ${controller.readableForeground.subtitleColor} 100%)`,
    boxShadow: `0 0 18px ${controller.readableForeground.titleColor}2e`,
  };
  const timelineThumbStyle: CSSProperties = {
    backgroundColor: controller.readableForeground.titleColor,
    boxShadow: `0 0 0 1px ${controller.readableForeground.titleColor}38, 0 0 14px ${controller.readableForeground.titleColor}52`,
  };

  useEffect(() => {
    if (!isSeeking) {
      setPendingSeek(elapsedSeconds);
    }
  }, [elapsedSeconds, isSeeking]);

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div
          className={`truncate text-[1.95rem] font-semibold leading-tight ${controller.surface.textPrimary}`}
          style={controller.readableForeground.titleStyle}
        >
          {title}
        </div>
        {artist ? (
          <div
            className={`truncate text-[1.05rem] ${controller.surface.textSecondary}`}
            style={controller.readableForeground.subtitleStyle}
          >
            {artist}
          </div>
        ) : null}
      </div>
      {durationSeconds > 0 ? (
        <div className="space-y-2">
          <Slider
            value={Math.min(durationSeconds, pendingSeek)}
            min={0}
            max={Math.max(durationSeconds, elapsedSeconds, pendingSeek)}
            step={1}
            ariaLabel={t('media.seek')}
            onValueChange={(value) => setPendingSeek(value)}
            onValueCommit={(value) => onSeek(value)}
            onInteractionStart={() => setIsSeeking(true)}
            onInteractionEnd={() => setIsSeeking(false)}
            rootClassName="relative flex h-6 w-full items-center touch-none select-none"
            trackClassName="relative h-[3px] grow rounded-full"
            rangeClassName="absolute h-full rounded-full"
            thumbClassName="block h-4 w-4 rounded-full outline-none"
            touchThumbClassName="block h-6 w-6 rounded-full outline-none"
            trackStyle={timelineTrackStyle}
            rangeStyle={timelineRangeStyle}
            thumbStyle={timelineThumbStyle}
          />
          <div
            className={`flex items-center justify-between text-sm ${controller.surface.textSecondary}`}
            style={controller.readableForeground.subtitleStyle}
          >
            <span>{formatMediaTime(Math.max(0, pendingSeek))}</span>
            <span>-{controller.displayRemaining}</span>
          </div>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <RoundControlButton
          theme={controller.theme}
          size="medium"
          variant="soft"
          aria-label={t('media.shuffle')}
          onClick={onToggleShuffle}
          className={`h-10 w-10 transition-colors ${shuffleEnabled ? '!border-0' : ''}`}
          iconStyle={transportIconStyle}
          style={shuffleEnabled ? controller.activeMiniControlStyle : controller.subtleControlStyle}
        >
          <Shuffle className="h-4 w-4" />
        </RoundControlButton>
        <button
          type="button"
          aria-label={t('media.previousTrack')}
          disabled={!canPreviousTrack}
          onClick={onPrevious}
          className="flex h-14 w-14 items-center justify-center rounded-full transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
          style={transportIconStyle}
        >
          <SkipBack className="h-9 w-9" />
        </button>
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? t('media.pausePlayback') : t('media.resumePlayback')}
          className="flex h-20 w-20 items-center justify-center rounded-full transition-colors"
          style={{
            ...controller.activeTransportStyle,
            ...transportIconStyle,
          }}
        >
          {isPlaying ? (
            <Pause className="h-10 w-10" fill="currentColor" />
          ) : (
            <Play className="ml-1 h-10 w-10" fill="currentColor" />
          )}
        </button>
        <button
          type="button"
          aria-label={t('media.nextTrack')}
          disabled={!canNextTrack}
          onClick={onNext}
          className="flex h-14 w-14 items-center justify-center rounded-full transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
          style={transportIconStyle}
        >
          <SkipForward className="h-9 w-9" />
        </button>
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
          className={`h-10 w-10 transition-colors ${repeatMode !== 'off' ? '!border-0' : ''}`}
          iconStyle={transportIconStyle}
          style={
            repeatMode !== 'off' ? controller.activeMiniControlStyle : controller.subtleControlStyle
          }
        >
          {repeatMode === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
        </RoundControlButton>
      </div>
    </div>
  );
}

interface MediaDialogVolumeControlProps {
  canMuteVolume: boolean;
  canSetVolume: boolean;
  controller: MediaDialogController;
  isMuted: boolean;
  onToggleMute: () => void;
  onVolumeChange: (value: number) => void;
  onVolumeInteractionEnd: () => void;
  onVolumeInteractionStart: () => void;
  volume: number;
}

export function MediaDialogVolumeControl({
  canMuteVolume,
  canSetVolume,
  controller,
  isMuted,
  onToggleMute,
  onVolumeChange,
  onVolumeInteractionEnd,
  onVolumeInteractionStart,
  volume,
}: MediaDialogVolumeControlProps) {
  const { t } = useI18n();
  const displayVolume = getMediaDisplayVolume(volume, isMuted);
  const volumeTrackStyle = {
    backgroundColor: `${controller.readableForeground.subtitleColor}33`,
  };
  const volumeFillStyle = {
    width: `${displayVolume}%`,
    background: `linear-gradient(90deg, ${controller.readableForeground.titleColor} 0%, ${controller.readableForeground.subtitleColor} 100%)`,
  };
  const volumeThumbStyle: CSSProperties = {
    backgroundColor: controller.readableForeground.titleColor,
    boxShadow: `0 0 0 1px ${controller.readableForeground.titleColor}38, 0 0 14px ${controller.readableForeground.titleColor}52`,
  };

  if (!canMuteVolume && !canSetVolume) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div
        className={`text-xs font-medium uppercase tracking-[0.18em] ${controller.surface.textMuted}`}
        style={controller.readableForeground.subtitleStyle}
      >
        {t('media.volume')}
      </div>
      <div className="flex items-center gap-3">
        <RoundControlButton
          theme={controller.theme}
          size="medium"
          variant="soft"
          onClick={onToggleMute}
          disabled={!canMuteVolume && !canSetVolume}
          aria-label={isMuted ? t('media.unmuteVolume') : t('media.muteVolume')}
          className="h-10 w-10 transition-colors !border-0"
          iconStyle={controller.readableForeground.titleStyle}
          style={isMuted ? controller.subtleControlStyle : controller.accentControlStyle}
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </RoundControlButton>
        <div className="relative flex-1">
          <Slider
            disabled={!canSetVolume}
            value={displayVolume}
            ariaLabel={t('media.volume')}
            onValueChange={onVolumeChange}
            onInteractionStart={onVolumeInteractionStart}
            onInteractionEnd={onVolumeInteractionEnd}
            rootClassName="relative flex h-6 w-full items-center touch-none select-none"
            trackClassName="relative h-[3px] grow rounded-full"
            rangeClassName="absolute h-full rounded-full"
            thumbClassName="block h-4 w-4 rounded-full outline-none"
            touchThumbClassName="block h-6 w-6 rounded-full outline-none"
            trackStyle={volumeTrackStyle}
            rangeStyle={volumeFillStyle}
            thumbStyle={volumeThumbStyle}
          />
        </div>
        <span
          className={`w-10 text-right text-sm font-medium ${controller.surface.textSecondary}`}
          style={controller.readableForeground.subtitleStyle}
        >
          {displayVolume}%
        </span>
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
      <span
        className={`mb-2 block text-sm font-medium ${controller.surface.textSecondary}`}
        style={controller.readableForeground.subtitleStyle}
      >
        {t('media.upNext')}
      </span>
      <div
        className={`rounded-2xl border px-4 py-3 text-sm ${controller.surface.textPrimary} ${controller.isGlass ? 'bg-white/10' : 'bg-white/5'} ${controller.surface.border}`}
        style={controller.readableForeground.titleStyle}
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
      style={controller.readableForeground.titleStyle}
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
      <span
        className={`mb-3 block text-sm font-medium ${controller.surface.textSecondary}`}
        style={controller.readableForeground.subtitleStyle}
      >
        {t('media.group.title')}
      </span>

      <div className="space-y-3">
        <div>
          <div
            className={`mb-2 text-xs uppercase tracking-[0.14em] ${controller.surface.textMuted}`}
            style={controller.readableForeground.subtitleStyle}
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
              <div
                className={`text-sm ${controller.surface.textMuted}`}
                style={controller.readableForeground.subtitleStyle}
              >
                {t('media.group.noAttached')}
              </div>
            )}
          </div>
        </div>

        <div>
          <div
            className={`mb-2 text-xs uppercase tracking-[0.14em] ${controller.surface.textMuted}`}
            style={controller.readableForeground.subtitleStyle}
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
              <div
                className={`text-sm ${controller.surface.textMuted}`}
                style={controller.readableForeground.subtitleStyle}
              >
                {t('media.group.noAvailable')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
