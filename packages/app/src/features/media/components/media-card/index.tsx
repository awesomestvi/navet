import { BaseCard } from '@navet/app/components/primitives';
import { type CardSize, getCompactCardSize } from '@navet/app/components/shared/card-size-selector';
import { useEditModeSettingsRequest } from '@navet/app/components/shared/edit-mode-settings-request';
import { useEntityCardInteractionController } from '@navet/app/components/shared/entity-card-interaction-controller';
import { getCardShellSurfaceTokens } from '@navet/app/components/shared/theme/card-shell-surface-tokens';
import { getCardStateSurfaceTokens } from '@navet/app/components/shared/theme/card-state-surface-tokens';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import type { NavetMediaCapabilities } from '@navet/app/core/navet-device-state';
import { useI18n, useTheme } from '@navet/app/hooks';
import type { ThemeMode } from '@navet/app/stores/theme-store';
import type { CSSProperties } from 'react';
import { lazy, memo, Suspense } from 'react';
import { MediaLargeView } from '../media/media-large-view';
import { MediaMediumVerticalView } from '../media/media-medium-vertical-view';
import { MediaMediumView } from '../media/media-medium-view';
import { MediaSmallView } from '../media/media-small-view';
import { MediaTvView } from '../media/media-tv-view';
import { getMediaEntityTypeKey } from './get-media-entity-type-key';
import { resolveMediaPlayerName } from './resolve-media-player-name';
import { useMediaCardController } from './use-media-card-controller';

const MediaDialog = lazy(async () => {
  const module = await import('../media/media-dialog');
  return { default: module.MediaDialog };
});

function getActiveTvShellBg(theme: ThemeMode) {
  if (theme === 'light') {
    return 'bg-gradient-to-br from-violet-50 via-fuchsia-50 to-white';
  }

  if (theme === 'glass') {
    return '';
  }

  if (theme === 'black') {
    return 'bg-gradient-to-br from-fuchsia-950/45 via-black to-black';
  }

  return 'bg-gradient-to-br from-violet-950/90 via-fuchsia-950/75 to-zinc-950';
}

function getActiveTvShellBorder(theme: ThemeMode) {
  if (theme === 'light') {
    return 'border-fuchsia-200/80';
  }

  if (theme === 'glass') {
    return 'border-fuchsia-400/20';
  }

  if (theme === 'black') {
    return 'border-fuchsia-500/35';
  }

  return 'border-fuchsia-500/25';
}

function getActiveTvGlowClassName(theme: ThemeMode) {
  return theme === 'light'
    ? 'bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.12),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.1),transparent_48%)]'
    : 'bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.18),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.14),transparent_44%)]';
}

function getActiveTvShellStyle(theme: ThemeMode): CSSProperties | undefined {
  if (theme !== 'glass') {
    return undefined;
  }

  return {
    background:
      'linear-gradient(135deg, rgba(217,70,239,0.34) 0%, rgba(126,34,206,0.2) 52%, rgba(255,255,255,0.08) 100%)',
    borderColor: 'rgba(244,114,182,0.38)',
  };
}

interface MediaCardProps {
  id: string;
  name: string;
  room: string;
  title: string;
  artist: string;
  entityType?: string;
  deviceClass?: string;
  source?: string;
  sourceList?: string[];
  entityPicture?: string;
  state: 'playing' | 'paused' | 'idle' | 'off';
  volume: number;
  isMuted: boolean;
  elapsedSeconds?: number;
  durationSeconds?: number;
  positionUpdatedAt?: string;
  mediaCapabilities?: NavetMediaCapabilities;
  supportsGrouping?: boolean;
  supportsPreviousTrack?: boolean;
  supportsNextTrack?: boolean;
  supportedFeatures?: number;
  groupMembers?: string[];
  size: CardSize;
  onSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
  /**
   * When true, TV remote UI (D-pad, channel keys) renders as if a `remote.*` entity exists.
   * Use in Storybook where HA is not connected; ignored for non-TV cards.
   */
  simulateTvRemote?: boolean;
}

