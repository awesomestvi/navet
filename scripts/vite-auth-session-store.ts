import { createHash, createHmac, randomBytes } from 'node:crypto'
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import type { ViteInstallationAuthority } from './vite-installation-authority.ts'
import {
  createInstallationCookieNames,
  type InstallationCookieNames,
} from './installation-cookie-scope.ts'

export const AUTH_COOKIE_NAME = 'navet_auth_session'
export const AUTH_BINDING_HEADER = 'X-Navet-OAuth-Binding'
export const AUTH_REVISION_HEADER = 'X-Navet-Auth-Revision'
export const AUTH_SESSION_REQUEST_MAX_BYTES = 24 * 1024
export const AUTH_SESSION_RECORD_MAX_BYTES = 32 * 1024
export const AUTH_SESSION_RECORD_TOO_LARGE_ERROR_CODE =
  'credential-session-record-too-large'
const AUTH_SESSION_RECORD_TOO_LARGE_STATUS = 507
export const AUTH_SESSION_CAPACITY_ERROR_CODE =
  'credential-session-capacity-reached'
const AUTH_SESSION_CAPACITY_STATUS = 507
export const AUTH_SESSION_UNAVAILABLE_ERROR_CODE =
  'credential-session-record-unavailable'
const AUTH_SESSION_UNAVAILABLE_STATUS = 503

const COOKIE_ID_PATTERN = /^[a-f0-9]{64}$/
const PUBLIC_SESSION_ID_PATTERN = /^nas_[a-f0-9]{32}$/
const OAUTH_PENDING_TTL_MS = 10 * 60 * 1000
const AUTH_SESSION_IDLE_TTL_MS = 90 * 24 * 60 * 60 * 1000
const COOKIE_MAX_AGE_SECONDS = AUTH_SESSION_IDLE_TTL_MS / 1000
const MAX_AUTH_SESSIONS = 256
const TEMP_FILE_TTL_MS = 60 * 60 * 1000
const NAVET_OAUTH_CALLBACK_PARAM = 'navet_oauth_callback'
const NAVET_OAUTH_ERROR_PARAM = 'navet_oauth_error'
const LEGACY_OAUTH_CALLBACK_PARAM = 'auth_callback'

type OAuthFailureCode =
  | 'access_denied'
  | 'callback_incomplete'
  | 'temporarily_unavailable'
  | 'invalid_response'
  | 'session_changed'
  | 'not_authorized'

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
  authRevision: number
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
  browserHassUrl?: string
  clientId: string
  redirectUri: string
  returnTo: string
  expiresAt: number
  installationPairingVerified?: boolean
}

export interface ViteStoredAuthSession {
  version: 2
  sessionId: string
  createdAt: number
  updatedAt: number
  authRevision?: number
  auth: HomeAssistantAuthData | null
  pending: VitePendingOAuth | null
  userId: string | null
  userName: string | null
}

export class ViteAuthSessionRecordTooLargeError extends Error {
  readonly code = AUTH_SESSION_RECORD_TOO_LARGE_ERROR_CODE
  readonly statusCode = AUTH_SESSION_RECORD_TOO_LARGE_STATUS

  constructor() {
    super('Home Assistant credential session exceeds the storage limit')
    this.name = 'ViteAuthSessionRecordTooLargeError'
  }
}

export class ViteAuthSessionCapacityError extends Error {
  readonly code = AUTH_SESSION_CAPACITY_ERROR_CODE
  readonly statusCode = AUTH_SESSION_CAPACITY_STATUS

  constructor() {
    super('Home Assistant credential session capacity has been reached')
    this.name = 'ViteAuthSessionCapacityError'
  }
}

export class ViteAuthSessionUnavailableError extends Error {
  readonly code = AUTH_SESSION_UNAVAILABLE_ERROR_CODE
  readonly statusCode = AUTH_SESSION_UNAVAILABLE_STATUS

  constructor() {
    super('Home Assistant credential session is unavailable')
    this.name = 'ViteAuthSessionUnavailableError'
  }
}

export function isViteAuthSessionRecordTooLargeError(
  error: unknown
): error is ViteAuthSessionRecordTooLargeError {
  return (
    error instanceof ViteAuthSessionRecordTooLargeError ||
    (Boolean(error) &&
      typeof error === 'object' &&
      (error as { code?: unknown }).code ===
        AUTH_SESSION_RECORD_TOO_LARGE_ERROR_CODE)
  )
}

export function isViteAuthSessionCapacityError(
  error: unknown
): error is ViteAuthSessionCapacityError {
  return (
    error instanceof ViteAuthSessionCapacityError ||
    (Boolean(error) &&
      typeof error === 'object' &&
      (error as { code?: unknown }).code === AUTH_SESSION_CAPACITY_ERROR_CODE)
  )
}

export function isViteAuthSessionUnavailableError(
  error: unknown
): error is ViteAuthSessionUnavailableError {
  return (
    error instanceof ViteAuthSessionUnavailableError ||
    (Boolean(error) &&
      typeof error === 'object' &&
      (error as { code?: unknown }).code ===
        AUTH_SESSION_UNAVAILABLE_ERROR_CODE)
  )
}

