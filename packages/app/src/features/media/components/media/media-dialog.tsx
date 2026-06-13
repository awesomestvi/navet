import type { MediaDialogProps } from './media-dialog.types';
import { MediaDialogContent } from './media-dialog-content';
import { useMediaDialogController } from './use-media-dialog-controller';

export function MediaDialog({
  artwork,
  artworkResource,
  artist,
  deviceClass,
  durationSeconds,
  entityName,
  entityType,
  elapsedSeconds,
  entityId,
  remoteAvailable,
  repeatMode,
  shuffleEnabled,
  title,
  ...props
}: MediaDialogProps) {
  const controller = useMediaDialogController({
    artwork,
    artworkResource,
    artist,
    durationSeconds,
    elapsedSeconds,
    entityId,
    title,
  });

  return (
    <MediaDialogContent
      {...props}
      artwork={artwork}
      artworkResource={artworkResource}
      artist={artist}
      controller={controller}
      deviceClass={deviceClass}
      durationSeconds={durationSeconds}
      entityName={entityName}
      entityType={entityType}
      elapsedSeconds={elapsedSeconds}
      entityId={entityId}
      remoteAvailable={remoteAvailable}
      repeatMode={repeatMode}
      shuffleEnabled={shuffleEnabled}
      title={title}
    />
  );
}
