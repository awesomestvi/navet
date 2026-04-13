export type PhotoFrameSourceMode = 'urls' | 'home-assistant';

export function resolvePhotoFrameSourceMode(
  sourceMode: PhotoFrameSourceMode | undefined,
  mediaSourceId: string | undefined
): PhotoFrameSourceMode {
  if (sourceMode === 'home-assistant' || (!sourceMode && mediaSourceId?.trim())) {
    return 'home-assistant';
  }

  return 'urls';
}
