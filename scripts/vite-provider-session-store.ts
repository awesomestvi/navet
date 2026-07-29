import { randomBytes } from 'node:crypto'
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

const COOKIE_ID_PATTERN = /^[a-f0-9]{64}$/
const SESSION_IDLE_TTL_MS = 90 * 24 * 60 * 60 * 1000
const COOKIE_MAX_AGE_SECONDS = SESSION_IDLE_TTL_MS / 1000
const DEFAULT_MAX_SESSIONS = 128
const TEMP_FILE_TTL_MS = 60 * 60 * 1000
export const PROVIDER_SESSION_RECORD_TOO_LARGE_ERROR_CODE =
  'credential-session-record-too-large'
export const PROVIDER_SESSION_RECORD_TOO_LARGE_STATUS = 507
export const PROVIDER_SESSION_CAPACITY_ERROR_CODE =
  'credential-session-capacity-reached'
export const PROVIDER_SESSION_CAPACITY_STATUS = 507

export class ViteProviderSessionRecordTooLargeError extends Error {
  readonly code = PROVIDER_SESSION_RECORD_TOO_LARGE_ERROR_CODE
  readonly statusCode = PROVIDER_SESSION_RECORD_TOO_LARGE_STATUS

  constructor() {
    super('Provider credential session exceeds the storage limit')
    this.name = 'ViteProviderSessionRecordTooLargeError'
  }
}

export class ViteProviderSessionCapacityError extends Error {
  readonly code = PROVIDER_SESSION_CAPACITY_ERROR_CODE
  readonly statusCode = PROVIDER_SESSION_CAPACITY_STATUS

  constructor() {
    super('Provider credential session capacity has been reached')
    this.name = 'ViteProviderSessionCapacityError'
  }
}

export function isViteProviderSessionRecordTooLargeError(
  error: unknown
): error is ViteProviderSessionRecordTooLargeError {
  return (
    error instanceof ViteProviderSessionRecordTooLargeError ||
    (Boolean(error) &&
      typeof error === 'object' &&
      (error as { code?: unknown }).code ===
        PROVIDER_SESSION_RECORD_TOO_LARGE_ERROR_CODE)
  )
}

export function isViteProviderSessionCapacityError(
  error: unknown
): error is ViteProviderSessionCapacityError {
  return (
    error instanceof ViteProviderSessionCapacityError ||
    (Boolean(error) &&
      typeof error === 'object' &&
      (error as { code?: unknown }).code ===
        PROVIDER_SESSION_CAPACITY_ERROR_CODE)
  )
}

export interface ViteProviderSessionStore<T extends { updatedAt: number }> {
  cleanupSessions(preserveCookieId?: string, reserveSlots?: number): number
  createSession(): { cookieId: string; session: T }
  deleteSession(cookieId: string): void
  discardLegacyGlobalSession(): void
  readSession(cookieId: string): T | null
  rotateSession(previousCookieId: string, session: T): { cookieId: string; session: T }
  writeSession(cookieId: string, session: T): void
}

interface ViteProviderSessionStoreOptions<T extends { updatedAt: number }> {
  createRecord: () => T
  isValidRecord: (value: unknown) => value is T
  legacySessionPath: string
  maxRecordBytes: number
  maxSessions?: number
  idleTtlMs?: number
  sessionsDirectory: string
}

