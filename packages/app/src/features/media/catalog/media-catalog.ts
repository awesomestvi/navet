import type { PlatformMediaItem } from '@navet/app/platform/provider-feature-models';
import { resolveAddonLocalEndpointUrl } from '@navet/app/utils/home-assistant-connection-target';
import { LruCache } from '@navet/app/utils/lru-cache';
import { sanitizeImageUrl } from '@navet/app/utils/url-security';

const COMMONS_FILE_REDIRECT_URL = 'https://commons.wikimedia.org/wiki/Special:Redirect/file';
const MUSICBRAINZ_ARTIST_API_URL = 'https://musicbrainz.org/ws/2/artist';
const MUSICBRAINZ_RELEASE_API_URL = 'https://musicbrainz.org/ws/2/release';
const COVER_ART_ARCHIVE_RELEASE_URL = 'https://coverartarchive.org/release';
const COVER_ART_ARCHIVE_RELEASE_GROUP_URL = 'https://coverartarchive.org/release-group';
const SPOTIFY_METADATA_ENDPOINT = '/__navet_spotify_metadata__';
const SPOTIFY_OEMBED_URL = 'https://open.spotify.com/oembed';
const SPOTIFY_TRACK_ID_PATTERN = /^[a-zA-Z0-9]{22}$/;
const MUSICBRAINZ_BROWSER_LOOKUP_LIMIT = 6;
const DEFAULT_CACHE_MAX_ENTRIES = 128;
const DEFAULT_FETCH_CONCURRENCY = 4;

export interface OpenMediaArtworkResult {
  artworkUrls: string[];
  artistName?: string;
  albumTitle?: string;
}

export interface SpotifyTrackMetadata {
  title?: string;
  artistName?: string;
  albumTitle?: string;
  artworkUrls: string[];
}

export interface MediaCatalogItemProjection {
  openArtwork: OpenMediaArtworkResult;
  spotifyMetadata: SpotifyTrackMetadata;
}

export const EMPTY_OPEN_MEDIA_ARTWORK_RESULT: OpenMediaArtworkResult = { artworkUrls: [] };
export const EMPTY_SPOTIFY_TRACK_METADATA: SpotifyTrackMetadata = { artworkUrls: [] };

interface MusicBrainzBrowseRelease {
  id?: string;
  score?: number | string;
  status?: string;
  title?: string;
  'release-group'?: {
    id?: string;
    'primary-type'?: string;
  };
}

interface MusicBrainzBrowseReleaseResponse {
  releases?: MusicBrainzBrowseRelease[];
}

interface MusicBrainzBrowseArtist {
  id?: string;
  score?: number | string;
}

interface MusicBrainzBrowseArtistSearchResponse {
  artists?: MusicBrainzBrowseArtist[];
}

interface MusicBrainzBrowseArtistLookupResponse {
  relations?: Array<{
    type?: string;
    url?: { resource?: string };
  }>;
}

interface WikidataEntityDataResponse {
  entities?: Record<
    string,
    {
      claims?: {
        P18?: Array<{
          mainsnak?: { datavalue?: { value?: string } };
        }>;
      };
    }
  >;
}

class RequestLimiter {
  readonly #queue: Array<() => void> = [];
  #activeCount = 0;

  constructor(readonly concurrency: number) {}

  run<Result>(operation: () => Promise<Result>): Promise<Result> {
    return new Promise<Result>((resolve, reject) => {
      const start = () => {
        this.#activeCount += 1;
        void operation()
          .then(resolve, reject)
          .finally(() => {
            this.#activeCount -= 1;
            this.#queue.shift()?.();
          });
      };

      if (this.#activeCount < this.concurrency) {
        start();
      } else {
        this.#queue.push(start);
      }
    });
  }
}

function waitForResult<Result>(promise: Promise<Result>, signal?: AbortSignal): Promise<Result> {
  if (!signal) return promise;
  if (signal.aborted)
    return Promise.reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));

  return new Promise<Result>((resolve, reject) => {
    const handleAbort = () => reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', handleAbort, { once: true });
    void promise.then(
      (value) => {
        signal.removeEventListener('abort', handleAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', handleAbort);
        reject(error);
      }
    );
  });
}

function escapeMusicBrainzQueryValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildMusicBrainzReleaseSearchUrl(title: string) {
  const url = new URL(MUSICBRAINZ_RELEASE_API_URL);
  url.searchParams.set(
    'query',
    `release:"${escapeMusicBrainzQueryValue(title)}" AND status:official`
  );
  url.searchParams.set('fmt', 'json');
  url.searchParams.set('limit', String(MUSICBRAINZ_BROWSER_LOOKUP_LIMIT));
  return url.toString();
}

