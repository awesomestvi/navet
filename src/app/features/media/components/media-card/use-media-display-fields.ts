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

function getStringAttribute(attrs: Record<string, unknown> | undefined, key: string) {
  const value = attrs?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function getLiveEntityPicture(attrs: Record<string, unknown> | undefined, fallback?: string) {
  return (
    getStringAttribute(attrs, 'entity_picture') ??
    getStringAttribute(attrs, 'entity_picture_local') ??
    getStringAttribute(attrs, 'media_image_url') ??
    fallback
  );
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
  const liveEntityPicture = getLiveEntityPicture(liveAttrs, entityPicture);
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
  const liveArtworkKey = [
    getStringAttribute(liveAttrs, 'entity_picture'),
    getStringAttribute(liveAttrs, 'entity_picture_local'),
    getStringAttribute(liveAttrs, 'media_image_url'),
    getStringAttribute(liveAttrs, 'media_content_id'),
    getStringAttribute(liveAttrs, 'media_title'),
    getStringAttribute(liveAttrs, 'media_artist'),
    getStringAttribute(liveAttrs, 'media_album_name'),
    artworkKey,
  ]
    .filter(Boolean)
    .join('::');

  return {
    displayArtist,
    displayTitle,
    liveArtworkKey,
    liveEntityPicture,
  };
}
