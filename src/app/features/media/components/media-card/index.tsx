import { lazy, memo, Suspense } from 'react';
import { type CardSize, getCompactCardSize } from '@/app/components/shared/card-size-selector';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getCardStateSurfaceTokens } from '@/app/components/shared/theme/card-state-surface-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import { MediaLargeView } from '../media/media-large-view';
import { MediaMediumVerticalView } from '../media/media-medium-vertical-view';
import { MediaMediumView } from '../media/media-medium-view';
import { MediaSmallView } from '../media/media-small-view';
import { MediaTvView } from '../media/media-tv-view';
import { useMediaCardController } from './use-media-card-controller';

const MediaDialog = lazy(async () => {
  const module = await import('../media/media-dialog');
  return { default: module.MediaDialog };
});

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
  supportsGrouping?: boolean;
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
  room,
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
  supportsGrouping: initialSupportsGrouping,
  groupMembers: initialGroupMembers,
  size,
  onSizeChange: _onSizeChange,
  isEditMode,
  simulateTvRemote = false,
}: MediaCardProps) {
  const { theme, colors } = useTheme();
  const cardShell = getCardShellSurfaceTokens(theme);
  const surface = getThemeSurfaceTokens(theme);
  const mediaSize = getCompactCardSize(size);
  const {
    albumArt: resolvedAlbumArt,
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
    openDialog,
    remoteAvailable,
    repeatMode,
    selectSource,
    availableGroupingPlayers,
    attachGroupMember,
    detachGroupMember,
    shuffleEnabled,
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
    initialSupportsGrouping,
    initialGroupMembers,
  });
  const stateSurface = getCardStateSurfaceTokens(theme, !isOff);

  const isSmall = mediaSize === 'small';
  const isMedium = mediaSize === 'medium';
  const isMediumVertical = mediaSize === 'medium-vertical';
  const isLarge = mediaSize === 'large';
  const isTv = deviceClass?.toLowerCase() === 'tv';
  const tvRemoteAvailable = simulateTvRemote === true ? true : remoteAvailable;
  const padding = 'p-3';
  const isLight = theme === 'light';
  const isGlass = theme === 'glass';
  const hasArtwork = Boolean(resolvedAlbumArt);
  const isActiveTv = isTv && !isOff;
  const inactiveShellBg = `bg-gradient-to-br ${colors.media.off.gradient}`;
  const inactiveShellBorder = colors.media.off.border;
  const cardBorder = hasArtwork ? 'border-transparent' : surface.border;
  const cardShadow = '';
  const activeTvShellBg = isLight
    ? 'bg-gradient-to-br from-violet-50 via-fuchsia-50 to-white'
    : isGlass
      ? 'bg-gradient-to-br from-fuchsia-500/12 via-violet-500/10 to-white/6'
      : theme === 'black'
        ? 'bg-gradient-to-br from-fuchsia-950/45 via-black to-black'
        : 'bg-gradient-to-br from-violet-950/90 via-fuchsia-950/75 to-zinc-950';
  const activeTvShellBorder = isLight
    ? 'border-fuchsia-200/80'
    : isGlass
      ? 'border-fuchsia-400/20'
      : theme === 'black'
        ? 'border-fuchsia-500/35'
        : 'border-fuchsia-500/25';
  const shellBg = isOff
    ? inactiveShellBg
    : isActiveTv
      ? activeTvShellBg
      : hasArtwork
        ? isGlass
          ? 'bg-transparent'
          : isLight
            ? 'bg-white'
            : 'bg-zinc-950'
        : isLight
          ? 'bg-white'
          : isGlass
            ? 'bg-white/8'
            : 'bg-zinc-900';
  const shellBorder = isOff ? inactiveShellBorder : isActiveTv ? activeTvShellBorder : cardBorder;
  const shellBlur = hasArtwork && !isOff ? '' : cardShell.backdropClassName;
  const shellOverlayClassName = isOff ? null : stateSurface.overlayClassName;
  const tvOnGlowClassName = isActiveTv
    ? isLight
      ? 'bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.12),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.1),transparent_48%)]'
      : 'bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.18),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.14),transparent_44%)]'
    : null;
  const handleCardActivate = isTv ? toggleTvPower : openDialog;
  const interactiveShellProps = isEditMode
    ? {}
    : {
        role: 'button' as const,
        tabIndex: 0,
        onClick: handleCardActivate,
        onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleCardActivate();
          }
        },
      };

  return (
    <>
      <div
        {...interactiveShellProps}
        className={`relative h-full rounded-3xl ${padding} ${theme !== 'dark' ? 'border' : ''} ${shellBorder} ${cardShadow} ${shellBg} ${shellBlur} ${stateSurface.containerClassName} overflow-hidden ${
          isEditMode ? '' : 'cursor-pointer'
        }`}
      >
        {shellOverlayClassName && (
          <div className={`absolute inset-0 ${shellOverlayClassName}`}></div>
        )}
        {tvOnGlowClassName && <div className={`absolute inset-0 ${tvOnGlowClassName}`}></div>}

        <div className="relative h-full flex flex-col">
          {isTv ? (
            <MediaTvView
              size={mediaSize}
              playerName={name}
              source={source}
              sourceList={sourceList}
              isOn={!isOff}
              isPlaying={isPlaying}
              volume={volume}
              isMuted={isMuted}
              theme={theme}
              remoteAvailable={tvRemoteAvailable}
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
              entityId={id}
              artwork={resolvedAlbumArt}
              onArtworkError={handleArtworkError}
              playerName={entityType || name}
              room={room}
              title={displayTitle}
              artist={displayArtist}
              isActive={!isOff}
              isPlaying={isPlaying}
              volume={volume}
              isMuted={isMuted}
              elapsedSeconds={elapsedSeconds}
              durationSeconds={durationSeconds}
              theme={theme}
              onToggleMute={toggleMute}
              onPrevious={handlePrevious}
              onTogglePlay={togglePlay}
              onNext={handleNext}
              onVolumeChange={handleVolumeChange}
              onVolumeInteractionStart={startVolumeInteraction}
              onVolumeInteractionEnd={endVolumeInteraction}
              onOpenDialog={openDialog}
            />
          ) : isMedium ? (
            <MediaMediumView
              entityId={id}
              artwork={resolvedAlbumArt}
              onArtworkError={handleArtworkError}
              playerName={entityType || name}
              room={room}
              title={displayTitle}
              artist={displayArtist}
              isActive={!isOff}
              isPlaying={isPlaying}
              volume={volume}
              isMuted={isMuted}
              elapsedSeconds={elapsedSeconds}
              durationSeconds={durationSeconds}
              theme={theme}
              onOpenDialog={openDialog}
              onToggleMute={toggleMute}
              onPrevious={handlePrevious}
              onTogglePlay={togglePlay}
              onNext={handleNext}
              onVolumeChange={handleVolumeChange}
              onVolumeInteractionStart={startVolumeInteraction}
              onVolumeInteractionEnd={endVolumeInteraction}
            />
          ) : isMediumVertical ? (
            <MediaMediumVerticalView
              entityId={id}
              artwork={resolvedAlbumArt}
              onArtworkError={handleArtworkError}
              playerName={entityType || name}
              room={room}
              title={displayTitle}
              artist={displayArtist}
              isActive={!isOff}
              isPlaying={isPlaying}
              volume={volume}
              isMuted={isMuted}
              elapsedSeconds={elapsedSeconds}
              durationSeconds={durationSeconds}
              theme={theme}
              onOpenDialog={openDialog}
              onToggleMute={toggleMute}
              onPrevious={handlePrevious}
              onTogglePlay={togglePlay}
              onNext={handleNext}
              onVolumeChange={handleVolumeChange}
              onVolumeInteractionStart={startVolumeInteraction}
              onVolumeInteractionEnd={endVolumeInteraction}
            />
          ) : isLarge ? (
            <MediaLargeView
              entityId={id}
              artwork={resolvedAlbumArt}
              onArtworkError={handleArtworkError}
              title={displayTitle}
              artist={displayArtist}
              playerName={entityType || name}
              room={room}
              isActive={!isOff}
              isPlaying={isPlaying}
              volume={volume}
              isMuted={isMuted}
              elapsedSeconds={elapsedSeconds}
              durationSeconds={durationSeconds}
              theme={theme}
              onOpenDialog={openDialog}
              onPrevious={handlePrevious}
              onTogglePlay={togglePlay}
              onNext={handleNext}
              onToggleMute={toggleMute}
              onVolumeChange={handleVolumeChange}
              onVolumeInteractionStart={startVolumeInteraction}
              onVolumeInteractionEnd={endVolumeInteraction}
            />
          ) : null}
        </div>
      </div>

      {isOpen && (
        <Suspense fallback={null}>
          <MediaDialog
            entityId={id}
            isOpen={isOpen}
            onOpenChange={closeDialog}
            artwork={resolvedAlbumArt}
            onArtworkError={handleArtworkError}
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
            onTogglePlay={togglePlay}
            onNext={handleNext}
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
          />
        </Suspense>
      )}
    </>
  );
});
