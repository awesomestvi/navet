import type { PlatformMediaItem } from '@navet/app/platform/provider-feature-models';
import { resolveAddonLocalEndpointUrl } from '@navet/app/utils/home-assistant-connection-target';
import { sanitizeImageUrl } from '@navet/app/utils/url-security';

export interface MediaDialogBrowserMetadata {
  albumTitle?: string;
  artistName?: string;
  artworkUrl?: string;
  title?: string;
}

const metadataCache = new Map<string, Promise<MediaDialogBrowserMetadata>>();
const SPOTIFY_METADATA_ENDPOINT = '/__navet_spotify_metadata__';
const SPOTIFY_ITEM_PATTERN = /(track|album|artist|playlist|show|episode)[/:]([a-zA-Z0-9]{10,})/i;

function getSpotifyItem(item: PlatformMediaItem) {
  const match = item.mediaContentId?.match(SPOTIFY_ITEM_PATTERN);
  if (!match?.[1] || !match[2]) return null;
  return { type: match[1].toLowerCase(), id: match[2] };
}

async function fetchTrackMetadata(trackId: string): Promise<MediaDialogBrowserMetadata> {
  const response = await fetch(
    resolveAddonLocalEndpointUrl(`${SPOTIFY_METADATA_ENDPOINT}/track/${trackId}`),
    { headers: { Accept: 'application/json' }, cache: 'force-cache' }
  );
  if (!response.ok) return {};

  const payload = (await response.json()) as {
    albumTitle?: unknown;
    artistName?: unknown;
    artworkUrls?: unknown;
    title?: unknown;
  };
  const artworkUrl = Array.isArray(payload.artworkUrls)
    ? payload.artworkUrls
        .filter((value): value is string => typeof value === 'string')
        .map((value) => sanitizeImageUrl(value))
        .find((value): value is string => Boolean(value))
    : undefined;

  return {
    title: typeof payload.title === 'string' ? payload.title : undefined,
    artistName: typeof payload.artistName === 'string' ? payload.artistName : undefined,
    albumTitle: typeof payload.albumTitle === 'string' ? payload.albumTitle : undefined,
    artworkUrl,
  };
}

async function fetchSpotifyOEmbed(type: string, id: string): Promise<MediaDialogBrowserMetadata> {
  const url = new URL('https://open.spotify.com/oembed');
  url.searchParams.set('url', `https://open.spotify.com/${type}/${id}`);
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'force-cache',
  });
  if (!response.ok) return {};

  const payload = (await response.json()) as { thumbnail_url?: unknown; title?: unknown };
  return {
    title: typeof payload.title === 'string' ? payload.title : undefined,
    artworkUrl:
      typeof payload.thumbnail_url === 'string'
        ? (sanitizeImageUrl(payload.thumbnail_url) ?? undefined)
        : undefined,
  };
}

export function resolveMediaDialogBrowserMetadata(item: PlatformMediaItem) {
  const spotifyItem = getSpotifyItem(item);
  if (!spotifyItem) return Promise.resolve({});

  const cacheKey = `${spotifyItem.type}:${spotifyItem.id}`;
  const cached = metadataCache.get(cacheKey);
  if (cached) return cached;

  const request = (async () => {
    const trackMetadata =
      spotifyItem.type === 'track'
        ? await fetchTrackMetadata(spotifyItem.id).catch((): MediaDialogBrowserMetadata => ({}))
        : {};
    if ('artworkUrl' in trackMetadata && trackMetadata.artworkUrl) return trackMetadata;

    const oEmbedMetadata = await fetchSpotifyOEmbed(spotifyItem.type, spotifyItem.id).catch(
      (): MediaDialogBrowserMetadata => ({})
    );
    return { ...oEmbedMetadata, ...trackMetadata };
  })();

  metadataCache.set(cacheKey, request);
  return request;
}