function buildMusicBrainzArtistSearchUrl(artistName: string) {
  const url = new URL(MUSICBRAINZ_ARTIST_API_URL);
  url.searchParams.set('query', `artist:"${escapeMusicBrainzQueryValue(artistName)}"`);
  url.searchParams.set('fmt', 'json');
  url.searchParams.set('limit', String(MUSICBRAINZ_BROWSER_LOOKUP_LIMIT));
  return url.toString();
}

function buildMusicBrainzArtistLookupUrl(artistId: string) {
  const url = new URL(`${MUSICBRAINZ_ARTIST_API_URL}/${artistId}`);
  url.searchParams.set('inc', 'url-rels');
  url.searchParams.set('fmt', 'json');
  return url.toString();
}

function scoreRelease(release: MusicBrainzBrowseRelease) {
  const score =
    typeof release.score === 'string' ? Number.parseInt(release.score, 10) : (release.score ?? 0);
  const releaseGroupType = release['release-group']?.['primary-type']?.toLowerCase() ?? '';
  return score + (release.status === 'Official' ? 20 : 0) + (releaseGroupType === 'album' ? 12 : 0);
}

function buildCoverArtCandidates(releases: MusicBrainzBrowseRelease[]) {
  const urls: string[] = [];
  for (const release of [...releases].sort(
    (left, right) => scoreRelease(right) - scoreRelease(left)
  )) {
    if (release['release-group']?.id) {
      urls.push(`${COVER_ART_ARCHIVE_RELEASE_GROUP_URL}/${release['release-group'].id}/front-500`);
    }
    if (release.id) {
      urls.push(`${COVER_ART_ARCHIVE_RELEASE_URL}/${release.id}/front-500`);
    }
  }
  return [...new Set(urls)]
    .map((url) => sanitizeImageUrl(url))
    .filter((url): url is string => Boolean(url));
}

function extractWikidataEntityId(resourceUrl: string | undefined) {
  if (!resourceUrl) return null;
  try {
    const url = new URL(resourceUrl);
    if (!url.hostname.endsWith('wikidata.org')) return null;
    return url.pathname.split('/').find((part) => /^Q\d+$/i.test(part)) ?? null;
  } catch {
    return null;
  }
}

function extractSpotifyTrackIdFromValue(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const uriMatch = trimmed.match(/spotify(?::|\/)track(?::|\/)([a-zA-Z0-9]{22})/);
  if (uriMatch?.[1]) return uriMatch[1];
  try {
    const url = new URL(trimmed);
    const trackId = url.pathname.split('/').find((part) => SPOTIFY_TRACK_ID_PATTERN.test(part));
    if (url.hostname.endsWith('spotify.com') && trackId) return trackId;
  } catch {
    // Provider media identifiers are commonly URIs rather than URLs.
  }
  return SPOTIFY_TRACK_ID_PATTERN.test(trimmed) ? trimmed : null;
}

export function isArtistMediaItem(item: PlatformMediaItem) {
  const mediaClass = item.mediaClass?.toLowerCase() ?? '';
  const mediaContentType = item.mediaContentType?.toLowerCase() ?? '';
  const mediaContentId = item.mediaContentId?.toLowerCase() ?? '';
  return (
    mediaClass === 'artist' ||
    mediaContentType === 'artist' ||
    mediaContentId.includes(':artist:') ||
    mediaContentId.includes('/artist/')
  );
}

export function isAlbumMediaItem(item: PlatformMediaItem) {
  const mediaClass = item.mediaClass?.toLowerCase() ?? '';
  const mediaContentType = item.mediaContentType?.toLowerCase() ?? '';
  const mediaContentId = item.mediaContentId?.toLowerCase() ?? '';
  return (
    mediaClass === 'album' ||
    mediaContentType === 'album' ||
    mediaContentId.includes(':album:') ||
    mediaContentId.includes('/album/')
  );
}

function isTrackMediaItem(item: PlatformMediaItem) {
  const mediaClass = item.mediaClass?.toLowerCase() ?? '';
  const mediaContentType = item.mediaContentType?.toLowerCase() ?? '';
  const mediaContentId = item.mediaContentId?.toLowerCase() ?? '';
  return (
    mediaClass === 'track' ||
    mediaClass === 'music' ||
    mediaContentType === 'track' ||
    mediaContentType === 'music' ||
    mediaContentId.includes(':track:') ||
    mediaContentId.includes('/track/')
  );
}

export function getSpotifyTrackId(item: PlatformMediaItem) {
  if (!isTrackMediaItem(item)) return null;
  return (
    extractSpotifyTrackIdFromValue(item.mediaContentId) ??
    extractSpotifyTrackIdFromValue(item.thumbnail ?? undefined)
  );
}

function getOpenArtworkLookup(item: PlatformMediaItem) {
  const title = (item.title || item.mediaContentId || '').trim();
  if (!title) return null;
  if (isArtistMediaItem(item)) return { kind: 'artist' as const, title };
  if (isAlbumMediaItem(item)) return { kind: 'album' as const, title };
  return null;
}

