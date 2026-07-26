import { createHash, randomBytes } from 'node:crypto'
import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'

export const AUTH_COOKIE_NAME = 'navet_auth_session'
export const AUTH_BINDING_HEADER = 'X-Navet-OAuth-Binding'
export const AUTH_SESSION_MAX_BYTES = 24 * 1024

const COOKIE_ID_PATTERN = /^[a-f0-9]{64}$/
const PUBLIC_SESSION_ID_PATTERN = /^nas_[a-f0-9]{32}$/
const OAUTH_PENDING_TTL_MS = 10 * 60 * 1000
const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60
const NAVET_OAUTH_CALLBACK_PARAM = 'navet_oauth_callback'
const LEGACY_OAUTH_CALLBACK_PARAM = 'auth_callback'

export interface HomeAssistantAuthData {
  hassUrl: string
  clientId: string | null
  expires: number
  refresh_token: string
  access_token: string
  expires_in: number
}

export interface ViteAuthSessionMetadata {
  authenticated: boolean
  providerId: 'home_assistant'
  sessionId: string
  hassUrl: string | null
  clientId: string | null
  expiresAt: number | null
  expiresIn: number | null
  userId: string | null
  userName: string | null
}

export interface VitePendingOAuth {
  state: string
  hassUrl: string
  clientId: string
  redirectUri: string
  returnTo: string
  expiresAt: number
}

export interface ViteStoredAuthSession {
  version: 2
  sessionId: string
  createdAt: number
  updatedAt: number
  auth: HomeAssistantAuthData | null
  pending: VitePendingOAuth | null
  userId: string | null
  userName: string | null
}

export interface ViteAuthenticatedPrincipal {
  providerId: 'home_assistant'
  source: 'standalone_session' | 'home_assistant_ingress'
  sessionId: string
  userId: string | null
  userName: string | null
}

export interface ViteAuthSessionStore {
  createSession(): { cookieId: string; session: ViteStoredAuthSession }
  deleteSession(cookieId: string): void
  discardLegacyGlobalSession(): void
  readSession(cookieId: string): ViteStoredAuthSession | null
  sanitizeSession(session: ViteStoredAuthSession): ViteAuthSessionMetadata
  writeSession(cookieId: string, session: ViteStoredAuthSession): void
}

