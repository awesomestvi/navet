import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { lookup } from 'node:dns/promises'
import { readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { connect as connectNet } from 'node:net'
import { isIP } from 'node:net'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { connect as connectTls } from 'node:tls'
import path from 'path'
import {
  defineConfig,
  loadEnv,
  type PluginOption,
  type PreviewServer,
  type UserConfig,
  type ViteDevServer,
} from 'vite'
import { VitePWA, type VitePWAOptions } from 'vite-plugin-pwa'
import {
  AUTH_COOKIE_NAME,
  createViteAuthRequestHandler,
  createViteAuthSessionStore,
  type HomeAssistantAuthData,
  resolveViteAuthenticatedPrincipal,
  resolveViteAuthSession,
  type ViteAuthenticatedPrincipal,
} from '../../scripts/vite-auth-session-store.ts'
import {
  createViteDashboardProfileRequestHandler,
  type ViteDashboardProfilePrincipal,
} from '../../scripts/vite-dashboard-profile-store.ts'
import { createViteChoreStoreRequestHandler } from '../../scripts/vite-chore-store.ts'
import {
  createViteInstallationAuthority,
  type ViteInstallationAuthority,
} from '../../scripts/vite-installation-authority.ts'
import { createInstallationCookieNames } from '../../scripts/installation-cookie-scope.ts'
import { normalizeViteProxyTargetPath } from '../../scripts/vite-proxy-path.ts'
import {
  appendHomeyOAuthCallbackMarker,
  appendHomeyOAuthFailureMarker,
  createViteHomeySessionStore,
  HOMEY_OAUTH_PENDING_TTL_MS,
  HOMEY_SESSION_COOKIE_NAME as HOMEY_SESSION_COOKIE_BASE_NAME,
  type HomeyOAuthFailureCode,
  type HomeySessionData,
  isConfirmedInvalidHomeyRefreshError,
  normalizeHomeyRefreshTokenPayload,
  type ViteStoredHomeySession,
} from '../../scripts/vite-homey-session-store.ts'
import {
  createViteOpenHABSessionStore,
  OPENHAB_SESSION_COOKIE_NAME as OPENHAB_SESSION_COOKIE_BASE_NAME,
  type OpenHABSessionData,
  normalizeOpenHABBaseUrl,
  normalizeOpenHABSessionData,
  toOpenHABBasicAuthHeader,
  type ViteStoredOpenHABSession,
} from '../../scripts/vite-openhab-session-store.ts'
import { createViteOpenHABLoginRateLimiter } from '../../scripts/vite-openhab-login-rate-limiter.ts'
import {
  clearViteProviderSessionCookie,
  createViteProviderRequestSession,
  createViteProviderState,
  deleteViteProviderRequestSessions,
  findViteProviderRequestSession,
  getViteProviderRequestOrigin,
  getViteProviderRequestSession,
  isViteProviderSessionCapacityError,
  isViteProviderSessionRecordTooLargeError,
  isViteStrictSameOriginMutation,
  PROVIDER_SESSION_CAPACITY_ERROR_CODE,
  PROVIDER_SESSION_CAPACITY_STATUS,
  PROVIDER_SESSION_RECORD_TOO_LARGE_ERROR_CODE,
  PROVIDER_SESSION_RECORD_TOO_LARGE_STATUS,
  rotateViteProviderRequestSession,
  setViteProviderSessionCookie,
} from '../../scripts/vite-provider-session-store.ts'
import { getVendorChunkName, isLazyHtmlPreload } from '../../scripts/vite-chunking.ts'
import {
  createVitePwaCachePolicy,
  deferVitePwaGenerationUntilWriteBundle,
  isNavetRuntimeAssetRequest,
  NAVET_PWA_INCLUDE_ASSETS,
} from '../../scripts/vite-pwa-cache.ts'
import { NAVET_INTERNAL_NAVIGATION_PATH_PATTERN } from '../../scripts/vite-pwa-routing.ts'
import {
  isAllowedRSSContentType,
  isBlockedRSSHostname,
  isPrivateIpAddress,
} from '../../packages/app/src/utils/rss-proxy-security.ts'
import {
  buildHomeAssistantProxyRequestHeaders,
  isHomeAssistantOAuthProxyBodyRequest,
} from '../../scripts/vite-proxy-request-headers.ts'

const repoRoot = path.resolve(import.meta.dirname, '../..')
type VitePwaManifestTransform = NonNullable<
  VitePWAOptions['workbox']['manifestTransforms']
>[number]
const packageJson = JSON.parse(
  readFileSync(path.resolve(repoRoot, 'package.json'), 'utf8')
) as {
  version?: string
}
const publicWebManifest = JSON.parse(
  readFileSync(path.resolve(repoRoot, 'assets/public/site.webmanifest'), 'utf8')
) as {
  name: string
  short_name: string
  description: string
  start_url: string
  scope: string
  display: 'standalone'
  background_color: string
  theme_color: string
  orientation: 'portrait-primary'
  icons: Array<{
    src: string
    sizes: string
    type: string
    purpose: 'any' | 'maskable'
  }>
  categories: string[]
}
const SPOTIFY_TRACK_ID_PATTERN = /^[a-zA-Z0-9]{22}$/
const HOME_ASSISTANT_OAUTH_BODY_MAX_BYTES = 16 * 1024
const DISABLED_INSTALLATION_AUTHORITY: ViteInstallationAuthority = {
  authorizeHomeAssistant: () => ({
    allowed: false,
    pairingVerified: false,
  }),
  authorizeHomeyStart: () => ({
    allowed: false,
    pairingVerified: false,
  }),
  authorizeOpenHAB: () => ({
    allowed: false,
    pairingVerified: false,
  }),
  commitHomeAssistant: () => false,
  commitHomey: () => false,
  commitOpenHAB: () => false,
  getCookieNames: (baseName) => createInstallationCookieNames(baseName),
}

function resolveFallbackGitSha() {
  try {
    return execSync('git rev-parse HEAD', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return 'local'
  }
}

function resolveFallbackBuildDate() {
  const sourceDateEpoch = process.env.SOURCE_DATE_EPOCH?.trim()

  if (sourceDateEpoch) {
    const epochMs = Number.parseInt(sourceDateEpoch, 10) * 1000
    if (Number.isFinite(epochMs)) {
      return new Date(epochMs).toISOString()
    }
  }

  try {
    return execSync('git log -1 --format=%cI', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return new Date(0).toISOString()
  }
}

const buildMetadata = {
  gitSha: (process.env.NAVET_GIT_SHA ?? resolveFallbackGitSha()).trim(),
  buildDate: (process.env.NAVET_BUILD_DATE ?? resolveFallbackBuildDate()).trim(),
  releaseChannel: (process.env.NAVET_RELEASE_CHANNEL ?? 'development').trim(),
  buildVersion: (process.env.NAVET_BUILD_VERSION ?? packageJson.version ?? '0.0.0').trim(),
}

const RSS_PROXY_MAX_BYTES = 1024 * 1024
const RSS_PROXY_TIMEOUT_MS = 10000
const HOMEY_SESSION_MAX_BYTES = 8 * 1024
const OPENHAB_SESSION_MAX_BYTES = 8 * 1024
const REACT_COMPILER_INCLUDE = [
  /[\\/]src[\\/]/,
  /[\\/]packages[\\/][^\\/]+[\\/]src[\\/]/,
  /[\\/]apps[\\/]website[\\/]src[\\/]/,
]
const REACT_COMPILER_EXCLUDE = [/[\\/]node_modules[\\/]/, /[\\/]\.cache[\\/]vite[^\\/]*[\\/]deps[\\/]/]

function isRecoverableProxyStreamError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const causeCode =
    typeof error.cause === 'object' && error.cause && 'code' in error.cause
      ? error.cause.code
      : null

  return (
    error.name === 'AbortError' ||
    error.message === 'terminated' ||
    causeCode === 'UND_ERR_BODY_TIMEOUT' ||
    causeCode === 'UND_ERR_ABORTED'
  )
}

async function pipeReadableStreamToResponse(
  body: NonNullable<Response['body']>,
  res: ServerResponse,
  options?: {
    req?: IncomingMessage
    abortController?: AbortController
  }
) {
  const source = Readable.fromWeb(body as unknown as Parameters<typeof Readable.fromWeb>[0])
  const abortUpstream = () => {
    options?.abortController?.abort()
  }

  options?.req?.once('close', abortUpstream)
  res.once('close', abortUpstream)

  try {
    await pipeline(source, res)
  } catch (error) {
    if (!isRecoverableProxyStreamError(error)) {
      if (!res.destroyed) {
        res.destroy(error instanceof Error ? error : undefined)
      }
      return
    }

    if (!res.destroyed) {
      res.destroy()
    }
  } finally {
    options?.req?.off('close', abortUpstream)
    res.off('close', abortUpstream)
  }
}

async function proxyRawUpstreamStream(options: {
  req: IncomingMessage
  res: ServerResponse
  targetUrl: URL
  headers: Headers
}) {
  const { req, res, targetUrl, headers } = options
  const requestImpl = targetUrl.protocol === 'https:' ? httpsRequest : httpRequest

  await new Promise<void>((resolve, reject) => {
    const upstreamRequest = requestImpl(
      targetUrl,
      {
        method: req.method,
        headers: Object.fromEntries(headers.entries()),
      },
      (upstreamResponse) => {
        res.statusCode = upstreamResponse.statusCode ?? 502
        setSecurityHeaders(res)

        const allowedResponseHeaders = new Set([
          'accept-ranges',
          'cache-control',
          'content-length',
          'content-range',
          'content-type',
          'etag',
          'last-modified',
        ])
        for (const [headerName, headerValue] of Object.entries(upstreamResponse.headers)) {
          if (!allowedResponseHeaders.has(headerName.toLowerCase())) {
            continue
          }
          if (headerValue == null) {
            continue
          }

          if (Array.isArray(headerValue)) {
            res.setHeader(headerName, headerValue)
          } else {
            res.setHeader(headerName, headerValue)
          }
        }

        upstreamResponse.on('error', reject)
        res.on('close', () => upstreamResponse.destroy())
        upstreamResponse.pipe(res)
        upstreamResponse.on('end', resolve)
      }
    )

    upstreamRequest.on('error', reject)
    req.on('close', () => upstreamRequest.destroy())
    upstreamRequest.end()
  })
}

const proxyWebSocketResponseHeaderBlocklist = new Set([
  'access-control-allow-credentials',
  'access-control-allow-headers',
  'access-control-allow-methods',
  'access-control-allow-origin',
  'access-control-expose-headers',
  'access-control-max-age',
  'location',
  'set-cookie',
  'www-authenticate',
  'x-accel-buffering',
  'x-accel-charset',
  'x-accel-expires',
  'x-accel-limit-rate',
  'x-accel-redirect',
])

function sendProxyUpgradeError(
  socket: import('node:net').Socket,
  statusCode: number,
  message: string
) {
  socket.write(
    `HTTP/1.1 ${statusCode} ${message}\r\nConnection: close\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`
  )
  socket.destroy()
}

function proxyCredentialedWebSocket(options: {
  authorization: string
  head: Buffer
  label: string
  req: IncomingMessage
  socket: import('node:net').Socket
  targetUrl: URL
}) {
  const { authorization, head, label, req, socket, targetUrl } = options
  const isSecure = targetUrl.protocol === 'https:'
  if (!isSecure && targetUrl.protocol !== 'http:') {
    sendProxyUpgradeError(socket, 400, `Invalid ${label} websocket target`)
    return
  }

  const hostname = targetUrl.hostname.replace(/^\[|\]$/g, '')
  const allowInsecureTls = /^(1|true|yes)$/i.test(
    process.env.NAVET_ALLOW_INSECURE_PROVIDER_TLS ?? ''
  )
  const upstreamSocket = isSecure
    ? connectTls({
        host: hostname,
        port: targetUrl.port ? Number(targetUrl.port) : 443,
        rejectUnauthorized: !allowInsecureTls,
        ...(isIP(hostname) === 0 ? { servername: hostname } : {}),
      })
    : connectNet({
        host: hostname,
        port: targetUrl.port ? Number(targetUrl.port) : 80,
      })

  let responseStarted = false
  let handshakeBuffer = Buffer.alloc(0)
  upstreamSocket.on(isSecure ? 'secureConnect' : 'connect', () => {
    const forwardedHeaders = [
      `Host: ${targetUrl.host}`,
      `Authorization: ${authorization}`,
      'Upgrade: websocket',
      'Connection: Upgrade',
    ]
    for (const headerName of [
      'sec-websocket-key',
      'sec-websocket-version',
      'sec-websocket-protocol',
      'sec-websocket-extensions',
    ]) {
      const value = req.headers[headerName]
      if (typeof value === 'string' && value) {
        forwardedHeaders.push(`${headerName}: ${value}`)
      }
    }
    upstreamSocket.write(
      [
        `GET ${targetUrl.pathname}${targetUrl.search} HTTP/1.1`,
        ...forwardedHeaders,
        '',
        '',
      ].join('\r\n')
    )
    if (head.byteLength > 0) {
      upstreamSocket.write(head)
    }
  })

  const handleHandshakeData = (chunk: Buffer) => {
    handshakeBuffer = Buffer.concat([handshakeBuffer, chunk])
    if (handshakeBuffer.byteLength > 16 * 1024) {
      upstreamSocket.destroy()
      sendProxyUpgradeError(socket, 502, `Invalid ${label} websocket response`)
      return
    }
    const separator = handshakeBuffer.indexOf('\r\n\r\n')
    if (separator === -1) {
      return
    }

    upstreamSocket.off('data', handleHandshakeData)
    const headerLines = handshakeBuffer
      .subarray(0, separator)
      .toString('latin1')
      .split('\r\n')
    if (!/^HTTP\/1\.[01] 101\b/.test(headerLines[0] ?? '')) {
      upstreamSocket.destroy()
      sendProxyUpgradeError(socket, 502, `${label} websocket upgrade failed`)
      return
    }
    const sanitizedHeaders = headerLines.slice(1).filter((line) => {
      const headerSeparator = line.indexOf(':')
      return (
        headerSeparator > 0 &&
        !proxyWebSocketResponseHeaderBlocklist.has(
          line.slice(0, headerSeparator).trim().toLowerCase()
        )
      )
    })

    responseStarted = true
    socket.write([headerLines[0], ...sanitizedHeaders, '', ''].join('\r\n'))
    const remainder = handshakeBuffer.subarray(separator + 4)
    if (remainder.byteLength > 0) {
      socket.write(remainder)
    }
    upstreamSocket.pipe(socket)
    socket.pipe(upstreamSocket)
  }
  upstreamSocket.on('data', handleHandshakeData)
  upstreamSocket.on('error', () => {
    if (!responseStarted) {
      sendProxyUpgradeError(socket, 502, `Unable to connect to ${label} websocket`)
    } else {
      socket.destroy()
    }
  })
  socket.on('error', () => upstreamSocket.destroy())
  socket.on('close', () => upstreamSocket.destroy())
}

function isCredentialProxyRequestAllowed(req: IncomingMessage, websocket = false) {
  const method = (req.method ?? 'GET').toUpperCase()
  const upgraded =
    websocket ||
    Boolean(String(req.headers.upgrade ?? '').trim()) ||
    String(req.headers.connection ?? '')
      .toLowerCase()
      .split(',')
      .some((token) => token.trim() === 'upgrade')
  return (
    (!upgraded && (method === 'GET' || method === 'HEAD')) ||
    isViteStrictSameOriginMutation(req)
  )
}

async function assertPublicHostname(hostname: string) {
  const normalizedHostname = hostname.toLowerCase()
  if (isBlockedRSSHostname(normalizedHostname)) {
    throw new Error('Private hostnames are not allowed')
  }

  if (isIP(normalizedHostname)) {
    if (isPrivateIpAddress(normalizedHostname)) {
      throw new Error('Private IP addresses are not allowed')
    }
    return
  }

  const addresses = await lookup(normalizedHostname, { all: true, verbatim: true })
  if (addresses.length === 0 || addresses.some((entry) => isPrivateIpAddress(entry.address))) {
    throw new Error('Private DNS targets are not allowed')
  }
}

async function validateRSSProxyTargetUrl(targetUrl: string) {
  const parsedUrl = new URL(targetUrl)
  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Only HTTPS feeds are allowed')
  }

  await assertPublicHostname(parsedUrl.hostname)
  return parsedUrl
}

function setSecurityHeaders(res: ServerResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
}

function rssProxyPlugin() {
  const setNoStoreHeaders = (res: ServerResponse) => {
    res.setHeader('Cache-Control', 'no-store')
    setSecurityHeaders(res)
  }

  const sendJson = (res: ServerResponse, statusCode: number, payload: Record<string, string>) => {
    res.statusCode = statusCode
    setNoStoreHeaders(res)
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(payload))
  }

  const handleRequest = async (requestUrlValue: string | null | undefined, res: ServerResponse) => {
    const requestUrl = requestUrlValue ? new URL(requestUrlValue, 'http://localhost') : null
    const targetUrl = requestUrl?.searchParams.get('url')?.trim()

    if (!targetUrl) {
      sendJson(res, 400, { error: 'Missing url query parameter' })
      return
    }

    try {
      const parsedUrl = await validateRSSProxyTargetUrl(targetUrl)
      const abortController = new AbortController()
      const timeoutId = setTimeout(() => abortController.abort(), RSS_PROXY_TIMEOUT_MS)

      try {
        const upstreamResponse = await fetch(parsedUrl, {
          redirect: 'error',
          signal: abortController.signal,
          headers: {
            Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9',
            'User-Agent': 'Navet RSS Reader/1.0',
          },
        })

        if (!upstreamResponse.ok) {
          sendJson(res, 502, {
            error: `Upstream feed request failed with status ${upstreamResponse.status}`,
          })
          return
        }

        const contentType = upstreamResponse.headers.get('content-type')
        if (!isAllowedRSSContentType(contentType)) {
          sendJson(res, 502, { error: 'Upstream feed returned an unsupported content type' })
          return
        }

        const contentLength = Number(upstreamResponse.headers.get('content-length') ?? '0')
        if (contentLength > RSS_PROXY_MAX_BYTES) {
          sendJson(res, 502, { error: 'Upstream feed is too large' })
          return
        }

        const body = await upstreamResponse.text()
        if (new TextEncoder().encode(body).byteLength > RSS_PROXY_MAX_BYTES) {
          sendJson(res, 502, { error: 'Upstream feed is too large' })
          return
        }

        res.statusCode = 200
        setNoStoreHeaders(res)
        res.setHeader('Content-Type', contentType ?? 'application/xml; charset=utf-8')
        res.end(body)
      } finally {
        clearTimeout(timeoutId)
      }
    } catch {
      sendJson(res, 502, { error: 'Unable to load feed' })
    }
  }

  return {
    name: 'navet-rss-proxy',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/__navet_rss_proxy__', async (req, res) => {
        await handleRequest(req.url, res)
      })
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use('/__navet_rss_proxy__', async (req, res) => {
        await handleRequest(req.url, res)
      })
    },
  }
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
    .replace(/&gt;/g, '>')
}

