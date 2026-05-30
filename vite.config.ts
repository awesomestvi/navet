import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { lookup } from 'node:dns/promises'
import { readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { isIP } from 'node:net'
import { Readable } from 'node:stream'
import path from 'path'
import {
  defineConfig,
  loadEnv,
  type PluginOption,
  type PreviewServer,
  type UserConfig,
  type ViteDevServer,
} from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import {
  createViteAuthSessionStore,
  type HomeAssistantAuthData,
  isValidAuthData,
} from './scripts/vite-auth-session-store'
import {
  buildDashboardProfileMetadata,
  createViteDashboardProfileStore,
  isValidDashboardProfileData,
} from './scripts/vite-dashboard-profile-store'
import { normalizeViteProxyTargetPath } from './scripts/vite-proxy-path'
import {
  createViteHomeySessionStore,
  type HomeySessionData,
  isValidHomeySessionData,
} from './scripts/vite-homey-session-store'
import { getAppChunkName, getVendorChunkName, isLazyHtmlPreload } from './scripts/vite-chunking'
import {
  isAllowedRSSContentType,
  isBlockedRSSHostname,
  isPrivateIpAddress,
} from './src/app/utils/rss-proxy-security'

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version?: string
}

const RSS_PROXY_MAX_BYTES = 1024 * 1024
const RSS_PROXY_TIMEOUT_MS = 10000
const AUTH_SESSION_MAX_BYTES = 16 * 1024
const HOMEY_SESSION_MAX_BYTES = 8 * 1024
const DASHBOARD_PROFILE_MAX_BYTES = 1024 * 1024

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

function homeAssistantProxyPlugin(getAuthSession: () => HomeAssistantAuthData | null) {
  const proxyBasePath = '/__navet_ha_proxy__'
  const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.statusCode = 400
      res.end('Missing proxy path')
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

      const authSession = getAuthSession()
      const upstreamBaseUrl = authSession?.hassUrl ?? null
      if (!upstreamBaseUrl) {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Home Assistant OAuth session is required' }))
        return
      }

      const upstreamOrigin = new URL(upstreamBaseUrl)
      const targetPath = normalizeViteProxyTargetPath(proxyBasePath, req.url)
      const targetUrl = new URL(targetPath, upstreamOrigin)
      if (targetUrl.origin !== upstreamOrigin.origin) {
        res.statusCode = 400
        res.end('Invalid proxy target')
        return
      }

      const headers = new Headers()
      const accept = typeof req.headers.accept === 'string' ? req.headers.accept : null
      if (accept) {
        headers.set('Accept', accept)
      }

      if (authSession?.access_token) {
        headers.set('Authorization', `Bearer ${authSession.access_token}`)
      }

      const upstreamResponse = await fetch(targetUrl, {
        redirect: 'manual',
        headers,
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

      const contentLength = upstreamResponse.headers.get('content-length')
      if (contentLength) {
        res.setHeader('Content-Length', contentLength)
      }

      if (!upstreamResponse.body) {
        res.end()
        return
      }

      Readable.fromWeb(upstreamResponse.body as globalThis.ReadableStream<Uint8Array>).pipe(res)
    } catch {
      res.statusCode = 502
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Unable to load Home Assistant resource' }))
    }
  }

  return {
    name: 'navet-ha-proxy',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/__navet_ha_proxy__', async (req, res) => {
        await handleRequest(req, res)
      })
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use('/__navet_ha_proxy__', async (req, res) => {
        await handleRequest(req, res)
      })
    },
  }
}

function homeyProxyPlugin(getHomeySession: () => HomeySessionData | null) {
  const proxyBasePath = '/__navet_homey_proxy__'
  const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.statusCode = 400
      res.end('Missing proxy path')
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

      const session = getHomeySession()
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
      const targetUrl = new URL(targetPath, upstreamOrigin)
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

      const upstreamResponse = await fetch(targetUrl, {
        method: req.method,
        redirect: 'manual',
        headers,
        body,
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

      Readable.fromWeb(upstreamResponse.body as globalThis.ReadableStream<Uint8Array>).pipe(res)
    } catch {
      res.statusCode = 502
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Unable to load Homey resource' }))
    }
  }

  return {
    name: 'navet-homey-proxy',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/__navet_homey_proxy__', async (req, res) => {
        await handleRequest(req, res)
      })
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use('/__navet_homey_proxy__', async (req, res) => {
        await handleRequest(req, res)
      })
    },
  }
}

