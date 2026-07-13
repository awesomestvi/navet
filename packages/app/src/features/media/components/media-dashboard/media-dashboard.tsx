import { dispatchEntityCommand } from '@navet/app/commands';
import { getDashboardCardFootprint } from '@navet/app/components/shared/card-size';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { EMPTY_NAVET_MEDIA_CAPABILITIES } from '@navet/app/core/navet-device-state';
import {
  useProviderMediaEntityRegistry,
  useProviderMediaPlayerEntities,
} from '@navet/app/features/media/hooks/use-provider-media-playback-data';
import { normalizeMediaPlaybackState } from '@navet/app/features/media/media-state';
import {
  useEntityProviderFeature,
  useI18n,
  useMediaQuery,
  usePersistedState,
  useServiceActionHandler,
  useTheme,
} from '@navet/app/hooks';
import type {
  PlatformMediaBrowseResult,
  PlatformMediaItem,
} from '@navet/app/platform/provider-feature-models';
import { integrationMediaFeatureService } from '@navet/app/services/integration-media-feature.service';
import { normalizeResourceUrl } from '@navet/app/services/integration-resource.service';
import type { MediaDevice } from '@navet/app/types/device.types';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { resolveAddonLocalEndpointUrl } from '@navet/app/utils/home-assistant-connection-target';
import { getProviderNativeId } from '@navet/app/utils/provider-ids';
import { sanitizeImageUrl } from '@navet/app/utils/url-security';
import {
  ArrowLeft,
  Bookmark,
  Clock3,
  Folder,
  ListMusic,
  Play,
  Search,
  UserRound,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MediaCard } from '../media-card';

type MediaDashboardDevice = MediaDevice & { type: 'media' };

interface MediaDashboardProps {
  devices: MediaDashboardDevice[];
  initialDeviceId?: string;
  onPromotedEntitiesChange?: (entityIds: string[]) => void;
}

type MediaFeedbackKey =
  | 'media.feedback.updatePlaybackFailed'
  | 'media.feedback.browseMediaFailed'
  | 'media.feedback.playMediaFailed'
  | 'media.feedback.seekFailed';

type MediaDefaultBrowseView = Pick<
  PlatformMediaItem,
  'title' | 'mediaClass' | 'mediaContentId' | 'mediaContentType' | 'canExpand' | 'canPlay'
>;

interface RememberedMediaSession {
  version: 1 | 2;
  device: MediaDashboardDevice;
  mediaLibraryEntityId?: string;
  transportEntityId?: string;
  playbackProviderLabel?: string;
  rememberedAt: string;
}

const SPOTIFY_ICON_PATH =
  'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z';