function readMetaContent(html: string, key: string) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const propertyFirst = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escapedKey}["'][^>]+content=["']([^"']*)["'][^>]*>`,
    'i'
  )
  const contentFirst = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escapedKey}["'][^>]*>`,
    'i'
  )
  const match = html.match(propertyFirst) ?? html.match(contentFirst)
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : undefined
}

function parseSpotifyTrackMetadata(html: string) {
  const title = readMetaContent(html, 'og:title') ?? readMetaContent(html, 'twitter:title')
  const description =
    readMetaContent(html, 'og:description') ?? readMetaContent(html, 'twitter:description')
  const artistFromMeta = readMetaContent(html, 'music:musician_description')
  const image = readMetaContent(html, 'og:image') ?? readMetaContent(html, 'twitter:image')
  const descriptionParts = description?.split(' · ').map((part) => part.trim()).filter(Boolean) ?? []
  const artistName = artistFromMeta ?? descriptionParts[0]
  const albumTitle =
    descriptionParts.length >= 3 && descriptionParts[2]?.toLowerCase() === 'song'
      ? descriptionParts[1]
      : undefined

  return {
    ...(title ? { title } : {}),
    ...(artistName ? { artistName } : {}),
    ...(albumTitle ? { albumTitle } : {}),
    artworkUrls: image ? [image] : [],
  }
}

function spotifyMetadataPlugin() {
  const basePath = '/__navet_spotify_metadata__/track/'

  const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      res.statusCode = 405
      res.end(JSON.stringify({ error: 'Method not allowed' }))
      return
    }

    const requestUrl = req.url ?? ''
    const requestPath = requestUrl.startsWith(basePath)
      ? requestUrl.slice(basePath.length)
      : requestUrl.replace(/^\//, '')
    const trackId = requestPath.split(/[?#]/)[0] ?? ''
    if (!SPOTIFY_TRACK_ID_PATTERN.test(trackId)) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: 'Invalid Spotify track id' }))
      return
    }

    try {
      const upstreamResponse = await fetch(`https://open.spotify.com/track/${trackId}`, {
        headers: {
          Accept: 'text/html',
          'User-Agent': 'Navet/spotify-metadata',
        },
      })

      if (!upstreamResponse.ok) {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ error: 'Unable to load Spotify metadata' }))
        return
      }

      const html = await upstreamResponse.text()
      res.statusCode = 200
      res.setHeader('Cache-Control', 'public, max-age=3600')
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify(parseSpotifyTrackMetadata(html)))
    } catch {
      res.statusCode = 502
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: 'Unable to load Spotify metadata' }))
    }
  }

  const registerMiddleware = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use(basePath, async (req, res) => {
      await handleRequest(req, res)
    })
  }

  return {
    name: 'navet-spotify-metadata',
    configureServer: registerMiddleware,
    configurePreviewServer: registerMiddleware,
  }
}