export const MediaCard = memo(function MediaCard({
  id,
  name,
  room: _room,
  title,
  artist,
  entityType,
  deviceClass,
  source: initialSource,
  sourceList: initialSourceList,
  entityPicture,
  state,
  volume: initialVolume,
  isMuted: initialMuted,
  elapsedSeconds: initialElapsedSeconds,
  durationSeconds: initialDurationSeconds,
  positionUpdatedAt: initialPositionUpdatedAt,
  mediaCapabilities: initialMediaCapabilities,
  supportsGrouping: initialSupportsGrouping,
  supportsPreviousTrack: initialSupportsPreviousTrack,
  supportsNextTrack: initialSupportsNextTrack,
  supportedFeatures: initialSupportedFeatures,
  groupMembers: initialGroupMembers,
  size,
  onSizeChange: _onSizeChange,
  isEditMode,
  simulateTvRemote = false,
}: MediaCardProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const mediaEntityTypeKey = getMediaEntityTypeKey(entityType, deviceClass);
  const mediaEntityTypeLabel = t(mediaEntityTypeKey);
  const resolvedPlayerName = resolveMediaPlayerName({
    entityId: id,
    entityName: name,
    room: _room,
    entityType,
  });
  const cardShell = getCardShellSurfaceTokens(theme);
  const surface = getThemeSurfaceTokens(theme);
  const mediaSize = getCompactCardSize(size);
  const {
    albumArt: resolvedAlbumArt,
    artworkResource,
    clearPlaylist,
    cycleRepeat,
    closeDialog,
    durationSeconds,
    displayArtist,
    displayTitle,
    elapsedSeconds,
    handleArtworkError,
    handleNext,
    handlePrevious,
    handleVolumeChange,
    groupMembers,
    isOff,
    isPlaying,
    isMuted,
    isOpen,
    mediaCapabilities,
    openDialog,
    remoteAvailable,
    repeatMode,
    seekTo,
    selectSource,
    selectSoundMode,
    availableGroupingPlayers,
    attachGroupMember,
    detachGroupMember,
    canNextTrack,
    canPreviousTrack,
    shuffleEnabled,
    soundMode,
    soundModeList,
    source,
    sourceList,
    supportsGrouping,
    startVolumeInteraction,
    endVolumeInteraction,
    sendRemoteCommand,
    toggleTvPower,
    toggleShuffle,
    toggleMute,
    togglePlay,
    upNextTitle,
    volume,
  } = useMediaCardController({
    entityId: id,
    entityName: resolvedPlayerName,
    deviceClass,
    entityPicture,
    artworkKey: [entityPicture, title, artist].filter(Boolean).join('::'),
    initialTitle: title,
    initialArtist: artist,
    initialSource,
    initialSourceList,
    initialState: state,
    initialVolume,
    initialMuted,
    initialElapsedSeconds,
    initialDurationSeconds,
    initialPositionUpdatedAt,
    initialMediaCapabilities,
    initialSupportsGrouping,
    initialSupportsPreviousTrack,
    initialSupportsNextTrack,
    initialSupportedFeatures,
    initialGroupMembers,
  });
  const stateSurface = getCardStateSurfaceTokens(theme, !isOff);

  const isSmall = mediaSize === 'small';
  const isMedium = mediaSize === 'medium';
  const isMediumVertical = mediaSize === 'medium-vertical';
  const isLarge = mediaSize === 'large';
  const isTv = deviceClass?.toLowerCase() === 'tv';
  const tvRemoteAvailable = simulateTvRemote === true ? true : remoteAvailable;
  const isGlass = theme === 'glass';
  const hasArtwork = Boolean(resolvedAlbumArt);
  const isActiveTv = isTv && !isOff;
  const inactiveShellBorder = surface.border;
  const cardBorder =
    theme === 'glass' && !isOff && !isActiveTv
      ? surface.border
      : hasArtwork
        ? 'border-transparent'
        : surface.border;
  const cardShadow = '';
  const activeTvShellBg = getActiveTvShellBg(theme);
  const activeTvShellBorder = getActiveTvShellBorder(theme);
  const shellBg = isOff
    ? ''
    : isActiveTv
      ? activeTvShellBg
      : isGlass
        ? surface.panel
        : hasArtwork
          ? theme === 'light'
            ? 'bg-white'
            : 'bg-zinc-950'
          : theme === 'light'
            ? ''
            : '';
  const backgroundClassName = theme === 'glass' ? shellBg || surface.panel : shellBg;
  const shellBorder = isOff ? inactiveShellBorder : isActiveTv ? activeTvShellBorder : cardBorder;
  const shellBlur = hasArtwork && !isOff ? '' : cardShell.backdropClassName;
  const shellOverlayClassName = isOff ? null : stateSurface.overlayClassName;
  const tvOnGlowClassName = isActiveTv ? getActiveTvGlowClassName(theme) : null;
  const activeTvShellStyle = isActiveTv ? getActiveTvShellStyle(theme) : undefined;
  const mediaIdentityProps = {
    entityId: id,
    artwork: resolvedAlbumArt,
    artworkResource,
    onArtworkError: handleArtworkError,
    entityName: resolvedPlayerName,
    entityTypeKey: mediaEntityTypeKey,
    title: displayTitle,
    artist: displayArtist,
    isActive: !isOff,
    isPlaying,
    volume,
    isMuted,
    theme,
  };
  const mediaControlProps = {
    onOpenDialog: openDialog,
    onSeek: seekTo,
    onCycleRepeat: cycleRepeat,
    onToggleShuffle: toggleShuffle,
    canRepeat: mediaCapabilities?.canRepeat ?? false,
    canShuffle: mediaCapabilities?.canShuffle ?? false,
    onToggleMute: toggleMute,
    onPrevious: handlePrevious,
    canPreviousTrack,
    onTogglePlay: togglePlay,
    onNext: handleNext,
    canNextTrack,
    repeatMode,
    shuffleEnabled,
    onVolumeChange: handleVolumeChange,
    onVolumeInteractionStart: startVolumeInteraction,
    onVolumeInteractionEnd: endVolumeInteraction,
  };
  const cardInteraction = useEntityCardInteractionController({
    ariaLabel: resolvedPlayerName,
    isEditMode,
    onToggle: isTv ? toggleTvPower : undefined,
    onOpenControls: openDialog,
    onOpenSettings: openDialog,
  });
  useEditModeSettingsRequest(id, openDialog, isEditMode);

  return (
    <>
      <BaseCard
        size={size}
        {...cardInteraction.cardProps}
        interactive={!isEditMode}
        className={`${isEditMode ? '' : 'cursor-pointer'}`}
        backgroundClassName={backgroundClassName}
        frameClassName={`${cardShell.rootFrameClassName} ${shellBorder} ${cardShadow} ${shellBlur} ${stateSurface.containerClassName}`}
        style={activeTvShellStyle}
        disableDefaultSheen
        overlay={
          <>
            {shellOverlayClassName ? (
              <div className={`absolute inset-0 ${shellOverlayClassName}`} />
            ) : null}
            {tvOnGlowClassName ? <div className={`absolute inset-0 ${tvOnGlowClassName}`} /> : null}
          </>
        }
        contentClassName="h-full"
      >
        <div className="relative h-full flex flex-col">
          {isTv ? (
            <MediaTvView
              size={mediaSize}
              playerName={resolvedPlayerName}
              source={source}
              sourceList={sourceList}
              isOn={!isOff}
              isPlaying={isPlaying}
              volume={volume}
              isMuted={isMuted}
              theme={theme}
              remoteAvailable={tvRemoteAvailable}
              canSetVolume={mediaCapabilities?.canSetVolume ?? false}
              canMuteVolume={mediaCapabilities?.canMuteVolume ?? false}
              canSelectSource={mediaCapabilities?.canSelectSource ?? false}
              onTogglePlay={togglePlay}
              onToggleMute={toggleMute}
              onVolumeChange={handleVolumeChange}
              onVolumeInteractionStart={startVolumeInteraction}
              onVolumeInteractionEnd={endVolumeInteraction}
              onSelectSource={selectSource}
              onRemoteCommand={sendRemoteCommand}
              onOpenDialog={openDialog}
            />
          ) : isSmall ? (
            <MediaSmallView
              {...mediaIdentityProps}
              {...mediaControlProps}
              elapsedSeconds={elapsedSeconds}
              durationSeconds={durationSeconds}
            />
          ) : isMedium ? (
            <MediaMediumView
              {...mediaIdentityProps}
              {...mediaControlProps}
              elapsedSeconds={elapsedSeconds}
              durationSeconds={durationSeconds}
            />
          ) : isMediumVertical ? (
            <MediaMediumVerticalView
              {...mediaIdentityProps}
              {...mediaControlProps}
              elapsedSeconds={elapsedSeconds}
              durationSeconds={durationSeconds}
            />
          ) : isLarge ? (
            <MediaLargeView
              {...mediaIdentityProps}
              {...mediaControlProps}
              elapsedSeconds={elapsedSeconds}
              durationSeconds={durationSeconds}
            />
          ) : null}
        </div>
      </BaseCard>

      {isOpen && (
        <Suspense fallback={null}>
          <MediaDialog
            entityId={id}
            room={_room}
            deviceClass={deviceClass}
            remoteAvailable={tvRemoteAvailable}
            isOpen={isOpen}
            onOpenChange={closeDialog}
            artwork={resolvedAlbumArt}
            artworkResource={artworkResource}
            onArtworkError={handleArtworkError}
            entityName={resolvedPlayerName}
            entityType={mediaEntityTypeLabel}
            title={displayTitle}
            artist={displayArtist}
            isPlaying={isPlaying}
            volume={volume}
            isMuted={isMuted}
            elapsedSeconds={elapsedSeconds}
            durationSeconds={durationSeconds}
            supportsGrouping={supportsGrouping}
            groupMembers={groupMembers}
            availableGroupingPlayers={availableGroupingPlayers}
            onPrevious={handlePrevious}
            canPreviousTrack={canPreviousTrack}
            onTogglePlay={togglePlay}
            onNext={handleNext}
            canNextTrack={canNextTrack}
            shuffleEnabled={shuffleEnabled}
            repeatMode={repeatMode}
            onToggleShuffle={toggleShuffle}
            onCycleRepeat={cycleRepeat}
            upNextTitle={upNextTitle}
            onToggleMute={toggleMute}
            onVolumeChange={handleVolumeChange}
            onVolumeInteractionStart={startVolumeInteraction}
            onVolumeInteractionEnd={endVolumeInteraction}
            onAttachGroupMember={attachGroupMember}
            onDetachGroupMember={detachGroupMember}
            source={source}
            sourceList={sourceList}
            onSelectSource={selectSource}
            onRemoteCommand={sendRemoteCommand}
            capabilities={mediaCapabilities}
            soundMode={soundMode}
            soundModeList={soundModeList}
            onSelectSoundMode={selectSoundMode}
            onSeek={seekTo}
            onClearPlaylist={clearPlaylist}
          />
        </Suspense>
      )}
    </>
  );
});