export interface ViteAuthenticatedPrincipal {
  providerId: 'home_assistant'
  source: 'standalone_session' | 'home_assistant_ingress'
  tenantId: string
  sessionId: string
  userId: string | null
  userName: string | null
}

export interface ViteAuthSessionStore {
  cookieNames: InstallationCookieNames
  cleanupSessions(reserveSlots?: number): number
  createEphemeralSession(cookieId: string): ViteStoredAuthSession
  createSession(): { cookieId: string; session: ViteStoredAuthSession }
  deleteSession(cookieId: string): void
  discardLegacyGlobalSession(): void
  readSession(cookieId: string): ViteStoredAuthSession | null
  rotateSession(
    previousCookieId: string,
    session: ViteStoredAuthSession
  ): { cookieId: string; session: ViteStoredAuthSession }
  sanitizeSession(session: ViteStoredAuthSession): ViteAuthSessionMetadata
  writeSession(cookieId: string, session: ViteStoredAuthSession): void
}

export function normalizeHassUrl(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  try {
    const candidate = value.trim()
    const rawMatch = /^(?:https?):\/\/[^/?#]+([^?#]*)/i.exec(candidate)
    const rawPath = rawMatch?.[1] ?? ''
    const decodedPath = decodeURIComponent(rawPath || '/')
    if (
      /%25/i.test(rawPath) ||
      decodedPath.includes('\\') ||
      decodedPath
        .split('/')
        .some((segment) => segment === '..' || segment === '.')
    ) {
      return ''
    }

    const parsed = new URL(candidate)
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

export function normalizeHassOrigin(value: unknown): string {
  const normalizedUrl = normalizeHassUrl(value)
  if (!normalizedUrl) {
    return ''
  }

  try {
    return new URL(normalizedUrl).origin
  } catch {
    return ''
  }
}

export function createHomeAssistantTenantId(hassUrl: unknown): string {
  const normalizedBaseUrl = normalizeHassUrl(hassUrl)
  return normalizedBaseUrl
    ? `hat_${createHash('sha256').update(normalizedBaseUrl).digest('hex')}`
    : ''
}

const HOME_ASSISTANT_INGRESS_TENANT_ID = `hat_${createHash('sha256')
  .update('home_assistant_ingress')
  .digest('hex')}`

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
    (pending.browserHassUrl === undefined ||
      (typeof pending.browserHassUrl === 'string' &&
        normalizeHassUrl(pending.browserHassUrl) ===
          pending.browserHassUrl)) &&
    typeof pending.clientId === 'string' &&
    pending.clientId.length > 0 &&
    typeof pending.redirectUri === 'string' &&
    pending.redirectUri.length > 0 &&
    typeof pending.returnTo === 'string' &&
    pending.returnTo.startsWith('/') &&
    !pending.returnTo.startsWith('//') &&
    typeof pending.expiresAt === 'number' &&
    Number.isFinite(pending.expiresAt) &&
    (pending.installationPairingVerified === undefined ||
      typeof pending.installationPairingVerified === 'boolean')
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
    (session.authRevision === undefined ||
      (typeof session.authRevision === 'number' &&
        Number.isSafeInteger(session.authRevision) &&
        session.authRevision >= 0 &&
        session.authRevision < Number.MAX_SAFE_INTEGER)) &&
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
    authRevision: 0,
    auth: null,
    pending: null,
    userId: null,
    userName: null,
  }
}

function createEphemeralSession(
  cookieId: string,
  bindingSecret: Buffer
): ViteStoredAuthSession {
  const now = Date.now()
  return {
    version: 2,
    sessionId: `nas_${createHmac('sha256', bindingSecret)
      .update(cookieId)
      .digest('hex')
      .slice(0, 32)}`,
    createdAt: now,
    updatedAt: now,
    authRevision: 0,
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
    authRevision: session.authRevision ?? 0,
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
  ),
  cookieNames = createInstallationCookieNames(AUTH_COOKIE_NAME)
): ViteAuthSessionStore {
  const bindingSecret = randomBytes(32)
  const getSessionPath = (cookieId: string) =>
    path.join(sessionsDirectory, `${cookieId}.json`)

  const readSession = (cookieId: string): ViteStoredAuthSession | null => {
    if (!COOKIE_ID_PATTERN.test(cookieId)) {
      return null
    }

    const sessionPath = getSessionPath(cookieId)
    let size: number
    try {
      size = statSync(sessionPath).size
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        return null
      }
      throw error
    }
    if (size > AUTH_SESSION_RECORD_MAX_BYTES) {
      throw new ViteAuthSessionUnavailableError()
    }

    let serialized: string
    try {
      serialized = readFileSync(sessionPath, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        return null
      }
      throw error
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(serialized) as unknown
    } catch {
      throw new ViteAuthSessionUnavailableError()
    }
    if (!isValidStoredSession(parsed)) {
      throw new ViteAuthSessionUnavailableError()
    }
    if (
      parsed.updatedAt + AUTH_SESSION_IDLE_TTL_MS < Date.now() ||
      (!parsed.auth && (!parsed.pending || parsed.pending.expiresAt < Date.now()))
    ) {
      rmSync(sessionPath, { force: true })
      return null
    }
    return parsed
  }

  const cleanupSessions = (reserveSlots = 0) => {
    let names: string[]
    try {
      names = readdirSync(sessionsDirectory)
    } catch {
      return 0
    }

    const now = Date.now()
    const active: Array<{
      authenticated: boolean
      cookieId: string
      updatedAt: number
    }> = []
    for (const name of names) {
      const match = /^([a-f0-9]{64})\.json$/.exec(name)
      const filePath = path.join(sessionsDirectory, name)
      if (!match) {
        if (name.includes('.tmp-')) {
          try {
            if (statSync(filePath).mtimeMs + TEMP_FILE_TTL_MS < now) {
              rmSync(filePath, { force: true })
            }
          } catch {
            // Ignore a concurrently removed temporary file.
          }
        }
        continue
      }
      try {
        const session = readSession(match[1])
        if (session) {
          active.push({
            authenticated: Boolean(session.auth),
            cookieId: match[1],
            updatedAt: session.updatedAt,
          })
        }
      } catch (error) {
        if (!isViteAuthSessionUnavailableError(error)) {
          throw error
        }
        active.push({
          authenticated: true,
          cookieId: match[1],
          updatedAt: now,
        })
      }
    }

    active.sort((left, right) => {
      if (left.authenticated !== right.authenticated) {
        return left.authenticated ? 1 : -1
      }
      return left.updatedAt - right.updatedAt
    })
    const targetCount = Math.max(0, MAX_AUTH_SESSIONS - reserveSlots)
    let currentCount = active.length
    for (const candidate of active) {
      if (currentCount <= targetCount) {
        break
      }
      if (!candidate.authenticated) {
        rmSync(getSessionPath(candidate.cookieId), { force: true })
        currentCount -= 1
      }
    }
    return currentCount
  }

  const writeSessionFile = (cookieId: string, session: ViteStoredAuthSession) => {
    if (!COOKIE_ID_PATTERN.test(cookieId) || !isValidStoredSession(session)) {
      throw new Error('Invalid auth session')
    }

    const serialized = JSON.stringify(session)
    if (Buffer.byteLength(serialized, 'utf8') > AUTH_SESSION_RECORD_MAX_BYTES) {
      throw new ViteAuthSessionRecordTooLargeError()
    }

    mkdirSync(sessionsDirectory, { recursive: true, mode: 0o700 })
    const sessionPath = getSessionPath(cookieId)
    const tempFilePath = `${sessionPath}.tmp-${randomBytes(8).toString('hex')}`
    try {
      writeFileSync(tempFilePath, serialized, {
        encoding: 'utf8',
        mode: 0o600,
      })
      renameSync(tempFilePath, sessionPath)
    } catch (error) {
      rmSync(tempFilePath, { force: true })
      throw error
    }
  }

  const writeSession = (cookieId: string, session: ViteStoredAuthSession) => {
    if (!COOKIE_ID_PATTERN.test(cookieId) || !isValidStoredSession(session)) {
      throw new Error('Invalid auth session')
    }

    const serialized = JSON.stringify(session)
    if (Buffer.byteLength(serialized, 'utf8') > AUTH_SESSION_RECORD_MAX_BYTES) {
      throw new ViteAuthSessionRecordTooLargeError()
    }

    mkdirSync(sessionsDirectory, { recursive: true, mode: 0o700 })
    const sessionPath = getSessionPath(cookieId)
    try {
      statSync(sessionPath)
    } catch {
      const remaining = cleanupSessions(1)
      if (remaining > MAX_AUTH_SESSIONS - 1) {
        throw new ViteAuthSessionCapacityError()
      }
    }
    writeSessionFile(cookieId, session)
  }

  const rotateSession = (
    previousCookieId: string,
    session: ViteStoredAuthSession
  ) => {
    const cookieId = randomBytes(32).toString('hex')
    if (previousCookieId && readSession(previousCookieId)) {
      writeSessionFile(cookieId, session)
    } else {
      writeSession(cookieId, session)
    }
    if (previousCookieId) {
      rmSync(getSessionPath(previousCookieId), { force: true })
    }
    return { cookieId, session }
  }

  return {
    cookieNames,
    cleanupSessions,
    createEphemeralSession(cookieId) {
      return createEphemeralSession(cookieId, bindingSecret)
    },
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
    rotateSession,
    sanitizeSession: sanitizeAuthSession,
    writeSession,
  }
}