function homeAssistantProxyPlugin(
  getAuthSession: (req: IncomingMessage) => HomeAssistantAuthData | null
) {
  const proxyBasePath = '/__navet_ha_proxy__'
  const websocketPath = `${proxyBasePath}/api/websocket`
  const handleUpgrade = (
    req: IncomingMessage,
    socket: import('node:net').Socket,
    head: Buffer
  ) => {
    const rawUrl = String(req.url ?? '')
    const separator = rawUrl.indexOf('?')
    const pathname = separator === -1 ? rawUrl : rawUrl.slice(0, separator)
    const query = separator === -1 ? '' : rawUrl.slice(separator + 1)
    if (!pathname.startsWith(proxyBasePath)) {
      return
    }
    if (
      pathname !== websocketPath ||
      query ||
      req.method !== 'GET' ||
      String(req.headers.upgrade ?? '').toLowerCase() !== 'websocket' ||
      !String(req.headers.connection ?? '')
        .toLowerCase()
        .split(',')
        .some((token) => token.trim() === 'upgrade') ||
      !isCredentialProxyRequestAllowed(req, true)
    ) {
      sendProxyUpgradeError(socket, 403, 'Forbidden Home Assistant websocket request')
      return
    }

    const authSession = getAuthSession(req)
    if (!authSession?.hassUrl || !authSession.access_token) {
      sendProxyUpgradeError(socket, 502, 'Home Assistant OAuth session is required')
      return
    }
    try {
      const targetUrl = new URL(
        `${authSession.hassUrl.replace(/\/+$/, '')}/api/websocket`
      )
      proxyCredentialedWebSocket({
        authorization: `Bearer ${authSession.access_token}`,
        head,
        label: 'Home Assistant',
        req,
        socket,
        targetUrl,
      })
    } catch {
      sendProxyUpgradeError(socket, 400, 'Invalid Home Assistant websocket target')
    }
  }

  const registerUpgradeProxy = (server: ViteDevServer | PreviewServer) => {
    server.httpServer?.on('upgrade', (req, socket, head) => {
      handleUpgrade(req, socket, head)
    })
  }

  const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.statusCode = 400
      res.end('Missing proxy path')
      return
    }
    if (!isCredentialProxyRequestAllowed(req)) {
      res.statusCode = 403
      res.end('Forbidden Home Assistant proxy request')
      return
    }

    try {
      let decodedUrl = ''
      try {
        decodedUrl = decodeURIComponent(req.url)
      } catch {
        res.statusCode = 400
        res.end('Invalid proxy path')
        return
      }

      if (req.url.includes('..') || decodedUrl.includes('..')) {
        res.statusCode = 400
        res.end('Invalid proxy path')
        return
      }

      const authSession = getAuthSession(req)
      if (!authSession?.hassUrl) {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Home Assistant OAuth session is required' }))
        return
      }

      const upstreamBaseUrl = authSession.hassUrl
      const upstreamOrigin = new URL(upstreamBaseUrl)
      const targetPath = normalizeViteProxyTargetPath(proxyBasePath, req.url)
      const targetUrl = new URL(
        `${upstreamBaseUrl.replace(/\/+$/, '')}${targetPath}`
      )
      if (targetUrl.origin !== upstreamOrigin.origin) {
        res.statusCode = 400
        res.end('Invalid proxy target')
        return
      }

      const forwardsOAuthBody = isHomeAssistantOAuthProxyBodyRequest(req.method, targetPath)
      const headers = buildHomeAssistantProxyRequestHeaders(req.headers, authSession.access_token, {
        forwardContentType: forwardsOAuthBody,
        includeAuthorization: !forwardsOAuthBody,
      })
      let body: Uint8Array<ArrayBuffer> | undefined
      if (forwardsOAuthBody) {
        const contentType = headers.get('content-type')?.toLowerCase() ?? ''
        if (
          !contentType.startsWith('multipart/form-data;') &&
          contentType !== 'application/x-www-form-urlencoded'
        ) {
          res.statusCode = 415
          res.end('Unsupported Home Assistant OAuth request content type')
          return
        }

        const declaredLength = Number.parseInt(String(req.headers['content-length'] ?? ''), 10)
        if (
          Number.isFinite(declaredLength) &&
          declaredLength > HOME_ASSISTANT_OAUTH_BODY_MAX_BYTES
        ) {
          res.statusCode = 413
          res.end('Home Assistant OAuth request is too large')
          return
        }

        const chunks: Buffer[] = []
        let size = 0
        for await (const chunk of req) {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
          size += buffer.byteLength
          if (size > HOME_ASSISTANT_OAUTH_BODY_MAX_BYTES) {
            res.statusCode = 413
            res.end('Home Assistant OAuth request is too large')
            return
          }
          chunks.push(buffer)
        }
        const payload = Buffer.concat(chunks)
        body = new Uint8Array(payload.byteLength)
        body.set(payload)
      }

      const abortController = new AbortController()
      const isRawCameraStream = targetPath.startsWith('/api/camera_proxy_stream/')

      if (isRawCameraStream) {
        await proxyRawUpstreamStream({
          req,
          res,
          targetUrl,
          headers,
        })
        return
      }

      const upstreamResponse = await fetch(targetUrl, {
        method: req.method,
        redirect: 'manual',
        headers,
        body,
        signal: abortController.signal,
      })

      res.statusCode = upstreamResponse.status
      setSecurityHeaders(res)

      const contentType = upstreamResponse.headers.get('content-type')
      if (contentType) {
        res.setHeader('Content-Type', contentType)
      }

      const cacheControl = upstreamResponse.headers.get('cache-control')
      if (cacheControl) {
        res.setHeader('Cache-Control', cacheControl)
      }

      if (!upstreamResponse.body) {
        res.end()
        return
      }

      await pipeReadableStreamToResponse(upstreamResponse.body, res, { req, abortController })
    } catch {
      res.statusCode = 502
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Unable to load Home Assistant resource' }))
    }
  }

  return {
    name: 'navet-ha-proxy',
    configureServer(server: ViteDevServer) {
      registerUpgradeProxy(server)
      server.middlewares.use('/__navet_ha_proxy__', async (req, res) => {
        await handleRequest(req, res)
      })
    },
    configurePreviewServer(server: PreviewServer) {
      registerUpgradeProxy(server)
      server.middlewares.use('/__navet_ha_proxy__', async (req, res) => {
        await handleRequest(req, res)
      })
    },
  }
}

function homeyProxyPlugin(
  getHomeySession: (
    req: IncomingMessage,
    res?: ServerResponse
  ) => HomeySessionData | null
) {
  const proxyBasePath = '/__navet_homey_proxy__'
  const handleUpgrade = (
    req: IncomingMessage,
    socket: import('node:net').Socket,
    head: Buffer
  ) => {
    if (!req.url?.startsWith(proxyBasePath)) {
      return
    }
    if (
      req.method !== 'GET' ||
      String(req.headers.upgrade ?? '').toLowerCase() !== 'websocket' ||
      !String(req.headers.connection ?? '')
        .toLowerCase()
        .split(',')
        .some((token) => token.trim() === 'upgrade') ||
      !isCredentialProxyRequestAllowed(req, true)
    ) {
      sendProxyUpgradeError(socket, 403, 'Forbidden Homey websocket request')
      return
    }

    let decodedUrl = ''
    try {
      decodedUrl = decodeURIComponent(req.url)
    } catch {
      sendProxyUpgradeError(socket, 400, 'Invalid Homey websocket path')
      return
    }
    if (req.url.includes('..') || decodedUrl.includes('..')) {
      sendProxyUpgradeError(socket, 400, 'Invalid Homey websocket path')
      return
    }

    const session = getHomeySession(req)
    if (!session?.homeyBaseUrl || !session.homeySessionToken) {
      sendProxyUpgradeError(socket, 502, 'Homey OAuth session is required')
      return
    }
    try {
      const upstreamOrigin = new URL(session.homeyBaseUrl)
      const targetPath = normalizeViteProxyTargetPath(proxyBasePath, req.url)
      const targetUrl = new URL(
        `${session.homeyBaseUrl.replace(/\/+$/, '')}${targetPath}`
      )
      if (targetUrl.origin !== upstreamOrigin.origin) {
        throw new Error('Invalid proxy target')
      }
      proxyCredentialedWebSocket({
        authorization: `Bearer ${session.homeySessionToken}`,
        head,
        label: 'Homey',
        req,
        socket,
        targetUrl,
      })
    } catch {
      sendProxyUpgradeError(socket, 400, 'Invalid Homey websocket target')
    }
  }

  const registerUpgradeProxy = (server: ViteDevServer | PreviewServer) => {
    server.httpServer?.on('upgrade', (req, socket, head) => {
      handleUpgrade(req, socket, head)
    })
  }

  const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.statusCode = 400
      res.end('Missing proxy path')
      return
    }
    if (!isCredentialProxyRequestAllowed(req)) {
      res.statusCode = 403
      res.end('Forbidden Homey proxy request')
      return
    }

    try {
      let decodedUrl = ''
      try {
        decodedUrl = decodeURIComponent(req.url)
      } catch {
        res.statusCode = 400
        res.end('Invalid proxy path')
        return
      }

      if (req.url.includes('..') || decodedUrl.includes('..')) {
        res.statusCode = 400
        res.end('Invalid proxy path')
        return
      }

      const session = getHomeySession(req, res)
      const upstreamBaseUrl = session?.homeyBaseUrl ?? null
      const sessionToken = session?.homeySessionToken ?? null
      if (!upstreamBaseUrl || !sessionToken) {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Homey OAuth session is required' }))
        return
      }

      const upstreamOrigin = new URL(upstreamBaseUrl)
      const targetPath = normalizeViteProxyTargetPath(proxyBasePath, req.url)
      const targetUrl = new URL(
        `${upstreamBaseUrl.replace(/\/+$/, '')}${targetPath}`
      )
      if (targetUrl.origin !== upstreamOrigin.origin) {
        res.statusCode = 400
        res.end('Invalid proxy target')
        return
      }

      const headers = new Headers()
      const contentType =
        typeof req.headers['content-type'] === 'string' ? req.headers['content-type'] : null
      const accept = typeof req.headers.accept === 'string' ? req.headers.accept : null
      if (contentType) {
        headers.set('Content-Type', contentType)
      }
      if (accept) {
        headers.set('Accept', accept)
      }
      headers.set('Authorization', `Bearer ${sessionToken}`)

      const body =
        req.method === 'GET' || req.method === 'HEAD'
          ? undefined
          : await new Response(req as never).text()

      const abortController = new AbortController()

      const upstreamResponse = await fetch(targetUrl, {
        method: req.method,
        redirect: 'manual',
        headers,
        body,
        signal: abortController.signal,
      })

      res.statusCode = upstreamResponse.status
      setSecurityHeaders(res)
      const responseContentType = upstreamResponse.headers.get('content-type')
      if (responseContentType) {
        res.setHeader('Content-Type', responseContentType)
      }

      if (!upstreamResponse.body) {
        res.end()
        return
      }

      await pipeReadableStreamToResponse(upstreamResponse.body, res, { req, abortController })
    } catch {
      res.statusCode = 502
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Unable to load Homey resource' }))
    }
  }

  return {
    name: 'navet-homey-proxy',
    configureServer(server: ViteDevServer) {
      registerUpgradeProxy(server)
      server.middlewares.use('/__navet_homey_proxy__', async (req, res) => {
        await handleRequest(req, res)
      })
    },
    configurePreviewServer(server: PreviewServer) {
      registerUpgradeProxy(server)
      server.middlewares.use('/__navet_homey_proxy__', async (req, res) => {
        await handleRequest(req, res)
      })
    },
  }
}

