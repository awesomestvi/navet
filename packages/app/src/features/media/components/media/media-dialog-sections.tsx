import { CardDialogHeader } from '@navet/app/components/patterns';
import { RoundControlButton } from '@navet/app/components/primitives/round-control-button';
import { Slider } from '@navet/app/components/primitives/slider';
import { getCardReadableTextTokens } from '@navet/app/components/shared/theme/card-readable-text-tokens';
import { getMediaTVViewSurfaceTokens } from '@navet/app/components/shared/theme/media-tv-view-surface-tokens';
import { useI18n } from '@navet/app/hooks';
import {
  Pause,
  Play,
  Repeat,
  Repeat1,
  RepeatOff,
  Shuffle,
  SkipBack,
  SkipForward,
  Slash,
  Tv2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { type CSSProperties, useEffect, useState } from 'react';
import { getMediaDisplayVolume } from './media-card-style-utils';
import type { MediaDialogGroupingPlayer, MediaDialogProps } from './media-dialog.types';
import { MediaFallbackArtwork } from './media-fallback-artwork';
import { formatMediaTime } from './media-time';
import { getTvDpadLayout, TvDpad } from './tv-dpad';
import { TvSourceSelector } from './tv-source-selector';
import { TvTransportControls } from './tv-transport-controls';
import { TvChannelControls, TvVolumeControls } from './tv-volume-controls';
import type { MediaDialogController } from './use-media-dialog-controller';

interface MediaDialogHeaderProps {
  controller: MediaDialogController;
  entityName: string;
  entityType: string;
  entityId: string;
  room?: string;
}

export function MediaDialogHeader({
  controller,
  entityName,
  entityType,
  entityId,
  room,
}: MediaDialogHeaderProps) {
  return (
    <CardDialogHeader
      title={entityName}
      description={entityType}
      entityId={entityId}
      forceDarkRoomSelector={controller.theme !== 'light'}
      roomSelectorFallbackRoomName={room}
      roomSelectorCompactContentStyle={controller.readableForeground.subtitleStyle}
      titleStyle={controller.readableForeground.titleStyle}
      descriptionStyle={controller.readableForeground.subtitleStyle}
      actionButtonStyle={controller.readableForeground.titleStyle}
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

  const offToggleSlashClassName = 'absolute inset-0 m-auto h-3.5 w-3.5 stroke-[2.25]';
  const mirroredOffToggleSlashStyle = { transform: 'scaleX(-1)' } as const;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div
          className={`truncate text-base font-semibold leading-tight sm:text-lg ${controller.surface.textPrimary}`}
          style={controller.readableForeground.titleStyle}
        >
          {title}
        </div>
        {artist ? (
          <div
            className={`truncate text-[0.82rem] md:text-[0.9rem] ${controller.surface.textSecondary}`}
            style={controller.readableForeground.subtitleStyle}
          >
            {artist}
          </div>
        ) : null}
      </div>
      {durationSeconds > 0 ? (
        <div className="space-y-1">
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
            className={`flex items-center justify-between text-[0.82rem] ${controller.surface.textSecondary}`}
            style={controller.readableForeground.subtitleStyle}
          >
            <span>{formatMediaTime(Math.max(0, pendingSeek))}</span>
            <span>-{controller.displayRemaining}</span>
          </div>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-1.5">
        <RoundControlButton
          theme={controller.theme}
          size="medium"
          variant="soft"
          aria-label={shuffleEnabled ? t('media.shuffle') : t('media.linearPlayback')}
          aria-pressed={shuffleEnabled}
          onClick={onToggleShuffle}
          className={`h-10 w-10 transition-colors ${shuffleEnabled ? '!border-0' : ''}`}
          iconStyle={transportIconStyle}
          style={shuffleEnabled ? controller.activeMiniControlStyle : controller.subtleControlStyle}
        >
          {shuffleEnabled ? (
            <Shuffle className="h-4 w-4" />
          ) : (
            <span className="relative flex items-center justify-center">
              <Shuffle className="h-4 w-4" />
              <Slash className={offToggleSlashClassName} style={mirroredOffToggleSlashStyle} />
            </span>
          )}
        </RoundControlButton>
        <RoundControlButton
          theme={controller.theme}
          size="medium"
          variant="neutral"
          aria-label={t('media.previousTrack')}
          disabled={!canPreviousTrack}
          onClick={onPrevious}
          className="h-14 w-14 backdrop-blur-xl transition-colors disabled:cursor-not-allowed disabled:opacity-45"
          iconStyle={transportIconStyle}
          style={controller.activeMiniControlStyle}
        >
          <SkipBack className="h-6.5 w-6.5" />
        </RoundControlButton>
        <RoundControlButton
          theme={controller.theme}
          size="large"
          variant="neutral"
          aria-label={isPlaying ? t('media.pausePlayback') : t('media.resumePlayback')}
          onClick={onTogglePlay}
          className="h-20 w-20 backdrop-blur-xl transition-colors"
          iconStyle={transportIconStyle}
          style={controller.activeTransportStyle}
        >
          {isPlaying ? (
            <Pause className="h-8 w-8" fill="currentColor" />
          ) : (
            <Play className="ml-0.5 h-8 w-8" fill="currentColor" />
          )}
        </RoundControlButton>
        <RoundControlButton
          theme={controller.theme}
          size="medium"
          variant="neutral"
          aria-label={t('media.nextTrack')}
          disabled={!canNextTrack}
          onClick={onNext}
          className="h-14 w-14 backdrop-blur-xl transition-colors disabled:cursor-not-allowed disabled:opacity-45"
          iconStyle={transportIconStyle}
          style={controller.activeMiniControlStyle}
        >
          <SkipForward className="h-6.5 w-6.5" />
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
          aria-pressed={repeatMode !== 'off'}
          onClick={onCycleRepeat}
          className={`h-10 w-10 transition-colors ${repeatMode !== 'off' ? '!border-0' : ''}`}
          iconStyle={transportIconStyle}
          style={
            repeatMode !== 'off' ? controller.activeMiniControlStyle : controller.subtleControlStyle
          }
        >
          {repeatMode === 'off' ? (
            <RepeatOff className="h-4 w-4" />
          ) : repeatMode === 'one' ? (
            <Repeat1 className="h-4 w-4" />
          ) : (
            <Repeat className="h-4 w-4" />
          )}
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
    <div>
      <div className="flex items-center gap-2.5">
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

interface MediaDialogTvControlsProps {
  controller: MediaDialogController;
  source?: string;
  sourceList: string[];
  isPlaying: boolean;
  remoteAvailable: boolean;
  canSetVolume: boolean;
  canMuteVolume: boolean;
  canSelectSource: boolean;
  isMuted: boolean;
  volume: number;
  onToggleMute: () => void;
  onVolumeChange: (value: number) => void;
  onVolumeInteractionEnd: () => void;
  onVolumeInteractionStart: () => void;
  onSelectSource: (source: string) => void;
  onRemoteCommand?: MediaDialogProps['onRemoteCommand'];
  onTogglePlay: () => void;
}

export function MediaDialogTvControls({
  controller,
  source,
  sourceList,
  isPlaying,
  remoteAvailable,
  canSetVolume,
  canMuteVolume,
  canSelectSource,
  isMuted,
  volume,
  onToggleMute,
  onVolumeChange,
  onVolumeInteractionEnd,
  onVolumeInteractionStart,
  onSelectSource,
  onRemoteCommand,
  onTogglePlay,
}: MediaDialogTvControlsProps) {
  const { t } = useI18n();
  const tvSurface = getMediaTVViewSurfaceTokens(controller.theme, true);
  const tvTextTokens = getCardReadableTextTokens({
    theme: controller.theme,
    tone: 'pink',
    baseColor: tvSurface.tvBaseColor,
    backgroundColor: tvSurface.tvBackgroundColor,
  });
  const currentSource =
    source &&
    source.trim().length > 0 &&
    source !== t('media.nothingPlaying') &&
    source !== t('media.nothingPlayingDescription')
      ? source
      : t('media.source');
  const canShowRemoteControls = remoteAvailable && typeof onRemoteCommand === 'function';
  const tvControlClusterGap = 'gap-1.5';
  const tvIconClass = 'h-4 w-4';
  const tvPlayPauseIconClass = 'h-6 w-6';
  const iconClassName = tvSurface.iconClassName;
  const separatorColor = tvSurface.separatorColor;
  const dpadLayout = getTvDpadLayout('medium');
  const showVolumeControls = canSetVolume || canMuteVolume;
  const showChannelControls = canShowRemoteControls;
  const showUtilitySeparator = showVolumeControls && showChannelControls;
  const showSourceSelector = canSelectSource;

  const handleRemoteCommand = (
    action: Parameters<NonNullable<MediaDialogProps['onRemoteCommand']>>[0]
  ) => {
    onRemoteCommand?.(action);
  };

  return (
    <div className="space-y-5">
      {showSourceSelector ? (
        <div className="flex justify-center">
          <TvSourceSelector
            source={source}
            sourceList={sourceList}
            isSmallTvCard={false}
            theme={controller.theme}
            panelStyle={tvSurface.panelStyle}
            tvTextTokens={tvTextTokens}
            onSelectSource={onSelectSource}
          />
        </div>
      ) : (
        <div className="flex justify-center">
          <div
            className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-2 ${controller.surface.border} ${
              controller.isGlass ? 'bg-white/10' : 'bg-white/[0.05]'
            }`}
          >
            <Tv2 className={`h-4 w-4 shrink-0 ${controller.surface.textMuted}`} />
            <span
              className={`min-w-0 truncate text-sm font-semibold ${controller.surface.textPrimary}`}
              style={controller.readableForeground.titleStyle}
            >
              {currentSource}
            </span>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        {canShowRemoteControls ? (
          <TvDpad
            theme={controller.theme}
            remoteAvailable={remoteAvailable}
            style={tvSurface.controlStyle}
            shellStyle={tvSurface.navShellStyle}
            layout={dpadLayout}
            onRemoteCommand={handleRemoteCommand}
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/12 bg-white/[0.04]">
            <Tv2 className={`h-9 w-9 ${controller.surface.textMuted}`} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <TvTransportControls
          theme={controller.theme}
          isPlaying={isPlaying}
          remoteAvailable={canShowRemoteControls}
          controlStyle={tvSurface.controlStyle}
          iconClassName={iconClassName}
          tvIconClass={tvIconClass}
          playPauseSize="large"
          playPauseClassName="h-14 w-14"
          playPauseIconClass={tvPlayPauseIconClass}
          onRemoteCommand={handleRemoteCommand}
          onTogglePlay={onTogglePlay}
        />
      </div>

      {showVolumeControls || showChannelControls ? (
        <div className="flex items-center justify-center">
          <div
            className={`flex min-w-0 items-center rounded-full border px-3 py-2 ${controller.surface.border} ${tvControlClusterGap} ${
              controller.isGlass ? 'bg-white/8' : 'bg-white/[0.04]'
            }`}
          >
            <TvVolumeControls
              theme={controller.theme}
              isMuted={isMuted}
              volume={volume}
              canSetVolume={canSetVolume}
              canMuteVolume={canMuteVolume}
              controlStyle={tvSurface.controlStyle}
              iconClassName={iconClassName}
              tvIconClass={tvIconClass}
              tvControlClusterGap={tvControlClusterGap}
              onToggleMute={onToggleMute}
              onVolumeChange={onVolumeChange}
              onVolumeInteractionStart={onVolumeInteractionStart}
              onVolumeInteractionEnd={onVolumeInteractionEnd}
            />
            {showUtilitySeparator ? (
              <div className="mx-1 h-6 w-px shrink-0" style={{ backgroundColor: separatorColor }} />
            ) : null}
            <TvChannelControls
              theme={controller.theme}
              remoteAvailable={canShowRemoteControls}
              controlStyle={tvSurface.controlStyle}
              iconClassName={iconClassName}
              tvIconClass={tvIconClass}
              tvControlClusterGap={tvControlClusterGap}
              onRemoteCommand={handleRemoteCommand}
            />
          </div>
        </div>
      ) : null}
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
