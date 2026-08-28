import path from 'node:path'
import {
  createViteProviderSessionStore,
  type ViteProviderSessionStore,
} from './vite-provider-session-store.ts'
import {
  createInstallationCookieNames,
  type InstallationCookieNames,
} from './installation-cookie-scope.ts'

export const OPENHAB_SESSION_COOKIE_NAME = 'navet_openhab_session'
const OPENHAB_SESSION_RECORD_MAX_BYTES = 16 * 1024

export interface OpenHABSessionData {
  hassUrl: string
  username: string
  password: string
}

export interface ViteStoredOpenHABSession {
  version: 1
  createdAt: number
  updatedAt: number
  auth: OpenHABSessionData | null
}

function parseIpv4(hostname: string): number[] | null {
  const parts = hostname.split('.')
  if (parts.length !== 4) {
    return null
  }
  const values: number[] = []
  for (const part of parts) {
    if (!/^(0|[1-9][0-9]{0,2})$/.test(part)) {
      return null
    }
    const value = Number(part)
    if (value > 255) {
      return null
    }
    values.push(value)
  }
  return values
}

function hasUnsafeUrlCharacters(value: string): boolean {
  return /[\u0000-\u0020\u007f\\]/.test(value)
}

function isValidPort(value: string): boolean {
  if (!/^[0-9]+$/.test(value)) {
    return false
  }
  const port = Number(value)
  return Number.isFinite(port) && port >= 1 && port <= 65535
}

export function isAllowedOpenHABHostname(value: unknown): boolean {
  const hostname = String(value ?? '')
    .replace(/^\[|\]$/g, '')
    .toLowerCase()
  const ipv4 = parseIpv4(hostname)
  if (ipv4) {
    return (
      ipv4[0] === 10 ||
      (ipv4[0] === 172 && ipv4[1] >= 16 && ipv4[1] <= 31) ||
      (ipv4[0] === 192 && ipv4[1] === 168)
    )
  }
  if (hostname.includes(':')) {
    return hostname.startsWith('fc') || hostname.startsWith('fd')
  }
  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname.length > 253 ||
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/.test(
      hostname
    )
  ) {
    return false
  }
  return !hostname.includes('.') || hostname.endsWith('.local')
}

function isAllowedPublicHttpsHostname(value: string): boolean {
  const hostname = value.toLowerCase()
  if (
    parseIpv4(hostname) ||
    hostname.includes(':') ||
    !hostname.includes('.') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.home.arpa') ||
    hostname.endsWith('.test') ||
    hostname.endsWith('.invalid') ||
    hostname.endsWith('.example')
  ) {
    return false
  }
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/.test(
    hostname
  )
}

function normalizeOpenHABAuthority(value: string, protocol: string): string {
  if (!value || value.includes('@') || hasUnsafeUrlCharacters(value)) {
    return ''
  }

  let hostname: string
  let serializedHostname: string
  let port = ''
  if (value.startsWith('[')) {
    const closingBracket = value.indexOf(']')
    if (closingBracket <= 1) {
      return ''
    }
    hostname = value.slice(1, closingBracket)
    const remainder = value.slice(closingBracket + 1)
    if (
      !hostname.includes(':') ||
      !/^[0-9A-Fa-f:.]+$/.test(hostname) ||
      (remainder &&
        (!remainder.startsWith(':') || !isValidPort(remainder.slice(1))))
    ) {
      return ''
    }
    port = remainder ? remainder.slice(1) : ''
    serializedHostname = `[${hostname.toLowerCase()}]`
  } else {
    const colonIndex = value.lastIndexOf(':')
    if (colonIndex !== value.indexOf(':')) {
      return ''
    }
    hostname = colonIndex === -1 ? value : value.slice(0, colonIndex)
    port = colonIndex === -1 ? '' : value.slice(colonIndex + 1)
    if (
      !/^[A-Za-z0-9.-]+$/.test(hostname) ||
      (colonIndex !== -1 && !isValidPort(port))
    ) {
      return ''
    }
    serializedHostname = hostname.toLowerCase()
  }

  if (
    !isAllowedOpenHABHostname(hostname) &&
    !(protocol === 'https' && isAllowedPublicHttpsHostname(hostname))
  ) {
    return ''
  }
  const numericPort = port ? Number(port) : null
  const canonicalPort =
    numericPort === null ||
    (protocol === 'http' && numericPort === 80) ||
    (protocol === 'https' && numericPort === 443)
      ? ''
      : `:${numericPort}`
  return `${serializedHostname}${canonicalPort}`
}

