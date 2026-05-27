import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

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

export function createViteHomeySessionStore(
  sessionFilePath = path.resolve(process.cwd(), '.cache', 'navet-homey-session.json')
) {
  let session = loadPersistedHomeySession(sessionFilePath)

  return {
    getSerializedSession(): string | null {
      return session
    },
    getSession(): HomeySessionData | null {
      if (!session) {
        return null
      }

      try {
        const parsed = JSON.parse(session)
        return isValidHomeySessionData(parsed) ? parsed : null
      } catch {
        return null
      }
    },
    saveSession(data: HomeySessionData) {
      const serialized = JSON.stringify(data)
      mkdirSync(path.dirname(sessionFilePath), { recursive: true })
      writeFileSync(sessionFilePath, serialized, 'utf8')
      session = serialized
    },
    clearSession() {
      session = null
      rmSync(sessionFilePath, { force: true })
    },
  }
}

function loadPersistedHomeySession(sessionFilePath: string): string | null {
  try {
    const serialized = readFileSync(sessionFilePath, 'utf8')
    const parsed = JSON.parse(serialized)
    return isValidHomeySessionData(parsed) ? serialized : null
  } catch {
    return null
  }
}
