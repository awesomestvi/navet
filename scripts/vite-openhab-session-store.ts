import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export interface OpenHABSessionData {
  hassUrl: string
  username: string
  password: string
}

export function isValidOpenHABSessionData(value: unknown): value is OpenHABSessionData {
  if (!value || typeof value !== 'object') {
    return false
  }

  const data = value as Partial<OpenHABSessionData>
  return (
    typeof data.hassUrl === 'string' &&
    /^https?:\/\//.test(data.hassUrl) &&
    typeof data.username === 'string' &&
    data.username.trim().length > 0 &&
    typeof data.password === 'string' &&
    data.password.length > 0
  )
}

export function toOpenHABBasicAuthHeader(session: OpenHABSessionData): string {
  return `Basic ${Buffer.from(`${session.username}:${session.password}`).toString('base64')}`
}

export function createViteOpenHABSessionStore(
  sessionFilePath = path.resolve(process.cwd(), '.cache', 'navet-openhab-session.json')
) {
  let session = loadPersistedOpenHABSession(sessionFilePath)

  return {
    getSerializedSession(): string | null {
      return session
    },
    getSession(): OpenHABSessionData | null {
      if (!session) {
        return null
      }

      try {
        const parsed = JSON.parse(session)
        return isValidOpenHABSessionData(parsed) ? parsed : null
      } catch {
        return null
      }
    },
    saveSession(data: OpenHABSessionData) {
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

function loadPersistedOpenHABSession(sessionFilePath: string): string | null {
  try {
    const serialized = readFileSync(sessionFilePath, 'utf8')
    const parsed = JSON.parse(serialized)
    return isValidOpenHABSessionData(parsed) ? serialized : null
  } catch {
    return null
  }
}