export function normalizeOpenHABBaseUrl(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  const candidate = value.trim()
  if (!candidate || hasUnsafeUrlCharacters(candidate)) {
    return ''
  }

  const match = /^(https?):\/\/([^/?#]+)([^?#]*)$/i.exec(candidate)
  if (!match?.[1] || !match[2]) {
    return ''
  }
  const protocol = match[1].toLowerCase()
  const authority = normalizeOpenHABAuthority(match[2], protocol)
  const pathname = match[3] ?? ''
  if (
    !authority ||
    (pathname && !pathname.startsWith('/')) ||
    /%25/i.test(pathname)
  ) {
    return ''
  }

  let decodedPath: string
  try {
    decodedPath = decodeURIComponent(pathname || '/')
  } catch {
    return ''
  }
  if (
    decodedPath.includes('\\') ||
    decodedPath
      .split('/')
      .some((segment) => segment === '..' || segment === '.')
  ) {
    return ''
  }

  return `${protocol}://${authority}${pathname.replace(/\/+$/, '')}`
}

export function normalizeOpenHABSessionData(
  value: unknown
): OpenHABSessionData | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const data = value as Partial<OpenHABSessionData>
  const hassUrl = normalizeOpenHABBaseUrl(data.hassUrl)
  if (
    !hassUrl ||
    typeof data.username !== 'string' ||
    data.username.trim().length === 0 ||
    typeof data.password !== 'string' ||
    data.password.length === 0
  ) {
    return null
  }
  return {
    hassUrl,
    username: data.username.trim(),
    password: data.password,
  }
}

export function isValidOpenHABSessionData(value: unknown): value is OpenHABSessionData {
  const normalized = normalizeOpenHABSessionData(value)
  return Boolean(
    normalized &&
      normalized.hassUrl === (value as OpenHABSessionData).hassUrl &&
      normalized.username === (value as OpenHABSessionData).username
  )
}

export function toOpenHABBasicAuthHeader(session: OpenHABSessionData): string {
  return `Basic ${Buffer.from(`${session.username}:${session.password}`).toString('base64')}`
}

function isValidStoredOpenHABSession(value: unknown): value is ViteStoredOpenHABSession {
  if (!value || typeof value !== 'object') {
    return false
  }

  const stored = value as Partial<ViteStoredOpenHABSession>
  return (
    stored.version === 1 &&
    typeof stored.createdAt === 'number' &&
    Number.isFinite(stored.createdAt) &&
    typeof stored.updatedAt === 'number' &&
    Number.isFinite(stored.updatedAt) &&
    (stored.auth === null || isValidOpenHABSessionData(stored.auth))
  )
}

function createEmptyStoredOpenHABSession(): ViteStoredOpenHABSession {
  const now = Date.now()
  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    auth: null,
  }
}

export function createViteOpenHABSessionStore(
  options: {
    cookieNames?: InstallationCookieNames
    legacySessionPath?: string
    sessionsDirectory?: string
  } = {}
): ViteProviderSessionStore<ViteStoredOpenHABSession> {
  const cacheDirectory = path.resolve(process.cwd(), '.cache')
  return createViteProviderSessionStore({
    cookieNames:
      options.cookieNames ??
      createInstallationCookieNames(OPENHAB_SESSION_COOKIE_NAME),
    createRecord: createEmptyStoredOpenHABSession,
    isValidRecord: isValidStoredOpenHABSession,
    legacySessionPath:
      options.legacySessionPath ?? path.join(cacheDirectory, 'navet-openhab-session.json'),
    maxRecordBytes: OPENHAB_SESSION_RECORD_MAX_BYTES,
    sessionsDirectory:
      options.sessionsDirectory ??
      path.join(cacheDirectory, 'navet-provider-sessions', 'openhab'),
  })
}
