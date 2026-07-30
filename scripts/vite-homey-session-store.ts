import path from 'node:path'
import {
  createViteProviderSessionStore,
  type ViteProviderSessionStore,
} from './vite-provider-session-store'
import {
  createInstallationCookieNames,
  type InstallationCookieNames,
} from './installation-cookie-scope'

export const HOMEY_SESSION_COOKIE_NAME = 'navet_homey_session'
export const HOMEY_OAUTH_PENDING_TTL_MS = 10 * 60 * 1000
const HOMEY_SESSION_RECORD_MAX_BYTES = 32 * 1024
const HOMEY_OAUTH_CALLBACK_PARAM = 'homey_oauth_callback'
const HOMEY_OAUTH_ERROR_PARAM = 'homey_oauth_error'

export type HomeyOAuthFailureCode =
  | 'access_denied'
  | 'callback_incomplete'
  | 'temporarily_unavailable'
  | 'invalid_response'
  | 'session_changed'
  | 'not_authorized'

export interface HomeySessionData {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user?: HomeySessionUser | null
  homeys: HomeyCloudHomey[]
  selectedHomeyId?: string | null
  homeyBaseUrl?: string | null
  homeySessionToken?: string | null
  userId?: string | null
}

export interface HomeySessionUser {
  id?: string | null
  name: string
  avatarUrl?: string | null
  email?: string | null
  is_owner?: boolean
  is_admin?: boolean
}

export interface HomeyCloudHomey {
  id: string
  name: string
  platform?: string | null
  localUrl?: string | null
  localUrlSecure?: string | null
  remoteUrl?: string | null
}

export interface HomeyPendingOAuth {
  expiresAt: number
  installationPairingVerified?: boolean
  returnTo: string
  state: string
}

export interface ViteStoredHomeySession {
  version: 1
  createdAt: number
  updatedAt: number
  auth: HomeySessionData | null
  pending: HomeyPendingOAuth | null
}

export function isConfirmedInvalidHomeyRefreshError(payload: unknown): boolean {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      (payload as { error?: unknown }).error === 'invalid_grant'
  )
}

export function normalizeHomeyRefreshTokenPayload(
  value: unknown,
  currentRefreshToken: string
): { accessToken: string; expiresIn: number; refreshToken: string } | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const token = value as {
    access_token?: unknown
    expires_in?: unknown
    refresh_token?: unknown
  }
  const accessToken =
    typeof token.access_token === 'string' ? token.access_token.trim() : ''
  const refreshToken =
    typeof token.refresh_token === 'string' && token.refresh_token.trim()
      ? token.refresh_token.trim()
      : currentRefreshToken.trim()
  const rawExpiresIn = token.expires_in
  const expiresIn =
    typeof rawExpiresIn === 'number' ||
    (typeof rawExpiresIn === 'string' && rawExpiresIn.trim())
      ? Number(rawExpiresIn)
      : Number.NaN
  if (
    !accessToken ||
    !refreshToken ||
    !Number.isFinite(expiresIn) ||
    expiresIn <= 0 ||
    !Number.isFinite(Date.now() + expiresIn * 1000)
  ) {
    return null
  }
  return { accessToken, expiresIn, refreshToken }
}