function normalizeIngressPath(value: unknown) {
  if (typeof value !== 'string') {
    return ''
  }

  const trimmed = value.trim()
  if (!trimmed || trimmed === '/') {
    return ''
  }

  const normalized = trimmed.replace(/\/+$/, '')
  let decoded = ''
  try {
    decoded = decodeURIComponent(normalized)
  } catch {
    return ''
  }

  if (
    !normalized.startsWith('/') ||
    normalized.startsWith('//') ||
    !/^\/[A-Za-z0-9._~!$&'()*+,=:@%/-]+$/.test(normalized) ||
    decoded.startsWith('//') ||
    !/^\/[A-Za-z0-9._~!$&'()*+,=:@%/-]+$/.test(decoded) ||
    decoded.includes('..') ||
    decoded.includes('\\')
  ) {
    return ''
  }

  return normalized
}

function getRequestProtocol(req: IncomingMessage) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] ?? '')
    .split(',')[0]
    .trim()
    .toLowerCase()
  if (forwardedProto === 'https' || forwardedProto === 'http') {
    return forwardedProto
  }

  return (req.socket as (typeof req.socket & { encrypted?: boolean }) | undefined)?.encrypted
    ? 'https'
    : 'http'
}

export function getViteProviderRequestOrigin(req: IncomingMessage) {
  return `${getRequestProtocol(req)}://${req.headers.host ?? 'localhost'}`
}

export function isViteSameOriginMutation(req: IncomingMessage) {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin.trim() : ''
  return !origin || origin === getViteProviderRequestOrigin(req)
}

export function isViteStrictSameOriginMutation(req: IncomingMessage) {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin.trim() : ''
  return Boolean(origin) && origin === getViteProviderRequestOrigin(req)
}