function authSessionStorePlugin() {
  const authSessionStore = createViteAuthSessionStore()

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

  const readRequestBody = async (req: IncomingMessage) => {
    const chunks: Buffer[] = []
    let size = 0

    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      size += buffer.byteLength
      if (size > AUTH_SESSION_MAX_BYTES) {
        throw new Error('Auth session is too large')
      }
      chunks.push(buffer)
    }

    return Buffer.concat(chunks).toString('utf8')
  }

  const handleRequest = async (
    req: IncomingMessage,
    res: ServerResponse
  ) => {
    if (req.method === 'GET') {
      const authSession = authSessionStore.getSerializedSession()
      if (!authSession) {
        sendNoContent(res)
        return
      }

      res.statusCode = 200
      setNoStoreHeaders(res)
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(authSession)
      return
    }

    if (req.method === 'PUT') {
      try {
        const body = await readRequestBody(req)
        const parsed = JSON.parse(body)
        if (!isValidAuthData(parsed)) {
          sendJson(res, 400, { error: 'Unsupported auth session' })
          return
        }

        authSessionStore.saveAuthSession(parsed)
        sendJson(res, 200, { ok: true })
      } catch {
        sendJson(res, 400, { error: 'Unable to save auth session' })
      }
      return
    }

    if (req.method === 'DELETE') {
      authSessionStore.clearAuthSession()
      sendJson(res, 200, { ok: true })
      return
    }

    res.setHeader('Allow', 'GET, PUT, DELETE')
    sendJson(res, 405, { error: 'Method not allowed' })
  }

  const registerMiddleware = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use('/__navet_auth__/session', async (req, res) => {
      await handleRequest(req, res)
    })
  }

  return {
    name: 'navet-auth-session-store',
    api: {
      getAuthSession(): HomeAssistantAuthData | null {
        return authSessionStore.getAuthSession()
      },
    },
    configureServer: registerMiddleware,
    configurePreviewServer: registerMiddleware,
  }
}

function dashboardProfileStorePlugin() {
  const dashboardProfileStore = createViteDashboardProfileStore()

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

  const applyMetadataHeaders = (
    res: ServerResponse,
    metadata: { etag: string; lastModified: string }
  ) => {
    res.setHeader('ETag', metadata.etag)
    res.setHeader('Last-Modified', metadata.lastModified)
  }

  const readRequestBody = async (req: IncomingMessage) => {
    const chunks: Buffer[] = []
    let size = 0

    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      size += buffer.byteLength
      if (size > DASHBOARD_PROFILE_MAX_BYTES) {
        throw new Error('Dashboard profile is too large')
      }
      chunks.push(buffer)
    }

    return Buffer.concat(chunks).toString('utf8')
  }

  const isFreshRequest = (
    req: IncomingMessage,
    metadata: { etag: string; lastModified: string }
  ) => {
    const ifNoneMatch = req.headers['if-none-match']
    if (typeof ifNoneMatch === 'string' && ifNoneMatch === metadata.etag) {
      return true
    }

    const ifModifiedSince = req.headers['if-modified-since']
    return typeof ifModifiedSince === 'string' && ifModifiedSince === metadata.lastModified
  }

  const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === 'GET') {
      const serializedProfile = dashboardProfileStore.getSerializedProfile()
      if (!serializedProfile) {
        sendNoContent(res)
        return
      }

      const metadata =
        dashboardProfileStore.getProfileMetadata() ??
        buildDashboardProfileMetadata(serializedProfile, {
          mtimeMs: Date.now(),
          mtime: new Date(),
        })

      if (isFreshRequest(req, metadata)) {
        res.statusCode = 304
        setNoStoreHeaders(res)
        applyMetadataHeaders(res, metadata)
        res.end()
        return
      }

      res.statusCode = 200
      setNoStoreHeaders(res)
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      applyMetadataHeaders(res, metadata)
      res.end(serializedProfile)
      return
    }

    if (req.method === 'PUT') {
      try {
        const body = await readRequestBody(req)
        if (!body) {
          sendJson(res, 400, { error: 'Missing dashboard profile body' })
          return
        }

        const parsed = JSON.parse(body)
        if (!isValidDashboardProfileData(parsed)) {
          sendJson(res, 400, { error: 'Unsupported dashboard profile' })
          return
        }

        dashboardProfileStore.saveProfile(parsed)
        const metadata = dashboardProfileStore.getProfileMetadata()

        res.statusCode = 200
        setNoStoreHeaders(res)
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        if (metadata) {
          applyMetadataHeaders(res, metadata)
        }
        res.end(JSON.stringify({ ok: true, updatedAt: parsed.exportedAt ?? null }))
      } catch (error) {
        const message = error instanceof Error ? error.message : ''
        if (message === 'Dashboard profile is too large') {
          sendJson(res, 413, { error: message })
          return
        }

        sendJson(res, 400, { error: 'Unable to save dashboard profile' })
      }
      return
    }

    res.setHeader('Allow', 'GET, PUT')
    sendJson(res, 405, { error: 'Method not allowed' })
  }

  const registerMiddleware = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use('/__navet_profile__/default', async (req, res) => {
      await handleRequest(req, res)
    })
  }

  return {
    name: 'navet-dashboard-profile-store',
    configureServer: registerMiddleware,
    configurePreviewServer: registerMiddleware,
  }
}