function openhabProxyPlugin(
  getOpenHABSession: (
    req: IncomingMessage,
    res?: ServerResponse
  ) => OpenHABSessionData | null
) {
  const proxyBasePath = '/__navet_openhab_proxy__'
  const maxWebSocketHandshakeBytes = 16 * 1024
  const sendUpgradeError = (socket: import('node:net').Socket, statusCode: number, message: string) => {
    socket.write(
      `HTTP/1.1 ${statusCode} ${message}\r\nConnection: close\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`
    )
    socket.destroy()
  }

  const resolveAllowedSuffix = (req: IncomingMessage, websocket: boolean) => {
    const requestUrl = String(req.url ?? '')
    const separator = requestUrl.indexOf('?')
    const rawPath = separator === -1 ? requestUrl : requestUrl.slice(0, separator)
    const query = separator === -1 ? '' : requestUrl.slice(separator + 1)
    if (!rawPath.startsWith(proxyBasePath) || /%25/i.test(rawPath)) {
      return ''
    }

    let pathname = ''
    try {
      pathname = decodeURIComponent(rawPath)
    } catch {
      return ''
    }
    if (pathname.includes('..') || pathname.includes('\\')) {
      return ''
    }

    const suffix = pathname.slice(proxyBasePath.length) || '/'
    if (websocket) {
      return req.method === 'GET' &&
        suffix === '/ws' &&
        !query &&
        isViteStrictSameOriginMutation(req) &&
        String(req.headers.upgrade ?? '').toLowerCase() === 'websocket' &&
        String(req.headers.connection ?? '')
          .toLowerCase()
          .split(',')
          .some((token) => token.trim() === 'upgrade')
        ? '/ws'
        : ''
    }

    if (
      req.method === 'GET' &&
      suffix === '/rest/items' &&
      query === 'recursive=false'
    ) {
      return '/rest/items?recursive=false'
    }
    if (
      req.method === 'POST' &&
      /^\/rest\/items\/[A-Za-z0-9_]+$/.test(suffix) &&
      !query &&
      isViteStrictSameOriginMutation(req)
    ) {
      return suffix
    }
    return ''
  }

  const resolveOpenHABTargetUrl = (
    suffix: string,
    session: OpenHABSessionData
  ) => {
    const baseUrl = normalizeOpenHABBaseUrl(session.hassUrl)
    if (!baseUrl || !suffix) {
      throw new Error('Invalid proxy target')
    }
    return new URL(`${baseUrl}${suffix}`)
  }

  const handleUpgrade = (
    req: IncomingMessage,
    socket: import('node:net').Socket,
    head: Buffer
  ) => {
    if (!req.url?.startsWith(proxyBasePath)) {
      return
    }

    const suffix = resolveAllowedSuffix(req, true)
    if (!suffix) {
      sendUpgradeError(socket, 403, 'Forbidden openHAB websocket request')
      return
    }

    const session = getOpenHABSession(req)
    if (!session) {
      sendUpgradeError(socket, 502, 'openHAB session is required')
      return
    }

    let targetUrl: URL
    try {
      targetUrl = resolveOpenHABTargetUrl(suffix, session)
    } catch {
      sendUpgradeError(socket, 400, 'Invalid proxy target')
      return
    }

    targetUrl.protocol = targetUrl.protocol === 'https:' ? 'wss:' : 'ws:'

    const isSecureWebSocket = targetUrl.protocol === 'wss:'
    const upstreamHostname = targetUrl.hostname.replace(/^\[|\]$/g, '')
    const upstreamSocket = isSecureWebSocket
      ? connectTls({
          host: upstreamHostname,
          port: targetUrl.port ? Number(targetUrl.port) : 443,
          rejectUnauthorized: !/^(1|true|yes)$/i.test(
            process.env.NAVET_ALLOW_INSECURE_PROVIDER_TLS ?? ''
          ),
          ...(isIP(upstreamHostname) === 0 ? { servername: upstreamHostname } : {}),
        })
      : connectNet({
          host: upstreamHostname,
          port: targetUrl.port ? Number(targetUrl.port) : 80,
        })

    let responseStarted = false
    let handshakeBuffer = Buffer.alloc(0)

    upstreamSocket.on(isSecureWebSocket ? 'secureConnect' : 'connect', () => {
      const forwardedHeaders = [
        `Host: ${targetUrl.host}`,
        `Authorization: ${toOpenHABBasicAuthHeader(session)}`,
        'Upgrade: websocket',
        'Connection: Upgrade',
      ]
      for (const headerName of [
        'sec-websocket-key',
        'sec-websocket-version',
        'sec-websocket-protocol',
        'sec-websocket-extensions',
      ]) {
        const value = req.headers[headerName]
        if (typeof value === 'string' && value) {
          forwardedHeaders.push(`${headerName}: ${value}`)
        }
      }

      upstreamSocket.write(
        [`GET ${targetUrl.pathname}${targetUrl.search} HTTP/1.1`, ...forwardedHeaders, '', ''].join(
          '\r\n'
        )
      )

      if (head.length > 0) {
        upstreamSocket.write(head)
      }
    })

    const handleHandshakeData = (chunk: Buffer) => {
      handshakeBuffer = Buffer.concat([handshakeBuffer, chunk])
      if (handshakeBuffer.byteLength > maxWebSocketHandshakeBytes) {
        upstreamSocket.destroy()
        sendUpgradeError(socket, 502, 'Invalid openHAB websocket response')
        return
      }

      const separator = handshakeBuffer.indexOf('\r\n\r\n')
      if (separator === -1) {
        return
      }
      upstreamSocket.off('data', handleHandshakeData)
      const headerLines = handshakeBuffer
        .subarray(0, separator)
        .toString('latin1')
        .split('\r\n')
      if (!/^HTTP\/1\.[01] 101\b/.test(headerLines[0] ?? '')) {
        upstreamSocket.destroy()
        sendUpgradeError(socket, 502, 'openHAB websocket upgrade failed')
        return
      }

      const blockedResponseHeaders = new Set([
        'access-control-allow-credentials',
        'access-control-allow-headers',
        'access-control-allow-methods',
        'access-control-allow-origin',
        'access-control-expose-headers',
        'access-control-max-age',
        'location',
        'set-cookie',
        'www-authenticate',
        'x-accel-buffering',
        'x-accel-charset',
        'x-accel-expires',
        'x-accel-limit-rate',
        'x-accel-redirect',
      ])
      const sanitizedHeaders = headerLines.slice(1).filter((line) => {
        const headerSeparator = line.indexOf(':')
        return (
          headerSeparator > 0 &&
          !blockedResponseHeaders.has(
            line.slice(0, headerSeparator).trim().toLowerCase()
          )
        )
      })

      responseStarted = true
      socket.write(
        [headerLines[0], ...sanitizedHeaders, '', ''].join('\r\n')
      )
      const remainder = handshakeBuffer.subarray(separator + 4)
      if (remainder.byteLength > 0) {
        socket.write(remainder)
      }
      upstreamSocket.pipe(socket)
      socket.pipe(upstreamSocket)
    }
    upstreamSocket.on('data', handleHandshakeData)

    upstreamSocket.on('error', () => {
      if (!responseStarted) {
        sendUpgradeError(socket, 502, 'Unable to connect to openHAB websocket')
      } else {
        socket.destroy()
      }
    })

    socket.on('error', () => {
      upstreamSocket.destroy()
    })

    socket.on('close', () => {
      upstreamSocket.destroy()
    })
  }

  const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.statusCode = 400
      res.end('Missing proxy path')
      return
    }

    try {
      const suffix = resolveAllowedSuffix(req, false)
      if (!suffix) {
        res.statusCode = 403
        res.end('Forbidden openHAB proxy request')
        return
      }

      const session = getOpenHABSession(req, res)
      if (!session) {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'openHAB session is required' }))
        return
      }

      const targetUrl = resolveOpenHABTargetUrl(suffix, session)

      const headers = new Headers()
      const contentType =
        typeof req.headers['content-type'] === 'string' ? req.headers['content-type'] : null
      const accept = typeof req.headers.accept === 'string' ? req.headers.accept : null
      if (contentType) {
        headers.set('Content-Type', contentType)
      }
      if (accept) {
        headers.set('Accept', accept)
      } else {
        headers.set('Accept', 'application/json')
      }
      headers.set('Authorization', toOpenHABBasicAuthHeader(session))

      let body: string | undefined
      if (req.method === 'POST') {
        const chunks: Buffer[] = []
        let size = 0
        for await (const chunk of req) {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
          size += buffer.byteLength
          if (size > OPENHAB_SESSION_MAX_BYTES) {
            res.statusCode = 413
            res.end('openHAB command is too large')
            return
          }
          chunks.push(buffer)
        }
        body = Buffer.concat(chunks).toString('utf8')
      }

      const abortController = new AbortController()

      const upstreamResponse = await fetch(targetUrl, {
        method: req.method,
        redirect: 'manual',
        headers,
        body,
        signal: abortController.signal,
      })

      res.statusCode = upstreamResponse.status
      setSecurityHeaders(res)
      const responseContentType = upstreamResponse.headers.get('content-type')
      if (responseContentType) {
        res.setHeader('Content-Type', responseContentType)
      }

      if (!upstreamResponse.body) {
        res.end()
        return
      }

      await pipeReadableStreamToResponse(upstreamResponse.body, res, { req, abortController })
    } catch {
      res.statusCode = 502
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Unable to load openHAB resource' }))
    }
  }

  const registerUpgradeProxy = (server: ViteDevServer | PreviewServer) => {
    server.httpServer?.on('upgrade', (req, socket, head) => {
      handleUpgrade(req, socket, head)
    })
  }

  return {
    name: 'navet-openhab-proxy',
    configureServer(server: ViteDevServer) {
      registerUpgradeProxy(server)
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith(proxyBasePath)) {
          next()
          return
        }
        await handleRequest(req, res)
      })
    },
    configurePreviewServer(server: PreviewServer) {
      registerUpgradeProxy(server)
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith(proxyBasePath)) {
          next()
          return
        }
        await handleRequest(req, res)
      })
    },
  }
}

function authSessionStorePlugin(
  installationAuthority: ViteInstallationAuthority
) {
  const authSessionStore = createViteAuthSessionStore(
    undefined,
    undefined,
    installationAuthority.getCookieNames(AUTH_COOKIE_NAME)
  )
  const handleRequest = createViteAuthRequestHandler(
    authSessionStore,
    fetch,
    installationAuthority
  )

  const registerMiddleware = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use('/__navet_auth__', async (req, res) => {
      await handleRequest(req, res)
    })
  }

  return {
    name: 'navet-auth-session-store',
    api: {
      getAuthSession(req: IncomingMessage): HomeAssistantAuthData | null {
        return resolveViteAuthSession(req, authSessionStore)?.auth ?? null
      },
      resolveAuthenticatedPrincipal(
        req: IncomingMessage,
        options?: { trustIngressHeaders?: boolean }
      ): ViteAuthenticatedPrincipal | null {
        return resolveViteAuthenticatedPrincipal(req, authSessionStore, options)
      },
    },
    configureServer: registerMiddleware,
    configurePreviewServer: registerMiddleware,
  }
}