function getHeader(req: IncomingMessage, name: string): string {
  const value = req.headers[name.toLowerCase()]
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

function getAuthRevision(session: ViteStoredAuthSession): number {
  return session.authRevision ?? 0
}

function parseAuthRevisionHeader(req: IncomingMessage): number | null {
  const value = getHeader(req, AUTH_REVISION_HEADER).trim()
  if (!/^(0|[1-9][0-9]{0,15})$/.test(value)) {
    return null
  }
  const revision = Number(value)
  return Number.isSafeInteger(revision) &&
    revision >= 0 &&
    revision < Number.MAX_SAFE_INTEGER
    ? revision
    : null
}

function parseViteAuthCookies(
  req: IncomingMessage,
  cookieName = AUTH_COOKIE_NAME
): string[] {
  const values: string[] = []
  const cookieHeader = getHeader(req, 'cookie')
  for (const entry of cookieHeader.split(';')) {
    const separator = entry.indexOf('=')
    if (separator <= 0) {
      continue
    }

    const name = entry.slice(0, separator).trim()
    const value = entry.slice(separator + 1).trim()
    if (
      name === cookieName &&
      COOKIE_ID_PATTERN.test(value) &&
      !values.includes(value)
    ) {
      values.push(value)
    }
  }

  return values
}

export function parseViteAuthCookie(req: IncomingMessage): string {
  return parseViteAuthCookies(req)[0] ?? ''
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
  return serializeViteAuthCookieAtPath(
    req,
    AUTH_COOKIE_NAME,
    cookieId,
    ingressPath || '/',
    maxAgeSeconds
  )
}

function serializeViteAuthCookieAtPath(
  req: IncomingMessage,
  cookieName: string,
  cookieId: string,
  cookiePath: string,
  maxAgeSeconds: number
): string {
  const attributes = [
    `${cookieName}=${cookieId}`,
    `Path=${cookiePath}`,
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ]
  if (getRequestProtocol(req) === 'https') {
    attributes.push('Secure')
  }
  return attributes.join('; ')
}

function serializeViteAuthCookieForStore(
  req: IncomingMessage,
  store: ViteAuthSessionStore,
  cookieId: string,
  maxAgeSeconds = COOKIE_MAX_AGE_SECONDS
): string {
  const ingressPath = normalizeIngressPath(getHeader(req, 'x-ingress-path'))
  return serializeViteAuthCookieAtPath(
    req,
    store.cookieNames.currentName,
    cookieId,
    ingressPath || '/',
    maxAgeSeconds
  )
}

function serializeViteAuthCookieDeletion(
  req: IncomingMessage,
  cookieNames: InstallationCookieNames
): string | string[] {
  const ingressPath = normalizeIngressPath(getHeader(req, 'x-ingress-path'))
  const cookieNamesToClear = [cookieNames.currentName]
  const cookies = cookieNamesToClear.flatMap((cookieName) =>
    ingressPath
      ? [
          serializeViteAuthCookieAtPath(req, cookieName, '', ingressPath, 0),
          serializeViteAuthCookieAtPath(req, cookieName, '', '/', 0),
        ]
      : [serializeViteAuthCookieAtPath(req, cookieName, '', '/', 0)]
  )
  return cookies.length === 1 ? cookies[0] : cookies
}

type ViteAuthRequestContext = {
  cookieId: string
  session: ViteStoredAuthSession
}

function getStoredRequestContexts(
  req: IncomingMessage,
  store: ViteAuthSessionStore
): ViteAuthRequestContext[] {
  store.discardLegacyGlobalSession()
  let contexts: ViteAuthRequestContext[] = []
  for (const cookieId of parseViteAuthCookies(
    req,
    store.cookieNames.currentName
  )) {
    const session = store.readSession(cookieId)
    if (session) {
      contexts.push({ cookieId, session })
    }
  }
  if (contexts.length === 0 && store.cookieNames.scoped) {
    contexts = parseViteAuthCookies(req, store.cookieNames.legacyName).flatMap(
      (cookieId) => {
        const session = store.readSession(cookieId)
        return session ? [{ cookieId, session }] : []
      }
    )
  }
  return contexts
}

function getLocallyBackedPresentedContexts(
  req: IncomingMessage,
  store: ViteAuthSessionStore
): ViteAuthRequestContext[] {
  const cookieIds = parseViteAuthCookies(req, store.cookieNames.currentName)
  if (store.cookieNames.scoped) {
    for (const cookieId of parseViteAuthCookies(req, store.cookieNames.legacyName)) {
      if (!cookieIds.includes(cookieId)) {
        cookieIds.push(cookieId)
      }
    }
  }
  return cookieIds.flatMap((cookieId) => {
    const session = store.readSession(cookieId)
    return session ? [{ cookieId, session }] : []
  })
}

function getPreferredStoredRequestContext(
  req: IncomingMessage,
  store: ViteAuthSessionStore
): ViteAuthRequestContext | null {
  const contexts = getStoredRequestContexts(req, store)
  const now = Date.now()
  contexts.sort((left, right) => {
    const leftCurrent = Boolean(
      left.session.auth && left.session.auth.expires > now
    )
    const rightCurrent = Boolean(
      right.session.auth && right.session.auth.expires > now
    )
    if (leftCurrent !== rightCurrent) {
      return leftCurrent ? -1 : 1
    }
    const leftAuthenticated = Boolean(left.session.auth)
    const rightAuthenticated = Boolean(right.session.auth)
    if (leftAuthenticated !== rightAuthenticated) {
      return leftAuthenticated ? -1 : 1
    }
    if (left.session.updatedAt !== right.session.updatedAt) {
      return right.session.updatedAt - left.session.updatedAt
    }
    return left.cookieId.localeCompare(right.cookieId)
  })
  return contexts[0] ?? null
}

function getRequestContext(
  req: IncomingMessage,
  res: ServerResponse,
  store: ViteAuthSessionStore,
  create: boolean
): { cookieId: string; session: ViteStoredAuthSession } | null {
  const existingContext = getPreferredStoredRequestContext(req, store)
  if (existingContext) {
    return existingContext
  }
  if (!create) {
    return null
  }

  // Never reuse an unbacked caller-supplied cookie. The HMAC-bound public
  // session ID allows the next OAuth request without writing an anonymous
  // session file.
  const cookieId = randomBytes(32).toString('hex')
  res.setHeader('Set-Cookie', serializeViteAuthCookieForStore(req, store, cookieId))
  return { cookieId, session: store.createEphemeralSession(cookieId) }
}

function renewViteAuthRequestSession(
  req: IncomingMessage,
  res: ServerResponse,
  store: ViteAuthSessionStore,
  context: { cookieId: string; session: ViteStoredAuthSession }
) {
  const next: ViteStoredAuthSession = {
    ...context.session,
    updatedAt: Date.now(),
  }
  if (next.auth || next.pending) {
    store.writeSession(context.cookieId, next)
  }
  res.setHeader(
    'Set-Cookie',
    serializeViteAuthCookieForStore(req, store, context.cookieId)
  )
  return { cookieId: context.cookieId, session: next }
}

export function resolveViteAuthSession(
  req: IncomingMessage,
  store: ViteAuthSessionStore
): ViteStoredAuthSession | null {
  return getPreferredStoredRequestContext(req, store)?.session ?? null
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
        tenantId: HOME_ASSISTANT_INGRESS_TENANT_ID,
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
  // Home Assistant access tokens are short lived, but the browser-bound Navet
  // credential session remains durable while its refresh credential is stored.
  // Expiry schedules renewal; it must not make Navet-local profile or chore
  // routes treat the browser as logged out before refresh can complete.
  return session?.auth
    ? {
        providerId: 'home_assistant',
        source: 'standalone_session',
        tenantId: createHomeAssistantTenantId(session.auth.hassUrl),
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
    parsed.searchParams.delete(NAVET_OAUTH_ERROR_PARAM)
    parsed.searchParams.delete(LEGACY_OAUTH_CALLBACK_PARAM)
    parsed.searchParams.delete('code')
    parsed.searchParams.delete('state')
    parsed.searchParams.delete('error')
    parsed.searchParams.delete('error_description')
    parsed.searchParams.delete('error_uri')
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}

function createOAuthReturnUrl(returnTo: string): URL {
  try {
    const parsed = new URL(returnTo, 'http://navet.local')
    if (parsed.origin === 'http://navet.local') {
      for (const parameter of [
        NAVET_OAUTH_CALLBACK_PARAM,
        NAVET_OAUTH_ERROR_PARAM,
        LEGACY_OAUTH_CALLBACK_PARAM,
        'code',
        'state',
        'error',
        'error_description',
        'error_uri',
      ]) {
        parsed.searchParams.delete(parameter)
      }
      return parsed
    }
  } catch {
    // Fall through to the safe root route.
  }
  return new URL('/', 'http://navet.local')
}

function appendOAuthCallbackMarker(returnTo: string): string {
  const parsed = createOAuthReturnUrl(returnTo)
  parsed.searchParams.set(NAVET_OAUTH_CALLBACK_PARAM, '1')
  return `${parsed.pathname}${parsed.search}${parsed.hash}`
}

function appendOAuthFailureMarker(
  returnTo: string,
  failure: OAuthFailureCode
): string {
  const parsed = createOAuthReturnUrl(returnTo)
  parsed.searchParams.set(NAVET_OAUTH_ERROR_PARAM, failure)
  return `${parsed.pathname}${parsed.search}${parsed.hash}`
}

async function readRequestBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.byteLength
    if (size > AUTH_SESSION_REQUEST_MAX_BYTES) {
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

function sendSessionStoreError(res: ServerResponse, error: unknown): boolean {
  let code: string
  let status: number
  if (isViteAuthSessionRecordTooLargeError(error)) {
    code = AUTH_SESSION_RECORD_TOO_LARGE_ERROR_CODE
    status = AUTH_SESSION_RECORD_TOO_LARGE_STATUS
  } else if (isViteAuthSessionCapacityError(error)) {
    code = AUTH_SESSION_CAPACITY_ERROR_CODE
    status = AUTH_SESSION_CAPACITY_STATUS
  } else if (isViteAuthSessionUnavailableError(error)) {
    code = AUTH_SESSION_UNAVAILABLE_ERROR_CODE
    status = AUTH_SESSION_UNAVAILABLE_STATUS
  } else {
    return false
  }

  sendJson(res, status, {
    error: error.message,
    code,
  })
  return true
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

function getBoundRequestContext(
  req: IncomingMessage,
  store: ViteAuthSessionStore,
  allowEphemeral: boolean
): { cookieId: string; session: ViteStoredAuthSession } | null {
  const storedContexts = getStoredRequestContexts(req, store)
  const stored = storedContexts.find((context) =>
    hasValidBinding(req, context.session)
  )
  if (stored) {
    return stored
  }
  return allowEphemeral
    ? getBoundEphemeralRequestContext(req, store)
    : null
}

function getBoundEphemeralRequestContext(
  req: IncomingMessage,
  store: ViteAuthSessionStore
): ViteAuthRequestContext | null {
  for (const cookieId of parseViteAuthCookies(
    req,
    store.cookieNames.currentName
  )) {
    const ephemeral = store.createEphemeralSession(cookieId)
    if (hasValidBinding(req, ephemeral)) {
      return { cookieId, session: ephemeral }
    }
  }
  return null
}

function getOAuthCallbackRequestContext(
  req: IncomingMessage,
  store: ViteAuthSessionStore,
  state: string
): ViteAuthRequestContext | null {
  if (!state) {
    return null
  }
  return (
    getStoredRequestContexts(req, store).find(
      (context) => context.session.pending?.state === state
    ) ?? null
  )
}

function isSameOriginMutation(req: IncomingMessage): boolean {
  const origin = getHeader(req, 'origin').trim()
  return Boolean(origin) && origin === getRequestOrigin(req)
}

function resolveAuthRoute(req: IncomingMessage): string {
  const pathname = new URL(req.url ?? '/', 'http://navet.local').pathname
  return pathname.startsWith('/__navet_auth__/')
    ? pathname.slice('/__navet_auth__'.length)
    : pathname
}

export function createViteAuthRequestHandler(
  store: ViteAuthSessionStore,
  fetchImpl: typeof fetch,
  installationAuthority: ViteInstallationAuthority
) {
  const sessionMutationGenerations = new Map<string, number>()
  const readMutationGeneration = (cookieId: string) =>
    sessionMutationGenerations.get(cookieId) ?? 0
  const advanceMutationGeneration = (cookieId: string) => {
    const next = readMutationGeneration(cookieId) + 1
    sessionMutationGenerations.delete(cookieId)
    sessionMutationGenerations.set(cookieId, next)
    if (sessionMutationGenerations.size > MAX_AUTH_SESSIONS * 4) {
      const oldest = sessionMutationGenerations.keys().next().value as
        | string
        | undefined
      if (oldest && oldest !== cookieId) {
        sessionMutationGenerations.delete(oldest)
      }
    }
    return next
  }

  const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
    const route = resolveAuthRoute(req)

    if (route === '/callback') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        sendJson(res, 405, { error: 'Method not allowed' })
        return
      }

      const requestUrl = new URL(req.url ?? '/', 'http://navet.local')
      const code = requestUrl.searchParams.get('code')?.trim() ?? ''
      const state = requestUrl.searchParams.get('state')?.trim() ?? ''
      const providerError =
        requestUrl.searchParams.get('error')?.trim() ?? ''
      const context = getOAuthCallbackRequestContext(req, store, state)
      const pending = context?.session.pending
      if (
        !context ||
        !pending ||
        !state ||
        state !== pending.state ||
        pending.expiresAt < Date.now()
      ) {
        sendJson(res, 400, {
          error: 'OAuth callback does not match this browser session',
        })
        return
      }

      // Consume state before the upstream exchange so failed or concurrent
      // callbacks cannot replay the same browser-bound OAuth grant.
      const consumed: ViteStoredAuthSession = {
        ...context.session,
        updatedAt: Date.now(),
        pending: {
          ...pending,
          state: randomBytes(32).toString('hex'),
        },
      }
      store.writeSession(context.cookieId, consumed)

      const redirectFailure = (failure: OAuthFailureCode) => {
        res.statusCode = 302
        res.setHeader('Cache-Control', 'no-store')
        res.setHeader('Pragma', 'no-cache')
        res.setHeader(
          'Location',
          appendOAuthFailureMarker(pending.returnTo, failure)
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
          redirectFailure('temporarily_unavailable')
          return
        }

        let token: Record<string, unknown>
        try {
          token = (await tokenResponse.json()) as Record<string, unknown>
        } catch {
          redirectFailure('invalid_response')
          return
        }
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
          redirectFailure('invalid_response')
          return
        }

        const next: ViteStoredAuthSession = {
          ...createEmptySession(),
          updatedAt: Date.now(),
          authRevision: 1,
          auth,
          pending: null,
          userId: null,
          userName: null,
        }
        const current = store.readSession(context.cookieId)
        if (!current || JSON.stringify(current) !== JSON.stringify(consumed)) {
          redirectFailure('session_changed')
          return
        }
        if (
          !installationAuthority.commitHomeAssistant(
            pending.hassUrl,
            normalizeHassUrl,
            pending.installationPairingVerified === true
          )
        ) {
          redirectFailure('not_authorized')
          return
        }
        const presentedContexts = getStoredRequestContexts(req, store)
        advanceMutationGeneration(context.cookieId)
        const rotated = store.rotateSession(context.cookieId, next)
        for (const presentedContext of presentedContexts) {
          if (presentedContext.cookieId !== context.cookieId) {
            advanceMutationGeneration(presentedContext.cookieId)
            store.deleteSession(presentedContext.cookieId)
          }
        }
        res.statusCode = 302
        res.setHeader('Cache-Control', 'no-store')
        res.setHeader(
          'Set-Cookie',
          serializeViteAuthCookieForStore(req, store, rotated.cookieId)
        )
        res.setHeader('Location', appendOAuthCallbackMarker(pending.returnTo))
        res.end()
      } catch {
        redirectFailure('temporarily_unavailable')
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

      const context = getBoundRequestContext(req, store, true)
      if (!context) {
        sendJson(res, 401, {
          error: 'Authenticated browser session is required',
        })
        return
      }
      const storedAtStart = store.readSession(context.cookieId)
      const generationAtStart = readMutationGeneration(context.cookieId)

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
        const installationAuthorization =
          installationAuthority.authorizeHomeAssistant(
            req,
            hassUrl,
            normalizeHassUrl
          )
        if (!installationAuthorization.allowed) {
          sendJson(res, 403, {
            error: 'Home Assistant target is not authorized for this installation',
          })
          return
        }
        const upstreamHassUrl =
          installationAuthorization.upstreamTarget === undefined
            ? hassUrl
            : normalizeHassUrl(installationAuthorization.upstreamTarget)
        if (!upstreamHassUrl) {
          sendJson(res, 403, {
            error: 'Home Assistant target is not authorized for this installation',
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
          // Only hassUrl is used for server-side token exchange and proxying.
          hassUrl: upstreamHassUrl,
          browserHassUrl: hassUrl,
          clientId,
          redirectUri,
          returnTo: normalizeReturnTo(
            body.returnTo,
            joinPath(ingressPath, '/') || '/'
          ),
          expiresAt: Date.now() + OAUTH_PENDING_TTL_MS,
          installationPairingVerified:
            installationAuthorization.pairingVerified,
        }
        const current = store.readSession(context.cookieId)
        if (
          readMutationGeneration(context.cookieId) !== generationAtStart ||
          (storedAtStart
            ? !current ||
              JSON.stringify(current) !== JSON.stringify(storedAtStart)
            : Boolean(current))
        ) {
          sendJson(res, 409, {
            error: 'OAuth session changed before login could start',
          })
          return
        }
        advanceMutationGeneration(context.cookieId)
        store.writeSession(context.cookieId, {
          ...context.session,
          updatedAt: Date.now(),
          pending,
        })

        const authorizeUrl = new URL(`${pending.browserHassUrl}/auth/authorize`)
        authorizeUrl.searchParams.set('response_type', 'code')
        authorizeUrl.searchParams.set('client_id', clientId)
        authorizeUrl.searchParams.set('redirect_uri', redirectUri)
        authorizeUrl.searchParams.set('state', pending.state)
        sendJson(res, 200, { authorizeUrl: authorizeUrl.toString() })
      } catch (error) {
        if (sendSessionStoreError(res, error)) {
          return
        }
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

      const context = getBoundRequestContext(req, store, true)
      if (!context) {
        sendJson(res, 401, {
          error: 'Authenticated browser session is required',
        })
        return
      }
      if (!context.session.auth) {
        sendNoContent(res)
        return
      }
      renewViteAuthRequestSession(req, res, store, context)
      sendJson(res, 200, context.session.auth)
      return
    }

    if (route !== '/session') {
      sendJson(res, 404, { error: 'Unknown Home Assistant auth endpoint' })
      return
    }

    if (req.method === 'GET') {
      const context = getRequestContext(req, res, store, true)!
      const renewed = renewViteAuthRequestSession(req, res, store, context)
      sendJson(res, 200, store.sanitizeSession(renewed.session))
      return
    }

    if (req.method === 'PUT') {
      if (!isSameOriginMutation(req)) {
        sendJson(res, 403, {
          error: 'Cross-origin session mutation is not allowed',
        })
        return
      }

      const context = getBoundRequestContext(req, store, false)
      if (!context) {
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

        const revisionHeader = getHeader(req, AUTH_REVISION_HEADER).trim()
        const legacyRefresh = revisionHeader === ''
        const expectedRevision = parseAuthRevisionHeader(req)
        if (!legacyRefresh && expectedRevision === null) {
          sendJson(res, 428, {
            error: 'Home Assistant auth revision is invalid',
            code: 'credential-session-revision-required',
          })
          return
        }
        const current = store.readSession(context.cookieId)
        const unchanged =
          Boolean(current?.auth) &&
          JSON.stringify(current?.auth) === JSON.stringify(parsed)
        if (!current || current.sessionId !== context.session.sessionId) {
          if (unchanged && current) {
            res.setHeader(
              'Set-Cookie',
              serializeViteAuthCookieForStore(req, store, context.cookieId)
            )
            sendJson(res, 200, store.sanitizeSession(current))
            return
          }
          sendJson(res, 409, {
            error: 'Auth session changed before refresh completed',
            code: 'credential-session-superseded',
            session: current ? store.sanitizeSession(current) : null,
          })
          return
        }
        if (legacyRefresh) {
          // Compatibility for a tab that loaded before auth revisions shipped:
          // a later token expiry may advance the session, while stale/equal
          // refreshes become successful no-ops instead of retrying forever.
          if (
            unchanged ||
            !current.auth ||
            parsed.expires <= current.auth.expires
          ) {
            res.setHeader(
              'Set-Cookie',
              serializeViteAuthCookieForStore(req, store, context.cookieId)
            )
            sendJson(res, 200, store.sanitizeSession(current))
            return
          }
        } else if (expectedRevision !== getAuthRevision(current)) {
          if (unchanged) {
            res.setHeader(
              'Set-Cookie',
              serializeViteAuthCookieForStore(req, store, context.cookieId)
            )
            sendJson(res, 200, store.sanitizeSession(current))
            return
          }
          sendJson(res, 409, {
            error: 'Auth session changed before refresh completed',
            code: 'credential-session-superseded',
            session: store.sanitizeSession(current),
          })
          return
        }
        if (unchanged) {
          res.setHeader(
            'Set-Cookie',
            serializeViteAuthCookieForStore(req, store, context.cookieId)
          )
          sendJson(res, 200, store.sanitizeSession(current))
          return
        }

        const next: ViteStoredAuthSession = {
          ...current,
          updatedAt: Date.now(),
          authRevision: getAuthRevision(current) + 1,
          auth: parsed,
          pending: null,
          userId: null,
          userName: null,
        }
        const latest = store.readSession(context.cookieId)
        if (!latest || JSON.stringify(latest) !== JSON.stringify(current)) {
          sendJson(res, 409, {
            error: 'Auth session changed before refresh completed',
            code: 'credential-session-superseded',
            session: latest ? store.sanitizeSession(latest) : null,
          })
          return
        }
        store.writeSession(context.cookieId, next)
        res.setHeader(
          'Set-Cookie',
          serializeViteAuthCookieForStore(req, store, context.cookieId)
        )
        sendJson(res, 200, store.sanitizeSession(next))
      } catch (error) {
        if (sendSessionStoreError(res, error)) {
          return
        }
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

      const revisionHeader = getHeader(req, AUTH_REVISION_HEADER).trim()
      const conditionalDelete = revisionHeader !== ''
      const expectedRevision = conditionalDelete
        ? parseAuthRevisionHeader(req)
        : null
      if (conditionalDelete && expectedRevision === null) {
        sendJson(res, 428, {
          error: 'Home Assistant auth revision is invalid',
          code: 'credential-session-revision-required',
        })
        return
      }

      const storedContexts = getStoredRequestContexts(req, store)
      const presentedStoredContexts = getLocallyBackedPresentedContexts(req, store)
      const boundStoredContexts = storedContexts.filter((context) =>
        hasValidBinding(req, context.session)
      )
      const conditionallyMatchedContext = conditionalDelete
        ? boundStoredContexts.find(
            (storedContext) =>
              Boolean(storedContext.session.auth) &&
              getAuthRevision(storedContext.session) === expectedRevision
          )
        : null
      if (conditionalDelete && !conditionallyMatchedContext) {
        const current = getPreferredStoredRequestContext(req, store)
        sendJson(res, 409, {
          error: 'Auth session changed before invalidation completed',
          code: 'credential-session-superseded',
          session: current ? store.sanitizeSession(current.session) : null,
        })
        return
      }
      const context =
        conditionallyMatchedContext ??
        boundStoredContexts[0] ??
        getBoundEphemeralRequestContext(req, store)
      if (
        !context &&
        (parseViteAuthCookies(req, store.cookieNames.currentName).length > 0 ||
          presentedStoredContexts.length > 0)
      ) {
        sendJson(res, 401, {
          error: 'Authenticated browser session is required',
        })
        return
      }
      const storedContextsToRevoke = (
        store.cookieNames.scoped
          ? presentedStoredContexts
          : boundStoredContexts
      ).filter(
        (storedContext) =>
          !conditionalDelete ||
          (storedContext.session.sessionId === context?.session.sessionId &&
            getAuthRevision(storedContext.session) === expectedRevision)
      )
      for (const storedContext of storedContextsToRevoke) {
        advanceMutationGeneration(storedContext.cookieId)
        store.deleteSession(storedContext.cookieId)
      }
      if (
        context &&
        !storedContextsToRevoke.some(
          (storedContext) => storedContext.cookieId === context.cookieId
        )
      ) {
        advanceMutationGeneration(context.cookieId)
        store.deleteSession(context.cookieId)
      }
      res.setHeader(
        'Set-Cookie',
        serializeViteAuthCookieDeletion(
          req,
          store.cookieNames
        )
      )
      sendJson(res, 200, { ok: true })
      return
    }

    res.setHeader('Allow', 'GET, PUT, DELETE')
    sendJson(res, 405, { error: 'Method not allowed' })
  }

  return async (req: IncomingMessage, res: ServerResponse) => {
    try {
      await handleRequest(req, res)
    } catch (error) {
      if (sendSessionStoreError(res, error)) {
        return
      }
      throw error
    }
  }
}