function homeySessionStorePlugin() {
  const homeySessionStore = createViteHomeySessionStore()
  const athomApiBaseUrl = 'https://api.athom.com'

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

  const getHomeyOAuthConfig = (req: IncomingMessage) => {
    const clientId = process.env.NAVET_HOMEY_CLIENT_ID?.trim()
    const clientSecret = process.env.NAVET_HOMEY_CLIENT_SECRET?.trim()
    const redirectUri =
      process.env.NAVET_HOMEY_REDIRECT_URI?.trim() ??
      `${new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`).origin}/__navet_homey__/callback`

    return {
      clientId,
      clientSecret,
      redirectUri,
    }
  }

  const encodeClientCredentials = (clientId: string, clientSecret: string) =>
    Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const getPreferredHomeyBaseUrl = (homey: HomeySessionData['homeys'][number]) =>
    homey.localUrl ?? homey.localUrlSecure ?? homey.remoteUrl ?? null

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
  }) =>
    user.avatarUrl?.trim() ||
    user.imageUrl?.trim() ||
    user.avatar?.trim() ||
    user.image?.trim() ||
    user.gravatar?.trim() ||
    null

  const refreshHomeyAccessToken = async (
    session: HomeySessionData,
    req: IncomingMessage
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
      throw new Error('Unable to refresh Homey OAuth token')
    }

    const token = (await response.json()) as {
      access_token: string
      refresh_token?: string
      expires_in: number | string
    }

    const nextSession: HomeySessionData = {
      ...session,
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? session.refreshToken,
      expiresAt: Date.now() + Number(token.expires_in) * 1000,
    }

    homeySessionStore.saveSession(nextSession)
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
    const homeyBaseUrl = getPreferredHomeyBaseUrl(homey)
    if (!homeyBaseUrl) {
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
      throw new Error('Unable to create Homey session')
    }

    const homeySessionToken = JSON.parse(await sessionResponse.text()) as string
    return {
      homeyBaseUrl,
      homeySessionToken,
    }
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

  const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === 'GET') {
      const storedSession = homeySessionStore.getSession()
      if (!storedSession) {
        sendNoContent(res)
        return
      }

      const session = await refreshHomeyAccessToken(storedSession, req).catch(() => storedSession)
      res.statusCode = 200
      setNoStoreHeaders(res)
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify(sanitizeHomeySession(session)))
      return
    }

    if (req.method === 'PUT') {
      try {
        const body = await readRequestBody(req)
        const parsed = JSON.parse(body)
        if (!isValidHomeySessionData(parsed)) {
          sendJson(res, 400, { error: 'Unsupported Homey session' })
          return
        }

        homeySessionStore.saveSession(parsed)
        sendJson(res, 200, sanitizeHomeySession(parsed))
      } catch {
        sendJson(res, 400, { error: 'Unable to save Homey session' })
      }
      return
    }

    if (req.method === 'DELETE') {
      homeySessionStore.clearSession()
      sendJson(res, 200, { ok: true })
      return
    }

    res.setHeader('Allow', 'GET, PUT, DELETE')
    sendJson(res, 405, { error: 'Method not allowed' })
  }

  const registerMiddleware = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use('/__navet_homey__/authorize', async (req, res) => {
      const { clientId, redirectUri } = getHomeyOAuthConfig(req)
      if (!clientId) {
        sendJson(res, 500, { error: 'Homey OAuth client ID is not configured' })
        return
      }

      const loginUrl = new URL(`${athomApiBaseUrl}/oauth2/authorise`)
      loginUrl.searchParams.set('response_type', 'code')
      loginUrl.searchParams.set('client_id', clientId)
      loginUrl.searchParams.set('redirect_uri', redirectUri)
      loginUrl.searchParams.set(
        'state',
        Buffer.from(
          JSON.stringify({
            returnTo: '/',
          })
        ).toString('base64url')
      )

      res.statusCode = 302
      res.setHeader('Location', loginUrl.toString())
      res.end()
    })

    server.middlewares.use('/__navet_homey__/callback', async (req, res) => {
      const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
      const code = requestUrl.searchParams.get('code')?.trim()
      const { clientId, clientSecret, redirectUri } = getHomeyOAuthConfig(req)

      if (!code || !clientId || !clientSecret) {
        sendJson(res, 400, { error: 'Homey OAuth callback is incomplete' })
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
          sendJson(res, 502, { error: 'Homey OAuth token exchange failed' })
          return
        }

        const token = (await tokenResponse.json()) as {
          access_token: string
          refresh_token: string
          expires_in: number | string
        }
        const user = await loadAuthenticatedUser(token.access_token)
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

        let session: HomeySessionData = {
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          expiresAt: Date.now() + Number(token.expires_in) * 1000,
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
          const selection = await createHomeySession(session.accessToken, homeys[0])
          session = {
            ...session,
            selectedHomeyId: homeys[0].id,
            homeyBaseUrl: selection.homeyBaseUrl,
            homeySessionToken: selection.homeySessionToken,
          }
        }

        homeySessionStore.saveSession(session)
        res.statusCode = 302
        res.setHeader('Location', '/?homey_oauth_callback=1')
        res.end()
      } catch {
        sendJson(res, 502, { error: 'Unable to complete Homey OAuth callback' })
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

      try {
        const storedSession = homeySessionStore.getSession()
        if (!storedSession) {
          sendJson(res, 404, { error: 'No Homey OAuth session available' })
          return
        }

        const session = await refreshHomeyAccessToken(storedSession, req)
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

        homeySessionStore.saveSession(nextSession)
        sendJson(res, 200, sanitizeHomeySession(nextSession))
      } catch {
        sendJson(res, 502, { error: 'Unable to select Homey' })
      }
    })
  }

  return {
    name: 'navet-homey-session-store',
    api: {
      getHomeySession(): HomeySessionData | null {
        return homeySessionStore.getSession()
      },
    },
    configureServer: registerMiddleware,
    configurePreviewServer: registerMiddleware,
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const hassUrl = env.NAVET_HASS_URL?.trim().replace(/\/$/, '')
  const enableDemo = (env.NAVET_ENABLE_DEMO ?? process.env.NAVET_ENABLE_DEMO ?? 'true') !== 'false'
  const buildTarget = env.NAVET_BUILD_TARGET ?? process.env.NAVET_BUILD_TARGET ?? 'app'
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
      '@': path.resolve(__dirname, './src'),
      '@navet/core': path.resolve(__dirname, './packages/core/src'),
      '@navet/ui': path.resolve(__dirname, './packages/ui/src'),
      '@navet/app': path.resolve(__dirname, './packages/app/src'),
      '@navet/provider-homeassistant': path.resolve(__dirname, './packages/provider-homeassistant/src'),
      '@navet/provider-homey': path.resolve(__dirname, './packages/provider-homey/src'),
      '@navet/provider-hubitat': path.resolve(__dirname, './packages/provider-hubitat/src'),
      '@navet/provider-openhab': path.resolve(__dirname, './packages/provider-openhab/src'),
      '@navet/provider-smartthings': path.resolve(__dirname, './packages/provider-smartthings/src'),
      '@docker': path.resolve(__dirname, './docker'),
      '@scripts': path.resolve(__dirname, './scripts'),
      ...(isStorybook
        ? {
            'virtual:pwa-register': path.resolve(
              __dirname,
              './src/test/mocks/virtual-pwa-register.ts'
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
        manualChunks(id: string) {
          const appChunkName = getAppChunkName(id)
          if (appChunkName) {
            return appChunkName
          }

          return getVendorChunkName(id)
        },
      },
    },
  } satisfies NonNullable<UserConfig['build']>

  function createAppPlugins() {
    const authSessionPlugin = authSessionStorePlugin()
    const dashboardProfilePlugin = dashboardProfileStorePlugin()
    const homeySessionPlugin = homeySessionStorePlugin()
    const appPlugins: PluginOption[] = [
      react(),
      tailwindcss(),
      rssProxyPlugin(),
      authSessionPlugin,
      dashboardProfilePlugin,
      homeySessionPlugin,
      homeAssistantProxyPlugin(
        () =>
          (
            authSessionPlugin as PluginOption & {
              api?: { getAuthSession?: () => HomeAssistantAuthData | null }
            }
          ).api?.getAuthSession?.() ?? null
      ),
      homeyProxyPlugin(
        () =>
          (
            homeySessionPlugin as PluginOption & {
              api?: { getHomeySession?: () => HomeySessionData | null }
            }
          ).api?.getHomeySession?.() ?? null
      ),
    ]

    if (!isStorybook) {
      appPlugins.push(
        VitePWA({
          registerType: 'autoUpdate',
          injectRegister: false,
          manifestFilename: 'site.webmanifest',
          includeAssets: [
            'favicon.svg',
            'favicon-32x32.svg',
            'apple-touch-icon.png',
            'logo.svg',
            'logo-horizontal.svg',
            'logo-horizontal-light.svg',
            'pwa-192.png',
            'pwa-512.png',
          ],
          manifest: {
            name: 'Navet',
            short_name: 'Navet',
            description: 'A smart home dashboard built for calm, app-like control surfaces.',
            start_url: './',
            scope: './',
            display: 'standalone',
            orientation: 'portrait-primary',
            background_color: '#0a0a0a',
            theme_color: '#0a0a0a',
            categories: ['productivity', 'utilities', 'lifestyle'],
            icons: [
              {
                src: './pwa-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any maskable',
              },
              {
                src: './pwa-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable',
              },
              {
                src: './favicon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'any',
              },
            ],
          },
          workbox: {
            navigateFallback: './index.html',
            globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
            globIgnores: ['config.js'],
          },
        })
      )
    }

    return appPlugins
  }

  function createSharedConfig(overrides: UserConfig): UserConfig {
    return {
      base: './',
      envPrefix: ['VITE_'],
      define: {
        __APP_VERSION__: JSON.stringify(packageJson.version ?? '0.0.0'),
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
      cacheDir: config.cacheDir,
      plugins: createAppPlugins(),
      build: {
        ...baseBuildConfig,
        outDir: config.outDir,
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

  function createWebsiteConfig(config: {
    cacheDir: string
    outDir: string
    emptyOutDir?: boolean
  }): UserConfig {
    return createSharedConfig({
      root: path.resolve(__dirname, 'website'),
      publicDir: path.resolve(__dirname, 'public'),
      cacheDir: config.cacheDir,
      plugins: [react(), tailwindcss()],
      build: {
        ...baseBuildConfig,
        outDir: config.outDir,
        emptyOutDir: config.emptyOutDir,
      },
    })
  }

  if (buildTarget === 'website') {
    return createWebsiteConfig({
      cacheDir: path.resolve(__dirname, '.cache/vite-website'),
      outDir: path.resolve(__dirname, 'dist'),
    })
  }

  if (buildTarget === 'all') {
    return createAppConfig({
      cacheDir: path.resolve(__dirname, '.cache/vite-pages-demo'),
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      input: {
        index: path.resolve(__dirname, 'website/index.html'),
        'demo/index': path.resolve(__dirname, 'demo/index.html'),
      },
    })
  }

  return createAppConfig({ cacheDir: '.cache/vite' })
})