function dashboardProfileStorePlugin(
  installationAuthority: ViteInstallationAuthority,
  resolvePrincipal: (
    req: IncomingMessage
  ) => ViteDashboardProfilePrincipal | null | Promise<ViteDashboardProfilePrincipal | null>
) {
  const handleRequest = createViteDashboardProfileRequestHandler({
    cookieNames: installationAuthority.getCookieNames('navet_profile_client'),
    resolvePrincipal,
  })
  const registerMiddleware = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use('/__navet_profile__', async (req, res) => {
      await handleRequest(req, res)
    })
  }

  return {
    name: 'navet-dashboard-profile-store',
    configureServer: registerMiddleware,
    configurePreviewServer: registerMiddleware,
  }
}

function choreStorePlugin(
  resolvePrincipal: (
    req: IncomingMessage
  ) => ViteDashboardProfilePrincipal | null | Promise<ViteDashboardProfilePrincipal | null>
) {
  const handleRequest = createViteChoreStoreRequestHandler({ resolvePrincipal })
  const registerMiddleware = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use('/__navet_chores__', async (req, res) => {
      await handleRequest(req, res)
    })
  }

  return {
    name: 'navet-chore-store',
    configureServer: registerMiddleware,
    configurePreviewServer: registerMiddleware,
  }
}