function buildSessionCookie(
  req: IncomingMessage,
  cookieName: string,
  cookieId: string,
  maxAgeSeconds: number,
  pathOverride?: string
) {
  const ingressPath = normalizeIngressPath(req.headers['x-ingress-path'])
  const cookiePath = (pathOverride ?? ingressPath) || '/'
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

export function getViteProviderCookieId(req: IncomingMessage, cookieName: string) {
  return getViteProviderCookieIds(req, cookieName)[0] ?? ''
}

export function getViteProviderCookieIds(req: IncomingMessage, cookieName: string) {
  const values: string[] = []
  for (const part of String(req.headers.cookie ?? '').split(';')) {
    const entry = part.trim()
    const separator = entry.indexOf('=')
    if (separator <= 0 || entry.slice(0, separator).trim() !== cookieName) {
      continue
    }
    const value = entry.slice(separator + 1).trim()
    if (COOKIE_ID_PATTERN.test(value) && !values.includes(value)) {
      values.push(value)
    }
  }
  return values
}

export function setViteProviderSessionCookie(
  req: IncomingMessage,
  res: ServerResponse,
  cookieName: string,
  cookieId: string
) {
  res.setHeader(
    'Set-Cookie',
    buildSessionCookie(req, cookieName, cookieId, COOKIE_MAX_AGE_SECONDS)
  )
}

export function clearViteProviderSessionCookie(
  req: IncomingMessage,
  res: ServerResponse,
  cookieName: string
) {
  const ingressPath = normalizeIngressPath(req.headers['x-ingress-path'])
  res.setHeader(
    'Set-Cookie',
    ingressPath
      ? [
          buildSessionCookie(req, cookieName, '', 0, ingressPath),
          buildSessionCookie(req, cookieName, '', 0, '/'),
        ]
      : buildSessionCookie(req, cookieName, '', 0, '/')
  )
}

export function createViteProviderSessionStore<T extends { updatedAt: number }>(
  options: ViteProviderSessionStoreOptions<T>
): ViteProviderSessionStore<T> {
  const {
    createRecord,
    isValidRecord,
    legacySessionPath,
    maxRecordBytes,
    sessionsDirectory,
  } = options
  const idleTtlMs = options.idleTtlMs ?? SESSION_IDLE_TTL_MS
  const maxSessions = options.maxSessions ?? DEFAULT_MAX_SESSIONS

  const ensureDirectory = () => {
    mkdirSync(sessionsDirectory, { recursive: true, mode: 0o700 })
  }

  const discardLegacyGlobalSession = () => {
    rmSync(legacySessionPath, { force: true })
  }

  const getSessionPath = (cookieId: string) =>
    path.join(sessionsDirectory, `${cookieId}.json`)

  const readSession = (cookieId: string) => {
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
    if (size > maxRecordBytes) {
      rmSync(sessionPath, { force: true })
      return null
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
      parsed = JSON.parse(serialized)
    } catch {
      rmSync(sessionPath, { force: true })
      return null
    }
    if (
      !isValidRecord(parsed) ||
      parsed.updatedAt + idleTtlMs < Date.now() ||
      (!('auth' in parsed) && !('pending' in parsed)) ||
      (('auth' in parsed && !parsed.auth) &&
        (!('pending' in parsed) || !parsed.pending)) ||
      (('auth' in parsed && !parsed.auth) &&
        'pending' in parsed &&
        parsed.pending &&
        typeof (parsed.pending as { expiresAt?: unknown }).expiresAt === 'number' &&
        (parsed.pending as { expiresAt: number }).expiresAt < Date.now())
    ) {
      rmSync(sessionPath, { force: true })
      return null
    }
    return parsed
  }

  const cleanupSessions = (preserveCookieId = '', reserveSlots = 0) => {
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

      const session = readSession(match[1])
      if (session) {
        active.push({
          authenticated: 'auth' in session && Boolean(session.auth),
          cookieId: match[1],
          updatedAt: session.updatedAt,
        })
      }
    }

    active.sort((left, right) => {
      if (left.authenticated !== right.authenticated) {
        return left.authenticated ? 1 : -1
      }
      return left.updatedAt - right.updatedAt
    })
    let currentCount = active.length
    const targetCount = Math.max(0, maxSessions - reserveSlots)
    for (const candidate of active) {
      if (currentCount <= targetCount) {
        break
      }
      if (candidate.cookieId === preserveCookieId) {
        continue
      }
      if (candidate.authenticated) {
        continue
      }
      rmSync(getSessionPath(candidate.cookieId), { force: true })
      currentCount -= 1
    }
    return currentCount
  }

  const writeSessionFile = (cookieId: string, session: T) => {
    if (!COOKIE_ID_PATTERN.test(cookieId) || !isValidRecord(session)) {
      throw new Error('Invalid provider session')
    }

    const serialized = JSON.stringify(session)
    if (Buffer.byteLength(serialized, 'utf8') > maxRecordBytes) {
      throw new ViteProviderSessionRecordTooLargeError()
    }

    ensureDirectory()
    const sessionPath = getSessionPath(cookieId)
    const tempPath = `${sessionPath}.tmp-${randomBytes(8).toString('hex')}`
    try {
      writeFileSync(tempPath, serialized, { encoding: 'utf8', mode: 0o600 })
      renameSync(tempPath, sessionPath)
    } catch (error) {
      rmSync(tempPath, { force: true })
      throw error
    }
  }

  const writeSession = (cookieId: string, session: T) => {
    if (!COOKIE_ID_PATTERN.test(cookieId) || !isValidRecord(session)) {
      throw new Error('Invalid provider session')
    }

    const serialized = JSON.stringify(session)
    if (Buffer.byteLength(serialized, 'utf8') > maxRecordBytes) {
      throw new ViteProviderSessionRecordTooLargeError()
    }

    ensureDirectory()
    const sessionPath = getSessionPath(cookieId)
    try {
      statSync(sessionPath)
    } catch {
      const remaining = cleanupSessions('', 1)
      if (remaining > maxSessions - 1) {
        throw new ViteProviderSessionCapacityError()
      }
    }
    writeSessionFile(cookieId, session)
  }

  const deleteSession = (cookieId: string) => {
    if (COOKIE_ID_PATTERN.test(cookieId)) {
      rmSync(getSessionPath(cookieId), { force: true })
    }
  }

  const createSession = () => {
    discardLegacyGlobalSession()
    const cookieId = randomBytes(32).toString('hex')
    const session = createRecord()
    writeSession(cookieId, session)
    return { cookieId, session }
  }

  const rotateSession = (previousCookieId: string, session: T) => {
    const cookieId = randomBytes(32).toString('hex')
    if (previousCookieId && readSession(previousCookieId)) {
      writeSessionFile(cookieId, session)
    } else {
      writeSession(cookieId, session)
    }
    if (previousCookieId) {
      deleteSession(previousCookieId)
    }
    return { cookieId, session }
  }

  return {
    cleanupSessions,
    createSession,
    deleteSession,
    discardLegacyGlobalSession,
    readSession(cookieId) {
      discardLegacyGlobalSession()
      return readSession(cookieId)
    },
    rotateSession,
    writeSession,
  }
}