export function getResolvedMediaBrowserArtist(
  item: PlatformMediaItem,
  projection: MediaCatalogItemProjection
) {
  return (
    projection.spotifyMetadata.artistName ||
    item.artist?.trim() ||
    projection.openArtwork.artistName ||
    undefined
  );
}

export function getResolvedMediaBrowserAlbum(
  item: PlatformMediaItem,
  projection: MediaCatalogItemProjection
) {
  return (
    item.album?.trim() ||
    projection.spotifyMetadata.albumTitle?.trim() ||
    projection.openArtwork.albumTitle ||
    undefined
  );
}

export class MediaCatalog {
  readonly #openArtworkCache: LruCache<string, OpenMediaArtworkResult>;
  readonly #spotifyCache: LruCache<string, SpotifyTrackMetadata>;
  readonly #openArtworkRequests = new Map<string, Promise<OpenMediaArtworkResult>>();
  readonly #spotifyRequests = new Map<string, Promise<SpotifyTrackMetadata>>();
  readonly #limiter: RequestLimiter;

  constructor(options?: { cacheMaxEntries?: number; concurrency?: number }) {
    this.#openArtworkCache = new LruCache(options?.cacheMaxEntries ?? DEFAULT_CACHE_MAX_ENTRIES);
    this.#spotifyCache = new LruCache(options?.cacheMaxEntries ?? DEFAULT_CACHE_MAX_ENTRIES);
    this.#limiter = new RequestLimiter(options?.concurrency ?? DEFAULT_FETCH_CONCURRENCY);
  }

  async resolveItem(
    item: PlatformMediaItem,
    options?: { signal?: AbortSignal }
  ): Promise<MediaCatalogItemProjection> {
    const [openArtwork, spotifyMetadata] = await Promise.all([
      this.resolveOpenArtwork(item, options),
      this.resolveSpotifyMetadata(item, options),
    ]);
    return { openArtwork, spotifyMetadata };
  }