function homeySessionStorePlugin(
  installationAuthority: ViteInstallationAuthority
) {
  const HOMEY_SESSION_COOKIE_NAME = installationAuthority.getCookieNames(
    HOMEY_SESSION_COOKIE_BASE_NAME
  )
  const homeySessionStore = createViteHomeySessionStore({
    cookieNames: HOMEY_SESSION_COOKIE_NAME,
  })
  const athomApiBaseUrl = 'https://api.athom.com'
  const defaultHomeyCallbackPath = '/__navet_homey__/callback'
  const sessionTouchIntervalMs = 24 * 60 * 60 * 1000

  class HomeyRefreshError extends Error {
    readonly confirmedInvalid: boolean

    constructor(message: string, confirmedInvalid: boolean) {
      super(message)
      this.confirmedInvalid = confirmedInvalid
    }
  }

  class HomeySessionSupersededError extends Error {}

  const setNoStoreHeaders = (res: ServerResponse) => {
    res.setHeader('Cache-Control', 'no-store')
  }

  const sendJson = (res: ServerResponse, statusCode: number, payload: Record<string, unknown>) => {
    res.statusCode = statusCode
    setNoStoreHeaders(res)
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(payload))
  }

  const sendNoContent = (res: ServerResponse) => {
    res.statusCode = 204
    setNoStoreHeaders(res)
    res.end()
  }

  const sendSessionStoreError = (res: ServerResponse, error: unknown) => {
    let code: string
    let status: number
    if (isViteProviderSessionRecordTooLargeError(error)) {
      code = PROVIDER_SESSION_RECORD_TOO_LARGE_ERROR_CODE
      status = PROVIDER_SESSION_RECORD_TOO_LARGE_STATUS
    } else if (isViteProviderSessionCapacityError(error)) {
      code = PROVIDER_SESSION_CAPACITY_ERROR_CODE
      status = PROVIDER_SESSION_CAPACITY_STATUS
    } else {
      return false
    }
    sendJson(res, status, {
      error: error.message,
      code,
    })
    return true
  }

  const getHomeyCallbackPath = (redirectUri: string) => {
    try {
      const pathname = new URL(redirectUri).pathname.trim()
      return pathname || defaultHomeyCallbackPath
    } catch {
      return defaultHomeyCallbackPath
    }
  }

  const getHomeyOAuthConfig = (req: IncomingMessage) => {
    const clientId = process.env.NAVET_HOMEY_CLIENT_ID?.trim()
    const clientSecret = process.env.NAVET_HOMEY_CLIENT_SECRET?.trim()
    const redirectUri =
      process.env.NAVET_HOMEY_REDIRECT_URI?.trim() ??
      `${getViteProviderRequestOrigin(req)}${defaultHomeyCallbackPath}`
    const callbackPath = getHomeyCallbackPath(redirectUri)

    return {
      clientId,
      clientSecret,
      redirectUri,
      callbackPath,
    }
  }

  const normalizeHomeyReturnTo = (value: unknown, req: IncomingMessage) => {
    const rawIngressPath =
      typeof req.headers['x-ingress-path'] === 'string'
        ? req.headers['x-ingress-path'].trim()
        : ''
    const ingressPath =
      rawIngressPath && rawIngressPath !== '/'
        ? `/${rawIngressPath.replace(/^\/+|\/+$/g, '')}`
        : ''
    const fallback = ingressPath ? `${ingressPath}/` : '/'
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
      return fallback
    }

    try {
      const origin = getViteProviderRequestOrigin(req)
      const parsed = new URL(value, origin)
      if (
        parsed.origin !== origin ||
        (ingressPath &&
          parsed.pathname !== ingressPath &&
          !parsed.pathname.startsWith(`${ingressPath}/`))
      ) {
        return fallback
      }
      for (const parameter of [
        'homey_oauth_callback',
        'homey_oauth_error',
        'code',
        'state',
        'error',
        'error_description',
        'error_uri',
      ]) {
        parsed.searchParams.delete(parameter)
      }
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    } catch {
      return fallback
    }
  }

  const encodeClientCredentials = (clientId: string, clientSecret: string) =>
    Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const normalizeHomeyOAuthToken = (value: unknown) => {
    if (!value || typeof value !== 'object') {
      return null
    }
    const token = value as Record<string, unknown>
    const accessToken =
      typeof token.access_token === 'string' ? token.access_token.trim() : ''
    const refreshToken =
      typeof token.refresh_token === 'string' ? token.refresh_token.trim() : ''
    const expiresIn = Number(token.expires_in)
    return accessToken &&
      refreshToken &&
      Number.isFinite(expiresIn) &&
      expiresIn > 0
      ? {
          accessToken,
          refreshToken,
          expiresIn,
        }
      : null
  }

  const getHomeyBaseUrlCandidates = (homey: HomeySessionData['homeys'][number]) =>
    Array.from(
      new Set([homey.localUrlSecure, homey.localUrl, homey.remoteUrl].filter(Boolean))
    ) as string[]

  const sanitizeHomeySession = (session: HomeySessionData) => ({
    userId: session.userId ?? null,
    user: session.user ?? null,
    homeys: session.homeys,
    selectedHomeyId: session.selectedHomeyId ?? null,
    homeyBaseUrl: session.homeyBaseUrl ?? null,
    hasActiveHomeySession: Boolean(session.homeySessionToken),
  })

  const getHomeyUserName = (user: {
    firstname?: string | null
    lastname?: string | null
    name?: string | null
    email?: string | null
  }) => {
    const first = user.firstname?.trim() ?? ''
    const last = user.lastname?.trim() ?? ''
    const fullName = `${first} ${last}`.trim()
    return fullName || user.name?.trim() || user.email?.trim() || 'Homey User'
  }

  const getHomeyUserAvatarUrl = (user: {
    avatar?: string | null
    avatarUrl?: string | null
    image?: string | null
    imageUrl?: string | null
    gravatar?: string | null
  }) => {
    const candidates = [
      user.avatarUrl,
      user.imageUrl,
      user.avatar,
      user.image,
      user.gravatar,
    ]

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim()
      }
    }

    return null
  }

  const refreshHomeyAccessToken = async (
    session: HomeySessionData,
    req: IncomingMessage,
    persistSession: (session: HomeySessionData) => void
  ): Promise<HomeySessionData> => {
    if (session.expiresAt > Date.now() + 30_000) {
      return session
    }

    const { clientId, clientSecret } = getHomeyOAuthConfig(req)
    if (!clientId || !clientSecret) {
      throw new Error('Homey OAuth credentials are not configured')
    }

    const response = await fetch(`${athomApiBaseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encodeClientCredentials(clientId, clientSecret)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken,
      }),
    })

    if (!response.ok) {
      let payload: { error?: unknown } | null = null
      try {
        payload = JSON.parse(await response.text()) as { error?: unknown }
      } catch {
        payload = null
      }
      throw new HomeyRefreshError(
        'Unable to refresh Homey OAuth token',
        isConfirmedInvalidHomeyRefreshError(payload)
      )
    }

    const token = normalizeHomeyRefreshTokenPayload(
      await response.json(),
      session.refreshToken
    )
    if (!token) {
      throw new HomeyRefreshError(
        'Homey OAuth refresh returned an invalid token',
        false
      )
    }

    const nextSession: HomeySessionData = {
      ...session,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: Date.now() + token.expiresIn * 1000,
    }

    persistSession(nextSession)
    return nextSession
  }

  const loadAuthenticatedUser = async (accessToken: string) => {
    const response = await fetch(`${athomApiBaseUrl}/user/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error('Unable to load Homey account')
    }

    return (await response.json()) as {
      _id?: string
      firstname?: string | null
      lastname?: string | null
      name?: string | null
      email?: string | null
      avatar?: string | null
      avatarUrl?: string | null
      image?: string | null
      imageUrl?: string | null
      gravatar?: string | null
      homeys?: Array<{
        _id?: string
        name?: string
        platform?: string | null
        localUrl?: string | null
        localUrlSecure?: string | null
        remoteUrl?: string | null
      }>
    }
  }

  const createHomeySession = async (
    accessToken: string,
    homey: HomeySessionData['homeys'][number]
  ) => {
    const homeyBaseUrls = getHomeyBaseUrlCandidates(homey)
    if (homeyBaseUrls.length === 0) {
      throw new Error('The selected Homey has no usable URL')
    }

    const delegationResponse = await fetch(`${athomApiBaseUrl}/delegation/token?audience=homey`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!delegationResponse.ok) {
      throw new Error('Unable to create Homey delegation token')
    }

    const delegationToken = JSON.parse(await delegationResponse.text()) as string

    let lastError: Error | null = null
    const failedTargets: string[] = []

    for (const homeyBaseUrl of homeyBaseUrls) {
      try {
        const sessionResponse = await fetch(`${homeyBaseUrl}/api/manager/users/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: delegationToken,
          }),
        })

        if (!sessionResponse.ok) {
          failedTargets.push(`${homeyBaseUrl} -> HTTP ${sessionResponse.status}`)
          lastError = new Error('Unable to create Homey session')
          continue
        }

        const homeySessionToken = JSON.parse(await sessionResponse.text()) as string
        return {
          homeyBaseUrl,
          homeySessionToken,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        failedTargets.push(`${homeyBaseUrl} -> ${message}`)
        lastError = error instanceof Error ? error : new Error('Unable to create Homey session')
      }
    }

    const detail = failedTargets.length > 0 ? ` (${failedTargets.join('; ')})` : ''
    throw new Error((lastError?.message ?? 'Unable to create Homey session') + detail)
  }

  const readRequestBody = async (req: IncomingMessage) => {
    const chunks: Buffer[] = []
    let size = 0

    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      size += buffer.byteLength
      if (size > HOMEY_SESSION_MAX_BYTES) {
        throw new Error('Homey session is too large')
      }
      chunks.push(buffer)
    }

    return Buffer.concat(chunks).toString('utf8')
  }

  const writeHomeyRecord = (
    cookieId: string,
    record: ViteStoredHomeySession,
    overrides: Partial<Pick<ViteStoredHomeySession, 'auth' | 'pending'>>
  ) => {
    const next: ViteStoredHomeySession = {
      ...record,
      ...overrides,
      updatedAt: Date.now(),
    }
    homeySessionStore.writeSession(cookieId, next)
    return next
  }

  const touchHomeyRecord = (
    req: IncomingMessage,
    res: ServerResponse | undefined,
    context: { cookieId: string; session: ViteStoredHomeySession }
  ) => {
    let next = context.session
    if (next.updatedAt + sessionTouchIntervalMs < Date.now()) {
      next = writeHomeyRecord(context.cookieId, next, {})
    }
    if (res) {
      setViteProviderSessionCookie(
        req,
        res,
        HOMEY_SESSION_COOKIE_NAME,
        context.cookieId
      )
    }
    return next
  }

  const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === 'GET') {
      const context = getViteProviderRequestSession(
        req,
        HOMEY_SESSION_COOKIE_NAME,
        homeySessionStore
      )
      if (!context?.session.auth) {
        sendNoContent(res)
        return
      }

      let record = context.session
      const sendLatestSessionOrNoContent = () => {
        const latest = homeySessionStore.readSession(context.cookieId)
        if (!latest?.auth) {
          sendNoContent(res)
          return
        }
        setViteProviderSessionCookie(
          req,
          res,
          HOMEY_SESSION_COOKIE_NAME,
          context.cookieId
        )
        sendJson(res, 200, sanitizeHomeySession(latest.auth))
      }
      const persistSession = (session: HomeySessionData) => {
        const current = homeySessionStore.readSession(context.cookieId)
        if (!current || JSON.stringify(current) !== JSON.stringify(record)) {
          throw new HomeySessionSupersededError()
        }
        record = writeHomeyRecord(context.cookieId, record, { auth: session })
      }
      let session: HomeySessionData
      try {
        session = await refreshHomeyAccessToken(
          context.session.auth,
          req,
          persistSession
        )
      } catch (error) {
        if (sendSessionStoreError(res, error)) {
          return
        }
        if (error instanceof HomeySessionSupersededError) {
          sendLatestSessionOrNoContent()
          return
        }
        if (error instanceof HomeyRefreshError && error.confirmedInvalid) {
          const current = homeySessionStore.readSession(context.cookieId)
          if (
            !current ||
            JSON.stringify(current) !== JSON.stringify(record)
          ) {
            sendLatestSessionOrNoContent()
            return
          }
          clearViteProviderSessionCookie(
            req,
            res,
            HOMEY_SESSION_COOKIE_NAME,
            homeySessionStore
          )
          if (HOMEY_SESSION_COOKIE_NAME.scoped) {
            deleteViteProviderRequestSessions(
              req,
              HOMEY_SESSION_COOKIE_NAME,
              homeySessionStore
            )
          } else {
            homeySessionStore.deleteSession(context.cookieId)
          }
          sendNoContent(res)
          return
        }
        session = context.session.auth
      }
      const current = homeySessionStore.readSession(context.cookieId)
      if (!current || JSON.stringify(current) !== JSON.stringify(record)) {
        sendLatestSessionOrNoContent()
        return
      }
      touchHomeyRecord(req, res, { cookieId: context.cookieId, session: record })
      res.statusCode = 200
      setNoStoreHeaders(res)
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify(sanitizeHomeySession(session)))
      return
    }

    if (req.method === 'DELETE') {
      const context = getViteProviderRequestSession(
        req,
        HOMEY_SESSION_COOKIE_NAME,
        homeySessionStore
      )
      if (!context) {
        sendJson(res, 401, { error: 'Bound browser session is required' })
        return
      }
      if (!isViteStrictSameOriginMutation(req)) {
        sendJson(res, 403, { error: 'Cross-origin session mutation is not allowed' })
        return
      }

      clearViteProviderSessionCookie(
        req,
        res,
        HOMEY_SESSION_COOKIE_NAME,
        homeySessionStore
      )
      deleteViteProviderRequestSessions(
        req,
        HOMEY_SESSION_COOKIE_NAME,
        homeySessionStore
      )
      sendJson(res, 200, { ok: true })
      return
    }

    res.setHeader('Allow', 'GET, DELETE')
    sendJson(res, 405, { error: 'Method not allowed' })
  }

  const registerMiddleware = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use('/__navet_homey__/authorize', async (req, res) => {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST')
        sendJson(res, 405, { error: 'Method not allowed' })
        return
      }
      if (!isViteStrictSameOriginMutation(req)) {
        sendJson(res, 403, { error: 'Cross-origin OAuth start is not allowed' })
        return
      }
      const installationAuthorization =
        installationAuthority.authorizeHomeyStart(req)
      if (!installationAuthorization.allowed) {
        sendJson(res, 403, {
          error: 'Homey enrollment is not authorized for this installation',
        })
        return
      }

      const { clientId, redirectUri } = getHomeyOAuthConfig(req)
      if (!clientId) {
        sendJson(res, 500, { error: 'Homey OAuth client ID is not configured' })
        return
      }

      let body: { returnTo?: unknown }
      try {
        body = JSON.parse(await readRequestBody(req)) as { returnTo?: unknown }
      } catch {
        sendJson(res, 400, { error: 'Invalid Homey OAuth request' })
        return
      }
      let context: {
        cookieId: string
        session: ViteStoredHomeySession
      }
      let state: string
      try {
        context = createViteProviderRequestSession(
          req,
          res,
          HOMEY_SESSION_COOKIE_NAME,
          homeySessionStore
        )
        state = createViteProviderState()
        writeHomeyRecord(context.cookieId, context.session, {
          pending: {
            state,
            returnTo: normalizeHomeyReturnTo(body.returnTo, req),
            expiresAt: Date.now() + HOMEY_OAUTH_PENDING_TTL_MS,
            installationPairingVerified:
              installationAuthorization.pairingVerified,
          },
        })
      } catch (error) {
        if (sendSessionStoreError(res, error)) {
          return
        }
        throw error
      }

      const loginUrl = new URL(`${athomApiBaseUrl}/oauth2/authorise`)
      loginUrl.searchParams.set('response_type', 'code')
      loginUrl.searchParams.set('client_id', clientId)
      loginUrl.searchParams.set('redirect_uri', redirectUri)
      loginUrl.searchParams.set('state', state)

      sendJson(res, 200, { authorizeUrl: loginUrl.toString() })
    })

    server.middlewares.use(async (req, res, next) => {
      const { callbackPath } = getHomeyOAuthConfig(req)
      const requestPath = new URL(req.url ?? '/', getViteProviderRequestOrigin(req)).pathname
      if (requestPath !== callbackPath) {
        next()
        return
      }

      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        sendJson(res, 405, { error: 'Method not allowed' })
        return
      }

      const requestUrl = new URL(req.url ?? '/', getViteProviderRequestOrigin(req))
      const code = requestUrl.searchParams.get('code')?.trim() ?? ''
      const state = requestUrl.searchParams.get('state')?.trim() ?? ''
      const providerError =
        requestUrl.searchParams.get('error')?.trim() ?? ''
      const { clientId, clientSecret, redirectUri } = getHomeyOAuthConfig(req)
      const context = state
        ? findViteProviderRequestSession(
            req,
            HOMEY_SESSION_COOKIE_NAME,
            homeySessionStore,
            (candidate) => candidate.session.pending?.state === state
          )
        : null
      const pending = context?.session.pending

      if (
        !context ||
        !pending ||
        !state ||
        state !== pending.state ||
        pending.expiresAt < Date.now()
      ) {
        sendJson(res, 400, {
          error: 'Homey OAuth callback does not match this browser session',
        })
        return
      }

      // Consume the browser-bound state before any upstream request. This makes
      // parallel callbacks and retries replay-resistant even when exchange fails.
      const consumed = writeHomeyRecord(context.cookieId, context.session, {
        pending: {
          ...pending,
          state: createViteProviderState(),
        },
      })

      const redirectFailure = (failure: HomeyOAuthFailureCode) => {
        res.statusCode = 302
        setNoStoreHeaders(res)
        res.setHeader(
          'Location',
          appendHomeyOAuthFailureMarker(pending.returnTo, failure)
        )
        res.end()
      }

      if (providerError) {
        redirectFailure(
          providerError === 'access_denied'
            ? 'access_denied'
            : 'temporarily_unavailable'
        )
        return
      }
      if (!code) {
        redirectFailure('callback_incomplete')
        return
      }
      if (!clientId || !clientSecret) {
        redirectFailure('temporarily_unavailable')
        return
      }

      try {
        const tokenResponse = await fetch(`${athomApiBaseUrl}/oauth2/token`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${encodeClientCredentials(clientId, clientSecret)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
          }),
        })

        if (!tokenResponse.ok) {
          redirectFailure('temporarily_unavailable')
          return
        }

        let token: ReturnType<typeof normalizeHomeyOAuthToken>
        try {
          token = normalizeHomeyOAuthToken(await tokenResponse.json())
        } catch {
          token = null
        }
        if (!token) {
          redirectFailure('invalid_response')
          return
        }
        const user = await loadAuthenticatedUser(token.accessToken)
        const mappedHomeys =
          user.homeys?.map((homey) =>
            homey._id && homey.name
              ? {
                  id: homey._id,
                  name: homey.name,
                  platform: homey.platform ?? null,
                  localUrl: homey.localUrl ?? null,
                  localUrlSecure: homey.localUrlSecure ?? null,
                  remoteUrl: homey.remoteUrl ?? null,
                }
              : null
          ) ?? []
        const homeys = mappedHomeys.filter(
          (
            homey
          ): homey is {
            id: string
            name: string
            platform: string | null
            localUrl: string | null
            localUrlSecure: string | null
            remoteUrl: string | null
          } => Boolean(homey)
        )
        const authorityCurrent = homeySessionStore.readSession(context.cookieId)
        if (
          !authorityCurrent ||
          JSON.stringify(authorityCurrent) !== JSON.stringify(consumed)
        ) {
          redirectFailure('session_changed')
          return
        }
        if (
          !installationAuthority.commitHomey(
            homeys.map((homey) => homey.id),
            pending.installationPairingVerified === true
          )
        ) {
          redirectFailure('not_authorized')
          return
        }

        let session: HomeySessionData = {
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          expiresAt: Date.now() + token.expiresIn * 1000,
          userId: user._id ?? null,
          user: {
            id: user._id ?? null,
            name: getHomeyUserName(user),
            avatarUrl: getHomeyUserAvatarUrl(user),
            email: user.email ?? null,
          },
          homeys,
          selectedHomeyId: null,
          homeyBaseUrl: null,
          homeySessionToken: null,
        }

        if (homeys.length === 1) {
          try {
            const selection = await createHomeySession(session.accessToken, homeys[0])
            session = {
              ...session,
              selectedHomeyId: homeys[0].id,
              homeyBaseUrl: selection.homeyBaseUrl,
              homeySessionToken: selection.homeySessionToken,
            }
          } catch {
            session = {
              ...session,
              selectedHomeyId: homeys[0].id,
              homeyBaseUrl:
                homeys[0].localUrlSecure ?? homeys[0].localUrl ?? homeys[0].remoteUrl ?? null,
              homeySessionToken: null,
            }
          }
        }

        const now = Date.now()
        const current = homeySessionStore.readSession(context.cookieId)
        if (
          !current ||
          JSON.stringify(current) !== JSON.stringify(consumed)
        ) {
          redirectFailure('session_changed')
          return
        }
        rotateViteProviderRequestSession(
          req,
          res,
          HOMEY_SESSION_COOKIE_NAME,
          homeySessionStore,
          context.cookieId,
          {
            version: 1,
            createdAt: now,
            updatedAt: now,
            auth: session,
            pending: null,
          }
        )
        res.statusCode = 302
        setNoStoreHeaders(res)
        res.setHeader(
          'Location',
          appendHomeyOAuthCallbackMarker(pending.returnTo)
        )
        res.end()
      } catch {
        redirectFailure('temporarily_unavailable')
      }
    })

    server.middlewares.use('/__navet_homey__/session', async (req, res) => {
      await handleRequest(req, res)
    })

    server.middlewares.use('/__navet_homey__/session/select', async (req, res) => {
      if (req.method !== 'PUT') {
        res.setHeader('Allow', 'PUT')
        sendJson(res, 405, { error: 'Method not allowed' })
        return
      }
      if (!isViteStrictSameOriginMutation(req)) {
        sendJson(res, 403, { error: 'Cross-origin session mutation is not allowed' })
        return
      }

      const context = getViteProviderRequestSession(
        req,
        HOMEY_SESSION_COOKIE_NAME,
        homeySessionStore
      )
      if (!context?.session.auth) {
        sendJson(res, 401, { error: 'Bound Homey OAuth session is required' })
        return
      }
      let record = context.session

      try {
        const persistSession = (session: HomeySessionData) => {
          const current = homeySessionStore.readSession(context.cookieId)
          if (!current || JSON.stringify(current) !== JSON.stringify(record)) {
            throw new HomeySessionSupersededError()
          }
          record = writeHomeyRecord(context.cookieId, record, { auth: session })
        }
        const session = await refreshHomeyAccessToken(
          context.session.auth,
          req,
          persistSession
        )
        const body = JSON.parse(await readRequestBody(req)) as { homeyId?: string }
        const homeyId = body.homeyId?.trim()
        if (!homeyId) {
          sendJson(res, 400, { error: 'homeyId is required' })
          return
        }

        const homey = session.homeys.find((entry) => entry.id === homeyId)
        if (!homey) {
          sendJson(res, 404, { error: 'Homey not found in OAuth session' })
          return
        }

        const selection = await createHomeySession(session.accessToken, homey)
        const nextSession: HomeySessionData = {
          ...session,
          selectedHomeyId: homey.id,
          homeyBaseUrl: selection.homeyBaseUrl,
          homeySessionToken: selection.homeySessionToken,
        }

        persistSession(nextSession)
        sendJson(res, 200, sanitizeHomeySession(nextSession))
      } catch (error) {
        if (sendSessionStoreError(res, error)) {
          return
        }
        if (error instanceof HomeySessionSupersededError) {
          sendJson(res, 409, {
            error: 'Homey session changed before selection completed',
          })
          return
        }
        if (error instanceof HomeyRefreshError && error.confirmedInvalid) {
          const current = homeySessionStore.readSession(context.cookieId)
          if (
            !current ||
            JSON.stringify(current) !== JSON.stringify(record)
          ) {
            sendJson(res, 409, {
              error: 'Homey session changed before selection completed',
            })
            return
          }
          clearViteProviderSessionCookie(
            req,
            res,
            HOMEY_SESSION_COOKIE_NAME,
            homeySessionStore
          )
          if (HOMEY_SESSION_COOKIE_NAME.scoped) {
            deleteViteProviderRequestSessions(
              req,
              HOMEY_SESSION_COOKIE_NAME,
              homeySessionStore
            )
          } else {
            homeySessionStore.deleteSession(context.cookieId)
          }
          sendJson(res, 401, { error: 'Homey OAuth session has expired' })
          return
        }
        sendJson(res, 502, {
          error: 'Unable to select Homey',
          details:
            error instanceof Error && error.message.trim()
              ? error.message.trim()
              : 'Unknown error',
        })
      }
    })
  }

  return {
    name: 'navet-homey-session-store',
    api: {
      getHomeySession(
        req: IncomingMessage,
        res?: ServerResponse
      ): HomeySessionData | null {
        const context = getViteProviderRequestSession(
          req,
          HOMEY_SESSION_COOKIE_NAME,
          homeySessionStore
        )
        if (!context?.session.auth) {
          return null
        }
        touchHomeyRecord(req, res, context)
        return context.session.auth
      },
    },
    configureServer: registerMiddleware,
    configurePreviewServer: registerMiddleware,
  }
}

function openhabSessionStorePlugin(
  installationAuthority: ViteInstallationAuthority
) {
  const OPENHAB_SESSION_COOKIE_NAME = installationAuthority.getCookieNames(
    OPENHAB_SESSION_COOKIE_BASE_NAME
  )
  const openhabSessionStore = createViteOpenHABSessionStore({
    cookieNames: OPENHAB_SESSION_COOKIE_NAME,
  })
  const loginRateLimiter = createViteOpenHABLoginRateLimiter()
  const OPENHAB_VALIDATE_TIMEOUT_MS = 5_000
  const sessionTouchIntervalMs = 24 * 60 * 60 * 1000
  const openHABValidationError = 'Unable to verify the openHAB connection'

  const setNoStoreHeaders = (res: ServerResponse) => {
    res.setHeader('Cache-Control', 'no-store')
  }

  const sendJson = (res: ServerResponse, statusCode: number, payload: Record<string, unknown>) => {
    res.statusCode = statusCode
    setNoStoreHeaders(res)
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(payload))
  }

  const sendNoContent = (res: ServerResponse) => {
    res.statusCode = 204
    setNoStoreHeaders(res)
    res.end()
  }

  const sendSessionStoreError = (res: ServerResponse, error: unknown) => {
    let code: string
    let status: number
    if (isViteProviderSessionRecordTooLargeError(error)) {
      code = PROVIDER_SESSION_RECORD_TOO_LARGE_ERROR_CODE
      status = PROVIDER_SESSION_RECORD_TOO_LARGE_STATUS
    } else if (isViteProviderSessionCapacityError(error)) {
      code = PROVIDER_SESSION_CAPACITY_ERROR_CODE
      status = PROVIDER_SESSION_CAPACITY_STATUS
    } else {
      return false
    }
    sendJson(res, status, {
      error: error.message,
      code,
    })
    return true
  }

  const readRequestBody = async (req: IncomingMessage) => {
    const chunks: Buffer[] = []
    let size = 0

    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      size += buffer.byteLength
      if (size > OPENHAB_SESSION_MAX_BYTES) {
        throw new Error('openHAB session is too large')
      }
      chunks.push(buffer)
    }

    return Buffer.concat(chunks).toString('utf8')
  }

  const validateOpenHABSession = async (session: OpenHABSessionData) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), OPENHAB_VALIDATE_TIMEOUT_MS)

    try {
      const normalizedBaseUrl = normalizeOpenHABBaseUrl(session.hassUrl)
      if (!normalizedBaseUrl) {
        throw new Error(openHABValidationError)
      }
      const targetUrl = new URL(
        `${normalizedBaseUrl}/rest/items?recursive=false&limit=1`
      )
      const response = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          Accept: 'application/json',
          Authorization: toOpenHABBasicAuthHeader(session),
        },
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(openHABValidationError)
      }
      const payload: unknown = await response.json()
      if (!Array.isArray(payload)) {
        throw new Error(openHABValidationError)
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(openHABValidationError)
      }
      throw new Error(openHABValidationError)
    } finally {
      clearTimeout(timeoutId)
    }
  }

  const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === 'GET') {
      const context = getViteProviderRequestSession(
        req,
        OPENHAB_SESSION_COOKIE_NAME,
        openhabSessionStore
      )
      if (!context?.session.auth) {
        sendNoContent(res)
        return
      }

      if (context.session.updatedAt + sessionTouchIntervalMs < Date.now()) {
        openhabSessionStore.writeSession(context.cookieId, {
          ...context.session,
          updatedAt: Date.now(),
        })
      }
      setViteProviderSessionCookie(
        req,
        res,
        OPENHAB_SESSION_COOKIE_NAME,
        context.cookieId
      )
      sendJson(res, 200, {
        authenticated: true,
        hassUrl: context.session.auth.hassUrl,
      })
      return
    }

    if (req.method === 'PUT') {
      const context = getViteProviderRequestSession(
        req,
        OPENHAB_SESSION_COOKIE_NAME,
        openhabSessionStore
      )
      if (!isViteStrictSameOriginMutation(req)) {
        sendJson(res, 403, { error: 'Cross-origin session mutation is not allowed' })
        return
      }

      try {
        const body = await readRequestBody(req)
        const parsed = normalizeOpenHABSessionData(JSON.parse(body))
        if (!parsed) {
          sendJson(res, 400, { error: 'Unsupported openHAB session' })
          return
        }
        const installationAuthorization =
          installationAuthority.authorizeOpenHAB(
            req,
            parsed.hassUrl,
            normalizeOpenHABBaseUrl
          )
        if (!installationAuthorization.allowed) {
          sendJson(res, 403, {
            error: 'openHAB target is not authorized for this installation',
          })
          return
        }
        const rateLimit = loginRateLimiter.consume(req)
        if (!rateLimit.allowed) {
          res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds))
          sendJson(res, 429, {
            error: 'Too many openHAB login attempts. Try again later.',
          })
          return
        }

        await validateOpenHABSession(parsed)
        if (context) {
          const current = openhabSessionStore.readSession(context.cookieId)
          if (
            !current ||
            JSON.stringify(current) !== JSON.stringify(context.session)
          ) {
            sendJson(res, 409, {
              error: 'openHAB session changed before login completed',
            })
            return
          }
        }
        if (
          !installationAuthority.commitOpenHAB(
            parsed.hassUrl,
            normalizeOpenHABBaseUrl,
            installationAuthorization.pairingVerified
          )
        ) {
          sendJson(res, 403, {
            error: 'openHAB target is not authorized for this installation',
          })
          return
        }
        const now = Date.now()
        const next: ViteStoredOpenHABSession = {
          version: 1,
          createdAt: now,
          updatedAt: now,
          auth: parsed,
        }
        rotateViteProviderRequestSession(
          req,
          res,
          OPENHAB_SESSION_COOKIE_NAME,
          openhabSessionStore,
          context?.cookieId ?? '',
          next
        )
        loginRateLimiter.reset(req)
        sendJson(res, 200, {
          authenticated: true,
          hassUrl: parsed.hassUrl,
        })
      } catch (error) {
        if (sendSessionStoreError(res, error)) {
          loginRateLimiter.reset(req)
          return
        }
        sendJson(res, 400, { error: openHABValidationError })
      }
      return
    }

    if (req.method === 'DELETE') {
      const context = getViteProviderRequestSession(
        req,
        OPENHAB_SESSION_COOKIE_NAME,
        openhabSessionStore
      )
      if (!context) {
        sendJson(res, 401, { error: 'Bound browser session is required' })
        return
      }
      if (!isViteStrictSameOriginMutation(req)) {
        sendJson(res, 403, { error: 'Cross-origin session mutation is not allowed' })
        return
      }

      clearViteProviderSessionCookie(
        req,
        res,
        OPENHAB_SESSION_COOKIE_NAME,
        openhabSessionStore
      )
      deleteViteProviderRequestSessions(
        req,
        OPENHAB_SESSION_COOKIE_NAME,
        openhabSessionStore
      )
      sendJson(res, 200, { ok: true })
      return
    }

    res.setHeader('Allow', 'GET, PUT, DELETE')
    sendJson(res, 405, { error: 'Method not allowed' })
  }

  const registerMiddleware = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use('/__navet_openhab__/session', async (req, res) => {
      await handleRequest(req, res)
    })
  }

  return {
    name: 'navet-openhab-session-store',
    api: {
      getOpenHABSession(
        req: IncomingMessage,
        res?: ServerResponse
      ): OpenHABSessionData | null {
        const context = getViteProviderRequestSession(
          req,
          OPENHAB_SESSION_COOKIE_NAME,
          openhabSessionStore
        )
        if (!context?.session.auth) {
          return null
        }
        if (context.session.updatedAt + sessionTouchIntervalMs < Date.now()) {
          openhabSessionStore.writeSession(context.cookieId, {
            ...context.session,
            updatedAt: Date.now(),
          })
        }
        if (res) {
          setViteProviderSessionCookie(
            req,
            res,
            OPENHAB_SESSION_COOKIE_NAME,
            context.cookieId
          )
        }
        return context.session.auth
      },
    },
    configureServer: registerMiddleware,
    configurePreviewServer: registerMiddleware,
  }
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, repoRoot, '')
  if (env.NAVET_HOMEY_CLIENT_ID) {
    process.env.NAVET_HOMEY_CLIENT_ID = env.NAVET_HOMEY_CLIENT_ID
  }
  if (env.NAVET_HOMEY_CLIENT_SECRET) {
    process.env.NAVET_HOMEY_CLIENT_SECRET = env.NAVET_HOMEY_CLIENT_SECRET
  }
  if (env.NAVET_HOMEY_REDIRECT_URI) {
    process.env.NAVET_HOMEY_REDIRECT_URI = env.NAVET_HOMEY_REDIRECT_URI
  }
  const hassUrl = env.NAVET_HASS_URL?.trim().replace(/\/$/, '')
  const enableDemo = (env.NAVET_ENABLE_DEMO ?? process.env.NAVET_ENABLE_DEMO ?? 'true') !== 'false'
  const lifecycleEvent = process.env.npm_lifecycle_event ?? ''
  const commandLine = process.argv.join(' ')
  const isStorybook =
    env.STORYBOOK === '1' ||
    process.env.STORYBOOK === '1' ||
    lifecycleEvent.includes('storybook') ||
    commandLine.includes('storybook') ||
    commandLine.includes('chromatic')

  const resolveConfig = {
    alias: {
      '@assets': path.resolve(repoRoot, 'assets'),
      '@docs': path.resolve(repoRoot, 'docs'),
      '@website': path.resolve(repoRoot, 'apps/website/src'),
      '@navet/core': path.resolve(repoRoot, 'packages/core/src'),
      '@navet/ui': path.resolve(repoRoot, 'packages/ui/src'),
      '@navet/app': path.resolve(repoRoot, 'packages/app/src'),
      '@navet/provider-homeassistant': path.resolve(repoRoot, 'packages/provider-homeassistant/src'),
      '@navet/provider-homey': path.resolve(repoRoot, 'packages/provider-homey/src'),
      '@navet/provider-hubitat': path.resolve(repoRoot, 'packages/provider-hubitat/src'),
      '@navet/provider-openhab': path.resolve(repoRoot, 'packages/provider-openhab/src'),
      '@navet/provider-smartthings': path.resolve(repoRoot, 'packages/provider-smartthings/src'),
      '@docker': path.resolve(repoRoot, 'docker'),
      '@scripts': path.resolve(repoRoot, 'scripts'),
      ...(isStorybook
        ? {
            'virtual:pwa-register': path.resolve(
              repoRoot,
              'packages/app/src/test/mocks/virtual-pwa-register.ts'
            ),
          }
        : {}),
    },
  }

  const baseBuildConfig = {
    modulePreload: {
      resolveDependencies(_filename: string, deps: string[], context: { hostType: string }) {
        if (context.hostType !== 'html') {
          return deps
        }

        return deps.filter((dependency) => !isLazyHtmlPreload(dependency))
      },
    },
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name(id: string) {
                return getVendorChunkName(id) ?? 'vendor'
              },
              test(id: string) {
                return getVendorChunkName(id) !== undefined
              },
              entriesAware: true,
              includeDependenciesRecursively: false,
            },
          ],
        },
      },
    },
  } satisfies NonNullable<UserConfig['build']>

  function createAppPlugins() {
    const pwaCachePolicy = createVitePwaCachePolicy()
    const installationAuthority =
      command === 'serve' && mode !== 'test' && !isStorybook
        ? createViteInstallationAuthority({
            hassUrlPin: env.NAVET_HASS_URL?.trim(),
            installationKey: env.NAVET_INSTALLATION_KEY?.trim(),
            openhabUrlPin: env.NAVET_OPENHAB_URL?.trim(),
          })
        : DISABLED_INSTALLATION_AUTHORITY
    const authSessionPlugin = authSessionStorePlugin(installationAuthority)
    const dashboardProfilePlugin = dashboardProfileStorePlugin(
      installationAuthority,
      (req) =>
        (
          authSessionPlugin as PluginOption & {
            api?: {
              resolveAuthenticatedPrincipal?: (
                req: IncomingMessage,
                options?: { trustIngressHeaders?: boolean }
              ) => ViteAuthenticatedPrincipal | null
            }
          }
        ).api?.resolveAuthenticatedPrincipal?.(req, { trustIngressHeaders: false }) ?? null
    )
    const resolveAuthenticatedPrincipal = (req: IncomingMessage) =>
      (
        authSessionPlugin as PluginOption & {
          api?: {
            resolveAuthenticatedPrincipal?: (
              req: IncomingMessage,
              options?: { trustIngressHeaders?: boolean }
            ) => ViteAuthenticatedPrincipal | null
          }
        }
      ).api?.resolveAuthenticatedPrincipal?.(req, { trustIngressHeaders: false }) ?? null
    const choresPlugin = choreStorePlugin(resolveAuthenticatedPrincipal)
    const homeySessionPlugin = homeySessionStorePlugin(installationAuthority)
    const openhabSessionPlugin = openhabSessionStorePlugin(
      installationAuthority
    )
    const appPlugins: PluginOption[] = [
      react(),
      babel({
        include: REACT_COMPILER_INCLUDE,
        exclude: REACT_COMPILER_EXCLUDE,
        presets: [reactCompilerPreset()],
      }),
      tailwindcss(),
      rssProxyPlugin(),
      spotifyMetadataPlugin(),
      authSessionPlugin,
      dashboardProfilePlugin,
      choresPlugin,
      homeySessionPlugin,
      openhabSessionPlugin,
      homeAssistantProxyPlugin(
        (req) =>
          (
            authSessionPlugin as PluginOption & {
              api?: {
                getAuthSession?: (req: IncomingMessage) => HomeAssistantAuthData | null
              }
            }
          ).api?.getAuthSession?.(req) ?? null
      ),
      homeyProxyPlugin(
        (req, res) =>
          (
            homeySessionPlugin as PluginOption & {
              api?: {
                getHomeySession?: (
                  req: IncomingMessage,
                  res?: ServerResponse
                ) => HomeySessionData | null
              }
            }
          ).api?.getHomeySession?.(req, res) ?? null
      ),
      openhabProxyPlugin(
        (req, res) =>
          (
            openhabSessionPlugin as PluginOption & {
              api?: {
                getOpenHABSession?: (
                  req: IncomingMessage,
                  res?: ServerResponse
                ) => OpenHABSessionData | null
              }
            }
          ).api?.getOpenHABSession?.(req, res) ?? null
      ),
    ]

    if (!isStorybook) {
      const pwaPlugins = VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        manifestFilename: 'site.webmanifest',
        includeAssets: [...NAVET_PWA_INCLUDE_ASSETS],
        manifest: {
          ...publicWebManifest,
          start_url: './',
          scope: './',
          icons: publicWebManifest.icons.map((icon) => ({
            ...icon,
            src: `./${icon.src.replace(/^\/+/, '')}`,
          })),
        },
        workbox: {
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          navigateFallback: './index.html',
          navigateFallbackDenylist: [
            NAVET_INTERNAL_NAVIGATION_PATH_PATTERN,
          ],
          // Precache only the static entry graph referenced by index.html. Preloading every
          // route, locale, media codec, and card chunk made each install/update download and
          // write the entire application while a wall panel was in use.
          globPatterns: [
            'index.html',
            'offline.html',
            'boot-i18n.js',
            'assets/*.{css,js,svg,woff2}',
          ],
          manifestTransforms: [
            pwaCachePolicy.manifestTransform as VitePwaManifestTransform,
          ],
          runtimeCaching: [
            {
              urlPattern: isNavetRuntimeAssetRequest,
              handler: 'CacheFirst',
              options: {
                cacheName: 'navet-immutable-assets-v1',
                cacheableResponse: {
                  statuses: [0, 200],
                },
                expiration: {
                  maxAgeSeconds: 30 * 24 * 60 * 60,
                  maxEntries: 192,
                  purgeOnQuotaError: true,
                },
              },
            },
          ],
        },
      })
      appPlugins.push(
        pwaCachePolicy.capturePlugin,
        pwaPlugins,
        deferVitePwaGenerationUntilWriteBundle(pwaPlugins)
      )
    }

    return appPlugins
  }

  function createSharedConfig(overrides: UserConfig): UserConfig {
    return {
      root: import.meta.dirname,
      optimizeDeps: {
        exclude: ['maplibre-gl'],
      },
      publicDir: path.resolve(repoRoot, 'assets/public'),
      base: './',
      envPrefix: ['VITE_'],
      define: {
        __APP_VERSION__: JSON.stringify(packageJson.version ?? '0.0.0'),
        __APP_GIT_SHA__: JSON.stringify(buildMetadata.gitSha),
        __APP_BUILD_DATE__: JSON.stringify(buildMetadata.buildDate),
        __APP_RELEASE_CHANNEL__: JSON.stringify(buildMetadata.releaseChannel),
        __APP_BUILD_VERSION__: JSON.stringify(buildMetadata.buildVersion),
        __NAVET_ENABLE_DEMO__: JSON.stringify(enableDemo),
      },
      resolve: resolveConfig,
      assetsInclude: ['**/*.svg'],
      ...overrides,
    }
  }

  function createAppConfig(config: {
    cacheDir: string
    outDir?: string
    emptyOutDir?: boolean
    input?: string | Record<string, string>
  }): UserConfig {
    return createSharedConfig({
      cacheDir: path.resolve(repoRoot, config.cacheDir),
      plugins: createAppPlugins(),
      build: {
        ...baseBuildConfig,
        outDir: config.outDir ?? path.resolve(import.meta.dirname, 'dist'),
        emptyOutDir: config.emptyOutDir,
        rollupOptions: {
          ...baseBuildConfig.rollupOptions,
          ...(config.input ? { input: config.input } : {}),
          output: baseBuildConfig.rollupOptions?.output,
        },
      },
      server: {
        host: 'navet.local',
        port: 5200,
        strictPort: true,
        fs: {
          allow: [repoRoot],
        },
        proxy: hassUrl
          ? {
              '/api': {
                target: hassUrl,
                changeOrigin: true,
                secure: false,
              },
            }
          : undefined,
      },
    })
  }

  return createAppConfig({
    cacheDir: '.cache/vite-standalone',
    emptyOutDir: true,
  })
})