function createHomeyOAuthReturnUrl(returnTo: string): URL {
  try {
    const parsed = new URL(returnTo, 'http://navet.local')
    if (parsed.origin === 'http://navet.local') {
      for (const parameter of [
        HOMEY_OAUTH_CALLBACK_PARAM,
        HOMEY_OAUTH_ERROR_PARAM,
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

export function appendHomeyOAuthCallbackMarker(returnTo: string): string {
  const parsed = createHomeyOAuthReturnUrl(returnTo)
  parsed.searchParams.set(HOMEY_OAUTH_CALLBACK_PARAM, '1')
  return `${parsed.pathname}${parsed.search}${parsed.hash}`
}

export function appendHomeyOAuthFailureMarker(
  returnTo: string,
  failure: HomeyOAuthFailureCode
): string {
  const parsed = createHomeyOAuthReturnUrl(returnTo)
  parsed.searchParams.set(HOMEY_OAUTH_ERROR_PARAM, failure)
  return `${parsed.pathname}${parsed.search}${parsed.hash}`
}

export function isValidHomeySessionData(value: unknown): value is HomeySessionData {
  if (!value || typeof value !== 'object') {
    return false
  }

  const data = value as Partial<HomeySessionData>
  return (
    typeof data.accessToken === 'string' &&
    data.accessToken.trim().length > 0 &&
    typeof data.refreshToken === 'string' &&
    data.refreshToken.trim().length > 0 &&
    typeof data.expiresAt === 'number' &&
    Number.isFinite(data.expiresAt) &&
    (data.user == null || isValidHomeySessionUser(data.user)) &&
    Array.isArray(data.homeys) &&
    data.homeys.every(isValidHomeyCloudHomey) &&
    (data.selectedHomeyId == null || typeof data.selectedHomeyId === 'string') &&
    (data.homeyBaseUrl == null ||
      (typeof data.homeyBaseUrl === 'string' && /^https?:\/\//.test(data.homeyBaseUrl))) &&
    (data.homeySessionToken == null || typeof data.homeySessionToken === 'string') &&
    (data.userId == null || typeof data.userId === 'string')
  )
}

function isValidHomeySessionUser(value: unknown): value is HomeySessionUser {
  if (!value || typeof value !== 'object') {
    return false
  }

  const user = value as Partial<HomeySessionUser>
  return (
    typeof user.name === 'string' &&
    user.name.trim().length > 0 &&
    (user.id == null || typeof user.id === 'string') &&
    (user.avatarUrl == null || typeof user.avatarUrl === 'string') &&
    (user.email == null || typeof user.email === 'string') &&
    (user.is_owner == null || typeof user.is_owner === 'boolean') &&
    (user.is_admin == null || typeof user.is_admin === 'boolean')
  )
}

function isValidHomeyCloudHomey(value: unknown): value is HomeyCloudHomey {
  if (!value || typeof value !== 'object') {
    return false
  }

  const homey = value as Partial<HomeyCloudHomey>
  return (
    typeof homey.id === 'string' &&
    homey.id.length > 0 &&
    typeof homey.name === 'string' &&
    homey.name.length > 0 &&
    (homey.platform == null || typeof homey.platform === 'string') &&
    (homey.localUrl == null || /^https?:\/\//.test(homey.localUrl)) &&
    (homey.localUrlSecure == null || /^https?:\/\//.test(homey.localUrlSecure)) &&
    (homey.remoteUrl == null || /^https?:\/\//.test(homey.remoteUrl))
  )
}

function isValidPendingOAuth(value: unknown): value is HomeyPendingOAuth {
  if (!value || typeof value !== 'object') {
    return false
  }

  const pending = value as Partial<HomeyPendingOAuth>
  return (
    typeof pending.state === 'string' &&
    /^[a-f0-9]{64}$/.test(pending.state) &&
    typeof pending.returnTo === 'string' &&
    pending.returnTo.startsWith('/') &&
    !pending.returnTo.startsWith('//') &&
    typeof pending.expiresAt === 'number' &&
    Number.isFinite(pending.expiresAt) &&
    (pending.installationPairingVerified === undefined ||
      typeof pending.installationPairingVerified === 'boolean')
  )
}

function isValidStoredHomeySession(value: unknown): value is ViteStoredHomeySession {
  if (!value || typeof value !== 'object') {
    return false
  }

  const stored = value as Partial<ViteStoredHomeySession>
  return (
    stored.version === 1 &&
    typeof stored.createdAt === 'number' &&
    Number.isFinite(stored.createdAt) &&
    typeof stored.updatedAt === 'number' &&
    Number.isFinite(stored.updatedAt) &&
    (stored.auth === null || isValidHomeySessionData(stored.auth)) &&
    (stored.pending === null || isValidPendingOAuth(stored.pending))
  )
}

function createEmptyStoredHomeySession(): ViteStoredHomeySession {
  const now = Date.now()
  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    auth: null,
    pending: null,
  }
}

export function createViteHomeySessionStore(
  options: {
    cookieNames?: InstallationCookieNames
    legacySessionPath?: string
    sessionsDirectory?: string
  } = {}
): ViteProviderSessionStore<ViteStoredHomeySession> {
  const cacheDirectory = path.resolve(process.cwd(), '.cache')
  return createViteProviderSessionStore({
    cookieNames:
      options.cookieNames ??
      createInstallationCookieNames(HOMEY_SESSION_COOKIE_NAME),
    createRecord: createEmptyStoredHomeySession,
    isValidRecord: isValidStoredHomeySession,
    legacySessionPath:
      options.legacySessionPath ?? path.join(cacheDirectory, 'navet-homey-session.json'),
    maxRecordBytes: HOMEY_SESSION_RECORD_MAX_BYTES,
    sessionsDirectory:
      options.sessionsDirectory ??
      path.join(cacheDirectory, 'navet-provider-sessions', 'homey'),
  })
}