  async resolveOpenArtwork(
    item: PlatformMediaItem,
    options?: { signal?: AbortSignal }
  ): Promise<OpenMediaArtworkResult> {
    const lookup = getOpenArtworkLookup(item);
    if (!lookup) return EMPTY_OPEN_MEDIA_ARTWORK_RESULT;
    const key = `${lookup.kind}:${lookup.title.toLocaleLowerCase()}`;
    const cached = this.#openArtworkCache.get(key);
    if (cached) return cached;

    let request = this.#openArtworkRequests.get(key);
    if (!request) {
      request = this.#limiter
        .run(() =>
          lookup.kind === 'artist'
            ? this.#resolveArtistArtwork(lookup.title)
            : this.#resolveReleaseArtwork(lookup.title)
        )
        .catch(() => EMPTY_OPEN_MEDIA_ARTWORK_RESULT)
        .then((result) => {
          this.#openArtworkCache.set(key, result);
          return result;
        })
        .finally(() => this.#openArtworkRequests.delete(key));
      this.#openArtworkRequests.set(key, request);
    }
    return waitForResult(request, options?.signal);
  }

  async resolveSpotifyMetadata(
    item: PlatformMediaItem,
    options?: { signal?: AbortSignal }
  ): Promise<SpotifyTrackMetadata> {
    const trackId = getSpotifyTrackId(item);
    if (!trackId) return EMPTY_SPOTIFY_TRACK_METADATA;
    return this.resolveSpotifyTrack(trackId, options);
  }

  async resolveSpotifyTrack(
    trackId: string,
    options?: { signal?: AbortSignal }
  ): Promise<SpotifyTrackMetadata> {
    const cached = this.#spotifyCache.get(trackId);
    if (cached) return cached;

    let request = this.#spotifyRequests.get(trackId);
    if (!request) {
      request = this.#limiter
        .run(() => this.#resolveSpotifyTrackMetadata(trackId))
        .catch(() => EMPTY_SPOTIFY_TRACK_METADATA)
        .then((result) => {
          this.#spotifyCache.set(trackId, result);
          return result;
        })
        .finally(() => this.#spotifyRequests.delete(trackId));
      this.#spotifyRequests.set(trackId, request);
    }
    return waitForResult(request, options?.signal);
  }

  async #resolveReleaseArtwork(title: string): Promise<OpenMediaArtworkResult> {
    const response = await fetch(buildMusicBrainzReleaseSearchUrl(title), {
      headers: { Accept: 'application/json' },
      cache: 'force-cache',
    });
    if (!response.ok) return EMPTY_OPEN_MEDIA_ARTWORK_RESULT;
    const payload = (await response.json()) as MusicBrainzBrowseReleaseResponse;
    const releases = [...(payload.releases ?? [])].sort(
      (left, right) => scoreRelease(right) - scoreRelease(left)
    );
    return { artworkUrls: buildCoverArtCandidates(releases), albumTitle: releases[0]?.title };
  }

  async #resolveArtistArtwork(artistName: string): Promise<OpenMediaArtworkResult> {
    const searchResponse = await fetch(buildMusicBrainzArtistSearchUrl(artistName), {
      headers: { Accept: 'application/json' },
      cache: 'force-cache',
    });
    if (!searchResponse.ok) return EMPTY_OPEN_MEDIA_ARTWORK_RESULT;
    const searchPayload = (await searchResponse.json()) as MusicBrainzBrowseArtistSearchResponse;
    const artists = [...(searchPayload.artists ?? [])]
      .filter((artist) => artist.id)
      .sort((left, right) => Number(right.score ?? 0) - Number(left.score ?? 0));

    for (const artist of artists) {
      if (!artist.id) continue;
      const lookupResponse = await fetch(buildMusicBrainzArtistLookupUrl(artist.id), {
        headers: { Accept: 'application/json' },
        cache: 'force-cache',
      });
      if (!lookupResponse.ok) continue;
      const payload = (await lookupResponse.json()) as MusicBrainzBrowseArtistLookupResponse;
      const entityId = payload.relations
        ?.filter((relation) => relation.type === 'wikidata')
        .map((relation) => extractWikidataEntityId(relation.url?.resource))
        .find((value): value is string => Boolean(value));
      if (!entityId) continue;
      const imageUrl = await this.#resolveWikidataImage(entityId);
      if (imageUrl) return { artworkUrls: [imageUrl] };
    }
    return EMPTY_OPEN_MEDIA_ARTWORK_RESULT;
  }

  async #resolveWikidataImage(entityId: string) {
    const response = await fetch(
      `https://www.wikidata.org/wiki/Special:EntityData/${entityId}.json`,
      { headers: { Accept: 'application/json' }, cache: 'force-cache' }
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as WikidataEntityDataResponse;
    const fileName = payload.entities?.[entityId]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (typeof fileName !== 'string') return null;
    return sanitizeImageUrl(
      `${COMMONS_FILE_REDIRECT_URL}/${encodeURIComponent(fileName)}?width=500`
    );
  }

  async #resolveSpotifyTrackMetadata(trackId: string): Promise<SpotifyTrackMetadata> {
    const endpointMetadata = await this.#fetchSpotifyEndpoint(trackId).catch(
      () => EMPTY_SPOTIFY_TRACK_METADATA
    );
    if (
      endpointMetadata.title ||
      endpointMetadata.artistName ||
      endpointMetadata.albumTitle ||
      endpointMetadata.artworkUrls.length > 0
    ) {
      return endpointMetadata;
    }
    return this.#fetchSpotifyOEmbed(trackId).catch(() => EMPTY_SPOTIFY_TRACK_METADATA);
  }

  async #fetchSpotifyEndpoint(trackId: string): Promise<SpotifyTrackMetadata> {
    const response = await fetch(
      resolveAddonLocalEndpointUrl(`${SPOTIFY_METADATA_ENDPOINT}/track/${trackId}`),
      { headers: { Accept: 'application/json' }, cache: 'force-cache' }
    );
    if (!response.ok) return EMPTY_SPOTIFY_TRACK_METADATA;
    const payload = (await response.json()) as Partial<SpotifyTrackMetadata>;
    return {
      title: typeof payload.title === 'string' ? payload.title : undefined,
      artistName: typeof payload.artistName === 'string' ? payload.artistName : undefined,
      albumTitle: typeof payload.albumTitle === 'string' ? payload.albumTitle : undefined,
      artworkUrls: Array.isArray(payload.artworkUrls)
        ? payload.artworkUrls
            .map((url) => (typeof url === 'string' ? sanitizeImageUrl(url) : null))
            .filter((url): url is string => Boolean(url))
        : [],
    };
  }

  async #fetchSpotifyOEmbed(trackId: string): Promise<SpotifyTrackMetadata> {
    const url = new URL(SPOTIFY_OEMBED_URL);
    url.searchParams.set('url', `https://open.spotify.com/track/${trackId}`);
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'force-cache',
    });
    if (!response.ok) return EMPTY_SPOTIFY_TRACK_METADATA;
    const payload = (await response.json()) as { title?: unknown; thumbnail_url?: unknown };
    const artworkUrl =
      typeof payload.thumbnail_url === 'string' ? sanitizeImageUrl(payload.thumbnail_url) : null;
    return {
      title: typeof payload.title === 'string' ? payload.title : undefined,
      artworkUrls: artworkUrl ? [artworkUrl] : [],
    };
  }
}

export const mediaCatalog = new MediaCatalog();
