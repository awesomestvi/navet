import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getResolvedMediaBrowserAlbum,
  getResolvedMediaBrowserArtist,
  MediaCatalog,
} from './media-catalog';

function deferred<Value>() {
  let resolve: (value: Value) => void = () => {};
  const promise = new Promise<Value>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function jsonResponse(payload: unknown): Response {
  return { ok: true, json: async () => payload } as Response;
}

afterEach(() => vi.unstubAllGlobals());

describe('MediaCatalog', () => {
  it('coalesces duplicate metadata requests and caches their projection', async () => {
    const response = deferred<Response>();
    const fetchMock = vi.fn(() => response.promise);
    vi.stubGlobal('fetch', fetchMock);
    const catalog = new MediaCatalog();
    const trackId = '1234567890123456789012';

    const first = catalog.resolveSpotifyTrack(trackId);
    const second = catalog.resolveSpotifyTrack(trackId);
    expect(fetchMock).toHaveBeenCalledOnce();
    response.resolve(jsonResponse({ title: 'Track', artworkUrls: ['https://example.com/a.jpg'] }));
    await expect(Promise.all([first, second])).resolves.toEqual([
      {
        title: 'Track',
        artistName: undefined,
        albumTitle: undefined,
        artworkUrls: ['https://example.com/a.jpg'],
      },
      {
        title: 'Track',
        artistName: undefined,
        albumTitle: undefined,
        artworkUrls: ['https://example.com/a.jpg'],
      },
    ]);
    await catalog.resolveSpotifyTrack(trackId);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('limits concurrency while allowing one consumer to cancel its wait', async () => {
    const firstResponse = deferred<Response>();
    const fetchMock = vi
      .fn<() => Promise<Response>>()
      .mockImplementationOnce(() => firstResponse.promise)
      .mockResolvedValue(jsonResponse({ title: 'Second', artworkUrls: [] }));
    vi.stubGlobal('fetch', fetchMock);
    const catalog = new MediaCatalog({ concurrency: 1 });
    const abortController = new AbortController();
    const first = catalog.resolveSpotifyTrack('1234567890123456789012', {
      signal: abortController.signal,
    });
    const second = catalog.resolveSpotifyTrack('abcdefghijklmnopqrstuv');
    expect(fetchMock).toHaveBeenCalledOnce();
    abortController.abort();
    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
    firstResponse.resolve(jsonResponse({ title: 'First', artworkUrls: [] }));
    await expect(second).resolves.toMatchObject({ title: 'Second' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects unsafe artwork URLs returned by the Spotify metadata endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          title: 'Track',
          artworkUrls: ['javascript:alert(1)', 'https://example.com/cover.jpg', 42],
        })
      )
    );
    const catalog = new MediaCatalog();

    await expect(catalog.resolveSpotifyTrack('1234567890123456789012')).resolves.toMatchObject({
      artworkUrls: ['https://example.com/cover.jpg'],
    });
  });
});

describe('media browser metadata fallbacks', () => {
  const item = {
    title: 'Track',
    mediaContentId: 'track',
    mediaContentType: 'music',
    canPlay: true,
    canExpand: false,
    artist: '   ',
    album: '   ',
  };
  const projection = {
    spotifyMetadata: {
      artistName: '',
      albumTitle: 'Spotify album',
      artworkUrls: [],
    },
    openArtwork: {
      artistName: 'Open Artwork artist',
      albumTitle: 'Open Artwork album',
      artworkUrls: [],
    },
  };

  it('skips empty artist metadata and falls back to Open Artwork', () => {
    expect(getResolvedMediaBrowserArtist(item, projection)).toBe('Open Artwork artist');
  });

  it('uses Spotify album metadata when the provider album is empty', () => {
    expect(getResolvedMediaBrowserAlbum(item, projection)).toBe('Spotify album');
  });
});