export function normalizeHassUrl(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  try {
    const parsed = new URL(value.trim())
    if (
      (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
      parsed.username ||
      parsed.password
    ) {
      return ''
    }

    parsed.hash = ''
    parsed.search = ''
    return parsed.toString().replace(/\/+$/, '')
  } catch {
    return ''
  }
}

export function isValidAuthData(value: unknown): value is HomeAssistantAuthData {
  if (!value || typeof value !== 'object') {
    return false
  }

  const data = value as Partial<HomeAssistantAuthData>
  return (
    typeof data.hassUrl === 'string' &&
    normalizeHassUrl(data.hassUrl) === data.hassUrl.replace(/\/+$/, '') &&
    (typeof data.clientId === 'string' || data.clientId === null) &&
    typeof data.expires === 'number' &&
    Number.isFinite(data.expires) &&
    typeof data.refresh_token === 'string' &&
    data.refresh_token.length > 0 &&
    typeof data.access_token === 'string' &&
    data.access_token.length > 0 &&
    typeof data.expires_in === 'number' &&
    Number.isFinite(data.expires_in)
  )
}

function isValidPendingOAuth(value: unknown): value is VitePendingOAuth {
  if (!value || typeof value !== 'object') {
    return false
  }

  const pending = value as Partial<VitePendingOAuth>
  return (
    typeof pending.state === 'string' &&
    /^[a-f0-9]{64}$/.test(pending.state) &&
    typeof pending.hassUrl === 'string' &&
    normalizeHassUrl(pending.hassUrl) === pending.hassUrl &&
    typeof pending.clientId === 'string' &&
    pending.clientId.length > 0 &&
    typeof pending.redirectUri === 'string' &&
    pending.redirectUri.length > 0 &&
    typeof pending.returnTo === 'string' &&
    pending.returnTo.startsWith('/') &&
    typeof pending.expiresAt === 'number' &&
    Number.isFinite(pending.expiresAt)
  )
}

function isValidStoredSession(value: unknown): value is ViteStoredAuthSession {
  if (!value || typeof value !== 'object') {
    return false
  }

  const session = value as Partial<ViteStoredAuthSession>
  return (
    session.version === 2 &&
    typeof session.sessionId === 'string' &&
    PUBLIC_SESSION_ID_PATTERN.test(session.sessionId) &&
    typeof session.createdAt === 'number' &&
    typeof session.updatedAt === 'number' &&
    (session.auth === null || isValidAuthData(session.auth)) &&
    (session.pending === null || isValidPendingOAuth(session.pending)) &&
    session.userId === null &&
    session.userName === null
  )
}

function createEmptySession(): ViteStoredAuthSession {
  const now = Date.now()
  return {
    version: 2,
    sessionId: `nas_${randomBytes(16).toString('hex')}`,
    createdAt: now,
    updatedAt: now,
    auth: null,
    pending: null,
    userId: null,
    userName: null,
  }
}

export function sanitizeAuthSession(
  session: ViteStoredAuthSession
): ViteAuthSessionMetadata {
  const auth = session.auth
  return {
    authenticated: Boolean(auth),
    providerId: 'home_assistant',
    sessionId: session.sessionId,
    hassUrl: auth?.hassUrl ?? null,
    clientId: auth?.clientId ?? null,
    expiresAt: auth?.expires ?? null,
    expiresIn: auth?.expires_in ?? null,
    userId: null,
    userName: null,
  }
}

export function createViteAuthSessionStore(
  sessionsDirectory = path.resolve(process.cwd(), '.cache', 'navet-auth-sessions'),
  legacySessionFilePath = path.resolve(
    path.dirname(sessionsDirectory),
    'navet-auth-session.json'
  )
): ViteAuthSessionStore {
  const getSessionPath = (cookieId: string) =>
    path.join(sessionsDirectory, `${cookieId}.json`)

  const readSession = (cookieId: string): ViteStoredAuthSession | null => {
    if (!COOKIE_ID_PATTERN.test(cookieId)) {
      return null
    }

    try {
      const sessionPath = getSessionPath(cookieId)
      if (statSync(sessionPath).size > AUTH_SESSION_MAX_BYTES) {
        return null
      }
      const parsed = JSON.parse(readFileSync(sessionPath, 'utf8')) as unknown
      return isValidStoredSession(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  const writeSession = (cookieId: string, session: ViteStoredAuthSession) => {
    if (!COOKIE_ID_PATTERN.test(cookieId) || !isValidStoredSession(session)) {
      throw new Error('Invalid auth session')
    }

    mkdirSync(sessionsDirectory, { recursive: true, mode: 0o700 })
    const sessionPath = getSessionPath(cookieId)
    const tempFilePath = `${sessionPath}.tmp-${randomBytes(8).toString('hex')}`
    writeFileSync(tempFilePath, JSON.stringify(session), {
      encoding: 'utf8',
      mode: 0o600,
    })
    renameSync(tempFilePath, sessionPath)
  }

  return {
    createSession() {
      const cookieId = randomBytes(32).toString('hex')
      const session = createEmptySession()
      writeSession(cookieId, session)
      return { cookieId, session }
    },
    deleteSession(cookieId) {
      if (COOKIE_ID_PATTERN.test(cookieId)) {
        rmSync(getSessionPath(cookieId), { force: true })
      }
    },
    discardLegacyGlobalSession() {
      rmSync(legacySessionFilePath, { force: true })
    },
    readSession,
    sanitizeSession: sanitizeAuthSession,
    writeSession,
  }
}

function getHeader(req: IncomingMessage, name: string): string {
  const value = req.headers[name.toLowerCase()]
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

export function parseViteAuthCookie(req: IncomingMessage): string {
  const cookieHeader = getHeader(req, 'cookie')
  for (const entry of cookieHeader.split(';')) {
    const separator = entry.indexOf('=')
    if (separator <= 0) {
      continue
    }

    const name = entry.slice(0, separator).trim()
    const value = entry.slice(separator + 1).trim()
    if (name === AUTH_COOKIE_NAME && COOKIE_ID_PATTERN.test(value)) {
      return value
    }
  }

  return ''
}

export function normalizeIngressPath(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  const trimmed = value.trim()
  if (!trimmed || trimmed === '/') {
    return ''
  }

  const normalized = trimmed.replace(/\/+$/, '')
  let decoded: string
  try {
    decoded = decodeURIComponent(normalized)
  } catch {
    return ''
  }
  return normalized.startsWith('/') &&
    !normalized.startsWith('//') &&
    /^\/[A-Za-z0-9._~!$&'()*+,=:@%/-]+$/.test(normalized) &&
    !decoded.startsWith('//') &&
    /^\/[A-Za-z0-9._~!$&'()*+,=:@%/-]+$/.test(decoded) &&
    !decoded.includes('..') &&
    !decoded.includes('\\')
    ? normalized
    : ''
}

function joinPath(basePath: string, suffix: string): string {
  const normalizedBase = normalizeIngressPath(basePath)
  const normalizedSuffix = suffix.startsWith('/') ? suffix : `/${suffix}`
  return normalizedBase ? `${normalizedBase}${normalizedSuffix}` : normalizedSuffix
}

function getRequestProtocol(req: IncomingMessage): 'http' | 'https' {
  const forwarded = getHeader(req, 'x-forwarded-proto')
    .split(',')[0]
    ?.trim()
    .toLowerCase()
  if (forwarded === 'https') {
    return 'https'
  }
  if (forwarded === 'http') {
    return 'http'
  }

  return 'encrypted' in req.socket && req.socket.encrypted ? 'https' : 'http'
}

function getRequestOrigin(req: IncomingMessage): string {
  return `${getRequestProtocol(req)}://${getHeader(req, 'host') || 'localhost'}`
}

export function serializeViteAuthCookie(
  req: IncomingMessage,
  cookieId: string,
  maxAgeSeconds = COOKIE_MAX_AGE_SECONDS
): string {
  const ingressPath = normalizeIngressPath(getHeader(req, 'x-ingress-path'))
  const attributes = [
    `${AUTH_COOKIE_NAME}=${cookieId}`,
    `Path=${ingressPath || '/'}`,
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ]
  if (getRequestProtocol(req) === 'https') {
    attributes.push('Secure')
  }
  return attributes.join('; ')
}

function getRequestContext(
  req: IncomingMessage,
  res: ServerResponse,
  store: ViteAuthSessionStore,
  create: boolean
): { cookieId: string; session: ViteStoredAuthSession } | null {
  store.discardLegacyGlobalSession()
  const existingCookieId = parseViteAuthCookie(req)
  const existingSession = store.readSession(existingCookieId)
  if (existingSession) {
    return { cookieId: existingCookieId, session: existingSession }
  }
  if (!create) {
    return null
  }

  const context = store.createSession()
  res.setHeader('Set-Cookie', serializeViteAuthCookie(req, context.cookieId))
  return context
}

export function resolveViteAuthSession(
  req: IncomingMessage,
  store: ViteAuthSessionStore
): ViteStoredAuthSession | null {
  store.discardLegacyGlobalSession()
  return store.readSession(parseViteAuthCookie(req))
}

export function resolveViteAuthenticatedPrincipal(
  req: IncomingMessage,
  store: ViteAuthSessionStore,
  options: { trustIngressHeaders?: boolean } = {}
): ViteAuthenticatedPrincipal | null {
  if (options.trustIngressHeaders === true) {
    const userId = getHeader(req, 'x-remote-user-id').trim()
    if (userId) {
      return {
        providerId: 'home_assistant',
        source: 'home_assistant_ingress',
        sessionId: `hai_${createHash('sha256').update(userId).digest('hex').slice(0, 32)}`,
        userId,
        userName:
          getHeader(req, 'x-remote-user-display-name').trim() ||
          getHeader(req, 'x-remote-user-name').trim() ||
          null,
      }
    }
  }

  const session = resolveViteAuthSession(req, store)
  return session?.auth
    ? {
        providerId: 'home_assistant',
        source: 'standalone_session',
        sessionId: session.sessionId,
        userId: null,
        userName: null,
      }
    : null
}

function normalizeReturnTo(value: unknown, fallback: string): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//')
  ) {
    return fallback
  }

  try {
    const parsed = new URL(value, 'http://navet.local')
    if (parsed.origin !== 'http://navet.local') {
      return fallback
    }
    parsed.searchParams.delete(NAVET_OAUTH_CALLBACK_PARAM)
    parsed.searchParams.delete(LEGACY_OAUTH_CALLBACK_PARAM)
    parsed.searchParams.delete('code')
    parsed.searchParams.delete('state')
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}

function appendOAuthCallbackMarker(returnTo: string): string {
  const parsed = new URL(returnTo, 'http://navet.local')
  parsed.searchParams.set(NAVET_OAUTH_CALLBACK_PARAM, '1')
  return `${parsed.pathname}${parsed.search}${parsed.hash}`
}

async function readRequestBody(req: IncomingMessage): Promise<string> {
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

function sendJson(
  res: ServerResponse,
  statusCode: number,
  payload: unknown
) {
  res.statusCode = statusCode
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function sendNoContent(res: ServerResponse) {
  res.statusCode = 204
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Pragma', 'no-cache')
  res.end()
}

function hasValidBinding(
  req: IncomingMessage,
  session: ViteStoredAuthSession
): boolean {
  return getHeader(req, AUTH_BINDING_HEADER).trim() === session.sessionId
}

function isSameOriginMutation(req: IncomingMessage): boolean {
  const origin = getHeader(req, 'origin').trim()
  return !origin || origin === getRequestOrigin(req)
}

function resolveAuthRoute(req: IncomingMessage): string {
  const pathname = new URL(req.url ?? '/', 'http://navet.local').pathname
  return pathname.startsWith('/__navet_auth__/')
    ? pathname.slice('/__navet_auth__'.length)
    : pathname
}

export function createViteAuthRequestHandler(
  store: ViteAuthSessionStore,
  fetchImpl: typeof fetch = fetch
) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const route = resolveAuthRoute(req)

    if (route === '/callback') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        sendJson(res, 405, { error: 'Method not allowed' })
        return
      }

      const context = getRequestContext(req, res, store, false)
      const requestUrl = new URL(req.url ?? '/', 'http://navet.local')
      const code = requestUrl.searchParams.get('code')?.trim() ?? ''
      const state = requestUrl.searchParams.get('state')?.trim() ?? ''
      const pending = context?.session.pending
      if (
        !context ||
        !pending ||
        !code ||
        !state ||
        state !== pending.state ||
        pending.expiresAt < Date.now()
      ) {
        sendJson(res, 400, {
          error: 'OAuth callback does not match this browser session',
        })
        return
      }

      try {
        const tokenResponse = await fetchImpl(`${pending.hassUrl}/auth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: pending.clientId,
            code,
            grant_type: 'authorization_code',
          }),
        })
        if (!tokenResponse.ok) {
          sendJson(res, 502, {
            error: 'Home Assistant OAuth token exchange failed',
          })
          return
        }

        const token = (await tokenResponse.json()) as Record<string, unknown>
        const auth: HomeAssistantAuthData = {
          hassUrl: pending.hassUrl,
          clientId: pending.clientId,
          expires:
            Date.now() +
            Number(typeof token.expires_in === 'number' ? token.expires_in : 0) *
              1000,
          refresh_token:
            typeof token.refresh_token === 'string' ? token.refresh_token : '',
          access_token:
            typeof token.access_token === 'string' ? token.access_token : '',
          expires_in:
            typeof token.expires_in === 'number' ? token.expires_in : 0,
        }
        if (!isValidAuthData(auth)) {
          sendJson(res, 502, {
            error: 'Home Assistant returned an invalid OAuth session',
          })
          return
        }

        store.writeSession(context.cookieId, {
          ...context.session,
          updatedAt: Date.now(),
          auth,
          pending: null,
          userId: null,
          userName: null,
        })
        res.statusCode = 302
        res.setHeader('Cache-Control', 'no-store')
        res.setHeader('Location', appendOAuthCallbackMarker(pending.returnTo))
        res.end()
      } catch {
        sendJson(res, 502, {
          error: 'Unable to complete Home Assistant OAuth callback',
        })
      }
      return
    }

    if (route === '/authorize') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST')
        sendJson(res, 405, { error: 'Method not allowed' })
        return
      }
      if (!isSameOriginMutation(req)) {
        sendJson(res, 403, { error: 'Cross-origin OAuth start is not allowed' })
        return
      }

      const context = getRequestContext(req, res, store, false)
      if (!context || !hasValidBinding(req, context.session)) {
        sendJson(res, 401, {
          error: 'Authenticated browser session is required',
        })
        return
      }

      try {
        const body = JSON.parse(await readRequestBody(req)) as {
          hassUrl?: unknown
          returnTo?: unknown
        }
        const hassUrl = normalizeHassUrl(body.hassUrl)
        if (!hassUrl) {
          sendJson(res, 400, {
            error: 'A valid Home Assistant URL is required',
          })
          return
        }

        const ingressPath = normalizeIngressPath(
          getHeader(req, 'x-ingress-path')
        )
        const origin = getRequestOrigin(req)
        const redirectUri = `${origin}${joinPath(
          ingressPath,
          '/__navet_auth__/callback'
        )}`
        const clientId = `${origin}${joinPath(ingressPath, '/')}`
        const pending: VitePendingOAuth = {
          state: randomBytes(32).toString('hex'),
          hassUrl,
          clientId,
          redirectUri,
          returnTo: normalizeReturnTo(
            body.returnTo,
            joinPath(ingressPath, '/') || '/'
          ),
          expiresAt: Date.now() + OAUTH_PENDING_TTL_MS,
        }
        store.writeSession(context.cookieId, {
          ...context.session,
          updatedAt: Date.now(),
          pending,
        })

        const authorizeUrl = new URL(`${hassUrl}/auth/authorize`)
        authorizeUrl.searchParams.set('response_type', 'code')
        authorizeUrl.searchParams.set('client_id', clientId)
        authorizeUrl.searchParams.set('redirect_uri', redirectUri)
        authorizeUrl.searchParams.set('state', pending.state)
        sendJson(res, 200, { authorizeUrl: authorizeUrl.toString() })
      } catch {
        sendJson(res, 400, { error: 'Unable to start Home Assistant OAuth' })
      }
      return
    }

    if (route === '/session/credentials') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST')
        sendJson(res, 405, { error: 'Method not allowed' })
        return
      }

      const context = getRequestContext(req, res, store, false)
      if (!context || !hasValidBinding(req, context.session)) {
        sendJson(res, 401, {
          error: 'Authenticated browser session is required',
        })
        return
      }
      if (!context.session.auth) {
        sendNoContent(res)
        return
      }
      sendJson(res, 200, context.session.auth)
      return
    }

    if (route !== '/session') {
      sendJson(res, 404, { error: 'Unknown Home Assistant auth endpoint' })
      return
    }

    if (req.method === 'GET') {
      const context = getRequestContext(req, res, store, true)!
      sendJson(res, 200, store.sanitizeSession(context.session))
      return
    }

    if (req.method === 'PUT') {
      if (!isSameOriginMutation(req)) {
        sendJson(res, 403, {
          error: 'Cross-origin session mutation is not allowed',
        })
        return
      }

      const context = getRequestContext(req, res, store, false)
      if (!context || !hasValidBinding(req, context.session)) {
        sendJson(res, 401, {
          error: 'Authenticated browser session is required',
        })
        return
      }
      try {
        const parsed = JSON.parse(await readRequestBody(req)) as unknown
        if (!isValidAuthData(parsed)) {
          sendJson(res, 400, { error: 'Unsupported auth session' })
          return
        }
        if (!context.session.auth) {
          sendJson(res, 401, {
            error: 'Complete OAuth login before refreshing the session',
          })
          return
        }
        if (
          parsed.hassUrl !== context.session.auth.hassUrl ||
          parsed.clientId !== context.session.auth.clientId
        ) {
          sendJson(res, 409, {
            error: 'OAuth refresh cannot change the Home Assistant target',
          })
          return
        }

        const next: ViteStoredAuthSession = {
          ...context.session,
          updatedAt: Date.now(),
          auth: parsed,
          pending: null,
          userId: null,
          userName: null,
        }
        store.writeSession(context.cookieId, next)
        sendJson(res, 200, store.sanitizeSession(next))
      } catch {
        sendJson(res, 400, { error: 'Unable to save auth session' })
      }
      return
    }

    if (req.method === 'DELETE') {
      if (!isSameOriginMutation(req)) {
        sendJson(res, 403, {
          error: 'Cross-origin session mutation is not allowed',
        })
        return
      }

      const context = getRequestContext(req, res, store, false)
      if (context && !hasValidBinding(req, context.session)) {
        sendJson(res, 401, {
          error: 'Authenticated browser session is required',
        })
        return
      }
      if (context) {
        store.deleteSession(context.cookieId)
      }
      res.setHeader('Set-Cookie', serializeViteAuthCookie(req, '', 0))
      sendJson(res, 200, { ok: true })
      return
    }

    res.setHeader('Allow', 'GET, PUT, DELETE')
    sendJson(res, 405, { error: 'Method not allowed' })
  }
}
