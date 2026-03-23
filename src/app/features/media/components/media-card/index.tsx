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
}

export const MediaCard = memo(function MediaCard({
  id,
  name,
  room,
  title,
  artist,
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
}: MediaCardProps) {
  const { theme, colors } = useTheme();
  const cardShell = getCardShellSurfaceTokens(theme);
  const surface = getThemeSurfaceTokens(theme);
  const mediaSize = getCompactCardSize(size);
  const {
    albumArt: resolvedAlbumArt,
    closeDialog,
    durationSeconds,
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
    availableGroupingPlayers,
    attachGroupMember,
    detachGroupMember,
    supportsGrouping,
    startVolumeInteraction,
    endVolumeInteraction,
    toggleMute,
    togglePlay,
    volume,
  } = useMediaCardController({
    entityId: id,
    entityPicture,
    artworkKey: [entityPicture, title, artist].filter(Boolean).join('::'),
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
  const padding = isSmall ? 'p-4' : isLarge ? 'p-6' : 'p-5';
  const isLight = theme === 'light';
  const isGlass = theme === 'glass';
  const hasArtwork = Boolean(resolvedAlbumArt);
  const inactiveShellBg = `bg-gradient-to-br ${colors.media.off.gradient}`;
  const inactiveShellBorder = colors.media.off.border;
  const cardBorder = hasArtwork ? 'border-transparent' : surface.border;
  const cardShadow = '';
  const shellBg = hasArtwork
    ? isGlass
      ? 'bg-transparent'
      : isLight
        ? 'bg-white'
        : 'bg-zinc-950'
    : isOff
      ? inactiveShellBg
      : isLight
        ? 'bg-white'
        : isGlass
          ? 'bg-white/8'
          : 'bg-zinc-900';
  const shellBorder = isOff ? inactiveShellBorder : cardBorder;
  const shellBlur = hasArtwork ? '' : cardShell.backdropClassName;
  const shellOverlayClassName = isOff && !hasArtwork ? null : stateSurface.overlayClassName;
  const interactiveShellProps = isEditMode
    ? {}
    : {
        role: 'button' as const,
        tabIndex: 0,
        onClick: openDialog,
        onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openDialog();
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

        <div className="relative h-full flex flex-col">
          {isSmall ? (
            <MediaSmallView
              entityId={id}
              artwork={resolvedAlbumArt}
              onArtworkError={handleArtworkError}
              title={title}
              artist={artist}
              isActive={!isOff}
              isPlaying={isPlaying}
              volume={volume}
              elapsedSeconds={elapsedSeconds}
              durationSeconds={durationSeconds}
              theme={theme}
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
              title={title}
              artist={artist}
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
          ) : isMediumVertical ? (
            <MediaMediumVerticalView
              entityId={id}
              artwork={resolvedAlbumArt}
              onArtworkError={handleArtworkError}
              title={title}
              artist={artist}
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
              onVolumeChange={handleVolumeChange}
              onVolumeInteractionStart={startVolumeInteraction}
              onVolumeInteractionEnd={endVolumeInteraction}
            />
          ) : isLarge ? (
            <MediaLargeView
              entityId={id}
              artwork={resolvedAlbumArt}
              onArtworkError={handleArtworkError}
              title={title}
              artist={artist}
              playerName={name}
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
            title={title}
            artist={artist}
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
