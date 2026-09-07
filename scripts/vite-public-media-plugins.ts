import type { IncomingMessage, ServerResponse } from 'node:http';
import type { PreviewServer, ViteDevServer } from 'vite';
import { fetchPublicRssFeed, RSS_TIMEOUT_MS } from './public-rss-feed.ts';
import { setSecurityHeaders } from './vite-response-security.ts';

const SPOTIFY_TRACK_ID_PATTERN = /^[a-zA-Z0-9]{22}$/;
export function rssProxyPlugin(
  isAuthenticated: (req: IncomingMessage, res: ServerResponse) => boolean
) {
  const setNoStoreHeaders = (res: ServerResponse) => {
    res.setHeader('Cache-Control', 'no-store');
    setSecurityHeaders(res);
  };

  const sendJson = (res: ServerResponse, statusCode: number, payload: Record<string, string>) => {
    res.statusCode = statusCode;
    setNoStoreHeaders(res);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
  };

  const handleRequest = async (requestUrlValue: string | null | undefined, res: ServerResponse) => {
    const requestUrl = requestUrlValue ? new URL(requestUrlValue, 'http://localhost') : null;
    const targetUrl = requestUrl?.searchParams.get('url')?.trim();

    if (!targetUrl) {
      sendJson(res, 400, { error: 'Missing url query parameter' });
      return;
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), RSS_TIMEOUT_MS);
    const onClose = () => {
      if (!res.writableFinished) abortController.abort();
    };
    res.once('close', onClose);
    try {
      const result = await fetchPublicRssFeed(targetUrl, abortController.signal);
      res.statusCode = result.status;
      setNoStoreHeaders(res);
      res.setHeader('Content-Type', result.contentType);
      res.end(result.body);
    } finally {
      clearTimeout(timeoutId);
      res.off('close', onClose);
    }
  };

  return {
    name: 'navet-rss-proxy',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/__navet_rss_proxy__', async (req, res) => {
        if (!isAuthenticated(req, res)) {
          sendJson(res, 401, { error: 'Authentication required' });
          return;
        }
        await handleRequest(req.url, res);
      });
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use('/__navet_rss_proxy__', async (req, res) => {
        if (!isAuthenticated(req, res)) {
          sendJson(res, 401, { error: 'Authentication required' });
          return;
        }
        await handleRequest(req.url, res);
      });
    },
  };
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16))
    )
    .replace(/&#(\d+);/g, (_, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 10))
    )
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function readMetaContent(html: string, key: string) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const propertyFirst = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escapedKey}["'][^>]+content=["']([^"']*)["'][^>]*>`,
    'i'
  );
  const contentFirst = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escapedKey}["'][^>]*>`,
    'i'
  );
  const match = html.match(propertyFirst) ?? html.match(contentFirst);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : undefined;
}

function parseSpotifyTrackMetadata(html: string) {
  const title = readMetaContent(html, 'og:title') ?? readMetaContent(html, 'twitter:title');
  const description =
    readMetaContent(html, 'og:description') ?? readMetaContent(html, 'twitter:description');
  const artistFromMeta = readMetaContent(html, 'music:musician_description');
  const image = readMetaContent(html, 'og:image') ?? readMetaContent(html, 'twitter:image');
  const descriptionParts =
    description
      ?.split(' · ')
      .map((part) => part.trim())
      .filter(Boolean) ?? [];
  const artistName = artistFromMeta ?? descriptionParts[0];
  const albumTitle =
    descriptionParts.length >= 3 && descriptionParts[2]?.toLowerCase() === 'song'
      ? descriptionParts[1]
      : undefined;

  return {
    ...(title ? { title } : {}),
    ...(artistName ? { artistName } : {}),
    ...(albumTitle ? { albumTitle } : {}),
    artworkUrls: image ? [image] : [],
  };
}

export function spotifyMetadataPlugin() {
  const basePath = '/__navet_spotify_metadata__/track/';

  const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    const requestUrl = req.url ?? '';
    const requestPath = requestUrl.startsWith(basePath)
      ? requestUrl.slice(basePath.length)
      : requestUrl.replace(/^\//, '');
    const trackId = requestPath.split(/[?#]/)[0] ?? '';
    if (!SPOTIFY_TRACK_ID_PATTERN.test(trackId)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Invalid Spotify track id' }));
      return;
    }

    try {
      const upstreamResponse = await fetch(`https://open.spotify.com/track/${trackId}`, {
        headers: {
          Accept: 'text/html',
          'User-Agent': 'Navet/spotify-metadata',
        },
      });

      if (!upstreamResponse.ok) {
        await upstreamResponse.body?.cancel();
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'Unable to load Spotify metadata' }));
        return;
      }

      const html = await upstreamResponse.text();
      res.statusCode = 200;
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(parseSpotifyTrackMetadata(html)));
    } catch {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Unable to load Spotify metadata' }));
    }
  };

  const registerMiddleware = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use(basePath, async (req, res) => {
      await handleRequest(req, res);
    });
  };

  return {
    name: 'navet-spotify-metadata',
    configureServer: registerMiddleware,
    configurePreviewServer: registerMiddleware,
  };
}
