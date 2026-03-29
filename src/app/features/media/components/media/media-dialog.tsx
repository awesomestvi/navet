import type { MediaDialogProps } from './media-dialog.types';
import { MediaDialogContent } from './media-dialog-content';
import { useMediaDialogController } from './use-media-dialog-controller';

export function MediaDialog({
  artwork,
  artist,
  durationSeconds,
  elapsedSeconds,
  entityId,
  repeatMode,
  shuffleEnabled,
  title,
  ...props
}: MediaDialogProps) {
  const controller = useMediaDialogController({
    artwork,
    artist,
    durationSeconds,
    elapsedSeconds,
    entityId,
    repeatMode,
    shuffleEnabled,
    title,
  });

  return (
    <MediaDialogContent
      {...props}
      artwork={artwork}
      artist={artist}
      controller={controller}
      durationSeconds={durationSeconds}
      elapsedSeconds={elapsedSeconds}
      entityId={entityId}
      repeatMode={repeatMode}
      shuffleEnabled={shuffleEnabled}
      title={title}
    />
  );
}