const COMMONS_FILE_REDIRECT_URL = 'https://commons.wikimedia.org/wiki/Special:Redirect/file';
const MUSICBRAINZ_ARTIST_API_URL = 'https://musicbrainz.org/ws/2/artist';
const MUSICBRAINZ_RELEASE_API_URL = 'https://musicbrainz.org/ws/2/release';
const COVER_ART_ARCHIVE_RELEASE_URL = 'https://coverartarchive.org/release';
const COVER_ART_ARCHIVE_RELEASE_GROUP_URL = 'https://coverartarchive.org/release-group';
const MUSICBRAINZ_BROWSER_LOOKUP_LIMIT = 6;
const SPOTIFY_METADATA_ENDPOINT = '/__navet_spotify_metadata__';
const SPOTIFY_OEMBED_URL = 'https://open.spotify.com/oembed';
const SPOTIFY_IMAGE_ID_PATTERN = /(?:^|\/)image\/(ab[a-zA-Z0-9]{20,})(?:[/?#].*)?$/;
const SPOTIFY_TRACK_ID_PATTERN = /^[a-zA-Z0-9]{22}$/;
const BROWSE_COLLAPSED_ITEM_LIMIT = 8;
const COMPACT_FOLDER_ITEM_LIMIT = 16;
const DIRECTORY_COUNT_FETCH_CONCURRENCY = 3;
const MEDIA_BROWSER_TABLE_HEADER_HEIGHT = 42;
const MEDIA_BROWSER_TABLE_ROW_HEIGHT = 64;
const MEDIA_BROWSER_TABLE_OVERSCAN = 6;
const COMPACT_MOBILE_BROWSER_HEIGHT = 170;
const REMEMBERED_POSITION_WRITE_INTERVAL_SECONDS = 15;
const EMPTY_OPEN_MEDIA_ARTWORK_RESULT: OpenMediaArtworkResult = { artworkUrls: [] };
const EMPTY_SPOTIFY_TRACK_METADATA: SpotifyTrackMetadata = { artworkUrls: [] };
const EMPTY_MEDIA_DEFAULT_BROWSE_VIEWS: Record<string, MediaDefaultBrowseView> = {};
const EMPTY_MEDIA_BROWSER_EXPANDED_VIEWS: Record<string, boolean> = {};
const EMPTY_REMEMBERED_MEDIA_SESSION: RememberedMediaSession | null = null;
const openMediaArtworkCache = new Map<string, OpenMediaArtworkResult>();
const spotifyTrackMetadataCache = new Map<string, SpotifyTrackMetadata>();

interface OpenMediaArtworkResult {
  artworkUrls: string[];
  artistName?: string;
  albumTitle?: string;
}

interface SpotifyTrackMetadata {
  title?: string;
  artistName?: string;
  albumTitle?: string;
  artworkUrls: string[];
}

interface MusicBrainzBrowseRelease {
  id?: string;
  score?: number | string;
  status?: string;
  title?: string;
  'artist-credit'?: Array<{
    name?: string;
    artist?: {
      name?: string;
    };
  }>;
  'release-group'?: {
    id?: string;
    title?: string;
    'primary-type'?: string;
  };
}

interface MusicBrainzBrowseReleaseResponse {
  releases?: MusicBrainzBrowseRelease[];
}

interface MusicBrainzBrowseArtist {
  id?: string;
  name?: string;
  score?: number | string;
}

interface MusicBrainzBrowseArtistSearchResponse {
  artists?: MusicBrainzBrowseArtist[];
}

interface MusicBrainzBrowseArtistLookupResponse {
  relations?: Array<{
    type?: string;
    url?: {
      resource?: string;
    };
  }>;
}

interface WikidataEntityDataResponse {
  entities?: Record<
    string,
    {
      claims?: {
        P18?: Array<{
          mainsnak?: {
            datavalue?: {
              value?: string;
            };
          };
        }>;
      };
    }
  >;
}

function isAudioDevice(device: MediaDashboardDevice) {
  const className = device.deviceClass?.toLowerCase() ?? '';
  return className !== 'tv';
}

function isSpotifyAccountDevice(device: MediaDashboardDevice) {
  return (
    device.id.toLowerCase().includes('spotify') || device.name.toLowerCase().includes('spotify')
  );
}

function isMusicAssistantDevice(device: MediaDashboardDevice, registryPlatform?: string | null) {
  const identity = `${device.id} ${device.name} ${device.source ?? ''}`.toLowerCase();
  return (
    registryPlatform === 'music_assistant' ||
    identity.includes('music assistant') ||
    device.id.toLowerCase().includes('media_player.mass_') ||
    device.id.toLowerCase().includes('media_player.music_assistant')
  );
}

function getPhysicalSpeakerKey(device: MediaDashboardDevice) {
  const normalizedRoom = device.room.trim().toLowerCase();
  if (
    normalizedRoom &&
    !['unknown', 'unassigned', 'no room', 'media', 'home'].includes(normalizedRoom)
  ) {
    return normalizedRoom;
  }

  return device.name
    .toLowerCase()
    .replace(/\bmusic assistant\b/g, '')
    .replace(/\bspeaker\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getPlaybackProviderLabel(device: MediaDashboardDevice, registryPlatform?: string | null) {
  if (isMusicAssistantDevice(device, registryPlatform)) return 'Music Assistant';
  const identity = `${device.id} ${device.name} ${device.source ?? ''}`.toLowerCase();
  if (identity.includes('spotify')) return 'Spotify';
  if (identity.includes('apple music')) return 'Apple Music';
  if (identity.includes('youtube')) return 'YouTube';
  const source = device.source?.trim();
  return source && !['unknown', 'none', 'idle'].includes(source.toLowerCase()) ? source : undefined;
}

function hasCurrentMedia(device: MediaDashboardDevice) {
  return Boolean(
    (device.title.trim() &&
      device.title.trim().toLowerCase() !== device.name.trim().toLowerCase()) ||
      device.artist.trim() ||
      device.album?.trim() ||
      device.entityPicture ||
      (device.durationSeconds ?? 0) > 0
  );
}

function getMediaActivityTimestamp(device: MediaDashboardDevice) {
  if (!device.positionUpdatedAt) return 0;
  const timestamp = Date.parse(device.positionUpdatedAt);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function compareMediaActivity(left: MediaDashboardDevice, right: MediaDashboardDevice) {
  const timestampDifference = getMediaActivityTimestamp(right) - getMediaActivityTimestamp(left);
  return timestampDifference || (right.elapsedSeconds ?? 0) - (left.elapsedSeconds ?? 0);
}

function isSameMediaSession(left: MediaDashboardDevice, right: MediaDashboardDevice) {
  const leftTitle = left.title.trim().toLowerCase();
  const rightTitle = right.title.trim().toLowerCase();
  const leftArtist = left.artist.trim().toLowerCase();
  const rightArtist = right.artist.trim().toLowerCase();
  if (
    leftTitle &&
    rightTitle &&
    leftTitle === rightTitle &&
    (!leftArtist || !rightArtist || leftArtist === rightArtist)
  ) {
    return true;
  }

  const leftContentId = left.mediaContentId?.trim();
  const rightContentId = right.mediaContentId?.trim();
  if (leftContentId && rightContentId) return leftContentId === rightContentId;

  return false;
}

function isRememberedSessionUsable(
  session: RememberedMediaSession | null,
  devices: MediaDashboardDevice[]
) {
  if (
    (session?.version !== 1 && session?.version !== 2) ||
    !session.device?.id ||
    !hasCurrentMedia(session.device)
  )
    return false;

  const currentDevice = devices.find((device) => device.id === session.device.id);
  if (!currentDevice) return false;

  return (
    !session.device.providerId ||
    !currentDevice.providerId ||
    session.device.providerId === currentDevice.providerId
  );
}

function restoreRememberedDevice(
  session: RememberedMediaSession,
  currentDevice: MediaDashboardDevice
): MediaDashboardDevice {
  return {
    ...session.device,
    ...currentDevice,
    title: session.device.title,
    artist: session.device.artist,
    album: session.device.album,
    entityPicture: session.device.entityPicture,
    elapsedSeconds: session.device.elapsedSeconds,
    durationSeconds: session.device.durationSeconds,
    positionUpdatedAt: session.device.positionUpdatedAt,
    mediaContentId: session.device.mediaContentId,
    mediaContentType: session.device.mediaContentType,
    groupMembers:
      (currentDevice.groupMembers?.length ?? 0) > 1
        ? currentDevice.groupMembers
        : session.device.groupMembers,
    // Home Assistant's Spotify entity can collapse a paused session to idle and clear all media
    // attributes. Navet keeps presenting that last resumable session as paused.
    state: currentDevice.state === 'idle' ? 'paused' : currentDevice.state,
  };
}

function readLiveStringAttribute(attrs: Record<string, unknown> | undefined, key: string) {
  const value = attrs?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function findActiveSpotifyConnectTarget(
  spotifyDevice: MediaDashboardDevice | undefined,
  targets: MediaDashboardDevice[]
) {
  const playingTarget = targets.find((target) => target.state === 'playing');
  if (playingTarget) return playingTarget;

  const retainedTarget = targets
    .filter(
      (target) => (target.state === 'paused' || target.state === 'idle') && hasCurrentMedia(target)
    )
    .sort(compareMediaActivity)[0];
  if (retainedTarget) return retainedTarget;

  const spotifySource = spotifyDevice?.source?.trim().toLowerCase();
  if (spotifySource) {
    const sourceTarget = targets.find((target) => {
      const targetName = target.name.trim().toLowerCase();
      return spotifySource === targetName || spotifySource.includes(targetName);
    });
    if (sourceTarget) return sourceTarget;
  }

  return undefined;
}

function getDeviceCapabilities(device: MediaDashboardDevice) {
  return (
    device.mediaCapabilities ?? {
      ...EMPTY_NAVET_MEDIA_CAPABILITIES,
      canMuteVolume: true,
      canPause: true,
      canPlay: true,
      canSetVolume: true,
    }
  );
}

function inferMediaContentType(item: PlatformMediaItem) {
  if (item.mediaContentType) return item.mediaContentType;
  const value = item.mediaContentId?.toLowerCase() ?? '';
  if (value.includes(':playlist:') || value.includes('/playlist/')) return 'playlist';
  if (value.includes(':album:') || value.includes('/album/')) return 'album';
  if (value.includes(':episode:') || value.includes('/episode/')) return 'episode';
  return 'music';
}

function isSpotifyMediaItem(item: PlatformMediaItem) {
  const mediaContentId = item.mediaContentId?.trim().toLowerCase() ?? '';
  return mediaContentId.startsWith('spotify:') || mediaContentId.includes('open.spotify.com/');
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = error.message;
    if (typeof message === 'string') return message;
  }
  return typeof error === 'string' ? error : '';
}

function isRestrictedSpotifyPlaybackError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return (
    /upnp(?: error)?\s*800/.test(message) ||
    message.includes('restricted') ||
    message.includes('restriction') ||
    /does not support.*play_media/.test(message) ||
    /not supported.*play_media/.test(message)
  );
}

function getMediaItemKey(item: PlatformMediaItem) {
  return `${item.mediaContentType}:${item.mediaContentId}:${item.title}`;
}

function deduplicateMediaItems(items: PlatformMediaItem[]) {
  const seenMediaIds = new Set<string>();

  return items.filter((item) => {
    const mediaContentId = item.mediaContentId?.trim().toLowerCase();
    if (!mediaContentId) return true;

    const key = `${item.mediaContentType?.trim().toLowerCase() ?? ''}:${mediaContentId}`;
    if (seenMediaIds.has(key)) return false;

    seenMediaIds.add(key);
    return true;
  });
}

function getDirectoryItemCountKey(entityId: string, item: PlatformMediaItem) {
  return `${entityId}:${getMediaItemKey(item)}`;
}

function getMediaBrowserViewKey(entityId: string, item?: PlatformMediaItem) {
  const mediaContentId = item?.mediaContentId?.trim() || 'root';
  const mediaContentType = item?.mediaContentType?.trim() || 'root';
  return `${entityId}:${mediaContentType}:${mediaContentId}`;
}

function isMediaDirectoryItem(item: PlatformMediaItem) {
  return Boolean(item.canExpand && !item.canPlay);
}

function isArtworkCollectionItem(item: PlatformMediaItem) {
  const mediaClass = item.mediaClass?.toLowerCase() ?? '';
  return (
    isArtistMediaItem(item) ||
    isAlbumMediaItem(item) ||
    ['playlist', 'podcast', 'show'].includes(mediaClass)
  );
}

function isSpotifyProviderDirectory(item: PlatformMediaItem) {
  return [item.mediaContentId, item.mediaContentType, item.thumbnail, item.title].some((value) =>
    value?.toLowerCase().includes('spotify')
  );
}

function isArtistMediaItem(item: PlatformMediaItem) {
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

function getMediaItemInitials(item: PlatformMediaItem) {
  const title = item.title || item.mediaContentId || '';
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function shouldUseProviderMediaThumbnail(item: PlatformMediaItem) {
  if (!item.thumbnail) {
    return false;
  }

  return true;
}

function resolveSpotifyImageThumbnailUrl(thumbnail: string | null | undefined) {
  const match = thumbnail?.trim().match(SPOTIFY_IMAGE_ID_PATTERN);
  if (!match) {
    return null;
  }

  return sanitizeImageUrl(`https://i.scdn.co/image/${match[1]}`);
}

export function resolveMusicAssistantThumbnailSourceUrl(thumbnail: string | null | undefined) {
  const trimmedThumbnail = thumbnail?.trim();
  if (!trimmedThumbnail) {
    return null;
  }

  try {
    const thumbnailUrl = new URL(trimmedThumbnail, 'http://navet.local');
    if (!thumbnailUrl.pathname.toLowerCase().includes('/imageproxy')) {
      return null;
    }

    let sourceUrl = thumbnailUrl.searchParams.get('path');
    if (!sourceUrl) {
      return null;
    }

    for (let decodePass = 0; decodePass < 2; decodePass += 1) {
      const decodedSourceUrl = decodeURIComponent(sourceUrl);
      if (decodedSourceUrl === sourceUrl) {
        break;
      }
      sourceUrl = decodedSourceUrl;
    }

    return sanitizeImageUrl(sourceUrl);
  } catch {
    return null;
  }
}

function resolveMediaBrowserThumbnailUrl(
  item: PlatformMediaItem,
  providerId?: IntegrationProviderId
) {
  if (!shouldUseProviderMediaThumbnail(item)) {
    return null;
  }

  return (
    resolveSpotifyImageThumbnailUrl(item.thumbnail) ??
    resolveMusicAssistantThumbnailSourceUrl(item.thumbnail) ??
    normalizeResourceUrl(item.thumbnail ?? '', providerId)
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

function extractSpotifyTrackIdFromValue(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const spotifyUriMatch = trimmed.match(/spotify(?::|\/)track(?::|\/)([a-zA-Z0-9]{22})/);
  if (spotifyUriMatch) {
    return spotifyUriMatch[1];
  }

  try {
    const url = new URL(trimmed);
    const trackId = url.pathname.split('/').find((part) => SPOTIFY_TRACK_ID_PATTERN.test(part));
    if (url.hostname.endsWith('spotify.com') && trackId) {
      return trackId;
    }
  } catch {
    // Media content ids are often provider URIs, not URLs.
  }

  return SPOTIFY_TRACK_ID_PATTERN.test(trimmed) ? trimmed : null;
}

function getSpotifyTrackId(item: PlatformMediaItem) {
  if (!isTrackMediaItem(item)) {
    return null;
  }

  return (
    extractSpotifyTrackIdFromValue(item.mediaContentId) ??
    extractSpotifyTrackIdFromValue(item.thumbnail ?? undefined)
  );
}

function buildSpotifyTrackUrl(trackId: string) {
  return `https://open.spotify.com/track/${trackId}`;
}

function isAlbumMediaItem(item: PlatformMediaItem) {
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

function getMediaItemArtist(item: PlatformMediaItem) {
  return item.artist?.trim() || undefined;
}

function getMediaItemAlbum(item: PlatformMediaItem) {
  return item.album?.trim() || undefined;
}

function getMediaBrowserItemSubtitle(item: PlatformMediaItem, openArtwork: OpenMediaArtworkResult) {
  return getMediaItemArtist(item) ?? openArtwork.artistName ?? undefined;
}

function getMediaBrowserItemAlbum(item: PlatformMediaItem, openArtwork: OpenMediaArtworkResult) {
  return getMediaItemAlbum(item) ?? openArtwork.albumTitle ?? '';
}

function escapeMusicBrainzBrowseQueryValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function getOpenArtworkLookup(
  item: PlatformMediaItem
): { kind: 'album' | 'artist'; title: string } | null {
  const title = (item.title || item.mediaContentId || '').trim();
  if (!title) {
    return null;
  }

  if (isArtistMediaItem(item)) {
    return { kind: 'artist', title };
  }

  if (isAlbumMediaItem(item)) {
    return { kind: 'album', title };
  }

  return null;
}

function buildMusicBrainzBrowseSearchUrl(lookup: { kind: 'album'; title: string }) {
  const url = new URL(MUSICBRAINZ_RELEASE_API_URL);
  const escapedTitle = escapeMusicBrainzBrowseQueryValue(lookup.title);
  const query = `release:"${escapedTitle}" AND status:official`;
  url.searchParams.set('query', query);
  url.searchParams.set('fmt', 'json');
  url.searchParams.set('limit', String(MUSICBRAINZ_BROWSER_LOOKUP_LIMIT));
  return url.toString();
}

function buildMusicBrainzArtistSearchUrl(artistName: string) {
  const url = new URL(MUSICBRAINZ_ARTIST_API_URL);
  url.searchParams.set('query', `artist:"${escapeMusicBrainzBrowseQueryValue(artistName)}"`);
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

function scoreBrowseReleaseCandidate(release: MusicBrainzBrowseRelease) {
  const score =
    typeof release.score === 'string' ? Number.parseInt(release.score, 10) : (release.score ?? 0);
  const releaseGroupType = release['release-group']?.['primary-type']?.toLowerCase() ?? '';
  return score + (release.status === 'Official' ? 20 : 0) + (releaseGroupType === 'album' ? 12 : 0);
}

function buildCoverArtArchiveCandidates(releases: MusicBrainzBrowseRelease[]) {
  const candidateUrls: string[] = [];
  const sortedReleases = [...releases]
    .filter((release) => release.id || release['release-group']?.id)
    .sort((left, right) => scoreBrowseReleaseCandidate(right) - scoreBrowseReleaseCandidate(left));

  for (const release of sortedReleases) {
    if (release['release-group']?.id) {
      candidateUrls.push(
        `${COVER_ART_ARCHIVE_RELEASE_GROUP_URL}/${release['release-group'].id}/front-500`
      );
    }
    if (release.id) {
      candidateUrls.push(`${COVER_ART_ARCHIVE_RELEASE_URL}/${release.id}/front-500`);
    }
  }

  return [...new Set(candidateUrls)]
    .map((candidateUrl) => sanitizeImageUrl(candidateUrl))
    .filter((url): url is string => Boolean(url));
}

async function resolveReleaseArtwork(lookup: { kind: 'album'; title: string }) {
  const response = await fetch(buildMusicBrainzBrowseSearchUrl(lookup), {
    headers: { Accept: 'application/json' },
    cache: 'force-cache',
  });
  if (!response.ok) {
    return EMPTY_OPEN_MEDIA_ARTWORK_RESULT;
  }

  const payload = (await response.json()) as MusicBrainzBrowseReleaseResponse;
  const sortedReleases = [...(payload.releases ?? [])].sort(
    (left, right) => scoreBrowseReleaseCandidate(right) - scoreBrowseReleaseCandidate(left)
  );

  return {
    artworkUrls: buildCoverArtArchiveCandidates(sortedReleases),
    albumTitle: sortedReleases[0]?.title,
  };
}

function extractWikidataEntityId(resourceUrl: string | undefined) {
  if (!resourceUrl) {
    return null;
  }

  try {
    const url = new URL(resourceUrl);
    if (!url.hostname.endsWith('wikidata.org')) {
      return null;
    }

    const entityId = url.pathname.split('/').find((part) => /^Q\d+$/i.test(part));
    return entityId ?? null;
  } catch {
    return null;
  }
}

function buildCommonsImageUrl(fileName: string) {
  const url = `${COMMONS_FILE_REDIRECT_URL}/${encodeURIComponent(fileName)}?width=500`;
  return sanitizeImageUrl(url);
}

async function resolveWikidataImageUrl(entityId: string) {
  const response = await fetch(
    `https://www.wikidata.org/wiki/Special:EntityData/${entityId}.json`,
    {
      headers: { Accept: 'application/json' },
      cache: 'force-cache',
    }
  );
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as WikidataEntityDataResponse;
  const fileName =
    payload.entities?.[entityId]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value ?? null;
  return typeof fileName === 'string' ? buildCommonsImageUrl(fileName) : null;
}

async function resolveArtistPhotoCandidates(artistName: string) {
  const searchResponse = await fetch(buildMusicBrainzArtistSearchUrl(artistName), {
    headers: { Accept: 'application/json' },
    cache: 'force-cache',
  });
  if (!searchResponse.ok) {
    return [];
  }

  const searchPayload = (await searchResponse.json()) as MusicBrainzBrowseArtistSearchResponse;
  const rankedArtists = [...(searchPayload.artists ?? [])]
    .filter((artist) => artist.id)
    .sort((left, right) => {
      const leftScore =
        typeof left.score === 'string' ? Number.parseInt(left.score, 10) : (left.score ?? 0);
      const rightScore =
        typeof right.score === 'string' ? Number.parseInt(right.score, 10) : (right.score ?? 0);
      return rightScore - leftScore;
    });

  for (const artist of rankedArtists) {
    if (!artist.id) continue;

    const lookupResponse = await fetch(buildMusicBrainzArtistLookupUrl(artist.id), {
      headers: { Accept: 'application/json' },
      cache: 'force-cache',
    });
    if (!lookupResponse.ok) {
      continue;
    }

    const lookupPayload = (await lookupResponse.json()) as MusicBrainzBrowseArtistLookupResponse;
    const wikidataEntityId = lookupPayload.relations
      ?.filter((relation) => relation.type === 'wikidata')
      .map((relation) => extractWikidataEntityId(relation.url?.resource))
      .find((entityId): entityId is string => Boolean(entityId));
    if (!wikidataEntityId) {
      continue;
    }

    const imageUrl = await resolveWikidataImageUrl(wikidataEntityId);
    if (imageUrl) {
      return [imageUrl];
    }
  }

  return [];
}

function useOpenMediaBrowserArtwork(item: PlatformMediaItem) {
  const lookup = useMemo(() => getOpenArtworkLookup(item), [item]);
  const [artworkResult, setArtworkResult] = useState<OpenMediaArtworkResult>(
    EMPTY_OPEN_MEDIA_ARTWORK_RESULT
  );

  useEffect(() => {
    let cancelled = false;

    if (!lookup) {
      setArtworkResult(EMPTY_OPEN_MEDIA_ARTWORK_RESULT);
      return () => {
        cancelled = true;
      };
    }

    const cacheKey = `${lookup.kind}:${lookup.title.toLowerCase()}`;
    const cachedArtworkResult = openMediaArtworkCache.get(cacheKey);
    if (cachedArtworkResult) {
      setArtworkResult(cachedArtworkResult);
      return () => {
        cancelled = true;
      };
    }

    const artworkPromise: Promise<OpenMediaArtworkResult> =
      lookup.kind === 'artist'
        ? resolveArtistPhotoCandidates(lookup.title).then((artworkUrls) => ({ artworkUrls }))
        : resolveReleaseArtwork({ kind: lookup.kind, title: lookup.title });

    void artworkPromise
      .then((nextArtworkResult) => {
        openMediaArtworkCache.set(cacheKey, nextArtworkResult);
        if (!cancelled) {
          setArtworkResult(nextArtworkResult);
        }
      })
      .catch(() => {
        openMediaArtworkCache.set(cacheKey, EMPTY_OPEN_MEDIA_ARTWORK_RESULT);
        if (!cancelled) {
          setArtworkResult(EMPTY_OPEN_MEDIA_ARTWORK_RESULT);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [lookup]);

  return artworkResult;
}

function buildSpotifyOEmbedUrl(trackId: string) {
  const url = new URL(SPOTIFY_OEMBED_URL);
  url.searchParams.set('url', buildSpotifyTrackUrl(trackId));
  return url.toString();
}

function buildSpotifyMetadataEndpointUrl(trackId: string) {
  return resolveAddonLocalEndpointUrl(`${SPOTIFY_METADATA_ENDPOINT}/track/${trackId}`);
}

async function fetchSpotifyMetadataEndpoint(trackId: string) {
  const response = await fetch(buildSpotifyMetadataEndpointUrl(trackId), {
    headers: { Accept: 'application/json' },
    cache: 'force-cache',
  });
  if (!response.ok) {
    return EMPTY_SPOTIFY_TRACK_METADATA;
  }

  const payload = (await response.json()) as Partial<SpotifyTrackMetadata>;
  return {
    title: typeof payload.title === 'string' ? payload.title : undefined,
    artistName: typeof payload.artistName === 'string' ? payload.artistName : undefined,
    albumTitle: typeof payload.albumTitle === 'string' ? payload.albumTitle : undefined,
    artworkUrls: Array.isArray(payload.artworkUrls)
      ? payload.artworkUrls.filter((url): url is string => typeof url === 'string')
      : [],
  };
}

async function fetchSpotifyOEmbedMetadata(trackId: string) {
  const response = await fetch(buildSpotifyOEmbedUrl(trackId), {
    headers: { Accept: 'application/json' },
    cache: 'force-cache',
  });
  if (!response.ok) {
    return EMPTY_SPOTIFY_TRACK_METADATA;
  }

  const payload = (await response.json()) as {
    title?: unknown;
    thumbnail_url?: unknown;
  };
  const artworkUrl =
    typeof payload.thumbnail_url === 'string' ? sanitizeImageUrl(payload.thumbnail_url) : null;

  return {
    title: typeof payload.title === 'string' ? payload.title : undefined,
    artworkUrls: artworkUrl ? [artworkUrl] : [],
  };
}

async function resolveSpotifyTrackMetadata(trackId: string) {
  const endpointMetadata = await fetchSpotifyMetadataEndpoint(trackId).catch(
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

  return await fetchSpotifyOEmbedMetadata(trackId).catch(() => EMPTY_SPOTIFY_TRACK_METADATA);
}

function useSpotifyTrackMetadata(item: PlatformMediaItem) {
  const trackId = useMemo(() => getSpotifyTrackId(item), [item]);
  const [metadata, setMetadata] = useState<SpotifyTrackMetadata>(EMPTY_SPOTIFY_TRACK_METADATA);

  useEffect(() => {
    let cancelled = false;

    if (!trackId) {
      setMetadata(EMPTY_SPOTIFY_TRACK_METADATA);
      return () => {
        cancelled = true;
      };
    }

    const cachedMetadata = spotifyTrackMetadataCache.get(trackId);
    if (cachedMetadata) {
      setMetadata(cachedMetadata);
      return () => {
        cancelled = true;
      };
    }

    void resolveSpotifyTrackMetadata(trackId)
      .then((nextMetadata) => {
        spotifyTrackMetadataCache.set(trackId, nextMetadata);
        if (!cancelled) {
          setMetadata(nextMetadata);
        }
      })
      .catch(() => {
        spotifyTrackMetadataCache.set(trackId, EMPTY_SPOTIFY_TRACK_METADATA);
        if (!cancelled) {
          setMetadata(EMPTY_SPOTIFY_TRACK_METADATA);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [trackId]);

  return metadata;
}

interface MediaBrowserTileProps {
  compact?: boolean;
  item: PlatformMediaItem;
  mediaTileClassName: string;
  mediaTileArtworkClassName: string;
  onSelect: (item: PlatformMediaItem) => void;
  providerId?: IntegrationProviderId;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  theme: ReturnType<typeof useTheme>['theme'];
}

function MediaBrowserTile({
  compact = false,
  item,
  mediaTileClassName,
  mediaTileArtworkClassName,
  onSelect,
  providerId,
  surface,
  theme,
}: MediaBrowserTileProps) {
  const isDirectory = item.canExpand && !item.canPlay;
  const isArtist = isArtistMediaItem(item);
  const ItemIcon = isArtist ? UserRound : isDirectory ? Folder : ListMusic;
  const itemInitials = getMediaItemInitials(item);
  const providerThumbnailUrl = resolveMediaBrowserThumbnailUrl(item, providerId);
  const openArtwork = useOpenMediaBrowserArtwork(item);
  const spotifyMetadata = useSpotifyTrackMetadata(item);
  const itemTitle = spotifyMetadata.title ?? item.title ?? item.mediaContentId;
  const itemSubtitle =
    getMediaBrowserItemSubtitle(item, openArtwork) ??
    spotifyMetadata.artistName ??
    getMediaBrowserItemAlbum(item, openArtwork) ??
    spotifyMetadata.albumTitle;
  const [failedArtworkUrls, setFailedArtworkUrls] = useState<Set<string>>(() => new Set());
  const artworkUrl =
    [providerThumbnailUrl, ...spotifyMetadata.artworkUrls, ...openArtwork.artworkUrls].find(
      (candidateUrl): candidateUrl is string =>
        typeof candidateUrl === 'string' && !failedArtworkUrls.has(candidateUrl)
    ) ?? null;

  useEffect(() => {
    setFailedArtworkUrls(new Set());
  }, [
    item.mediaContentId,
    item.title,
    providerThumbnailUrl,
    spotifyMetadata.artworkUrls,
    openArtwork.artworkUrls,
  ]);

  return (
    <button type="button" className={mediaTileClassName} onClick={() => onSelect(item)}>
      <span className={mediaTileArtworkClassName}>
        {artworkUrl ? (
          <img
            src={artworkUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
            onError={() =>
              setFailedArtworkUrls((current) => {
                const next = new Set(current);
                next.add(artworkUrl);
                return next;
              })
            }
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center">
            {isArtist ? (
              <span
                className={`absolute inset-0 flex items-center justify-center ${
                  theme === 'glass'
                    ? 'bg-[radial-gradient(circle_at_35%_28%,rgba(29,185,84,0.22),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.13),rgba(255,255,255,0.035))]'
                    : theme === 'light'
                      ? 'bg-slate-100'
                      : theme === 'black'
                        ? 'bg-black'
                        : 'bg-zinc-900'
                }`}
              >
                <span
                  className={`flex h-[58%] w-[58%] items-center justify-center rounded-full border text-2xl font-semibold shadow-inner ${
                    theme === 'light'
                      ? 'border-white/80 bg-white/72 text-slate-700'
                      : theme === 'glass'
                        ? 'border-white/16 bg-black/22 text-white/86'
                        : 'border-zinc-700 bg-zinc-900 text-zinc-100'
                  }`}
                >
                  {itemInitials || <UserRound className="h-9 w-9" />}
                </span>
              </span>
            ) : (
              <ItemIcon className={`h-10 w-10 ${surface.textSecondary}`} />
            )}
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/42 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <span
          className={`absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border ${
            theme === 'light'
              ? 'border-white/70 bg-white/78 text-slate-600'
              : theme === 'glass'
                ? 'border-white/16 bg-black/32 text-white/82 backdrop-blur-md'
                : 'border-zinc-700 bg-zinc-950 text-zinc-200'
          }`}
        >
          {item.canPlay ? (
            <Play className="h-3 w-3 fill-current" />
          ) : (
            <ItemIcon className="h-3 w-3" />
          )}
        </span>
      </span>
      <span
        className={`${compact ? 'mt-1.5 block truncate' : 'mt-2 overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]'} text-sm font-semibold leading-tight ${surface.textPrimary}`}
      >
        {itemTitle}
      </span>
      {itemSubtitle ? (
        <span className={`mt-0.5 block truncate text-xs ${surface.textSecondary}`}>
          {itemSubtitle}
        </span>
      ) : null}
    </button>
  );
}

interface MediaBrowserTableRowProps {
  index: number;
  item: PlatformMediaItem;
  onSelect: (item: PlatformMediaItem) => void;
  providerId?: IntegrationProviderId;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  theme: ReturnType<typeof useTheme>['theme'];
}

function MediaBrowserTableRow({
  index,
  item,
  onSelect,
  providerId,
  surface,
  theme,
}: MediaBrowserTableRowProps) {
  const providerThumbnailUrl = resolveMediaBrowserThumbnailUrl(item, providerId);
  const openArtwork = useOpenMediaBrowserArtwork(item);
  const spotifyMetadata = useSpotifyTrackMetadata(item);
  const itemTitle = spotifyMetadata.title ?? item.title ?? item.mediaContentId;
  const itemSubtitle = getMediaBrowserItemSubtitle(item, openArtwork) ?? spotifyMetadata.artistName;
  const itemAlbum = getMediaBrowserItemAlbum(item, openArtwork) || spotifyMetadata.albumTitle || '';
  const [failedArtworkUrls, setFailedArtworkUrls] = useState<Set<string>>(() => new Set());
  const artworkUrl =
    [providerThumbnailUrl, ...spotifyMetadata.artworkUrls, ...openArtwork.artworkUrls].find(
      (candidateUrl): candidateUrl is string =>
        typeof candidateUrl === 'string' && !failedArtworkUrls.has(candidateUrl)
    ) ?? null;

  useEffect(() => {
    setFailedArtworkUrls(new Set());
  }, [
    item.mediaContentId,
    item.title,
    providerThumbnailUrl,
    spotifyMetadata.artworkUrls,
    openArtwork.artworkUrls,
  ]);

  return (
    <button
      type="button"
      className={`grid h-16 w-full grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-2 px-3 text-left text-sm transition-colors md:grid-cols-[2rem_minmax(0,1fr)_minmax(9rem,0.65fr)_4rem] md:gap-3 md:px-4 ${
        index % 2 === 0 ? surface.subtleBg : ''
      } ${
        theme === 'light'
          ? 'hover:bg-white/78 focus-visible:bg-white/78'
          : 'hover:bg-white/[0.075] focus-visible:bg-white/[0.075]'
      } focus:outline-none focus-visible:ring-2 ${
        theme === 'light' ? 'focus-visible:ring-slate-400' : 'focus-visible:ring-white/35'
      }`}
      onClick={() => onSelect(item)}
    >
      <span className={`text-right text-sm tabular-nums ${surface.textSecondary}`}>
        {index + 1}
      </span>
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-md border ${surface.border} ${
            theme === 'light' ? 'bg-slate-100' : 'bg-white/[0.06]'
          }`}
        >
          {artworkUrl ? (
            <img
              src={artworkUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              onError={() =>
                setFailedArtworkUrls((current) => {
                  const next = new Set(current);
                  next.add(artworkUrl);
                  return next;
                })
              }
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center">
              <ListMusic className={`h-4 w-4 ${surface.textMuted}`} />
            </span>
          )}
        </span>
        <span className="min-w-0">
          <span className={`block truncate text-sm font-medium ${surface.textPrimary}`}>
            {itemTitle}
          </span>
          {itemSubtitle ? (
            <span className={`block truncate text-xs ${surface.textSecondary}`}>
              {itemSubtitle}
            </span>
          ) : null}
        </span>
      </span>
      <span className={`hidden min-w-0 truncate text-sm md:block ${surface.textSecondary}`}>
        {itemAlbum}
      </span>
      <span className={`hidden text-right text-sm tabular-nums md:block ${surface.textSecondary}`}>
        {''}
      </span>
    </button>
  );
}

interface MediaBrowserVirtualTableProps {
  height: number;
  items: PlatformMediaItem[];
  onSelect: (item: PlatformMediaItem) => void;
  providerId?: IntegrationProviderId;
  resetKey: string;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  theme: ReturnType<typeof useTheme>['theme'];
}

function MediaBrowserVirtualTable({
  height,
  items,
  onSelect,
  providerId,
  resetKey,
  surface,
  theme,
}: MediaBrowserVirtualTableProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setScrollTop(0);
    listRef.current?.scrollTo?.({ top: 0 });
  }, [resetKey]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const visibleCount = Math.max(
    1,
    Math.floor((height - MEDIA_BROWSER_TABLE_HEADER_HEIGHT - 2) / MEDIA_BROWSER_TABLE_ROW_HEIGHT)
  );
  const listHeight = visibleCount * MEDIA_BROWSER_TABLE_ROW_HEIGHT;
  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / MEDIA_BROWSER_TABLE_ROW_HEIGHT) - MEDIA_BROWSER_TABLE_OVERSCAN
  );
  const endIndex = Math.min(
    items.length,
    startIndex + visibleCount + MEDIA_BROWSER_TABLE_OVERSCAN * 2
  );
  const virtualItems = items.slice(startIndex, endIndex);
  const topOffset = startIndex * MEDIA_BROWSER_TABLE_ROW_HEIGHT;
  const totalHeight = items.length * MEDIA_BROWSER_TABLE_ROW_HEIGHT;

  return (
    <div
      data-testid="media-browser-virtual-table-shell"
      className={`min-h-0 overflow-hidden rounded-[22px] border ${surface.border} ${
        theme === 'glass'
          ? surface.panelMuted
          : theme === 'light'
            ? 'bg-white'
            : theme === 'black'
              ? 'bg-black'
              : 'bg-zinc-950'
      }`}
      style={{ height: `${height}px` }}
    >
      <div className="min-w-0">
        <div className="min-w-0">
          <div
            className={`grid h-[42px] grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-2 px-3 text-xs font-medium md:grid-cols-[2rem_minmax(0,1fr)_minmax(9rem,0.65fr)_4rem] md:gap-3 md:px-4 ${surface.textMuted}`}
          >
            <span className="text-right">#</span>
            <span>Title</span>
            <span className="hidden md:block">Album</span>
            <span className="hidden justify-self-end md:block">
              <Clock3 className="h-3.5 w-3.5" />
            </span>
          </div>
          <div
            ref={listRef}
            data-testid="media-browser-virtual-table"
            className="overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ height: `${listHeight}px` }}
            onScroll={(event) => {
              const next = event.currentTarget.scrollTop;
              if (rafRef.current !== null) {
                return;
              }

              rafRef.current = window.requestAnimationFrame(() => {
                rafRef.current = null;
                setScrollTop(next);
              });
            }}
          >
            <div className="relative" style={{ height: totalHeight }}>
              <div
                className="absolute inset-x-0 top-0"
                style={{ transform: `translateY(${topOffset}px)` }}
              >
                {virtualItems.map((item, virtualIndex) => (
                  <MediaBrowserTableRow
                    key={`${startIndex + virtualIndex}:${getMediaItemKey(item)}`}
                    index={startIndex + virtualIndex}
                    item={item}
                    onSelect={onSelect}
                    providerId={providerId}
                    surface={surface}
                    theme={theme}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MediaDashboard({
  devices,
  initialDeviceId,
  onPromotedEntitiesChange,
}: MediaDashboardProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const runAction = useServiceActionHandler();
  const registryAnchorEntityId =
    devices.find((device) => device.deviceClass?.toLowerCase() === 'speaker')?.id ??
    devices.find((device) => getProviderNativeId(device.id).startsWith('media_player.'))?.id ??
    '';
  const mediaEntityRegistry = useProviderMediaEntityRegistry(registryAnchorEntityId);
  const liveMediaPlayerEntities = useProviderMediaPlayerEntities(registryAnchorEntityId, true);
  const resolvedDevices = useMemo(
    () =>
      devices.map((device) => {
        const liveEntity = liveMediaPlayerEntities?.[getProviderNativeId(device.id)];
        if (!liveEntity) return device;
        const attributes = liveEntity.attributes;
        const liveGroupMembers = Array.isArray(attributes.group_members)
          ? attributes.group_members.filter(
              (member): member is string => typeof member === 'string' && member.length > 0
            )
          : device.groupMembers;
        return {
          ...device,
          state: normalizeMediaPlaybackState(liveEntity.state, device.deviceClass),
          title: readLiveStringAttribute(attributes, 'media_title') ?? device.title,
          artist: readLiveStringAttribute(attributes, 'media_artist') ?? device.artist,
          album: readLiveStringAttribute(attributes, 'media_album_name') ?? device.album,
          source: readLiveStringAttribute(attributes, 'source') ?? device.source,
          entityPicture:
            readLiveStringAttribute(attributes, 'entity_picture') ?? device.entityPicture,
          durationSeconds:
            typeof attributes.media_duration === 'number'
              ? attributes.media_duration
              : device.durationSeconds,
          mediaContentId:
            readLiveStringAttribute(attributes, 'media_content_id') ?? device.mediaContentId,
          mediaContentType:
            readLiveStringAttribute(attributes, 'media_content_type') ?? device.mediaContentType,
          groupMembers: liveGroupMembers,
        } satisfies MediaDashboardDevice;
      }),
    [devices, liveMediaPlayerEntities]
  );
  const mediaPlatformByEntityId = useMemo(
    () => new Map(mediaEntityRegistry.map((entry) => [entry.entityId, entry.platform] as const)),
    [mediaEntityRegistry]
  );
  const getMediaPlatform = useCallback(
    (device: MediaDashboardDevice) => mediaPlatformByEntityId.get(getProviderNativeId(device.id)),
    [mediaPlatformByEntityId]
  );
  const isMusicAssistantPlaybackDevice = useCallback(
    (device: MediaDashboardDevice) => isMusicAssistantDevice(device, getMediaPlatform(device)),
    [getMediaPlatform]
  );
  const isSingleRowMediaLayout = useMediaQuery('(max-width: 899px)');
  const isVeryNarrowMediaDesktopLayout = useMediaQuery('(max-width: 999px)');
  const isNarrowMediaDesktopLayout = useMediaQuery('(max-width: 1099px)');
  const isMediumNarrowMediaDesktopLayout = useMediaQuery('(max-width: 1279px)');
  const isCompactDesktopMediaLayout = useMediaQuery('(max-width: 1399px)');
  const isMediumDesktopMediaLayout = useMediaQuery('(max-width: 1659px)');
  const [rememberedSession, setRememberedSession] =
    usePersistedState<RememberedMediaSession | null>(
      STORAGE_KEYS.mediaNowPlayingSession,
      EMPTY_REMEMBERED_MEDIA_SESSION
    );
  const usableRememberedSession = isRememberedSessionUsable(rememberedSession, resolvedDevices)
    ? rememberedSession
    : null;
  const rememberedCurrentDevice = usableRememberedSession
    ? resolvedDevices.find((device) => device.id === usableRememberedSession.device.id)
    : undefined;
  const initialDevice = resolvedDevices.find((device) => device.id === initialDeviceId);
  const spotifyAccountDevice = resolvedDevices.find(
    (device) => isAudioDevice(device) && isSpotifyAccountDevice(device)
  );
  const availableAudioOutputTargets = resolvedDevices.filter(
    (device) => isAudioDevice(device) && !isSpotifyAccountDevice(device)
  );
  const browsablePlaybackDevices = resolvedDevices.filter((device) => {
    if (!isAudioDevice(device)) return false;
    const capabilities = getDeviceCapabilities(device);
    const isMusicAssistant = isMusicAssistantPlaybackDevice(device);
    return (
      (capabilities.canBrowseMedia || isMusicAssistant) &&
      (!spotifyAccountDevice || isMusicAssistant)
    );
  });
  const resolveDeclaredPhysicalGroup = (device: MediaDashboardDevice) => {
    const physicalKeys = new Set([getPhysicalSpeakerKey(device)]);
    const entityIds = new Set([device.id]);
    for (const memberId of device.groupMembers ?? []) {
      const nativeMemberId = getProviderNativeId(memberId);
      const memberDevice = resolvedDevices.find(
        (candidate) => getProviderNativeId(candidate.id) === nativeMemberId
      );
      physicalKeys.add(
        memberDevice ? getPhysicalSpeakerKey(memberDevice) : `entity:${nativeMemberId}`
      );
      if (memberDevice) entityIds.add(memberDevice.id);
    }
    return { entityIds, physicalKeys };
  };
  const activePlaybackClusters = Object.values(
    resolvedDevices.reduce<Record<string, MediaDashboardDevice[]>>((clusters, device) => {
      if (
        !isAudioDevice(device) ||
        !['playing', 'paused'].includes(device.state) ||
        !hasCurrentMedia(device)
      ) {
        return clusters;
      }
      const key = `${device.title.trim().toLowerCase()}::${device.artist.trim().toLowerCase()}`;
      if (!key.replaceAll(':', '')) return clusters;
      const cluster = clusters[key] ?? [];
      cluster.push(device);
      clusters[key] = cluster;
      return clusters;
    }, {})
  );
  const inferredMusicAssistantGroup = activePlaybackClusters.find((cluster) => {
    const roomCount = new Set(cluster.map(getPhysicalSpeakerKey)).size;
    const hasDeclaredGroup = cluster.some((device) => (device.groupMembers?.length ?? 0) > 1);
    const playingRoomCount = new Set(
      cluster.filter((device) => device.state === 'playing').map(getPhysicalSpeakerKey)
    ).size;
    return (
      roomCount > 1 &&
      cluster.length >= roomCount &&
      hasDeclaredGroup &&
      cluster.some(isMusicAssistantPlaybackDevice) &&
      playingRoomCount > 1
    );
  });
  const inferredMusicAssistantDevice =
    inferredMusicAssistantGroup?.find(isMusicAssistantPlaybackDevice) ??
    inferredMusicAssistantGroup?.find((device) => getDeviceCapabilities(device).canBrowseMedia) ??
    inferredMusicAssistantGroup?.[0];
  const activeDeclaredGroupedPlaybackDevice = resolvedDevices.find(
    (device) =>
      device.state === 'playing' &&
      isAudioDevice(device) &&
      !isMusicAssistantPlaybackDevice(device) &&
      hasCurrentMedia(device) &&
      resolveDeclaredPhysicalGroup(device).physicalKeys.size > 1
  );
  const retainedDeclaredGroupedPlaybackDevice = resolvedDevices.find(
    (device) =>
      (device.state === 'paused' || device.state === 'idle') &&
      isAudioDevice(device) &&
      !isMusicAssistantPlaybackDevice(device) &&
      hasCurrentMedia(device) &&
      resolveDeclaredPhysicalGroup(device).physicalKeys.size > 1
  );
  const declaredGroupedPlaybackDevice =
    activeDeclaredGroupedPlaybackDevice ?? retainedDeclaredGroupedPlaybackDevice;
  const activeBrowsableDevice =
    browsablePlaybackDevices.find(
      (device) =>
        device.state === 'playing' &&
        isMusicAssistantPlaybackDevice(device) &&
        hasCurrentMedia(device)
    ) ??
    browsablePlaybackDevices.find(
      (device) => device.state === 'playing' && isMusicAssistantPlaybackDevice(device)
    ) ??
    browsablePlaybackDevices.find(
      (device) => device.state === 'playing' && hasCurrentMedia(device)
    ) ??
    browsablePlaybackDevices.find((device) => device.state === 'playing') ??
    browsablePlaybackDevices.find(
      (device) =>
        device.state === 'paused' &&
        isMusicAssistantPlaybackDevice(device) &&
        hasCurrentMedia(device)
    ) ??
    browsablePlaybackDevices.find((device) => device.state === 'paused');
  const defaultDevice =
    declaredGroupedPlaybackDevice ??
    inferredMusicAssistantDevice ??
    activeBrowsableDevice ??
    (initialDevice && isSpotifyAccountDevice(initialDevice) ? initialDevice : undefined) ??
    spotifyAccountDevice ??
    initialDevice ??
    resolvedDevices.find((device) => device.state === 'playing' && isAudioDevice(device)) ??
    resolvedDevices.find((device) => device.state === 'paused' && isAudioDevice(device)) ??
    resolvedDevices.find(isAudioDevice) ??
    resolvedDevices[0];
  const selectedDeviceId = defaultDevice?.id ?? '';
  const [browseResult, setBrowseResult] = useState<PlatformMediaBrowseResult | null>(null);
  const [browseHistory, setBrowseHistory] = useState<PlatformMediaItem[]>([]);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [defaultBrowseViews, setDefaultBrowseViews] = usePersistedState<
    Record<string, MediaDefaultBrowseView>
  >(STORAGE_KEYS.mediaDefaultViews, EMPTY_MEDIA_DEFAULT_BROWSE_VIEWS);
  const [expandedBrowserViews, setExpandedBrowserViews] = usePersistedState<
    Record<string, boolean>
  >(STORAGE_KEYS.mediaBrowserExpandedViews, EMPTY_MEDIA_BROWSER_EXPANDED_VIEWS);
  const defaultBrowseViewsRef = useRef(defaultBrowseViews);
  defaultBrowseViewsRef.current = defaultBrowseViews;
  const [directoryItemCounts, setDirectoryItemCounts] = useState<Record<string, number>>({});
  const directoryItemCountsRef = useRef<Record<string, number>>({});
  const directoryCountRequestsRef = useRef(new Set<string>());
  const selectedDevice =
    resolvedDevices.find((device) => device.id === selectedDeviceId) ?? defaultDevice;
  const spotifyAccountControlsUnavailable =
    selectedDevice !== undefined && isSpotifyAccountDevice(selectedDevice);
  const activeSpotifyConnectTarget = findActiveSpotifyConnectTarget(
    selectedDevice,
    availableAudioOutputTargets
  );
  const fallbackAudioOutputTarget = availableAudioOutputTargets.find((device) => {
    const outputCapabilities = getDeviceCapabilities(device);
    return outputCapabilities.canBrowseMedia || outputCapabilities.canPlayMedia;
  });
  const rememberedSpotifyTarget = availableAudioOutputTargets.find(
    (device) =>
      device.id === usableRememberedSession?.transportEntityId ||
      device.id === usableRememberedSession?.device.id
  );
  const selectedSpotifyTarget =
    activeSpotifyConnectTarget ?? rememberedSpotifyTarget ?? fallbackAudioOutputTarget;
  const activeBrowsableNowPlayingDevice =
    browsablePlaybackDevices.find(
      (device) =>
        device.state === 'playing' &&
        isMusicAssistantPlaybackDevice(device) &&
        hasCurrentMedia(device)
    ) ??
    browsablePlaybackDevices.find(
      (device) => device.state === 'playing' && hasCurrentMedia(device)
    );
  const activeNowPlayingDevice = resolvedDevices.find(
    (device) =>
      device.state === 'playing' &&
      isAudioDevice(device) &&
      !isSpotifyAccountDevice(device) &&
      hasCurrentMedia(device)
  );
  const retainedNowPlayingDevice = resolvedDevices
    .filter(
      (device) =>
        (device.state === 'paused' || device.state === 'idle') &&
        isAudioDevice(device) &&
        !isSpotifyAccountDevice(device) &&
        hasCurrentMedia(device)
    )
    .sort(compareMediaActivity)[0];
  const liveNowPlayingDevice =
    activeDeclaredGroupedPlaybackDevice ??
    inferredMusicAssistantDevice ??
    activeBrowsableNowPlayingDevice ??
    activeNowPlayingDevice ??
    retainedDeclaredGroupedPlaybackDevice ??
    retainedNowPlayingDevice;
  const rememberedNowPlayingDevice =
    !liveNowPlayingDevice &&
    usableRememberedSession &&
    rememberedCurrentDevice?.state === 'idle' &&
    !hasCurrentMedia(rememberedCurrentDevice)
      ? restoreRememberedDevice(usableRememberedSession, rememberedCurrentDevice)
      : undefined;
  const usingRememberedSession = rememberedNowPlayingDevice !== undefined;
  const nowPlayingDevice = liveNowPlayingDevice ?? rememberedNowPlayingDevice ?? selectedDevice;
  const matchingPhysicalTransportDevice = isMusicAssistantPlaybackDevice(nowPlayingDevice)
    ? resolvedDevices
        .filter(
          (device) =>
            device.id !== nowPlayingDevice.id &&
            isAudioDevice(device) &&
            !isSpotifyAccountDevice(device) &&
            !isMusicAssistantPlaybackDevice(device) &&
            getPhysicalSpeakerKey(device) === getPhysicalSpeakerKey(nowPlayingDevice) &&
            isSameMediaSession(device, nowPlayingDevice)
        )
        .sort((left, right) => {
          const playbackRank = (device: MediaDashboardDevice) =>
            device.state === 'playing' ? 2 : device.state === 'paused' ? 1 : 0;
          return playbackRank(right) - playbackRank(left) || compareMediaActivity(left, right);
        })[0]
    : undefined;
  const rememberedTransportDevice = usableRememberedSession?.transportEntityId
    ? resolvedDevices.find((device) => device.id === usableRememberedSession.transportEntityId)
    : undefined;
  const nowPlayingTransportDevice =
    matchingPhysicalTransportDevice ??
    (usingRememberedSession ? rememberedTransportDevice : undefined) ??
    nowPlayingDevice;
  const selectedDeviceUsesInferredMusicAssistantGroup = Boolean(
    inferredMusicAssistantGroup?.some((device) => device.id === nowPlayingDevice.id)
  );
  const rememberedMediaLibraryDevice = usableRememberedSession?.mediaLibraryEntityId
    ? resolvedDevices.find((device) => device.id === usableRememberedSession.mediaLibraryEntityId)
    : undefined;
  const mediaLibraryDevice = usingRememberedSession
    ? (rememberedMediaLibraryDevice ?? rememberedCurrentDevice ?? selectedDevice)
    : spotifyAccountControlsUnavailable
      ? (selectedSpotifyTarget ?? selectedDevice)
      : selectedDevice;
  const mediaLibraryEntityId = mediaLibraryDevice?.id;
  const defaultBrowseView = mediaLibraryEntityId
    ? defaultBrowseViews[mediaLibraryEntityId]
    : undefined;
  const mediaLibraryCapabilities = mediaLibraryDevice
    ? getDeviceCapabilities(mediaLibraryDevice)
    : EMPTY_NAVET_MEDIA_CAPABILITIES;
  const providerSupportsMediaBrowse = useEntityProviderFeature(mediaLibraryEntityId, 'mediaBrowse');
  const canBrowseMedia = mediaLibraryCapabilities.canBrowseMedia || providerSupportsMediaBrowse;
  const dashboardTitleKey = 'media.dashboard.nowPlaying';
  const playbackProviderLabel = selectedDeviceUsesInferredMusicAssistantGroup
    ? 'Music Assistant'
    : usingRememberedSession
      ? usableRememberedSession?.playbackProviderLabel
      : getPlaybackProviderLabel(nowPlayingDevice, getMediaPlatform(nowPlayingDevice));
  const continuingRememberedDevice =
    rememberedSession && isSameMediaSession(rememberedSession.device, nowPlayingDevice)
      ? rememberedSession.device
      : undefined;
  const nextRememberedPlaybackState =
    nowPlayingDevice.state === 'idle' ? ('paused' as const) : nowPlayingDevice.state;
  const keepPreviousRememberedPosition = Boolean(
    continuingRememberedDevice &&
      continuingRememberedDevice.state === nextRememberedPlaybackState &&
      Math.abs(
        (nowPlayingDevice.elapsedSeconds ?? 0) - (continuingRememberedDevice.elapsedSeconds ?? 0)
      ) < REMEMBERED_POSITION_WRITE_INTERVAL_SECONDS
  );
  const sessionDeviceToRemember =
    !usingRememberedSession &&
    hasCurrentMedia(nowPlayingDevice) &&
    ['playing', 'paused', 'idle'].includes(nowPlayingDevice.state)
      ? {
          ...continuingRememberedDevice,
          ...nowPlayingDevice,
          artist: nowPlayingDevice.artist.trim() || continuingRememberedDevice?.artist || '',
          album: nowPlayingDevice.album?.trim() || continuingRememberedDevice?.album,
          entityPicture:
            nowPlayingDevice.entityPicture ?? continuingRememberedDevice?.entityPicture,
          durationSeconds:
            nowPlayingDevice.durationSeconds ?? continuingRememberedDevice?.durationSeconds,
          elapsedSeconds: keepPreviousRememberedPosition
            ? continuingRememberedDevice?.elapsedSeconds
            : (nowPlayingDevice.elapsedSeconds ?? continuingRememberedDevice?.elapsedSeconds),
          positionUpdatedAt: keepPreviousRememberedPosition
            ? continuingRememberedDevice?.positionUpdatedAt
            : (nowPlayingDevice.positionUpdatedAt ?? continuingRememberedDevice?.positionUpdatedAt),
          mediaContentId:
            nowPlayingDevice.mediaContentId ?? continuingRememberedDevice?.mediaContentId,
          mediaContentType:
            nowPlayingDevice.mediaContentType ?? continuingRememberedDevice?.mediaContentType,
          state: nextRememberedPlaybackState,
        }
      : null;
  const nextRememberedSessionKey = sessionDeviceToRemember
    ? JSON.stringify({
        device: sessionDeviceToRemember,
        mediaLibraryEntityId,
        transportEntityId: nowPlayingTransportDevice.id,
        playbackProviderLabel,
      })
    : '';
  const currentRememberedSessionKey = rememberedSession
    ? JSON.stringify({
        device: rememberedSession.device,
        mediaLibraryEntityId: rememberedSession.mediaLibraryEntityId,
        transportEntityId: rememberedSession.transportEntityId,
        playbackProviderLabel: rememberedSession.playbackProviderLabel,
      })
    : '';
  useEffect(() => {
    if (!sessionDeviceToRemember || nextRememberedSessionKey === currentRememberedSessionKey) {
      return;
    }

    setRememberedSession({
      version: 2,
      device: sessionDeviceToRemember,
      mediaLibraryEntityId,
      transportEntityId: nowPlayingTransportDevice.id,
      playbackProviderLabel,
      rememberedAt: new Date().toISOString(),
    });
  }, [
    currentRememberedSessionKey,
    mediaLibraryEntityId,
    nextRememberedSessionKey,
    nowPlayingTransportDevice.id,
    playbackProviderLabel,
    sessionDeviceToRemember,
    setRememberedSession,
  ]);
  const unfilteredPlayableItems = (browseResult?.children ?? []).filter(
    (item) => item.mediaContentId || item.canExpand
  );
  const currentBrowseItem = browseHistory.at(-1);
  const currentBrowserViewKey = mediaLibraryEntityId
    ? getMediaBrowserViewKey(mediaLibraryEntityId, currentBrowseItem)
    : '';
  const showAllBrowserItems = Boolean(
    currentBrowserViewKey && expandedBrowserViews[currentBrowserViewKey]
  );
  const isRecentlyPlayedView =
    currentBrowseItem?.mediaContentId?.toLowerCase().includes('recently-played') ||
    currentBrowseItem?.title.toLowerCase() === 'recently played' ||
    browseResult?.title.toLowerCase() === 'recently played';
  const playableItems = isRecentlyPlayedView
    ? deduplicateMediaItems(unfilteredPlayableItems)
    : unfilteredPlayableItems;
  const browseDirectoryItems = playableItems.filter(
    (item) =>
      isMediaDirectoryItem(item) && !(browseHistory.length >= 2 && isArtworkCollectionItem(item))
  );
  const browseTileItems = playableItems.filter((item) => !browseDirectoryItems.includes(item));
  const inferredGroupSize = selectedDeviceUsesInferredMusicAssistantGroup
    ? new Set(inferredMusicAssistantGroup?.map(getPhysicalSpeakerKey) ?? []).size
    : 1;
  const selectedDeviceIsMusicAssistant = isMusicAssistantPlaybackDevice(nowPlayingDevice);
  const selectedDeclaredGroup = resolveDeclaredPhysicalGroup(nowPlayingDevice);
  const selectedGroupSize = selectedDeviceUsesInferredMusicAssistantGroup
    ? inferredGroupSize
    : selectedDeviceIsMusicAssistant
      ? 1
      : selectedDeclaredGroup.physicalKeys.size;
  const selectedDeviceIsGrouped = selectedGroupSize > 1;
  const hasPromotedNowPlayingDevice = liveNowPlayingDevice !== undefined || usingRememberedSession;
  const promotedEntityIdKey = [
    ...(hasPromotedNowPlayingDevice ? [nowPlayingDevice.id, nowPlayingTransportDevice.id] : []),
    ...(selectedDeviceIsGrouped
      ? selectedDeviceUsesInferredMusicAssistantGroup
        ? (inferredMusicAssistantGroup?.map((device) => device.id) ?? [])
        : [...selectedDeclaredGroup.entityIds]
      : []),
  ]
    .filter((entityId, index, entityIds) => entityIds.indexOf(entityId) === index)
    .sort()
    .join('\n');
  useEffect(() => {
    onPromotedEntitiesChange?.(promotedEntityIdKey ? promotedEntityIdKey.split('\n') : []);
  }, [onPromotedEntitiesChange, promotedEntityIdKey]);
  const nowPlayingTypeLabel =
    selectedDeviceIsGrouped || nowPlayingDevice.deviceClass?.toLowerCase() === 'speaker'
      ? t('media.type.speaker').toLowerCase()
      : t('media.type.player').toLowerCase();
  const largeCardFootprint = getDashboardCardFootprint('large', 4);

  const runMediaCommand = useCallback(
    (
      action: () => Promise<unknown>,
      feedbackKey: MediaFeedbackKey = 'media.feedback.updatePlaybackFailed'
    ) => {
      void runAction(async () => {
        await action();
      }, t(feedbackKey));
    },
    [runAction, t]
  );

  const toggleNowPlaying = useCallback(() => {
    const currentDevice = resolvedDevices.find(
      (device) => device.id === nowPlayingTransportDevice.id
    );
    const shouldRecreateSession =
      currentDevice?.state === 'idle' && Boolean(nowPlayingDevice.mediaContentId?.trim());

    if (!shouldRecreateSession) {
      runMediaCommand(() =>
        dispatchEntityCommand({ type: 'play_pause', entityId: nowPlayingTransportDevice.id })
      );
      return;
    }

    runMediaCommand(async () => {
      try {
        await integrationMediaFeatureService.playMedia(nowPlayingTransportDevice.id, {
          mediaContentId: nowPlayingDevice.mediaContentId ?? '',
          mediaContentType:
            nowPlayingDevice.mediaContentType ??
            inferMediaContentType({
              title: nowPlayingDevice.title,
              mediaContentId: nowPlayingDevice.mediaContentId,
            }),
        });

        if (
          (nowPlayingDevice.elapsedSeconds ?? 0) > 0 &&
          getDeviceCapabilities(nowPlayingDevice).canSeek
        ) {
          await integrationMediaFeatureService.seekMediaPlayer(
            nowPlayingTransportDevice.id,
            nowPlayingDevice.elapsedSeconds ?? 0
          );
        }
      } catch {
        // Some players keep an internal queue despite reporting idle. Preserve that provider-native
        // recovery path when replaying the remembered media identifier is unsupported.
        await dispatchEntityCommand({
          type: 'play_pause',
          entityId: nowPlayingTransportDevice.id,
        });
      }
    });
  }, [nowPlayingDevice, nowPlayingTransportDevice.id, resolvedDevices, runMediaCommand]);

  const browseMedia = useCallback(
    (item?: PlatformMediaItem, nextHistory?: PlatformMediaItem[], fallbackToRoot = false) => {
      if (!mediaLibraryEntityId || !canBrowseMedia) return;

      setIsBrowsing(true);
      runMediaCommand(async () => {
        let resolvedHistory = nextHistory;
        try {
          let result: PlatformMediaBrowseResult;
          try {
            result = await integrationMediaFeatureService.browseMediaPlayer(mediaLibraryEntityId, {
              mediaContentId: item?.mediaContentId,
              mediaContentType: item?.mediaContentType,
            });
          } catch (error) {
            if (!fallbackToRoot) throw error;

            result = await integrationMediaFeatureService.browseMediaPlayer(
              mediaLibraryEntityId,
              {}
            );
            setDefaultBrowseViews((current) => {
              const next = { ...current };
              delete next[mediaLibraryEntityId];
              return next;
            });
            resolvedHistory = [];
          }
          setBrowseResult(result);
          if (resolvedHistory) {
            setBrowseHistory(resolvedHistory);
          }
        } finally {
          setIsBrowsing(false);
        }
      }, 'media.feedback.browseMediaFailed');
    },
    [canBrowseMedia, mediaLibraryEntityId, runMediaCommand, setDefaultBrowseViews]
  );

  useEffect(() => {
    setBrowseResult(null);
    setBrowseHistory([]);
    setDirectoryItemCounts({});
    directoryItemCountsRef.current = {};
    directoryCountRequestsRef.current.clear();
    if (!mediaLibraryEntityId || !canBrowseMedia) {
      setIsBrowsing(false);
      return;
    }

    const initialBrowseView = defaultBrowseViewsRef.current[mediaLibraryEntityId];
    if (initialBrowseView) {
      browseMedia(initialBrowseView, [initialBrowseView], true);
      return;
    }

    browseMedia();
  }, [browseMedia, canBrowseMedia, mediaLibraryEntityId, selectedDeviceId]);

  useEffect(() => {
    if (!mediaLibraryEntityId || !browseResult?.children) return;

    const pendingDirectories = browseResult.children.filter((item) => {
      if (!isMediaDirectoryItem(item) || !item.mediaContentId) return false;
      const key = getDirectoryItemCountKey(mediaLibraryEntityId, item);
      return (
        directoryItemCountsRef.current[key] === undefined &&
        !directoryCountRequestsRef.current.has(key)
      );
    });
    if (pendingDirectories.length === 0) return;

    pendingDirectories.forEach((item) => {
      directoryCountRequestsRef.current.add(getDirectoryItemCountKey(mediaLibraryEntityId, item));
    });
    let nextDirectoryIndex = 0;

    const loadNextDirectoryCount = async () => {
      while (nextDirectoryIndex < pendingDirectories.length) {
        const item = pendingDirectories[nextDirectoryIndex];
        nextDirectoryIndex += 1;
        if (!item) continue;

        const key = getDirectoryItemCountKey(mediaLibraryEntityId, item);
        try {
          const result = await integrationMediaFeatureService.browseMediaPlayer(
            mediaLibraryEntityId,
            {
              mediaContentId: item.mediaContentId,
              mediaContentType: item.mediaContentType,
            }
          );
          const count = result.children?.length;
          if (count !== undefined) {
            directoryItemCountsRef.current[key] = count;
            setDirectoryItemCounts((current) =>
              current[key] === count ? current : { ...current, [key]: count }
            );
          }
        } catch {
          // Folder counts are supplementary; browsing remains available if a count cannot load.
        } finally {
          directoryCountRequestsRef.current.delete(key);
        }
      }
    };

    const workerCount = Math.min(DIRECTORY_COUNT_FETCH_CONCURRENCY, pendingDirectories.length);
    void Promise.all(Array.from({ length: workerCount }, () => loadNextDirectoryCount()));
  }, [browseResult, mediaLibraryEntityId]);

  if (!selectedDevice) {
    return null;
  }

  const playMediaItem = (item: PlatformMediaItem) => {
    if (!item.mediaContentId || !mediaLibraryEntityId || !item.canPlay) return;

    runMediaCommand(async () => {
      try {
        await integrationMediaFeatureService.playMedia(mediaLibraryEntityId, {
          mediaContentId: item.mediaContentId ?? '',
          mediaContentType: inferMediaContentType(item),
        });
      } catch (error) {
        if (
          mediaLibraryDevice !== undefined &&
          isSpotifyAccountDevice(mediaLibraryDevice) &&
          isSpotifyMediaItem(item) &&
          isRestrictedSpotifyPlaybackError(error)
        ) {
          throw new Error(t('media.feedback.spotifyRestrictedPlayback'));
        }
        throw error;
      }
    }, 'media.feedback.playMediaFailed');
  };
  const browseMediaDirectory = (item: PlatformMediaItem) => {
    browseMedia(item, [...browseHistory, item]);
  };
  const browseBack = () => {
    const nextHistory = browseHistory.slice(0, -1);
    const previousItem = nextHistory[nextHistory.length - 1];
    browseMedia(previousItem, nextHistory);
  };
  const currentBrowseTitle =
    browseHistory[browseHistory.length - 1]?.title ??
    browseResult?.title ??
    t('media.dashboard.browser');
  const currentBrowseDirectory = browseHistory[browseHistory.length - 1];
  const isCurrentBrowseDefault = Boolean(
    currentBrowseDirectory?.mediaContentId &&
      defaultBrowseView?.mediaContentId === currentBrowseDirectory.mediaContentId &&
      defaultBrowseView?.mediaContentType === currentBrowseDirectory.mediaContentType
  );
  const showDefaultViewAction = Boolean(
    currentBrowseDirectory?.mediaContentId || defaultBrowseView
  );
  const defaultViewActionLabel = currentBrowseDirectory
    ? isCurrentBrowseDefault
      ? t('media.dashboard.defaultView.remove')
      : t('media.dashboard.defaultView.set', { title: currentBrowseTitle })
    : t('media.dashboard.defaultView.useLibrary');
  const toggleDefaultBrowseView = () => {
    if (!mediaLibraryEntityId) return;

    setDefaultBrowseViews((current) => {
      const next = { ...current };
      if (currentBrowseDirectory?.mediaContentId && !isCurrentBrowseDefault) {
        next[mediaLibraryEntityId] = {
          title: currentBrowseDirectory.title,
          mediaClass: currentBrowseDirectory.mediaClass,
          mediaContentId: currentBrowseDirectory.mediaContentId,
          mediaContentType: currentBrowseDirectory.mediaContentType,
          canExpand: true,
          canPlay: false,
        };
      } else {
        delete next[mediaLibraryEntityId];
      }
      return next;
    });
  };
  const toggleBrowserItemsExpanded = () => {
    if (!currentBrowserViewKey) return;

    setExpandedBrowserViews((current) => {
      const next = { ...current };
      if (current[currentBrowserViewKey]) {
        delete next[currentBrowserViewKey];
      } else {
        next[currentBrowserViewKey] = true;
      }
      return next;
    });
  };
  const useCompactFolderGrid = browseHistory.length > 0;
  const compactFolderItemLimit = isSingleRowMediaLayout
    ? BROWSE_COLLAPSED_ITEM_LIMIT
    : isVeryNarrowMediaDesktopLayout
      ? 6
      : isNarrowMediaDesktopLayout
        ? 8
        : isMediumNarrowMediaDesktopLayout
          ? 8
          : isCompactDesktopMediaLayout
            ? 10
            : isMediumDesktopMediaLayout
              ? 12
              : COMPACT_FOLDER_ITEM_LIMIT;
  const compactBrowserHeight = isSingleRowMediaLayout
    ? COMPACT_MOBILE_BROWSER_HEIGHT
    : largeCardFootprint.heightPx;
  const browserTileLimit = useCompactFolderGrid
    ? compactFolderItemLimit
    : BROWSE_COLLAPSED_ITEM_LIMIT;
  const visibleBrowseDirectoryItems = showAllBrowserItems
    ? browseDirectoryItems
    : browseDirectoryItems.slice(0, BROWSE_COLLAPSED_ITEM_LIMIT);
  const visibleBrowseTileItems = showAllBrowserItems
    ? browseTileItems
    : browseTileItems.slice(0, browserTileLimit);
  const hasHiddenBrowserItems =
    browseDirectoryItems.length > visibleBrowseDirectoryItems.length ||
    browseTileItems.length > visibleBrowseTileItems.length ||
    (showAllBrowserItems && playableItems.length > browserTileLimit);
  const handleCardSizeChange = useCallback(() => undefined, []);
  const quietPanelClassName = `rounded-xl border p-4 ${surface.border} ${
    theme === 'light'
      ? 'bg-slate-50'
      : theme === 'glass'
        ? 'bg-black/18'
        : theme === 'black'
          ? 'bg-black'
          : 'bg-zinc-950'
  }`;
  const itemButtonClassName = `rounded-xl border text-left transition-colors ${surface.border} ${
    theme === 'light'
      ? 'bg-white hover:bg-slate-100'
      : theme === 'glass'
        ? 'bg-white/[0.045] hover:bg-white/[0.09]'
        : theme === 'black'
          ? 'bg-black hover:bg-zinc-950'
          : 'bg-zinc-900 hover:bg-zinc-800'
  }`;
  const mediaTileClassName = `group self-start rounded-xl text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
    theme === 'light'
      ? 'focus-visible:ring-slate-400 focus-visible:ring-offset-white'
      : 'focus-visible:ring-white/40 focus-visible:ring-offset-zinc-950'
  }`;
  const mediaTileArtworkClassName = `relative block aspect-square w-full overflow-hidden rounded-xl border shadow-sm ${surface.border} ${
    theme === 'light'
      ? 'bg-linear-to-br from-slate-100 via-white to-slate-200 group-hover:border-slate-300'
      : theme === 'glass'
        ? 'bg-linear-to-br from-white/[0.08] via-white/[0.035] to-black/20 group-hover:border-white/22'
        : theme === 'black'
          ? 'bg-black group-hover:border-zinc-700'
          : 'bg-zinc-900 group-hover:border-zinc-600'
  }`;
  const selectBrowserItem = (item: PlatformMediaItem) => {
    const isDirectory = item.canExpand && !item.canPlay;
    if (isDirectory) {
      browseMediaDirectory(item);
      return;
    }

    playMediaItem(item);
  };

  const nowPlayingPanel = (
    <section className="min-w-0 space-y-3">
      <div
        data-testid="media-now-playing-card"
        className="w-full"
        style={{
          minHeight: `${largeCardFootprint.heightPx}px`,
          height: `${largeCardFootprint.heightPx}px`,
        }}
      >
        <MediaCard
          id={nowPlayingDevice.id}
          name={nowPlayingDevice.name}
          room={nowPlayingDevice.room}
          title={nowPlayingDevice.title}
          artist={nowPlayingDevice.artist}
          album={nowPlayingDevice.album}
          entityType={nowPlayingDevice.entityType}
          deviceClass={nowPlayingDevice.deviceClass}
          source={nowPlayingDevice.source}
          sourceList={nowPlayingDevice.sourceList}
          entityPicture={nowPlayingDevice.entityPicture}
          state={nowPlayingDevice.state}
          volume={nowPlayingDevice.volume}
          isMuted={nowPlayingDevice.isMuted}
          elapsedSeconds={nowPlayingDevice.elapsedSeconds}
          durationSeconds={nowPlayingDevice.durationSeconds}
          positionUpdatedAt={nowPlayingDevice.positionUpdatedAt}
          mediaCapabilities={nowPlayingDevice.mediaCapabilities}
          supportsGrouping={nowPlayingDevice.supportsGrouping}
          supportsPreviousTrack={nowPlayingDevice.supportsPreviousTrack}
          supportsNextTrack={nowPlayingDevice.supportsNextTrack}
          groupMembers={nowPlayingDevice.groupMembers}
          mediaStackAppearance={selectedDeviceIsGrouped}
          mediaStackCount={selectedDeviceIsGrouped ? selectedGroupSize - 1 : undefined}
          size="large"
          onSizeChange={handleCardSizeChange}
          isEditMode={false}
          hideTransportControls={isSpotifyAccountDevice(nowPlayingDevice)}
          onTogglePlayback={toggleNowPlaying}
        />
      </div>
    </section>
  );

  const browserPanel = (
    <section
      data-testid="media-browser-panel"
      className="min-w-0 space-y-4 min-[900px]:col-span-2 min-[1660px]:col-span-3 min-[1920px]:col-span-5"
    >
      {canBrowseMedia ? (
        <div className="flex h-9 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {browseHistory.length > 0 ? (
              <button
                type="button"
                aria-label={t('dashboard.onboarding.back')}
                disabled={isBrowsing}
                onClick={browseBack}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${surface.border} ${
                  theme === 'light'
                    ? 'bg-white/72 hover:bg-slate-100'
                    : 'bg-white/[0.045] hover:bg-white/[0.09]'
                }`}
              >
                <ArrowLeft className={`h-4 w-4 ${surface.textSecondary}`} />
              </button>
            ) : null}
            <h2 className={`truncate text-lg font-semibold md:text-xl ${surface.textPrimary}`}>
              {currentBrowseTitle}
            </h2>
            {showDefaultViewAction ? (
              <button
                type="button"
                aria-label={defaultViewActionLabel}
                disabled={isBrowsing}
                onClick={toggleDefaultBrowseView}
                className={`inline-flex h-9 w-6 shrink-0 items-center justify-center transition-opacity hover:opacity-75 disabled:cursor-not-allowed disabled:opacity-45 ${
                  isCurrentBrowseDefault ? surface.textPrimary : surface.textSecondary
                }`}
              >
                <Bookmark className={`h-4 w-4 ${isCurrentBrowseDefault ? 'fill-current' : ''}`} />
              </button>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {hasHiddenBrowserItems ? (
              <button
                type="button"
                className={`inline-flex h-9 shrink-0 items-center rounded-full px-3 text-xs font-semibold transition-colors ${
                  theme === 'light'
                    ? 'bg-white/72 text-slate-700 hover:bg-slate-100'
                    : 'bg-white/[0.06] text-white/82 hover:bg-white/[0.1]'
                }`}
                onClick={toggleBrowserItemsExpanded}
              >
                {showAllBrowserItems ? 'Show less' : 'Show all'}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {canBrowseMedia ? (
        playableItems.length > 0 ? (
          <div className="space-y-4">
            {browseDirectoryItems.length > 0 ? (
              <div
                data-testid="media-browser-directory-grid"
                className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2 min-[1660px]:grid-cols-3 min-[1920px]:grid-cols-5 lg:gap-4"
              >
                {visibleBrowseDirectoryItems.map((item) => {
                  const directoryCount = mediaLibraryEntityId
                    ? directoryItemCounts[getDirectoryItemCountKey(mediaLibraryEntityId, item)]
                    : undefined;
                  const showSpotifyIcon =
                    browseHistory.length === 0 && isSpotifyProviderDirectory(item);

                  return (
                    <button
                      key={getMediaItemKey(item)}
                      type="button"
                      className={`${itemButtonClassName} flex min-h-13 items-center justify-between gap-2.5 px-3 py-2`}
                      onClick={() => browseMediaDirectory(item)}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                            theme === 'light' ? 'bg-slate-100' : 'bg-white/8'
                          }`}
                        >
                          {showSpotifyIcon ? (
                            <svg
                              data-testid="spotify-library-icon"
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="h-4 w-4 text-[#1DB954]"
                            >
                              <path d={SPOTIFY_ICON_PATH} />
                            </svg>
                          ) : (
                            <Folder className={`h-3.5 w-3.5 ${surface.textMuted}`} />
                          )}
                        </span>
                        <span className={`truncate text-sm font-medium ${surface.textPrimary}`}>
                          {item.title || item.mediaContentId}
                        </span>
                      </span>
                      {directoryCount !== undefined ? (
                        <span
                          role="status"
                          aria-label={`${directoryCount} ${directoryCount === 1 ? 'item' : 'items'}`}
                          className={`min-w-6 shrink-0 rounded-full px-1.5 py-0.5 text-center text-[0.6875rem] font-semibold tabular-nums ${
                            theme === 'light'
                              ? 'bg-slate-200/80 text-slate-600'
                              : 'bg-white/10 text-white/68'
                          }`}
                        >
                          {directoryCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {browseTileItems.length > 0 ? (
              showAllBrowserItems ? (
                <MediaBrowserVirtualTable
                  height={compactBrowserHeight}
                  items={browseTileItems}
                  onSelect={selectBrowserItem}
                  providerId={selectedDevice.providerId}
                  resetKey={currentBrowseTitle}
                  surface={surface}
                  theme={theme}
                />
              ) : (
                <div
                  data-testid={useCompactFolderGrid ? 'media-browser-compact-grid' : undefined}
                  style={useCompactFolderGrid ? { height: `${compactBrowserHeight}px` } : undefined}
                  className={
                    useCompactFolderGrid
                      ? isSingleRowMediaLayout
                        ? 'flex items-start gap-3 overflow-x-auto overflow-y-hidden pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                        : isNarrowMediaDesktopLayout
                          ? 'grid grid-cols-[repeat(auto-fill,6.5rem)] auto-rows-[9.25rem] content-start items-start justify-between gap-x-3 gap-y-3 overflow-hidden'
                          : 'grid grid-cols-[repeat(auto-fill,8rem)] auto-rows-[10.625rem] content-start items-start justify-between gap-x-4 gap-y-3 overflow-hidden'
                      : 'grid grid-cols-2 items-start gap-4 sm:grid-cols-[repeat(auto-fill,minmax(7.75rem,9rem))]'
                  }
                >
                  {visibleBrowseTileItems.map((item, index) => (
                    <MediaBrowserTile
                      key={`${index}:${getMediaItemKey(item)}`}
                      compact={useCompactFolderGrid}
                      item={item}
                      mediaTileArtworkClassName={mediaTileArtworkClassName}
                      mediaTileClassName={`${mediaTileClassName} ${
                        useCompactFolderGrid
                          ? isSingleRowMediaLayout
                            ? 'w-[6.5rem] shrink-0'
                            : isNarrowMediaDesktopLayout
                              ? 'w-[6.5rem]'
                              : 'w-32'
                          : 'w-full'
                      }`}
                      onSelect={selectBrowserItem}
                      providerId={selectedDevice.providerId}
                      surface={surface}
                      theme={theme}
                    />
                  ))}
                </div>
              )
            ) : null}
          </div>
        ) : (
          <div
            className={`${quietPanelClassName} flex min-h-40 items-center justify-center text-center`}
          >
            <div>
              <Search className={`mx-auto h-8 w-8 ${surface.textMuted}`} />
              <p className={`mt-3 text-sm ${surface.textSecondary}`}>
                {isBrowsing ? t('common.loading') : t('media.dashboard.browserEmpty')}
              </p>
            </div>
          </div>
        )
      ) : (
        <div className={quietPanelClassName}>
          <p className={`text-sm ${surface.textSecondary}`}>
            {t('media.dashboard.browserUnsupportedDetail')}
          </p>
        </div>
      )}
    </section>
  );

  return (
    <section className="relative">
      <div className="pt-2">
        <div
          data-testid="media-dashboard-layout"
          className="grid gap-3 min-[900px]:grid-cols-3 min-[1660px]:grid-cols-4 min-[1920px]:grid-cols-6 lg:gap-4"
        >
          <section className="min-w-0 space-y-4 min-[900px]:col-span-1">
            <div className="flex h-9 items-center gap-3">
              <h2 className={`text-lg font-semibold md:text-xl ${surface.textPrimary}`}>
                {playbackProviderLabel ?? t(dashboardTitleKey)}
              </h2>
              <span className={`text-xs md:text-sm ${surface.textSecondary}`}>
                {selectedGroupSize} {nowPlayingTypeLabel}
                {selectedGroupSize > 1 ? 's' : ''}
              </span>
            </div>
            {nowPlayingPanel}
          </section>
          {browserPanel}
        </div>
      </div>
    </section>
  );
}
