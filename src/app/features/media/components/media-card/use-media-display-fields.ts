interface UseMediaDisplayFieldsParams {
  liveAttrs: Record<string, unknown> | undefined;
  entityPicture?: string;
  artworkKey?: string;
  initialTitle: string;
  initialArtist: string;
  nothingPlayingLabel: string;
  nothingPlayingDescription: string;
}

export function useMediaDisplayFields({
  liveAttrs,
  entityPicture,
  artworkKey,
  initialTitle,
  initialArtist,
  nothingPlayingLabel,
  nothingPlayingDescription,
}: UseMediaDisplayFieldsParams) {
  const liveEntityPicture =
    typeof liveAttrs?.entity_picture === 'string' ? liveAttrs.entity_picture : entityPicture;
  const hasLiveMediaMetadata =
    typeof liveAttrs?.media_title === 'string' ||
    typeof liveAttrs?.app_name === 'string' ||
    typeof liveAttrs?.media_artist === 'string' ||
    typeof liveAttrs?.media_album_name === 'string' ||
    typeof liveAttrs?.source === 'string';

  const displayTitle =
    (typeof liveAttrs?.media_title === 'string' && liveAttrs.media_title) ||
    (typeof liveAttrs?.app_name === 'string' && liveAttrs.app_name) ||
    (hasLiveMediaMetadata ? initialTitle : nothingPlayingLabel);
  const displayArtist =
    (typeof liveAttrs?.media_artist === 'string' && liveAttrs.media_artist) ||
    (typeof liveAttrs?.media_album_name === 'string' && liveAttrs.media_album_name) ||
    (typeof liveAttrs?.source === 'string' && liveAttrs.source) ||
    (hasLiveMediaMetadata ? initialArtist : nothingPlayingDescription);
  const liveArtworkKey =
    typeof liveAttrs?.media_content_id === 'string' ? liveAttrs.media_content_id : artworkKey;

  return {
    displayArtist,
    displayTitle,
    liveArtworkKey,
    liveEntityPicture,
  };
}