export function getViteProviderRequestSession<T extends { updatedAt: number }>(
  req: IncomingMessage,
  cookieName: string,
  store: ViteProviderSessionStore<T>
) {
  return getViteProviderRequestSessions(req, cookieName, store)[0] ?? null
}

export function getViteProviderRequestSessions<T extends { updatedAt: number }>(
  req: IncomingMessage,
  cookieName: string,
  store: ViteProviderSessionStore<T>
) {
  const contexts: Array<{ cookieId: string; session: T }> = []
  for (const cookieId of getViteProviderCookieIds(req, cookieName)) {
    const session = store.readSession(cookieId)
    if (session) {
      contexts.push({ cookieId, session })
    }
  }
  contexts.sort((left, right) => {
    const leftAuthenticated =
      'auth' in left.session &&
      Boolean((left.session as T & { auth?: unknown }).auth)
    const rightAuthenticated =
      'auth' in right.session &&
      Boolean((right.session as T & { auth?: unknown }).auth)
    if (leftAuthenticated !== rightAuthenticated) {
      return leftAuthenticated ? -1 : 1
    }
    if (left.session.updatedAt !== right.session.updatedAt) {
      return right.session.updatedAt - left.session.updatedAt
    }
    return left.cookieId.localeCompare(right.cookieId)
  })
  return contexts
}

export function findViteProviderRequestSession<T extends { updatedAt: number }>(
  req: IncomingMessage,
  cookieName: string,
  store: ViteProviderSessionStore<T>,
  predicate: (context: { cookieId: string; session: T }) => boolean
) {
  return (
    getViteProviderRequestSessions(req, cookieName, store).find(predicate) ??
    null
  )
}

export function deleteViteProviderRequestSessions<
  T extends { updatedAt: number },
>(
  req: IncomingMessage,
  cookieName: string,
  store: ViteProviderSessionStore<T>,
  preserveCookieId = ''
) {
  for (const cookieId of getViteProviderCookieIds(req, cookieName)) {
    if (cookieId !== preserveCookieId) {
      store.deleteSession(cookieId)
    }
  }
}

export function rotateViteProviderRequestSession<
  T extends { updatedAt: number },
>(
  req: IncomingMessage,
  res: ServerResponse,
  cookieName: string,
  store: ViteProviderSessionStore<T>,
  previousCookieId: string,
  session: T
) {
  const staleCookieIds = getViteProviderCookieIds(req, cookieName)
  const rotated = store.rotateSession(previousCookieId, session)
  setViteProviderSessionCookie(req, res, cookieName, rotated.cookieId)
  for (const cookieId of staleCookieIds) {
    if (cookieId !== rotated.cookieId) {
      store.deleteSession(cookieId)
    }
  }
  return rotated
}

export function createViteProviderRequestSession<T extends { updatedAt: number }>(
  req: IncomingMessage,
  res: ServerResponse,
  cookieName: string,
  store: ViteProviderSessionStore<T>
) {
  const existing = getViteProviderRequestSession(req, cookieName, store)
  if (existing) {
    setViteProviderSessionCookie(req, res, cookieName, existing.cookieId)
    return existing
  }

  const created = store.createSession()
  setViteProviderSessionCookie(req, res, cookieName, created.cookieId)
  return created
}

export function createViteProviderState() {
  return randomBytes(32).toString('hex')
}
