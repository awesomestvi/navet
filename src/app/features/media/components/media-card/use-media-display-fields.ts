interface UseMediaDisplayFieldsParams {
  liveAttrs: Record<string, unknown> | undefined;
  entityPicture?: string;
  artworkKey?: string;
  entityName: string;
  initialTitle: string;
  initialArtist: string;
  nothingPlayingLabel: string;
  nothingPlayingDescription: string;
}

function normalizeMediaText(value: string) {
  return value.trim().toLowerCase();
}

export function useMediaDisplayFields({
  liveAttrs,
  entityPicture,
  artworkKey,
  entityName,
  initialTitle,
  initialArtist,
  nothingPlayingLabel,
  nothingPlayingDescription,
}: UseMediaDisplayFieldsParams) {
  const liveEntityPicture =
    typeof liveAttrs?.entity_picture === 'string' ? liveAttrs.entity_picture : entityPicture;
  const normalizedEntityName = normalizeMediaText(entityName);
  const initialTitleIsEntityName =
    initialTitle.trim().length > 0 && normalizeMediaText(initialTitle) === normalizedEntityName;
  const fallbackTitle =
    initialTitle.trim().length > 0 && !initialTitleIsEntityName
      ? initialTitle
      : nothingPlayingLabel;
  const fallbackArtist =
    initialArtist.trim().length > 0 ? initialArtist : nothingPlayingDescription;
  const resolvedDisplayTitle =
    (typeof liveAttrs?.media_title === 'string' && liveAttrs.media_title) ||
    (typeof liveAttrs?.app_name === 'string' && liveAttrs.app_name) ||
    (typeof liveAttrs?.media_channel === 'string' && liveAttrs.media_channel) ||
    (typeof liveAttrs?.media_series_title === 'string' && liveAttrs.media_series_title) ||
    fallbackTitle;
  const displayTitle =
    normalizeMediaText(resolvedDisplayTitle) === normalizedEntityName
      ? nothingPlayingLabel
      : resolvedDisplayTitle;
  const displayArtist =
    (typeof liveAttrs?.media_artist === 'string' && liveAttrs.media_artist) ||
    (typeof liveAttrs?.media_album_name === 'string' && liveAttrs.media_album_name) ||
    (typeof liveAttrs?.media_channel === 'string' && liveAttrs.media_channel) ||
    (typeof liveAttrs?.media_series_title === 'string' && liveAttrs.media_series_title) ||
    (typeof liveAttrs?.app_name === 'string' && liveAttrs.app_name) ||
    (typeof liveAttrs?.source === 'string' && liveAttrs.source) ||
    fallbackArtist;
  const liveArtworkKey =
    typeof liveAttrs?.media_content_id === 'string' ? liveAttrs.media_content_id : artworkKey;

  return {
    displayArtist,
    displayTitle,
    liveArtworkKey,
    liveEntityPicture,
  };
}
